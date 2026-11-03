import fs from 'fs';
import path from 'path';
import { sendTelegramNotification, answerTelegramCallback } from '../telegram';
import { getDaemonSupabase } from '../services/supabase';

export interface UpdateReminderState {
  lastUpdatedAt: string;
  nextReminderAt: string;
  reminderDays: number;
  lastNotifiedAt?: string;
  notes?: string;
}

const REMINDER_FILE_PATH = path.resolve(process.cwd(), 'daemon', '.tmp', 'update-reminder.json');

/**
 * Đọc trạng thái lịch nhắc nhở bảo trì / update
 */
export function getReminderState(): UpdateReminderState {
  try {
    if (fs.existsSync(REMINDER_FILE_PATH)) {
      const raw = fs.readFileSync(REMINDER_FILE_PATH, 'utf-8');
      const data = JSON.parse(raw);
      if (data && data.nextReminderAt) {
        return data as UpdateReminderState;
      }
    }
  } catch (err) {
    console.warn('[UPDATE REMINDER] Không đọc được file cache, khởi tạo mặc định:', (err as Error).message);
  }

  // Mặc định: 7 ngày kể từ hiện tại
  const now = new Date();
  const next = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const defaultState: UpdateReminderState = {
    lastUpdatedAt: now.toISOString(),
    nextReminderAt: next.toISOString(),
    reminderDays: 7,
    notes: 'Lịch bảo trì và cập nhật Mèo Dev định kỳ 7 ngày',
  };

  saveReminderState(defaultState);
  return defaultState;
}

/**
 * Lưu trạng thái lịch nhắc nhở
 */
export function saveReminderState(state: UpdateReminderState): void {
  try {
    const dir = path.dirname(REMINDER_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(REMINDER_FILE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('❌ [UPDATE REMINDER] Lỗi lưu file state:', (err as Error).message);
  }
}

/**
 * Đặt lịch nhắc nhở cập nhật sau N ngày (hoặc cập nhật mốc thời gian vừa deploy)
 */
export function scheduleUpdateReminder(days = 7, notes = 'Định kỳ 7 ngày bảo trì'): UpdateReminderState {
  const now = new Date();
  const next = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const newState: UpdateReminderState = {
    lastUpdatedAt: now.toISOString(),
    nextReminderAt: next.toISOString(),
    reminderDays: days,
    notes,
  };

  saveReminderState(newState);
  return newState;
}

/**
 * Định dạng thời gian theo múi giờ Việt Nam (UTC+7)
 */
function formatVietnameseDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

/**
 * Tác vụ kiểm tra định kỳ (gọi qua cron hàng ngày hoặc khi daemon kiểm tra)
 */
export async function runUpdateReminderCheck(): Promise<boolean> {
  const state = getReminderState();
  const now = Date.now();
  const targetTime = new Date(state.nextReminderAt).getTime();

  // Kiểm tra xem đã đến hạn nhắc nhở chưa
  if (now < targetTime) {
    return false;
  }

  // Kiểm tra tránh spam (không gửi lại nếu vừa gửi trong vòng 20 tiếng)
  if (state.lastNotifiedAt) {
    const lastNotified = new Date(state.lastNotifiedAt).getTime();
    if (now - lastNotified < 20 * 60 * 60 * 1000) {
      return false;
    }
  }

  console.log('⏰ [UPDATE REMINDER] Đã đến hạn 7 ngày! Đang gửi thông báo nhắc bảo trì tới Boss...');

  const formattedDueDate = formatVietnameseDate(state.nextReminderAt);
  const formattedLastUpdate = formatVietnameseDate(state.lastUpdatedAt);

  const reminderMsg =
    `🔔 <b>[NHẮC NHỞ BẢO TRÌ & UPDATE 7 NGÀY - MÈO DEV]</b>\n\n` +
    `Boss ơi! Đã <b>${state.reminderDays} ngày</b> trôi qua kể từ lần cập nhật gần nhất (<code>${formattedLastUpdate}</code>).\n\n` +
    `📋 <b>DANH SÁCH HẠNG MỤC CẦN KIỂM TRA:</b>\n` +
    `1. <b>Sức khỏe VPS & PM2:</b> Kiểm tra xem bot có đang chạy mượt không (gõ lệnh <code>pm2 status</code> & <code>pm2 logs</code>).\n` +
    `2. <b>Cập nhật Code & Mô hình:</b> Kiểm tra repo GitHub xem có commit mới cần kéo về không.\n` +
    `3. <b>Doanh thu & Đơn hàng:</b> Gõ lệnh <code>/stats</code> để kiểm tra doanh số và độ no bụng.\n` +
    `4. <b>Dọn dẹp rác:</b> Xóa file tạm, giải phóng RAM bộ nhớ trên VPS nếu cần.\n\n` +
    `🚀 <i>Boss có thể bấm nút bên dưới để Mèo Dev tự động kiểm tra Git & Deploy bản mới nhất ngay, hoặc gia hạn thêm 7 ngày:</i>`;

  const success = await sendTelegramNotification(reminderMsg, {
    parseMode: 'HTML',
    replyMarkup: {
      inline_keyboard: [
        [{ text: '🚀 Tự Động Update & Deploy Bản Mới', callback_data: 'deploy_latest' }],
        [{ text: '⏰ Nhắc Lại Sau 7 Ngày Nữa', callback_data: 'snooze_reminder_7d' }],
        [{ text: '📊 Xem Báo Cáo /stats', callback_data: 'quick_stats' }],
      ],
    },
  });

  if (success) {
    state.lastNotifiedAt = new Date().toISOString();
    saveReminderState(state);

    // Ghi log lên Live Terminal
    const supabase = getDaemonSupabase();
    try {
      await supabase.from('live_logs').insert({
        type: 'SYSTEM',
        message: `🔔 [MAINTENANCE] Đã gửi thông báo nhắc nhở Boss bảo trì & update hệ thống định kỳ ${state.reminderDays} ngày!`,
        meta: { reminderDays: state.reminderDays, dueDate: formattedDueDate },
      });
    } catch {
      // Ignore
    }
  }

  return success;
}

/**
 * Xử lý khi Boss bấm nút "Nhắc lại sau 7 ngày nữa" (Callback Query)
 */
export async function handleSnoozeReminderCallback(
  callbackId: string,
  chatId?: string | number,
  days = 7
): Promise<void> {
  const newState = scheduleUpdateReminder(days, `Gia hạn nhắc nhở thêm ${days} ngày bởi Boss`);
  const formattedNext = formatVietnameseDate(newState.nextReminderAt);

  await answerTelegramCallback(callbackId, `Đã gia hạn nhắc nhở sau ${days} ngày!`);

  await sendTelegramNotification(
    `✅ <b>ĐÃ GIA HẠN THÀNH CÔNG!</b>\n\n` +
    `Em đã hẹn giờ nhắc lại Boss vào ngày: <code>${formattedNext}</code> (sau ${days} ngày nữa).\n` +
    `Mèo Dev tiếp tục cày cuốc 24/7! 🐱`,
    { parseMode: 'HTML' },
    chatId
  );
}
