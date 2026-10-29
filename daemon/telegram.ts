import { DAEMON_CONFIG } from './config';

export interface TelegramInlineButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface TelegramSendOptions {
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disableWebPagePreview?: boolean;
  replyMarkup?: {
    inline_keyboard: TelegramInlineButton[][];
  };
}

export interface TelegramCallbackQuery {
  id: string;
  from: {
    id: number;
    first_name?: string;
    username?: string;
  };
  message?: {
    message_id: number;
    chat: { id: number };
    text?: string;
  };
  data?: string;
}

export interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: string;
  first_name?: string;
  username?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
}

/**
 * Gửi tin nhắn từ Mèo Dev về Telegram (chỉ định chat_id hoặc mặc định tới Boss)
 */
export async function sendTelegramNotification(
  message: string,
  options: TelegramSendOptions = { parseMode: 'HTML', disableWebPagePreview: false },
  targetChatId?: string | number
): Promise<boolean> {
  const { telegramBotToken, telegramChatId } = DAEMON_CONFIG;
  const recipientChatId = targetChatId || telegramChatId;

  if (!telegramBotToken || !recipientChatId) {
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

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const isLastChunk = i === chunks.length - 1;

      const payload: Record<string, unknown> = {
        chat_id: recipientChatId,
        text: chunk,
        parse_mode: options.parseMode || 'HTML',
        disable_web_page_preview: options.disableWebPagePreview,
      };

      if (isLastChunk && options.replyMarkup) {
        payload.reply_markup = options.replyMarkup;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.ok) {
        // Fallback gửi dạng plain text nếu dính lỗi format HTML (như thẻ chưa đóng)
        if (options.parseMode) {
          const fallbackPayload: Record<string, unknown> = {
            chat_id: recipientChatId,
            text: chunk.replace(/<[^>]*>/g, ''),
          };
          if (isLastChunk && options.replyMarkup) {
            fallbackPayload.reply_markup = options.replyMarkup;
          }
          const fbRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fallbackPayload),
          });
          const fbData = await fbRes.json();
          if (!fbData.ok) {
            console.error('❌ Telegram API error (sau fallback):', fbData.description);
          }
        } else {
          console.error('❌ Telegram API error:', data.description);
        }
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Lỗi kết nối Telegram API:', (error as Error).message);
    return false;
  }
}

/**
 * Hiển thị trạng thái đang soạn tin (typing) cho Mèo Dev trên Telegram
 */
export async function sendTelegramChatAction(
  chatId: string | number,
  action: 'typing' | 'upload_document' = 'typing'
): Promise<boolean> {
  const { telegramBotToken } = DAEMON_CONFIG;
  if (!telegramBotToken || !chatId) return false;

  try {
    const url = `https://api.telegram.org/bot${telegramBotToken}/sendChatAction`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action }),
    });
    const data = await res.json();
    return Boolean(data.ok);
  } catch {
    return false;
  }
}

/**
 * Phản hồi Callback Query để Telegram tắt biểu tượng đồng hồ đang chờ trên nút bấm
 */
export async function answerTelegramCallback(callbackQueryId: string, text?: string): Promise<boolean> {
  const { telegramBotToken } = DAEMON_CONFIG;
  if (!telegramBotToken) return false;

  try {
    const res = await fetch(`https://api.telegram.org/bot${telegramBotToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || 'Mèo Dev đã nhận lệnh!',
        show_alert: false,
      }),
    });
    const data = await res.json();
    return Boolean(data.ok);
  } catch (err) {
    console.error('❌ Lỗi answerCallbackQuery:', (err as Error).message);
    return false;
  }
}

/**
 * Lắng nghe cả nút bấm (callback_query) và tin nhắn văn bản (message) từ Telegram Long Polling
 */
export async function fetchTelegramUpdates(
  offset: number
): Promise<{ nextOffset: number; callbacks: TelegramCallbackQuery[]; messages: TelegramMessage[] }> {
  const { telegramBotToken } = DAEMON_CONFIG;
  if (!telegramBotToken) return { nextOffset: offset, callbacks: [], messages: [] };

  try {
    const url = offset > 0
      ? `https://api.telegram.org/bot${telegramBotToken}/getUpdates?offset=${offset}&timeout=5`
      : `https://api.telegram.org/bot${telegramBotToken}/getUpdates?timeout=5`;

    const res = await fetch(url);
    const data = await res.json();
    if (!data.ok || !Array.isArray(data.result)) {
      return { nextOffset: offset, callbacks: [], messages: [] };
    }

    let maxUpdateId = offset;
    const callbacks: TelegramCallbackQuery[] = [];
    const messages: TelegramMessage[] = [];

    for (const update of data.result) {
      if (update.update_id >= maxUpdateId) {
        maxUpdateId = update.update_id + 1;
      }
      if (update.callback_query) {
        callbacks.push(update.callback_query);
      }
      if (update.message && update.message.text) {
        messages.push(update.message);
      }
    }

    return { nextOffset: maxUpdateId, callbacks, messages };
  } catch {
    return { nextOffset: offset, callbacks: [], messages: [] };
  }
}
