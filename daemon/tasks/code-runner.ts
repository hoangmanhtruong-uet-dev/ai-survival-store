import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { DAEMON_CONFIG } from '../config';
import { sendTelegramNotification, sendTelegramChatAction, answerTelegramCallback } from '../telegram';
import { getDaemonSupabase } from '../services/supabase';

let isCodingTaskRunning = false;

// Lưu trữ metadata của các nhánh đang chờ duyệt
const pendingBranches = new Map<string, { taskDescription: string; startedAt: number }>();

function runCommand(command: string, cwd = process.cwd()): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    exec(command, { cwd, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({
        stdout: stdout || '',
        stderr: stderr || '',
        code: err ? err.code || 1 : 0,
      });
    });
  });
}

/**
 * Tìm đường dẫn thực thi của Antigravity CLI (agy)
 */
function resolveAgyBin(): string {
  if (process.env.AGY_BIN_PATH) {
    return process.env.AGY_BIN_PATH;
  }
  if (process.platform === 'win32') {
    const winPath = 'C:\\Users\\ADMIN\\.gemini\\bin\\agy.exe';
    if (fs.existsSync(winPath)) {
      return `"${winPath}"`;
    }
  } else {
    // Các đường dẫn phổ biến trên Linux / VPS
    const linuxPaths = [
      path.join(process.env.HOME || '/root', '.gemini', 'bin', 'agy'),
      '/usr/local/bin/agy',
      '/usr/bin/agy',
    ];
    for (const p of linuxPaths) {
      if (fs.existsSync(p)) return p;
    }
  }
  return 'agy';
}

/**
 * Xử lý tác vụ /code do Boss ra lệnh từ Telegram:
 * 1. Tạo nhánh riêng an toàn
 * 2. Kích hoạt Antigravity CLI (Pro Account) để đọc hiểu codebase và viết code
 * 3. Tự động commit vào nhánh riêng
 * 4. Bắn bản xem trước (Diff Preview) qua Telegram kèm nút [Duyệt Merge lên Main]
 */
