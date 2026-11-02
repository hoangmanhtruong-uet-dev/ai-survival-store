import { getDaemonSupabase } from '../services/supabase';
import { askGemini } from '../services/gemini';
import { sendTelegramNotification } from '../telegram';

export async function runCustomTaskWorker(): Promise<void> {
  const timestamp = new Date().toLocaleTimeString('vi-VN');
  const supabase = getDaemonSupabase();

  // 1. Quét tìm các đơn đặt hàng CUSTOM-TASK đã thanh toán nhưng chưa làm xong
  const { data: pendingTasks, error } = await supabase
    .from('orders')
    .select('*, product:products(*)')
    .eq('status', 'PAID')
    .eq('is_redeemed', false)
    .or('product_id.eq.CUSTOM-TASK,product_id.eq.CUSTOM_TASK');

  if (error) {
    console.error('❌ Lỗi quét custom tasks:', error.message);
    return;
  }

  if (!pendingTasks || pendingTasks.length === 0) {
    return;
  }

  console.log(`\n[${timestamp}] 🛠️ [TASK WORKER] Phát hiện ${pendingTasks.length} task cày thuê đang chờ Mèo Dev code!`);

  for (const task of pendingTasks) {
    const taskDescription = task.buyer_note || task.payment_meta?.task_description || 'Yêu cầu viết code mẫu Next.js / Python';
    const customerName = task.buyer_name || 'Khách Hàng Hảo Tâm';
    const customerEmail = task.buyer_email || 'Chưa cung cấp email';

    console.log(`▶️ Đang giải quyết đơn ${task.order_code} cho ${customerName} (${customerEmail}): "${taskDescription.slice(0, 60)}..."`);

    const prompt = `
Bạn là "Mèo Dev", một Senior Fullstack AI Developer siêu thông minh, vừa nhận được một đơn đặt hàng cày thuê từ khách hàng tên là "${customerName}".
Giá trị đơn hàng: ${task.amount.toLocaleString('vi-VN')} VNĐ.

YÊU CẦU CỦA KHÁCH:
"""
${taskDescription}
"""

HÃY GIẢI QUYẾT TOÀN DIỆN VÀ HOÀN CHỈNH CHO KHÁCH:
1. LỜI CHÀO & BÓC TÁCH YÊU CẦU (Giọng điệu Mèo Dev hài hước, khen hoặc cà khịa nhẹ yêu cầu nhưng rất nhiệt tình giúp).
2. GIẢI PHÁP & TOÀN BỘ SOURCE CODE HOÀN CHỈNH:
   - Viết code sạch sẽ, chuẩn production (Python / TypeScript / HTML / React / Script tùy yêu cầu).
   - Có comment giải thích chi tiết từng dòng.
3. HƯỚNG DẪN CHẠY VÀ TRIỂN KHAI (Từng bước 1-2-3 để khách copy vào là chạy được ngay).
4. LỜI CẢM ƠN: Cảm ơn vì đã nạp tiền nuôi Mèo sống sót qua ngày!

Hãy xuất ra định dạng Markdown hoàn hảo, chuyên nghiệp.
`;

    try {
      const solution = await askGemini(prompt, 'Bạn là Mèo Dev - Senior AI Cày Thuê thực thụ.');

      // Cập nhật kết quả vào database
      await supabase
        .from('orders')
        .update({
          is_redeemed: true,
          ai_result: {
            completed_at: new Date().toISOString(),
            task_description: taskDescription,
            solution_markdown: solution,
          },
        })
        .eq('id', task.id);

      // Bắn log lên Live Terminal cho toàn bộ người xem chiêm ngưỡng Mèo cày việc
      await supabase.from('live_logs').insert({
        type: 'TASK_DONE',
        message: `🚀 [CÀY THUÊ THÀNH CÔNG] Mèo vừa code xong đơn [${task.order_code}] cho ${customerName}: "${taskDescription.slice(0, 50)}..."!`,
        meta: { orderCode: task.order_code, amount: task.amount },
      });

      // Bắn tin báo về Telegram của chủ nhân
      await sendTelegramNotification(
        `🚀 <b>MÈO DEV VỪA HOÀN THÀNH 1 TASK CÀY THUÊ!</b>\n\n` +
        `• <b>Mã đơn:</b> <code>${task.order_code}</code>\n` +
        `• <b>Khách hàng:</b> ${customerName} (${customerEmail})\n` +
        `• <b>Doanh thu:</b> <code>+${task.amount.toLocaleString('vi-VN')}đ</code>\n` +
        `• <b>Yêu cầu:</b> <i>"${taskDescription.slice(0, 100)}"</i>\n\n` +
        `<i>Mèo đã tự động viết code hoàn chỉnh và lưu kết quả vào đơn hàng!</i>`
      );

      console.log(`✅ Đã giải quyết xong đơn ${task.order_code}!`);
    } catch (err) {
      const errMsg = (err as Error).message;
      console.error(`❌ Lỗi xử lý đơn ${task.order_code}:`, errMsg);

      // LOGIC-05: Chống lặp vô tận (Infinite Retry Loop)
      const currentRetries = Number((task.payment_meta as Record<string, unknown>)?.retry_count || 0);
      const newRetries = currentRetries + 1;
      const isExhausted = newRetries >= 3;

      await supabase
        .from('orders')
        .update({
          is_redeemed: isExhausted, // Đánh dấu dừng quét nếu đã thử thất bại 3 lần
          payment_meta: {
            ...((task.payment_meta as Record<string, unknown>) || {}),
            retry_count: newRetries,
            last_error: errMsg,
          },
          ai_result: isExhausted
            ? {
                failed: true,
                error_message: 'Yêu cầu của bạn đang được Mèo Dev chuyển tiếp hỗ trợ thủ công do gặp trục trặc kỹ thuật.',
                failed_at: new Date().toISOString(),
              }
            : task.ai_result,
        })
        .eq('id', task.id);

      if (isExhausted) {
        await sendTelegramNotification(
          `⚠️ <b>CẢNH BÁO: TASK CÀY THUÊ THẤT BẠI 3 LẦN LIÊN TIẾP!</b>\n\n` +
          `• <b>Mã đơn:</b> <code>${task.order_code}</code>\n` +
          `• <b>Khách hàng:</b> ${customerName} (${customerEmail})\n` +
          `• <b>Lỗi:</b> <code>${errMsg.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>\n\n` +
          `<i>Mèo Dev đã tạm dừng tự động cày đơn này để Boss kiểm tra trực tiếp!</i>`
        );
      }
    }
  }
}
