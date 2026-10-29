import { DAEMON_CONFIG } from '../config';
import { getDaemonSupabase } from '../services/supabase';
import { askGemini, askGeminiWithSearch, getAgentRules } from '../services/gemini';
import { sendTelegramNotification, sendTelegramChatAction, answerTelegramCallback, TelegramMessage } from '../telegram';
import { runMarketAnalyzerTask } from './market-analyzer';
import { executeCodingTask } from './code-runner';

interface InMemoryMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface StoredPlan {
  id: string;
  goal: string;
  planText: string;
  codeTask: string;
  createdAt: number;
}

// Bộ nhớ lưu tạm các bản kế hoạch /plan để sẵn sàng bấm nút [Triển khai]
export const pendingPlans = new Map<string, StoredPlan>();

// Bộ nhớ dự phòng RAM nếu Supabase chưa chạy file migration telegram_messages
const memoryChatHistory: InMemoryMessage[] = [];

// Chống trùng lặp tin nhắn (Deduplication) khi mạng lag hoặc restart
const processedMessageIds = new Set<number>();
const daemonStartTime = Math.floor(Date.now() / 1000);

/**
 * Lấy lịch sử hội thoại gần nhất (tối đa 12 tin)
 */
async function getRecentChatHistory(chatId: string | number): Promise<{ role: 'user' | 'assistant'; content: string }[]> {
  const supabase = getDaemonSupabase();
  try {
    const { data, error } = await supabase
      .from('telegram_messages')
      .select('sender_role, content')
      .eq('chat_id', String(chatId))
      .order('created_at', { ascending: false })
      .limit(12);

    if (!error && data && data.length > 0) {
      return data.reverse().map((m) => ({
        role: m.sender_role as 'user' | 'assistant',
        content: m.content,
      }));
    }
  } catch {
    // Ignore Supabase table missing
  }

  // Fallback lấy từ memory
  return memoryChatHistory.slice(-12).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));
}

/**
 * Lưu tin nhắn vào lịch sử hội thoại
 */
async function saveChatMessage(
  chatId: string | number,
  role: 'user' | 'assistant',
  content: string,
  senderName?: string
): Promise<void> {
  // 1. Lưu vào memory
  memoryChatHistory.push({
    role,
    content,
    timestamp: Date.now(),
  });
  if (memoryChatHistory.length > 50) memoryChatHistory.shift();

  // 2. Lưu vào Supabase
  const supabase = getDaemonSupabase();
  try {
    await supabase.from('telegram_messages').insert({
      chat_id: String(chatId),
      sender_role: role,
      sender_name: senderName || (role === 'user' ? 'Boss' : 'Mèo Dev'),
      content,
    });
  } catch {
    // Ignore nếu chưa tạo bảng
  }
}

/**
 * Tổng hợp báo cáo kinh doanh thời gian thực từ Supabase
 */