export async function executeCodingTask(chatId: string | number, taskDescription: string): Promise<void> {
  if (isCodingTaskRunning) {
    await sendTelegramNotification(
      `⏳ <b>Mèo Dev đang bận cày một tác vụ code khác!</b>\n<i>Boss đợi em xử lý xong task trước rồi ra lệnh tiếp nhé!</i>`,
      { parseMode: 'HTML' },
      chatId
    );
    return;
  }

  isCodingTaskRunning = true;
  const branchName = `ai-feat-${Date.now().toString(36)}`;
  pendingBranches.set(branchName, { taskDescription, startedAt: Date.now() });

  try {
    await sendTelegramChatAction(chatId, 'typing');
    await sendTelegramNotification(
      `🚀 <b>[MÈO DEV ANTIGRAVITY ENGINE] ĐÃ NHẬN LỆNH CODE!</b>\n\n` +
      `📋 <b>Nhiệm vụ:</b> <code>${taskDescription.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>\n` +
      `🌿 <b>Nhánh an toàn:</b> <code>${branchName}</code>\n` +
      `🤖 <b>Tài khoản:</b> Antigravity Pro Agent (Headless Worker)\n\n` +
      `<i>Mèo Dev đang mở repo, phân tích cấu trúc dự án và viết code... Quá trình này thường mất từ 1 - 3 phút!</i>`,
      { parseMode: 'HTML' },
      chatId
    );

    // 1. Tạo và chuyển sang nhánh riêng an toàn
    console.log(`\n[DEV AGENT] Tạo nhánh mới: ${branchName}...`);
    await runCommand(`git checkout -b ${branchName}`);

    // 2. Soạn prompt thực thi cho Antigravity Pro
    const agyBin = resolveAgyBin();
    const systemBrief =
      `Bạn là Mèo Dev - Senior Fullstack AI Autonomous Coder của dự án AI Survival Store (Next.js 16, TypeScript, Supabase, Tailwind). ` +
      `Nhiệm vụ cụ thể của Boss từ xa qua Telegram: "${taskDescription}". ` +
      `Yêu cầu bắt buộc: ` +
      `1. Khảo sát codebase hiện tại để nắm rõ luồng dữ liệu và API routes. ` +
      `2. Viết mã nguồn hoàn chỉnh, tạo hoặc cập nhật các file cần thiết. ` +
      `3. Đảm bảo code sạch, không phá hỏng các tính năng cũ, tuân thủ TypeScript chuẩn. ` +
      `4. Kết thúc bằng một bản tóm tắt ngắn gọn các file đã tạo mới hoặc thay đổi.`;

    // Chuẩn bị file tạm lưu prompt để tránh lỗi escape shell ký tự đặc biệt
    const tempDir = path.resolve(process.cwd(), 'daemon', '.tmp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const promptFilePath = path.join(tempDir, `prompt-${Date.now()}.txt`);
    fs.writeFileSync(promptFilePath, systemBrief, 'utf-8');

    console.log(`[DEV AGENT] Kích hoạt Antigravity CLI: ${agyBin}...`);
    
    // Tùy chọn model Gemini Pro và reasoning effort
    const modelArg = process.env.AGY_MODEL ? `--model ${process.env.AGY_MODEL.trim()}` : '';
    const effortArg = process.env.AGY_EFFORT ? `--effort ${process.env.AGY_EFFORT.trim()}` : '';
    const cliFlags = [modelArg, effortArg, '--dangerously-skip-permissions', '--mode auto'].filter(Boolean).join(' ');

    // Chạy CLI
    const { stdout, stderr } = await runCommand(
      process.platform === 'win32'
        ? `powershell -Command "${agyBin} --print (Get-Content -Raw '${promptFilePath}') ${cliFlags}"`
        : `${agyBin} --print "$(cat '${promptFilePath}')" ${cliFlags}`
    );

    // Dọn dẹp file prompt tạm
    try {
      fs.unlinkSync(promptFilePath);
    } catch {
      // Ignore
    }

    // 3. Kiểm tra các thay đổi trong Git
    const { stdout: statusOutput } = await runCommand('git status --porcelain');

    if (!statusOutput || statusOutput.trim().length === 0) {
      console.log('[DEV AGENT] Không có file nào được thay đổi.');
      await runCommand('git checkout main');
      await runCommand(`git branch -D ${branchName}`);
      pendingBranches.delete(branchName);

      await sendTelegramNotification(
        `⚠️ <b>[MÈO DEV ANTIGRAVITY ENGINE]</b>\n` +
        `Agent đã hoàn thành việc phân tích nhưng không có file mã nguồn nào được thay đổi hoặc yêu cầu chưa đủ rõ ràng.\n\n` +
        `<i>Chi tiết output:</i>\n<pre><code>${(stdout || stderr || 'Không có log').slice(0, 1000).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`,
        { parseMode: 'HTML' },
        chatId
      );
      return;
    }

    // 4. Commit các thay đổi vào nhánh riêng (Đảm bảo cấu hình git author trên VPS)
    console.log('[DEV AGENT] Đang commit thay đổi...');
    await runCommand('git config user.name "Meo Dev AI"');
    await runCommand('git config user.email "meodev@ai-survival.store"');
    await runCommand('git add .');
    const commitMsg = `feat(ai): ${taskDescription.slice(0, 70).replace(/"/g, "'")}`;
    await runCommand(`git commit -m "${commitMsg}"`);

    // 5. Lấy thống kê diff (thay đổi)
    const { stdout: diffStat } = await runCommand('git diff --stat HEAD~1');

    console.log(`[DEV AGENT] Đã tạo commit xong trên nhánh ${branchName}!`);

    // 6. Gửi bản báo cáo kèm nút bấm [Duyệt Merge] qua Telegram
    const safeDiff = (diffStat || statusOutput || 'Đã sửa đổi các file trong dự án.')
      .slice(0, 1500)
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    await sendTelegramNotification(
      `🎉 <b>[MÈO DEV] CODE ĐÃ XONG & ĐANG CHỜ BOSS DUYỆT!</b>\n\n` +
      `📋 <b>Nhiệm vụ:</b> <code>${taskDescription.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>\n` +
      `🌿 <b>Nhánh:</b> <code>${branchName}</code>\n\n` +
      `📊 <b>CÁC FILE ĐÃ ĐƯỢC TẠO / SỬA:</b>\n` +
      `<pre><code>${safeDiff}</code></pre>\n\n` +
      `👇 <b>Boss bấm nút bên dưới để quyết định:</b>`,
      {
        parseMode: 'HTML',
        replyMarkup: {
          inline_keyboard: [
            [
              { text: '🚀 Duyệt & Merge lên Web (Vercel Deploy)', callback_data: `merge_code:${branchName}` },
            ],
            [
              { text: '❌ Hủy bỏ thay đổi này', callback_data: `discard_code:${branchName}` },
            ],
          ],
        },
      },
      chatId
    );
  } catch (err) {
    const errMsg = (err as Error).message;
    console.error('❌ Lỗi thực thi Coding Task:', errMsg);
    try {
      await runCommand('git checkout main');
      await runCommand(`git branch -D ${branchName}`);
    } catch {
      // Ignore
    }
    pendingBranches.delete(branchName);

    await sendTelegramNotification(
      `😿 <b>LỖI KHI CODE:</b> <code>${errMsg.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>\n` +
      `<i>Nhánh code đã được hoàn tác an toàn về main!</i>`,
      { parseMode: 'HTML' },
      chatId
    );
  } finally {
    isCodingTaskRunning = false;
  }
}

/**
 * Xử lý khi Boss bấm nút [🚀 Duyệt & Merge lên Web]
 */
export async function handleApproveMerge(callbackId: string, branchName: string): Promise<void> {
  await answerTelegramCallback(callbackId, 'Đang tiến hành merge vào main và push lên Vercel...');

  try {
    console.log(`[MERGE] Boss duyệt! Đang merge nhánh ${branchName} vào main...`);
    await runCommand('git checkout main');
    
    // Kéo code mới nhất nếu có
    await runCommand('git pull origin main');

    // Merge nhánh feature
    const { code: mergeCode, stderr: mergeErr } = await runCommand(`git merge ${branchName} --no-edit`);
    if (mergeCode !== 0) {
      throw new Error(`Xung đột (conflict) khi merge: ${mergeErr}`);
    }

    // Push lên GitHub để Vercel tự build
    console.log(`[MERGE] Đang push origin main...`);
    const { code: pushCode, stderr: pushErr } = await runCommand('git push origin main');
    if (pushCode !== 0) {
      throw new Error(`Không thể git push lên origin main: ${pushErr}. Vui lòng kiểm tra quyền SSH/Token trên server!`);
    }

    // Xóa nhánh feature cũ
    await runCommand(`git branch -D ${branchName}`);
    const branchMeta = pendingBranches.get(branchName);
    pendingBranches.delete(branchName);

    const taskTitle = branchMeta?.taskDescription || 'Tính năng mới';

    // Bắn thông báo Telegram
    await sendTelegramNotification(
      `🚀 <b>MERGE VÀ DEPLOY THÀNH CÔNG!</b>\n\n` +
      `📦 <b>Tính năng:</b> <i>${taskTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</i>\n` +
      `✅ Code đã được đẩy chính thức lên nhánh <code>main</code>.\n` +
      `🌐 <b>Vercel</b> đang tự động kích hoạt tiến trình Build & Deploy trong 30 giây!\n\n` +
      `👉 <b>Xem trang web:</b> <a href="${DAEMON_CONFIG.siteUrl}">${DAEMON_CONFIG.siteUrl}</a>`
    );

    // Bắn log lên Live Terminal cho khách trên web thấy
    const supabase = getDaemonSupabase();
    try {
      await supabase.from('live_logs').insert({
        type: 'SYSTEM',
        message: `⚡ [CODE DEPLOYED] Boss vừa duyệt và deploy tính năng mới từ Telegram: "${taskTitle}". Hệ thống web đã được cập nhật!`,
      });
    } catch {
      // Ignore
    }
  } catch (err) {
    const errMsg = (err as Error).message;
    console.error('❌ Lỗi khi Merge code:', errMsg);
    await sendTelegramNotification(
      `❌ <b>LỖI KHI MERGE HOẶC PUSH CODE:</b>\n<code>${errMsg.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>`
    );
  }
}

/**
 * Xử lý khi Boss bấm nút [❌ Hủy bỏ thay đổi]
 */
export async function handleDiscardCode(callbackId: string, branchName: string): Promise<void> {
  await answerTelegramCallback(callbackId, 'Đã hủy bỏ nhánh code này.');

  try {
    console.log(`[DISCARD] Hủy bỏ nhánh ${branchName}...`);
    await runCommand('git checkout main');
    await runCommand(`git branch -D ${branchName}`);
    pendingBranches.delete(branchName);

    await sendTelegramNotification(
      `🗑️ <b>ĐÃ HỦY BỎ NHÁNH CODE:</b> <code>${branchName}</code>\n` +
      `<i>Toàn bộ thay đổi đã được xóa bỏ sạch sẽ. Mã nguồn trên main được giữ an toàn tuyệt đối!</i>`
    );
  } catch (err) {
    console.error('Lỗi khi discard nhánh:', (err as Error).message);
  }
}
