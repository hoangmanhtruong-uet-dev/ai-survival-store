import cron from 'node-cron';
import { validateDaemonConfig, DAEMON_CONFIG } from './config';
import { sendTelegramNotification, fetchTelegramUpdates, answerTelegramCallback } from './telegram';
import { getDaemonSupabase } from './services/supabase';
import { runHungerDecayTask } from './tasks/hunger-decay';
import { runFlashSaleTask } from './tasks/flash-sale';
import { runDailyContentGeneratorTask } from './tasks/content-generator';
import { runProductGeneratorTask, authorAndPublishProduct } from './tasks/product-generator';
import { runMarketAnalyzerTask } from './tasks/market-analyzer';
import { runCustomTaskWorker } from './tasks/custom-task-worker';

const BANNER = `
==========================================================
🐱 MÈO DEV SURVIVAL AUTONOMOUS DAEMON 24/7
Target: 7.000.000 VNĐ | Deadline: 60 Ngày | Script: rm -rf /
==========================================================
`;

async function main() {
  console.log(BANNER);

  // 1. Kiểm tra biến môi trường
  const { valid, missing } = validateDaemonConfig();
  if (!valid) {
    console.error('❌ LỖI KHỞI ĐỘNG: Thiếu các biến môi trường bắt buộc:');
    missing.forEach((m) => console.error(`   - ${m}`));
    console.error('\n👉 Vui lòng kiểm tra lại file .env.local trước khi chạy daemon!\n');
    process.exit(1);
  }

  const args = process.argv.slice(2);

  // 2. Chế độ chạy thủ công các tác vụ đơn lẻ (CLI Mode)
  if (args.includes('--hunger')) {
    console.log('▶️ [CLI] Kích hoạt thủ công: Giảm độ đói (Hunger Decay)');
    await runHungerDecayTask();
    process.exit(0);
  }

  if (args.includes('--sale')) {
    console.log('▶️ [CLI] Kích hoạt thủ công: Kiểm tra Flash Sale');
    await runFlashSaleTask();
    process.exit(0);
  }

  if (args.includes('--content')) {
    console.log('▶️ [CLI] Kích hoạt thủ công: AI Marketing Content Generator');
    await runDailyContentGeneratorTask();
    process.exit(0);
  }

  if (args.includes('--product')) {
    console.log('▶️ [CLI] Kích hoạt thủ công: Tự động mở rộng sản phẩm');
    await runProductGeneratorTask();
    process.exit(0);
  }

  // Hàm xử lý chung các lệnh bấm nút từ Telegram
  const processTelegramCallback = async (cb: { id: string; data?: string }) => {
    if (!cb.data) return;

    if (cb.data.startsWith('approve:')) {
      const insightId = cb.data.replace('approve:', '');
      console.log(`\n🛎️ [TELEGRAM APPROVE] Boss vừa bấm [✅ DUYỆT] ý tưởng: ${insightId}!`);
      await answerTelegramCallback(cb.id, 'Đã nhận lệnh Duyệt! Mèo Dev bắt đầu biên soạn...');
      await authorAndPublishProduct(insightId);
    } else if (cb.data.startsWith('reroll:')) {
      const insightId = cb.data.replace('reroll:', '');
      console.log(`\n🔄 [TELEGRAM REROLL] Boss yêu cầu đổi ý tưởng: ${insightId}!`);
      await answerTelegramCallback(cb.id, 'Đang phân tích lại xu hướng mới...');
      await runMarketAnalyzerTask('Reroll');
    } else if (cb.data.startsWith('reject:')) {
      const insightId = cb.data.replace('reject:', '');
      console.log(`\n❌ [TELEGRAM REJECT] Boss bấm hủy ý tưởng: ${insightId}.`);
      const supabase = getDaemonSupabase();
      try {
        await supabase.from('market_insights').update({ status: 'REJECTED' }).eq('id', insightId);
      } catch {
        // Ignore
      }
      await answerTelegramCallback(cb.id, 'Đã hủy ý tưởng này!');
      await sendTelegramNotification('🗑️ <i>Đã hủy ý tưởng. Hẹn Boss ở ca phân tích tiếp theo!</i>');
    }
  };

  if (args.includes('--worker')) {
    console.log('▶️ [CLI] Kích hoạt thủ công: Custom Task Worker (Cày việc cho khách)');
    await runCustomTaskWorker();
    process.exit(0);
  }

  if (args.includes('--listen')) {
    console.log('📡 [CLI] Bắt đầu lắng nghe Telegram Bot (Nhấn Ctrl+C để dừng)...');
    let offset = 0;
    while (true) {
      try {
        const { nextOffset, callbacks } = await fetchTelegramUpdates(offset);
        offset = nextOffset;
        for (const cb of callbacks) {
          await processTelegramCallback(cb);
        }
      } catch {
        // Ignore
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  if (args.includes('--market')) {
    console.log('▶️ [CLI] Kích hoạt thủ công: Market Intelligence Analyzer (Quét xu hướng thị trường)');
    await runMarketAnalyzerTask('CLI');
    console.log('\n📡 [CLI LISTENER] Mèo Dev đang online lắng nghe phản hồi từ Telegram...');
    console.log('👉 Boss hãy mở Telegram và bấm nút [✅ Duyệt], [🔄 Đổi ý tưởng] hoặc [❌ Hủy] để xem kết quả! (Nhấn Ctrl+C để thoát)\n');

    let offset = 0;
    while (true) {
      try {
        const { nextOffset, callbacks } = await fetchTelegramUpdates(offset);
        offset = nextOffset;
        for (const cb of callbacks) {
          await processTelegramCallback(cb);
          if (cb.data?.startsWith('approve:')) {
            console.log('\n🎉 [HOÀN TẤT] Boss đã duyệt mở bán thành công! Tiến trình kết thúc.');
            process.exit(0);
          }
        }
      } catch {
        // Ignore
      }
      await new Promise((r) => setTimeout(r, 1200));
    }
  }

  if (args.includes('--test')) {
    console.log('🧪 [TEST MODE] Bắt đầu chạy thử nghiệm toàn bộ tác vụ của Mèo Dev...\n');
    await runHungerDecayTask();
    await runFlashSaleTask();
    await runMarketAnalyzerTask('TEST');
    await runDailyContentGeneratorTask();
    console.log('\n✅ [TEST MODE] Toàn bộ tác vụ tự hành đã chạy thành công!');
    process.exit(0);
  }

  // 3. Chế độ chạy nền 24/7 (Daemon Mode)
  console.log('🚀 [DAEMON ONLINE] Mèo Dev đang chạy ngầm 24/7 trên VPS...\n');
  console.log('⏰ Lịch trình tự động:');
  console.log('   - Mỗi 30 phút:       Trừ 2% độ no bụng & Kêu cứu nếu đói (< 35%)');
  console.log('   - Mỗi 3 phút:        Quét & giải quyết đơn hàng Custom Task của khách');
  console.log('   - Mỗi 6 tiếng:       Kiểm tra đơn hàng & Kích hoạt Flash Sale nếu ế');
  console.log('   - 08:00, 14:00, 20:00: Gemini Search cào dữ liệu thị trường & đề xuất ý tưởng qua Telegram');
  console.log('   - 21:00 mỗi ngày:    AI viết bài Viral Threads/FB & Kịch bản TikTok bắt trend gửi về Telegram');
  console.log('   - 24/7 Listener:     Lắng nghe nút duyệt [✅ Duyệt Mở Bán] từ Telegram của Boss\n');

  // Bắn thông báo khởi động lên Telegram
  await sendTelegramNotification(
    `🐱 <b>MÈO DEV DAEMON ĐÃ ONLINE TRÊN VPS!</b>\n\n` +
    `• <b>Mục tiêu:</b> <code>7.000.000đ trong 60 ngày</code>\n` +
    `• <b>Hạ tầng:</b> Node.js Daemon 24/7 + Gemini Search Grounding\n` +
    `• <b>Website:</b> <a href="${DAEMON_CONFIG.siteUrl}">${DAEMON_CONFIG.siteUrl}</a>\n\n` +
    `<i>Mèo Dev sẽ tự động quét xu hướng thị trường 3 lần/ngày và báo cáo để Boss duyệt mở bán!</i>`
  );

  // Tác vụ 1: Mỗi 30 phút giảm đói
  cron.schedule('*/30 * * * *', async () => {
    try {
      await runHungerDecayTask();
    } catch (e) {
      console.error('❌ Lỗi cron hunger-decay:', (e as Error).message);
    }
  });

  // Tác vụ 2: Mỗi 6 tiếng kiểm tra Flash Sale
  cron.schedule('0 */6 * * *', async () => {
    try {
      await runFlashSaleTask();
    } catch (e) {
      console.error('❌ Lỗi cron flash-sale:', (e as Error).message);
    }
  });

  // Tác vụ 3: 08:00, 14:00, 20:00 cào dữ liệu thị trường & đề xuất ý tưởng sản phẩm mới
  cron.schedule('0 8,14,20 * * *', async () => {
    try {
      const hour = new Date().getHours();
      await runMarketAnalyzerTask(`${hour}:00`);
    } catch (e) {
      console.error('❌ Lỗi cron market-analyzer:', (e as Error).message);
    }
  });

  // Tác vụ 4: 21:00 hàng ngày sinh content marketing bắt trend
  cron.schedule('0 21 * * *', async () => {
    try {
      await runDailyContentGeneratorTask();
    } catch (e) {
      console.error('❌ Lỗi cron content-generator:', (e as Error).message);
    }
  });

  // Tác vụ 5: Mỗi 3 phút quét và cày thuê tự động các đơn hàng custom của khách
  cron.schedule('*/3 * * * *', async () => {
    try {
      await runCustomTaskWorker();
    } catch (e) {
      console.error('❌ Lỗi cron custom-task-worker:', (e as Error).message);
    }
  });

  // 4. Lắng nghe phản hồi từ Telegram (Inline Keyboard Buttons)
  let isPollingActive = true;
  const startTelegramPollingLoop = async () => {
    console.log('📡 [TELEGRAM BOT] Bắt đầu lắng nghe lệnh duyệt từ Boss...');
    let offset = 0;
    while (isPollingActive) {
      try {
        const { nextOffset, callbacks } = await fetchTelegramUpdates(offset);
        offset = nextOffset;

        for (const cb of callbacks) {
          await processTelegramCallback(cb);
        }
      } catch (err) {
        // Tạm nghỉ nếu gặp sự cố mạng
        await new Promise((res) => setTimeout(res, 5000));
      }
      // Nghỉ 1.5 giây giữa các lượt long polling
      await new Promise((res) => setTimeout(res, 1500));
    }
  };

  // Kích hoạt loop chạy ngầm
  startTelegramPollingLoop().catch((err) => {
    console.error('❌ Lỗi Telegram Polling Loop:', err);
  });

  // Xử lý dừng tiến trình an toàn
  const handleExit = async (signal: string) => {
    isPollingActive = false;
    console.log(`\n🛑 Nhận tín hiệu ${signal}. Đang tắt Mèo Dev Daemon...`);
    await sendTelegramNotification(`⚠️ <i>Mèo Dev Daemon trên VPS vừa dừng hoạt động (${signal}).</i>`);
    process.exit(0);
  };

  process.on('SIGINT', () => handleExit('SIGINT'));
  process.on('SIGTERM', () => handleExit('SIGTERM'));
}

main().catch((err) => {
  console.error('💥 Lỗi không xác định:', err);
  process.exit(1);
});

