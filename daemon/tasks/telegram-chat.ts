import { DAEMON_CONFIG } from '../config';
import { getDaemonSupabase } from '../services/supabase';
import { askGemini, askGeminiWithSearch, getAgentRules } from '../services/gemini';
import { sendTelegramNotification, sendTelegramChatAction, TelegramMessage } from '../telegram';
import { runMarketAnalyzerTask } from './market-analyzer';
import { executeCodingTask } from './code-runner';

interface InMemoryMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

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
async function getLiveStoreStats(): Promise<string> {
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
      `🐱 <b>XIN CHÀO BOSS! TÔI LÀ MÈO DEV - AI CO-FOUNDER SINH TỒN!</b>\n\n` +
      `Tôi đã sẵn sàng nhận lệnh và đồng hành cùng Boss cày KPI 7.000.000 VNĐ. Boss có thể chat tự do hoặc dùng các lệnh nhanh:\n\n` +
      `📌 <b>CÁC KHẢ NĂNG CỐT LÕI:</b>\n` +
      `• <b>Chat tự do:</b> Bàn bạc ý tưởng kinh doanh, hỏi ý kiến, tư vấn giải pháp dịch vụ số.\n` +
      `• <b>Lập trình từ xa (Antigravity Pro):</b> Gõ <code>/code [yêu cầu]</code> (VD: <i>/code Viết tính năng Lươn GPT thu 10k</i>) ➜ Mèo Dev sẽ chạy Antigravity CLI trên server để viết code trên nhánh riêng và gửi nút Duyệt Merge về đây!\n` +
      `• <b>Báo cáo gian hàng:</b> Gõ <code>/stats</code> hoặc hỏi <i>"doanh thu thế nào", "tình hình đơn hàng"</i>.\n` +
      `• <b>Nghiên cứu thị trường theo lệnh:</b> Gõ <code>/analyze [chủ đề]</code> hoặc chat <i>"quét mảng dropshipping", "tìm cơ hội AI chatbot"</i> ➜ Tôi sẽ Google Search và đề xuất ngay ý tưởng kèm nút duyệt!\n` +
      `• <b>Thẩm định chất lượng:</b> Khi tôi soạn xong sản phẩm, tôi sẽ gửi bản preview toàn văn qua đây để Boss duyệt trước khi mở bán!\n\n` +
      `Boss muốn tôi cày việc gì ngay bây giờ?`;

    await sendTelegramNotification(helpMsg, { parseMode: 'HTML' }, chatId);
    await saveChatMessage(chatId, 'assistant', helpMsg);
    return;
  }

  // Lệnh lập trình tự động từ xa bằng Antigravity CLI (Headless Pro Agent)
  if (
    lowerText.startsWith('/code') ||
    lowerText.startsWith('/dev') ||
    lowerText.startsWith('code cho tao') ||
    lowerText.startsWith('viết code') ||
    lowerText.startsWith('code tính năng')
  ) {
    const requirement = text
      .replace(/^\/code|^\/dev|^code cho tao|^viết code|^code tính năng/i, '')
      .replace(/^[:\-\s]+/, '')
      .trim();

    if (!requirement || requirement.length < 3) {
      const missingMsg =
        `⚠️ <b>Thiếu nội dung yêu cầu code!</b>\n\n` +
        `<i>Boss hãy dùng cú pháp:</i>\n` +
        `<code>/code [yêu cầu chi tiết tính năng]</code>\n\n` +
        `<i>Ví dụ:</i>\n` +
        `<code>/code Viết API lươn gpt và giao diện thu 10k</code>`;
      await sendTelegramNotification(missingMsg, { parseMode: 'HTML' }, chatId);
      return;
    }

    // Kích hoạt tác vụ code trong background
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