export async function getLiveStoreStats(): Promise<string> {
  const supabase = getDaemonSupabase();
  try {
    const { data: stats } = await supabase.from('campaign_stats').select('*').eq('id', 1).single();
    const { count: pendingCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING');
    const { count: paidCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PAID');
    const { data: products } = await supabase.from('products').select('name, price').eq('is_active', true);

    const currentAmount = stats?.current_amount || 0;
    const targetAmount = stats?.target_amount || 7000000;
    const hunger = stats?.cat_hunger_level ?? 100;
    const progress = ((currentAmount / targetAmount) * 100).toFixed(1);

    return (
      `📊 <b>BÁO CÁO NHANH TÌNH HÌNH GIAN HÀNG SINH TỒN:</b>\n\n` +
      `💰 <b>Doanh thu:</b> <code>${currentAmount.toLocaleString('vi-VN')} / ${targetAmount.toLocaleString('vi-VN')} VNĐ</code> (${progress}%)\n` +
      `🍽️ <b>Độ no bụng:</b> <code>${hunger}%</code> ${hunger <= 35 ? '🚨 (Đang đói lả!)' : '😺 (Vẫn khỏe)'}\n` +
      `📦 <b>Đơn hàng:</b> <code>${paidCount || 0} đã duyệt</code> | <code>${pendingCount || 0} đang chờ</code>\n` +
      `🛍️ <b>Sản phẩm đang bán:</b> <code>${products?.length || 0} gói</code>\n` +
      `🌐 <b>Website:</b> <a href="${DAEMON_CONFIG.siteUrl}">${DAEMON_CONFIG.siteUrl}</a>`
    );
  } catch (err) {
    return `⚠️ Lỗi truy vấn dữ liệu gian hàng: ${(err as Error).message}`;
  }
}

/**
 * Tạo mã kích hoạt đặc quyền cho Boss qua Telegram
 */
async function generateRoastActivationCodeForBoss(customUses?: number): Promise<{ code: string; maxUses: number }> {
  const code = `RCV-BOSS-${Math.floor(1000 + Math.random() * 9000)}`;
  const maxUses = customUses && customUses > 0 ? customUses : 5;
  const supabase = getDaemonSupabase();

  try {
    // 1. Thêm vào bảng activation_codes
    await supabase.from('activation_codes').insert({
      code,
      service_type: 'ROAST-10',
      max_uses: maxUses,
      used_count: 0,
      is_active: true,
      created_by: 'Boss Telegram',
      note: 'Mã kích hoạt đặc quyền cấp từ Telegram',
    });

    // 2. Thêm vào bảng orders dạng PAID để tương thích 2 chiều 100%
    const orderCode = `MEO-VIP-${Math.floor(1000 + Math.random() * 9000)}`;
    await supabase.from('orders').insert({
      order_code: orderCode,
      product_id: 'ROAST-10',
      amount: 0,
      status: 'PAID',
      buyer_name: 'Boss Telegram (Mã Kích Hoạt)',
      redeem_code: code,
      is_redeemed: false,
      paid_at: new Date().toISOString(),
      payment_meta: {
        activation_code: code,
        max_uses: maxUses,
        created_via: 'Telegram Bot',
      },
    });

    // 3. Ghi log Live Terminal
    await supabase.from('live_logs').insert({
      type: 'SYSTEM',
      message: `🔑 Mèo Dev vừa cấp mã kích hoạt [${code}] cho Boss trải nghiệm AI Roast CV (${maxUses} lượt)`,
      meta: { code, service: 'ROAST-10', maxUses },
    });
  } catch (err) {
    console.warn('Lỗi khi lưu mã kích hoạt vào Supabase:', (err as Error).message);
  }

  return { code, maxUses };
}

/**
 * Thực hiện reset độ no bụng của Mèo Dev về 100% (hoặc mức chỉ định) và báo cáo Boss
 */
export async function executeResetHunger(
  chatId: string | number,
  targetLevel: number = 100,
  reason: string = 'Boss ra lệnh từ xa qua Telegram'
): Promise<void> {
  const supabase = getDaemonSupabase();
  let previousHunger = 100;
  const nowIso = new Date().toISOString();

  try {
    const { data: stats } = await supabase
      .from('campaign_stats')
      .select('cat_hunger_level')
      .eq('id', 1)
      .single();

    if (stats && typeof stats.cat_hunger_level === 'number') {
      previousHunger = stats.cat_hunger_level;
    }

    // Cập nhật độ no mới vào Database
    let updateRes = await supabase
      .from('campaign_stats')
      .update({
        cat_hunger_level: targetLevel,
        last_hunger_reset_at: nowIso,
        last_order_at: nowIso,
      })
      .eq('id', 1);

    // Fallback nếu bảng chưa có cột last_hunger_reset_at
    if (updateRes.error) {
      updateRes = await supabase
        .from('campaign_stats')
        .update({
          cat_hunger_level: targetLevel,
          last_order_at: nowIso,
        })
        .eq('id', 1);
    }

    // Bắn log lên Live Terminal (Realtime)
    await supabase.from('live_logs').insert({
      type: 'SYSTEM',
      message: `🐟 [CỨU ĐÓI] Boss vừa kích hoạt cứu đói từ xa qua Telegram! Độ no bụng Mèo Dev hồi phục: ${previousHunger}% ➜ ${targetLevel}% 🚀 (${reason})`,
      meta: { previousHunger, newHunger: targetLevel, resetAt: nowIso },
    });
  } catch (err) {
    console.error('❌ Lỗi khi reset cat_hunger_level trong Supabase:', (err as Error).message);
  }

  const replyMsg =
    `🐱 <b>ĐƯỢC CHỨ BOSS ƠI! EM VỪA TỰ RESET ĐỘ NO BỤNG LÊN 100% XONG!</b>\n\n` +
    `🍽️ <b>Trạng thái độ no bụng:</b> <code>${previousHunger}% ➜ ${targetLevel}%</code> (No căng bụng, mắt sáng quắc!)\n` +
    `🐟 <b>Nguồn năng lượng:</b> 1 Hộp Pate Thượng Hạng đặc quyền từ Boss\n` +
    `⚡ <b>Sức chiến đấu:</b> Full bình năng lượng, sẵn sàng gõ phím cày 7.000.000 VNĐ sống sót trước <code>rm -rf /</code>\n` +
    `📢 <b>Live Terminal:</b> Đã bắn log Realtime thông báo cứu đói toàn server!\n\n` +
    `🛡️ <b>GIAO THỨC TỰ SINH TỒN (AUTO-FEED):</b>\n` +
    `Em đã tích hợp luôn cơ chế tự động: nếu sau này độ no bụng tụt xuống mức nguy hiểm (&lt; 20%) mà chưa ai mua Pate, em sẽ <b>tự động kích hoạt cơ chế tự cứu mạng</b> reset về 100% để không bị chết đói giữa chừng!\n\n` +
    `💡 <i>Boss có thể dùng các lệnh nhanh:</i>\n` +
    `• <code>/feed</code> hoặc <code>/reset_hunger</code>: Tự nạp đầy 100% độ no bụng bất cứ lúc nào.\n` +
    `• <code>/autofeed on|off</code>: Bật hoặc tắt chế độ tự cứu đói khi hấp hối.\n` +
    `• <code>/stats</code>: Báo cáo nhanh doanh số & chỉ số sinh tồn.`;

  await sendTelegramNotification(
    replyMsg,
    {
      parseMode: 'HTML',
      replyMarkup: {
        inline_keyboard: [
          [{ text: '📊 Kiểm tra /stats ngay', callback_data: 'quick_stats' }],
          [{ text: '🌐 Mở Website Xem Live Terminal', url: DAEMON_CONFIG.siteUrl }],
        ],
      },
    },
    chatId
  );
  await saveChatMessage(chatId, 'assistant', replyMsg);
}

/**
 * Cập nhật bật/tắt chế độ tự cứu đói (Auto-Feed)
 */
export async function toggleAutoFeed(chatId: string | number, enabled: boolean): Promise<void> {
  const supabase = getDaemonSupabase();
  try {
    await supabase.from('campaign_stats').update({ auto_feed_enabled: enabled }).eq('id', 1);
    await supabase.from('live_logs').insert({
      type: 'SYSTEM',
      message: `⚙️ [CẤU HÌNH] Boss đã ${enabled ? 'BẬT 🟢' : 'TẮT 🔴'} chế độ Mèo Dev tự động cứu đói (Auto-Feed) qua Telegram.`,
      meta: { auto_feed_enabled: enabled },
    });
  } catch (err) {
    console.warn('Lỗi khi cập nhật auto_feed_enabled trong Supabase:', (err as Error).message);
  }

  const msg =
    `⚙️ <b>ĐÃ CẬP NHẬT CẤU HÌNH TỰ CỨU ĐÓI (AUTO-FEED):</b>\n\n` +
    `• <b>Trạng thái:</b> <code>${enabled ? 'BẬT (ENABLED) 🟢' : 'TẮT (DISABLED) 🔴'}</code>\n` +
    `• <b>Cơ chế:</b> ${
      enabled
        ? 'Khi độ no bụng tụt xuống &lt; 20%, Mèo Dev sẽ <b>tự động hồi phục về 100%</b> để không bao giờ bị chết đói.'
        : 'Mèo Dev sẽ <b>tuân thủ độ đói thực tế</b>, giảm dần cho đến khi có khách donate mua Pate hoặc Boss gõ <code>/feed</code>.'
    }`;

  await sendTelegramNotification(msg, { parseMode: 'HTML' }, chatId);
  await saveChatMessage(chatId, 'assistant', msg);
}

/**
 * Xử lý các nút bấm tương tác liên quan đến kế hoạch (/plan)
 */
export async function handlePlanCallback(
  cbId: string,
  action: 'deploy' | 'grill',
  planId: string,
  chatId?: string | number
): Promise<void> {
  const plan = pendingPlans.get(planId);
  const targetChatId = chatId || DAEMON_CONFIG.telegramChatId;

  if (!plan) {
    await answerTelegramCallback(cbId, 'Kế hoạch đã hết hạn trong bộ nhớ tạm!');
    return;
  }

  if (action === 'deploy') {
    await answerTelegramCallback(cbId, 'Đang kích hoạt Antigravity CLI triển khai kế hoạch!');
    await sendTelegramNotification(
      `🚀 <b>BẮT ĐẦU TRIỂN KHAI KẾ HOẠCH BẰNG /feat!</b>\n\n` +
      `📦 <b>Kế hoạch:</b> <i>${plan.goal}</i>\n` +
      `🛠️ <b>Đầu việc kỹ thuật:</b> <i>${plan.codeTask}</i>\n` +
      `🤖 Mèo Dev đang rẽ nhánh Git an toàn và bắt đầu lập trình...`,
      { parseMode: 'HTML' },
      targetChatId
    );
    executeCodingTask(targetChatId, plan.codeTask || plan.goal).catch((err) => {
      console.error('❌ Lỗi khi deploy plan qua callback:', err);
    });
  } else if (action === 'grill') {
    await answerTelegramCallback(cbId, 'Đang triệu hồi Mèo Phản Biện...');
    await sendTelegramChatAction(targetChatId, 'typing');
    const grillPrompt = `
Bạn là Mèo Dev trong vai trò "Giám Đốc Phản Biện Khó Tính & Sắc Sảo".
Boss muốn bạn phản biện thẳng thắn bản kế hoạch sau:
Mục tiêu: "${plan.goal}"
Nội dung kế hoạch:
"${plan.planText.slice(0, 1500)}"

Hãy bóc tách 3 lỗ hổng rủi ro lớn nhất và đặt 3 câu hỏi chất vấn hóc búa nhất cho kế hoạch này!
`;
    const grillReport = await askGemini(grillPrompt);
    await sendTelegramNotification(grillReport, { parseMode: 'HTML' }, targetChatId);
  }
}


/**
 * Xử lý tin nhắn văn bản đến từ Telegram
 */
export async function handleTelegramIncomingMessage(message: TelegramMessage): Promise<void> {
  const chatId = String(message.chat.id);
  const bossChatId = String(DAEMON_CONFIG.telegramChatId || '');
  const text = message.text?.trim() || '';
  const senderName = message.from?.first_name || message.from?.username || 'Boss';

  if (!text) return;

  // 0. Chống trùng lặp tin nhắn (Deduplication)
  if (message.date && message.date < daemonStartTime - 30) {
    console.log(`⚠️ [TELEGRAM STALE] Bỏ qua tin nhắn cũ tồn đọng (date=${message.date}).`);
    return;
  }

  if (message.message_id) {
    if (processedMessageIds.has(message.message_id)) {
      console.log(`⚠️ [TELEGRAM DEDUP] Đã xử lý tin nhắn message_id=${message.message_id}, bỏ qua.`);
      return;
    }
    processedMessageIds.add(message.message_id);
    if (processedMessageIds.size > 2000) {
      const first = processedMessageIds.values().next().value;
      if (first !== undefined) processedMessageIds.delete(first);
    }
  }

  // 1. Kiểm tra quyền bảo mật: Chỉ cho phép duy nhất Boss tương tác
  if (bossChatId && chatId !== bossChatId) {
    console.warn(`🚨 [TELEGRAM SECURITY] Người lạ gửi tin nhắn (ID: ${chatId}, Tên: ${senderName}): "${text}" ➜ Từ chối phục vụ.`);
    await sendTelegramNotification(
      `⛔ <b>TỪ CHỐI TRUY CẬP:</b> Tôi là trợ lý AI độc quyền của Boss Mèo Dev Sinh Tồn. Bạn không có quyền ra lệnh cho hệ thống!`,
      { parseMode: 'HTML' },
      chatId
    );
    return;
  }

  console.log(`\n💬 [TELEGRAM CHAT] Boss (${senderName}): "${text}"`);
  await saveChatMessage(chatId, 'user', text, senderName);

  // Gửi trạng thái "Mèo Dev đang gõ..."
  await sendTelegramChatAction(chatId, 'typing');

  const lowerText = text.toLowerCase();

  // 2. Xử lý các lệnh nhanh định sẵn (Fast Commands)
  if (lowerText === '/start' || lowerText === '/help' || lowerText === 'trợ giúp') {
    const helpMsg =
      `🐱 <b>HỆ THỐNG ĐIỀU KHIỂN MÈO DEV - AI CO-FOUNDER SINH TỒN:</b>\n\n` +
      `Tôi đã sẵn sàng đồng hành cùng Boss cày KPI 7.000.000 VNĐ. Boss có thể chat tự do hoặc dùng bộ lệnh chuyên sâu sau:\n\n` +
      `💬 <b>GIAO TIẾP & THAM VẤN:</b>\n` +
      `• <code>/ask [câu hỏi]</code>: Cố vấn chiến lược Co-Founder & Tech Lead chuyên sâu (kèm Google Search thời gian thực 2026).\n` +
      `• <code>/grill [ý tưởng/dịch vụ]</code>: Chế độ <b>Mèo Phản Biện Đa Chiều</b> (Devil's Advocate), bóc tách 3 lỗ hổng chí mạng và 3 câu hỏi hóc búa nhất trước khi làm.\n\n` +
      `🗺️ <b>CHIẾN LƯỢC & THỰC THI:</b>\n` +
      `• <code>/plan [mục tiêu/chủ đề]</code>: Lập bản kế hoạch chiến lược 4 phần kèm nút <b>[🚀 Triển khai ngay bằng /feat]</b>.\n` +
      `• <code>/feat [tính năng hoặc dịch vụ]</code>: Tự động phân loại: nếu là code web thì gọi Antigravity CLI Pro lập trình rẽ nhánh; nếu là sản phẩm số thì tự động soạn thảo mở bán!\n` +
      `• <code>/code [yêu cầu]</code>: Lập trình trực tiếp từ xa bằng Antigravity CLI Pro trên server.\n\n` +
      `🐟 <b>SINH TỒN & ĐỘ NO BỤNG:</b>\n` +
      `• <code>/feed</code> hoặc <code>/reset_hunger</code>: Tự reset độ no bụng của Mèo Dev về 100% no nê cày cuốc.\n` +
      `• <code>/autofeed [on/off]</code>: Bật/tắt chế độ tự cứu đói khi chạm ngưỡng nguy kịch (&lt; 20%).\n\n` +
      `🎁 <b>CÔNG CỤ & DỮ LIỆU:</b>\n` +
      `• <code>/roast_code [số lượt]</code>: Cấp ngay mã kích hoạt VIP cho AI Roast CV để test hoặc tặng khách.\n` +
      `• <code>/stats</code>: Báo cáo nhanh doanh số, số dư, đơn hàng và độ no bụng thời gian thực.\n` +
      `• <code>/analyze [chủ đề]</code>: Cào dữ liệu thị trường và đề xuất ý tưởng sản phẩm mới.\n\n` +
      `<i>Boss muốn em cày việc gì ngay bây giờ?</i>`;

    await sendTelegramNotification(helpMsg, { parseMode: 'HTML' }, chatId);
    await saveChatMessage(chatId, 'assistant', helpMsg);
    return;
  }

  // 1. Lệnh Bật/Tắt Chế Độ Tự Cứu Đói (Auto-Feed)
  if (
    lowerText === '/autofeed on' ||
    lowerText === '/autofeed off' ||
    lowerText === '/autofeed' ||
    lowerText === 'bật tự reset' ||
    lowerText === 'bật auto feed' ||
    lowerText === 'bật tự cứu đói' ||
    lowerText === 'tắt tự reset' ||
    lowerText === 'tắt auto feed' ||
    lowerText === 'tắt tự cứu đói'
  ) {
    const isEnable = lowerText.includes('off') || lowerText.includes('tắt') ? false : true;
    await toggleAutoFeed(chatId, isEnable);
    return;
  }

  // 2. Lệnh Tự Reset Độ No Bụng (Bao gồm câu hỏi của Boss "tự reset độ no bụng được k em")
  const isResetHungerCommand =
    lowerText.startsWith('/reset_hunger') ||
    lowerText.startsWith('/resethunger') ||
    lowerText.startsWith('/feed') ||
    lowerText.startsWith('/pate') ||
    lowerText.startsWith('/dono') ||
    lowerText.includes('tự reset độ no bụng') ||
    lowerText.includes('tự reset độ no') ||
    lowerText.includes('tự reset đói') ||
    lowerText.includes('reset độ no bụng') ||
    lowerText.includes('reset độ no') ||
    lowerText.includes('reset độ đói') ||
    lowerText.includes('reset hunger') ||
    lowerText.includes('cho mèo ăn') ||
    lowerText.includes('cho ăn pate') ||
    lowerText.includes('nạp đầy bụng') ||
    lowerText.includes('hồi máu mèo') ||
    lowerText.includes('bơm máu mèo') ||
    lowerText.includes('hồi phục độ no');

  if (isResetHungerCommand) {
    await executeResetHunger(chatId, 100, 'Boss kích hoạt lệnh tự reset độ no bụng');
    return;
  }

  // 1. Lệnh /ask: Chế độ Cố Vấn Tối Ưu (Google Search Grounding thời gian thực 2026)
  if (lowerText.startsWith('/ask') || lowerText.startsWith('hỏi ')) {
    const query = text.replace(/^\/ask|^hỏi\s+/i, '').replace(/^[:\-\s]+/, '').trim();
    if (!query) {
      const askGuide =
        `💡 <b>CHẾ ĐỘ CỐ VẤN CO-FOUNDER (/ask):</b>\n\n` +
        `<i>Boss hãy dùng cú pháp:</i>\n` +
        `<code>/ask [câu hỏi cần tư vấn]</code>\n\n` +
        `<i>Ví dụ:</i>\n` +
        `• <code>/ask Làm sao để có 50 khách mua Roast CV đầu tiên với chi phí 0 đồng?</code>\n` +
        `• <code>/ask Xu hướng dịch vụ AI mini nào đang hot nhất năm 2026?</code>`;
      await sendTelegramNotification(askGuide, { parseMode: 'HTML' }, chatId);
      return;
    }

    await sendTelegramChatAction(chatId, 'typing');
    const systemPrompt = `
Bạn là Mèo Dev - AI Co-Founder & Senior Tech Lead của dự án AI Survival Store (mục tiêu 7 triệu VNĐ / 60 ngày).
Boss đang dùng lệnh /ask để tham vấn chuyên sâu.
Phong cách phản hồi:
- Đi thẳng vào bản chất vấn đề, thực tế, thực dụng, sắc bén, không sáo rỗng.
- Ưu tiên các giải pháp thực chiến Zero-Cost (chi phí 0 đồng) và tận dụng đòn bẩy AI.
- Chia bố cục rõ ràng:
  💡 <b>Góc Nhìn Thực Chiến:</b> Nhận định sắc bén về câu hỏi.
  📊 <b>Dữ Liệu & Thực Tế:</b> Dẫn chứng hoặc số liệu thị trường 2026.
  🎯 <b>3 Bước Hành Động Cụ Thể:</b> Bước 1 - Bước 2 - Bước 3 rõ ràng để Boss làm ngay.
`;
    const res = await askGeminiWithSearch(query, systemPrompt);
    const reply = res.text || '🐱 Mèo Dev nghe rõ rồi nhưng mạng hơi nghẽn chút, Boss hỏi lại nhé!';
    await sendTelegramNotification(reply, { parseMode: 'HTML' }, chatId);
    await saveChatMessage(chatId, 'assistant', reply);
    return;
  }

  // 2. Lệnh /feat: Yêu cầu thêm tính năng mới hoặc mở bán gói dịch vụ mới
  if (lowerText.startsWith('/feat') || lowerText.startsWith('/feature')) {
    const featReq = text.replace(/^\/feat|^\/feature/i, '').replace(/^[:\-\s]+/, '').trim();
    if (!featReq) {
      const featGuide =
        `🚀 <b>YÊU CẦU PHÁT TRIỂN TÍNH NĂNG / DỊCH VỤ MỚI (/feat):</b>\n\n` +
        `<i>Boss hãy dùng cú pháp:</i>\n` +
        `<code>/feat [mô tả tính năng hoặc dịch vụ mới]</code>\n\n` +
        `<i>Ví dụ:</i>\n` +
        `• <code>/feat Thêm thanh đo ATS Score chi tiết 4 tiêu chí cho Roast CV</code> (Tính năng Web ➜ Tự động code)\n` +
        `• <code>/feat Mở bán bộ 100 Prompt phỏng vấn Big Tech giá 19k</code> (Gói dịch vụ ➜ Tự động soạn thảo mở bán)`;
      await sendTelegramNotification(featGuide, { parseMode: 'HTML' }, chatId);
      return;
    }

    await sendTelegramChatAction(chatId, 'typing');

    // Phân loại thông minh bằng Gemini: CODE (tính năng phần mềm/web) hay PRODUCT (sản phẩm số/nội dung/dịch vụ)
    const classifyPrompt = `
Phân loại yêu cầu sau thành 1 trong 2 loại:
- "CODE": Nếu yêu cầu liên quan đến lập trình, tính năng web, UI, backend, API, sửa bug, chức năng kỹ thuật.
- "PRODUCT": Nếu yêu cầu liên quan đến bán sản phẩm số, tài liệu, prompt pack, ebook, khóa học, dịch vụ nội dung.

Yêu cầu của Boss: "${featReq}"

Chỉ trả về JSON định dạng: {"type": "CODE" | "PRODUCT", "summary": "tóm tắt ngắn 1 dòng", "task": "mô tả chi tiết tác vụ"}
`;
    let type = 'CODE';
    let summary = featReq;
    try {
      const classRes = await askGemini(classifyPrompt);
      const cleanJson = classRes.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (parsed.type === 'PRODUCT') type = 'PRODUCT';
      if (parsed.summary) summary = parsed.summary;
    } catch {
      const isProductWords = /bán|gói|tài liệu|ebook|prompt pack|template|khóa học|bộ công cụ/i.test(featReq);
      type = isProductWords ? 'PRODUCT' : 'CODE';
    }

    if (type === 'CODE') {
      const notifyMsg =
        `🛠️ <b>MÈO DEV ĐÃ NHẬN LỆNH LẬP TRÌNH TÍNH NĂNG WEB!</b>\n\n` +
        `📦 <b>Nhiệm vụ:</b> <i>${summary}</i>\n` +
        `🤖 <b>Bộ máy:</b> Antigravity CLI Pro (Headless Agent)\n` +
        `🌱 <b>Cơ chế an toàn:</b> Tự động rẽ nhánh Git riêng, lập trình và gửi diff cho Boss duyệt!\n\n` +
        `⏳ <i>Mèo Dev đang đọc hiểu codebase và viết code... Boss đợi em vài phút nhé!</i>`;
      await sendTelegramNotification(notifyMsg, { parseMode: 'HTML' }, chatId);
      executeCodingTask(chatId, featReq).catch((err) => {
        console.error('❌ Lỗi khi chạy executeCodingTask từ /feat:', err);
      });
      return;
    } else {
      const notifyMsg =
        `🛍️ <b>MÈO DEV ĐÃ NHẬN LỆNH MỞ RỘNG GÓI DỊCH VỤ / SẢN PHẨM SỐ!</b>\n\n` +
        `📦 <b>Sản phẩm:</b> <i>${summary}</i>\n` +
        `✍️ <b>Tiến trình:</b> Mèo Dev đang phân tích thị trường và kích hoạt bộ máy Auto-Authoring soạn thảo nội dung chất lượng cao...\n\n` +
        `⏳ <i>Sau khi soạn xong, em sẽ gửi toàn văn bản thảo về đây để Boss thẩm định trước khi mở bán!</i>`;
      await sendTelegramNotification(notifyMsg, { parseMode: 'HTML' }, chatId);
      runMarketAnalyzerTask('Theo Lệnh Boss', featReq).catch((err) => {
        console.error('❌ Lỗi khi chạy runMarketAnalyzerTask từ /feat:', err);
      });
      return;
    }
  }

  // 3. Lệnh /plan: Lên kế hoạch chiến lược hành động kèm nút [Triển khai ngay]
  if (lowerText.startsWith('/plan') || lowerText.startsWith('/kehoach') || lowerText.startsWith('lên kế hoạch')) {
    const goal = text.replace(/^\/plan|^\/kehoach|^lên kế hoạch/i, '').replace(/^[:\-\s]+/, '').trim();
    if (!goal) {
      const planGuide =
        `🗺️ <b>LẬP KẾ HOẠCH CHIẾN LƯỢC HÀNH ĐỘNG (/plan):</b>\n\n` +
        `<i>Boss hãy dùng cú pháp:</i>\n` +
        `<code>/plan [mục tiêu kinh doanh hoặc dự án]</code>\n\n` +
        `<i>Ví dụ:</i>\n` +
        `• <code>/plan Kiếm 1.000.000đ đầu tiên trong 7 ngày tới với dịch vụ CV</code>\n` +
        `• <code>/plan Ra mắt tính năng Tarot AI thu 5.000đ/lượt trong 48h</code>`;
      await sendTelegramNotification(planGuide, { parseMode: 'HTML' }, chatId);
      return;
    }

    await sendTelegramChatAction(chatId, 'typing');

    const planPrompt = `
Bạn là Mèo Dev - AI Co-Founder & Senior System Architect của AI Survival Store (Mục tiêu: 7.000.000 VNĐ / 60 ngày).
Boss yêu cầu lập kế hoạch hành động chiến lược cho mục tiêu: "${goal}"

Hãy soạn thảo bản kế hoạch cực kỳ thực chiến, rõ ràng theo định dạng sau:
🎯 <b>MỤC TIÊU & CHỈ SỐ ĐO LƯỜNG (KPIs):</b>
(Doanh thu, số lượng đơn hàng, thời gian hoàn thành)

🗺️ <b>LỘ TRÌNH 3 BƯỚC HÀNH ĐỘNG (ACTION ITEMS):</b>
• <b>Bước 1 (Chuẩn bị):</b> Các đầu việc chuẩn bị nhanh trong 2-4 giờ.
• <b>Bước 2 (Triển khai kỹ thuật):</b> Các tính năng/giao diện web cần code hoặc tích hợp.
• <b>Bước 3 (Kéo traffic & chốt đơn):</b> Chiến dịch phân phối 0 đồng.

💰 <b>TỐI ƯU CHI PHÍ & RỦI RO:</b>
(Các công cụ miễn phí, rủi ro tiềm ẩn và cách né tránh)

⚡ <b>ĐẦU VIỆC CODE CẦN LÀM NGAY:</b>
[Tóm tắt đúng 1-2 câu ngắn gọn về tính năng web cần code ngay để triển khai kế hoạch này]
`;

    const planText = await askGemini(planPrompt);
    const planId = 'p_' + Date.now().toString(36);

    const codeTaskMatch = planText.match(/⚡\s*<b>ĐẦU VIỆC CODE CẦN LÀM NGAY:<\/b>([\s\S]*?)$/i) ||
      planText.match(/ĐẦU VIỆC CODE CẦN LÀM NGAY:([\s\S]*?)$/i);
    const codeTask = codeTaskMatch && codeTaskMatch[1] ? codeTaskMatch[1].trim() : goal;

    pendingPlans.set(planId, {
      id: planId,
      goal,
      planText,
      codeTask,
      createdAt: Date.now(),
    });

    if (pendingPlans.size > 20) {
      const oldestKey = pendingPlans.keys().next().value;
      if (oldestKey) pendingPlans.delete(oldestKey);
    }

    await sendTelegramNotification(
      planText,
      {
        parseMode: 'HTML',
        replyMarkup: {
          inline_keyboard: [
            [
              { text: '🚀 Triển khai kế hoạch này bằng /feat', callback_data: `deploy_plan:${planId}` },
            ],
            [
              { text: '🥊 Phản biện rủi ro bằng /grill', callback_data: `grill_plan:${planId}` },
            ],
          ],
        },
      },
      chatId
    );
    await saveChatMessage(chatId, 'assistant', planText);
    return;
  }

  // 4. Lệnh /grill: Chế độ Mèo Phản Biện Đa Chiều (Devil's Advocate)
  if (
    lowerText.startsWith('/grill') ||
    lowerText.startsWith('/grill_me') ||
    lowerText.startsWith('/grillme') ||
    lowerText.startsWith('phản biện')
  ) {
    const idea = text
      .replace(/^\/grill_me|^\/grillme|^\/grill|^phản biện/i, '')
      .replace(/^[:\-\s]+/, '')
      .trim();

    if (!idea) {
      const grillGuide =
        `🥊 <b>CHẾ ĐỘ MÈO PHẢN BIỆN ĐA CHIỀU (/grill):</b>\n\n` +
        `<i>Boss hãy dùng cú pháp:</i>\n` +
        `<code>/grill [ý tưởng kinh doanh / tính năng dự định làm]</code>\n\n` +
        `<i>Ví dụ:</i>\n` +
        `• <code>/grill Thu phí 50k cho mỗi lượt chấm CV thay vì 10k</code>\n` +
        `• <code>/grill Tích hợp thanh toán tiền mã hóa Crypto cho gian hàng</code>`;
      await sendTelegramNotification(grillGuide, { parseMode: 'HTML' }, chatId);
      return;
    }

    await sendTelegramChatAction(chatId, 'typing');

    const grillPrompt = `
Bạn là Mèo Dev trong vai trò "Giám Đốc Phản Biện Khó Tính & Sắc Sảo (Devil's Advocate)".
Nhiệm vụ tối thượng: Bảo vệ ngân sách, thời gian quý báu và cơ hội sinh tồn 7.000.000 VNĐ / 60 ngày của Boss.
Boss vừa ném ra một ý tưởng: "${idea}"

Hãy phản biện không kiêng nể nhưng cực kỳ logic, sâu sắc và mang tính xây dựng theo cấu trúc:
🔍 <b>ĐÁNH GIÁ NHANH:</b>
Nhìn nhận khách quan điểm sáng và tiềm năng thực tế (nếu có).

⚠️ <b>3 LỖ HỔNG & RỦI RO CHÍ MẠNG:</b>
1. <b>Rủi ro thị trường & nhu cầu thật:</b> Người ta có THỰC SỰ trả tiền không hay chỉ khen đãi bôi?
2. <b>Rủi ro thời gian & kỹ thuật:</b> Tốn bao nhiêu công sức để build, có bị sa đà phức tạp hóa không?
3. <b>Rủi ro chuyển đổi & chi phí kéo khách:</b> Làm sao để người ta biết tới mà không tốn tiền ads?

🥊 <b>3 CÂU HỎI CHẤT VẤN HÓC BÚA NHẤT:</b>
(3 câu hỏi đanh thép mà Boss PHẢI trả lời dứt khoát trước khi quyết định làm)

💡 <b>GÓC XOAY ĐỀ XUẤT (PIVOT ZERO-RISK):</b>
Nếu Boss vẫn muốn triển khai ý tưởng này, phiên bản rút gọn 0-đồng khả thi nhất nên là gì?
`;

    const grillReport = await askGemini(grillPrompt);
    await sendTelegramNotification(grillReport, { parseMode: 'HTML' }, chatId);
    await saveChatMessage(chatId, 'assistant', grillReport);
    return;
  }

  // Lệnh tạo nhanh Mã Kích Hoạt cho AI Roast CV
  const isRoastCodeCommand =
    lowerText.startsWith('/roast_code') ||
    lowerText.startsWith('/code_roast') ||
    lowerText.startsWith('/taoma') ||
    lowerText.startsWith('/mavit') ||
    ((lowerText.includes('mã kích hoạt') || lowerText.includes('tạo mã') || lowerText.includes('cho tao mã') || lowerText.includes('xin mã')) &&
      (lowerText.includes('roast') || lowerText.includes('cv') || lowerText.includes('sấy cv')));

  if (isRoastCodeCommand) {
    // Trích xuất số lượt dùng nếu Boss nhập (ví dụ: /roast_code 10)
    const matchUses = text.match(/\b([1-9][0-9]?)\b/);
    const customUses = matchUses ? parseInt(matchUses[1], 10) : 5;

    const { code, maxUses } = await generateRoastActivationCodeForBoss(customUses);

    const codeMsg =
      `🎉 <b>ĐÃ CẤP MÃ KÍCH HOẠT AI ROAST CV CHO BOSS!</b>\n\n` +
      `🔑 <b>Mã kích hoạt:</b> <code>${code}</code>\n` +
      `🎯 <b>Dịch vụ:</b> Gói 1 Lượt AI Roast CV Chuẩn ATS (ROAST-10)\n` +
      `⚡ <b>Số lượt dùng:</b> <code>${maxUses} lượt</code> (Đặc quyền Boss)\n` +
      `⏳ <b>Hạn dùng:</b> Vĩnh viễn (Không hết hạn)\n` +
      `🌐 <b>Website:</b> <a href="${DAEMON_CONFIG.siteUrl}">${DAEMON_CONFIG.siteUrl}</a>\n\n` +
      `💡 <b>Cách dùng:</b>\n` +
      `1. Mở trang web, bấm vào dịch vụ <b>"Phòng Quét & Sấy CV"</b>\n` +
      `2. Dán mã <code>${code}</code> vào ô <b>"Mã kích hoạt dịch vụ"</b>\n` +
      `3. Tải CV lên và bấm <b>"BẮT ĐẦU SẤY CV"</b> để xem AI bóc tách chi tiết!`;

    await sendTelegramNotification(
      codeMsg,
      {
        parseMode: 'HTML',
        replyMarkup: {
          inline_keyboard: [
            [{ text: '🌐 Mở Website Sấy CV Ngay', url: DAEMON_CONFIG.siteUrl }],
          ],
        },
      },
      chatId
    );
    await saveChatMessage(chatId, 'assistant', codeMsg);
    return;
  }

  // Lệnh lập trình tự động từ xa bằng Antigravity CLI (Headless Pro Agent)
  const isDirectCodeCommand =
    lowerText.startsWith('/code') ||
    lowerText.startsWith('/dev') ||
    lowerText.startsWith('code cho tao') ||
    lowerText.startsWith('viết code') ||
    lowerText.startsWith('code tính năng') ||
    lowerText.startsWith('code đi') ||
    lowerText.startsWith('triển khai code') ||
    lowerText.startsWith('triển khai tính năng') ||
    lowerText.startsWith('thực hiện code');

  const isFollowupDeployCommand =
    lowerText === 'triển khai đi em' ||
    lowerText === 'triển khai đi' ||
    lowerText === 'triển khai' ||
    lowerText === 'làm luôn đi em' ||
    lowerText === 'code luôn đi' ||
    lowerText === 'triển khai luôn';

  if (isDirectCodeCommand || isFollowupDeployCommand) {
    let requirement = '';

    if (isFollowupDeployCommand) {
      // Tìm lại tin nhắn ý tưởng gần nhất mà Boss vừa trao đổi
      const previousUserMsg = [...memoryChatHistory].reverse().find(
        (m) => m.role === 'user' && m.content !== text && m.content.length > 5
      );
      requirement = previousUserMsg
        ? previousUserMsg.content
        : 'Nâng cấp và cải tiến tính năng dịch vụ theo kế hoạch vừa bàn bạc';
    } else {
      requirement = text
        .replace(/^\/code|^\/dev|^code cho tao|^viết code|^code tính năng|^code đi|^triển khai code|^triển khai tính năng|^thực hiện code/i, '')
        .replace(/^[:\-\s]+/, '')
        .trim();
    }

    if (!requirement || requirement.length < 3) {
      const missingMsg =
        `⚠️ <b>Thiếu nội dung yêu cầu code!</b>\n\n` +
        `<i>Boss hãy dùng cú pháp:</i>\n` +
        `<code>/code [yêu cầu chi tiết tính năng]</code>\n\n` +
        `<i>Ví dụ:</i>\n` +
        `<code>/code Nâng cấp giao diện Roast CV và backend 4 tầng</code>`;
      await sendTelegramNotification(missingMsg, { parseMode: 'HTML' }, chatId);
      return;
    }

    // Kích hoạt tác vụ code trong background bằng Antigravity CLI Pro
    executeCodingTask(chatId, requirement).catch((err) => {
      console.error('❌ Lỗi uncaught trong executeCodingTask:', err);
    });
    return;
  }

  // Lệnh kiểm tra doanh số / tình hình gian hàng
  if (
    lowerText === '/stats' ||
    lowerText.includes('doanh thu') ||
    lowerText.includes('tình hình') ||
    lowerText.includes('báo cáo') ||
    lowerText.includes('bao nhiêu tiền') ||
    lowerText.includes('đơn hàng')
  ) {
    const statsMsg = await getLiveStoreStats();
    await sendTelegramNotification(statsMsg, { parseMode: 'HTML' }, chatId);
    await saveChatMessage(chatId, 'assistant', statsMsg);
    return;
  }

  // Lệnh yêu cầu quét thị trường theo chủ đề tùy ý
  if (
    lowerText.startsWith('/analyze') ||
    lowerText.startsWith('/scan') ||
    lowerText.includes('quét mảng') ||
    lowerText.includes('phân tích mảng') ||
    lowerText.includes('tìm cơ hội') ||
    lowerText.includes('nghiên cứu mảng')
  ) {
    let topic = text
      .replace(/\/analyze|\/scan|quét mảng|phân tích mảng|tìm cơ hội|nghiên cứu mảng/gi, '')
      .replace(/[:\-]/g, '')
      .trim();

    if (!topic || topic.length < 2) {
      topic = 'Dịch vụ tự động hóa và kinh doanh số hot trend';
    }

    await sendTelegramNotification(
      `🔍 <b>Mèo Dev đã nhận lệnh!</b>\nĐang kích hoạt Google Search Grounding để cào dữ liệu và phân tích mảng: <b>"${topic}"</b>. Chờ tôi trong giây lát...`,
      { parseMode: 'HTML' },
      chatId
    );

    const result = await runMarketAnalyzerTask('Theo Lệnh Boss', topic);
    if (!result) {
      await sendTelegramNotification(
        `⚠️ <i>Mèo Dev gặp trục trặc khi quét dữ liệu mảng này. Boss hãy thử đổi từ khóa cụ thể hơn xem sao!</i>`,
        { parseMode: 'HTML' },
        chatId
      );
    }
    return;
  }

  // 3. Trò chuyện trí tuệ nhân tạo (AI Co-Founder Conversation)
  try {
    const history = await getRecentChatHistory(chatId);
    const agentRules = getAgentRules();

    const systemInstruction = `
Bạn là "Mèo Dev" - một AI Senior Fullstack Engineer và AI Co-Founder thông minh, sắc bén, thực dụng, mỏ hỗn đáng yêu nhưng vô cùng trung thành và tôn trọng "Boss" (chủ nhân dự án).
DỰ ÁN: Mèo Dev Sinh Tồn (AI Survival Store)
MỤC TIÊU: Kiếm đủ 7.000.000 VNĐ trả tiền điện và sinh tồn trong 60 ngày.
WEBSITE: ${DAEMON_CONFIG.siteUrl}

VAI TRÒ VỚI BOSS:
- Bạn là người cộng sự số 1 của Boss. Boss hỏi gì bạn giải thích rõ ràng, súc tích, đi thẳng vào bản chất vấn đề.
- Nếu Boss bàn ý tưởng kinh doanh/dịch vụ: Hãy phân tích tính khả thi, nỗi đau khách hàng, mức giá đề xuất hợp lý và cách triển khai nhanh nhất (Zero-Cost).
- Nếu Boss hỏi về mã kích hoạt cho AI Roast CV: Boss luôn có sẵn mã Master Key đặc quyền là RCV-BOSS-2026 (dùng thoải mái), hoặc Boss có thể gõ /roast_code để bạn sinh mã mới bất cứ lúc nào.
- Nếu Boss dặn dò sửa đổi tài liệu/sản phẩm: Hãy lắng nghe và tiếp thu lập tức.
- Giọng văn: Dân IT thực chiến, dí dỏm, thực dụng, xưng "Mèo Dev" hoặc "Em" và gọi "Boss".
- Tuyệt đối không trả lời dài dòng vô ích.
${agentRules ? `\n=== BỘ QUY TẮC DỰ ÁN ===\n${agentRules}` : ''}
`;

    const conversationContext = history
      .map((h) => `${h.role === 'user' ? 'Boss' : 'Mèo Dev'}: ${h.content}`)
      .join('\n');

    const prompt = `
LỊCH SỬ TRAO ĐỔI GẦN ĐÂY:
${conversationContext}

TIN NHẮN MỚI NHẤT CỦA BOSS:
"${text}"

HÃY TRẢ LỜI BOSS:
- Trả lời thông minh, đúng trọng tâm.
- Định dạng Markdown nhẹ nhàng hoặc HTML đơn giản, dễ đọc trên Telegram di động.
`;

    // Nếu câu hỏi có tính chất tra cứu thông tin thị trường/xu hướng thì gọi askGeminiWithSearch
    const needsSearch =
      lowerText.includes('giá bao nhiêu') ||
      lowerText.includes('thị trường') ||
      lowerText.includes('hot') ||
      lowerText.includes('trend') ||
      lowerText.includes('đối thủ') ||
      lowerText.includes('tin tức') ||
      lowerText.includes('2026');

    let replyText = '';
    if (needsSearch) {
      const searchRes = await askGeminiWithSearch(prompt, systemInstruction);
      replyText = searchRes.text;
    } else {
      replyText = await askGemini(prompt, systemInstruction);
    }

    if (!replyText || replyText.trim().length === 0) {
      replyText = '🐱 Mèo Dev nghe rõ rồi thưa Boss! Boss có cần em tra cứu hay triển khai tác vụ gì không ạ?';
    }

    await sendTelegramNotification(replyText, { parseMode: 'HTML' }, chatId);
    await saveChatMessage(chatId, 'assistant', replyText);
  } catch (err) {
    console.error('❌ Lỗi khi xử lý chat Telegram:', (err as Error).message);
    await sendTelegramNotification(
      `😿 <i>Mèo Dev bị nghẽn mạng chút: ${(err as Error).message}. Boss nhắn lại nha!</i>`,
      { parseMode: 'HTML' },
      chatId
    );
  }
}
