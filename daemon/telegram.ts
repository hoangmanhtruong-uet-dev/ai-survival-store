import { DAEMON_CONFIG } from './config';

export interface TelegramSendOptions {
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disableWebPagePreview?: boolean;
}

/**
 * Gửi tin nhắn tự động từ Mèo Dev về Telegram cá nhân của chủ nhân
 */
export async function sendTelegramNotification(
  message: string,
  options: TelegramSendOptions = { parseMode: 'HTML', disableWebPagePreview: false }
): Promise<boolean> {
  const { telegramBotToken, telegramChatId } = DAEMON_CONFIG;

  if (!telegramBotToken || !telegramChatId) {
    console.log('\n[📢 TELEGRAM PREVIEW (Chưa cấu hình Token/ChatID)]:');
    console.log('--------------------------------------------------');
    console.log(message);
    console.log('--------------------------------------------------');
    console.log('💡 Gợi ý: Điền TELEGRAM_BOT_TOKEN và TELEGRAM_CHAT_ID trong .env.local để nhận thông báo tự động về điện thoại!\n');
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;

    // Chia nhỏ tin nhắn nếu dài hơn 4000 ký tự (giới hạn của Telegram là 4096)
    const chunks: string[] = [];
    let remaining = message;
    while (remaining.length > 0) {
      if (remaining.length <= 4000) {
        chunks.push(remaining);
        break;
      }
      let splitIndex = remaining.lastIndexOf('\n', 4000);
      if (splitIndex === -1) splitIndex = 4000;
      chunks.push(remaining.slice(0, splitIndex));
      remaining = remaining.slice(splitIndex).trim();
    }

    for (const chunk of chunks) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: chunk,
          parse_mode: options.parseMode || 'HTML',
          disable_web_page_preview: options.disableWebPagePreview,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        // Fallback gửi dạng plain text nếu dính lỗi format HTML
        if (options.parseMode) {
          await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramChatId,
              text: chunk.replace(/<[^>]*>/g, ''),
            }),
          });
        }
        console.error('❌ Telegram API error:', data.description);
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Lỗi kết nối Telegram API:', (error as Error).message);
    return false;
  }
}

