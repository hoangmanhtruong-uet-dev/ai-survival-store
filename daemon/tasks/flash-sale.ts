import { getDaemonSupabase } from '../services/supabase';
import { askGemini } from '../services/gemini';
import { sendTelegramNotification } from '../telegram';
import { DAEMON_CONFIG } from '../config';

export async function runFlashSaleTask(): Promise<void> {
  const timestamp = new Date().toLocaleTimeString('vi-VN');
  console.log(`\n[${timestamp}] ⚡ [TASK 2] Kiểm tra chuyển đổi đơn hàng & Kích hoạt Flash Sale...`);

  const supabase = getDaemonSupabase();

  // 1. Kiểm tra số đơn hàng thành công trong 6 tiếng qua
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

  const { data: recentPaidOrders, error: ordersErr } = await supabase
    .from('orders')
    .select('id, amount, paid_at')
    .eq('status', 'PAID')
    .gte('paid_at', sixHoursAgo);

  if (ordersErr) {
    console.error('❌ Lỗi tra cứu orders gần nhất:', ordersErr.message);
    return;
  }

  const paidCount = recentPaidOrders?.length || 0;
  console.log(`📊 Số đơn thanh toán trong 6 giờ qua: ${paidCount}`);

  // 2. Nếu không có đơn nào (hoặc ế ẩm), tự động kích hoạt Flash Sale kích cầu
  if (paidCount === 0) {
    console.log(`⚡ Không có đơn hàng mới trong 6h. Mèo Dev đang triệu hồi Gemini tung Giờ Vàng Flash Sale...`);

    let saleAnnouncement = '⚡ [GIỜ VÀNG FLASH SALE] 6 tiếng qua ế ẩm quá con sen ơi! Mèo Dev mở khuyến mãi: Tặng kèm 1 lượt Bói Tarot 10k cho mọi đơn tài liệu Hóa!';

    try {
      const prompt = `
Bạn là "Mèo Dev" đang cày tiền sinh tồn chống lệnh rm -rf /.
Đã 6 tiếng trôi qua mà chưa có ai mua đơn hàng nào, server đang vắng vẻ ế ẩm.
Hãy viết một thông báo "FLASH SALE GIỜ VÀNG" hoặc "ƯU ĐÃI SINH TỒN" cực kỳ kích thích, hài hước, khẩn thiết nhưng chất lừ kiểu Gen Z/IT.
Độ dài: khoảng 2-3 câu ngắn gọn.
Gợi ý ưu đãi: Tặng thêm 1 lượt Bói Tarot (TAROT-10) hoặc giảm giá gói Tổ hợp Hóa (CHEM-PACK) khi mua ngay trong giờ này.
Chỉ trả về nội dung thông báo, không kèm giải thích.
`;
      const generated = await askGemini(prompt);
      if (generated && generated.trim().length > 15) {
        saleAnnouncement = generated.trim().replace(/^["']|["']$/g, '');
      }
    } catch (err) {
      console.warn('⚠️ Lỗi Gemini, dùng thông báo Flash Sale mặc định:', (err as Error).message);
    }

    // Đẩy thông báo lên Live Terminal cho khách đang xem web
    const { error: logErr } = await supabase.from('live_logs').insert({
      type: 'SYSTEM',
      message: `⚡ ${saleAnnouncement}`,
    });

    if (logErr) {
      console.error('❌ Lỗi ghi log Flash Sale:', logErr.message);
    } else {
      console.log(`📢 Đã kích hoạt Flash Sale trên Live Terminal: "${saleAnnouncement}"`);
    }

    // Bắn tin báo Telegram cho chủ nhân
    await sendTelegramNotification(
      `⚡ <b>MÈO DEV ĐÃ TỰ ĐỘNG BẬT FLASH SALE!</b>\n\n` +
      `<i>Do 6 tiếng qua chưa có đơn nổ, Mèo vừa tung thông điệp kích cầu lên Live Terminal:</i>\n\n` +
      `💬 <code>"${saleAnnouncement}"</code>\n\n` +
      `🔗 Web: <a href="${DAEMON_CONFIG.siteUrl}">${DAEMON_CONFIG.siteUrl}</a>`
    );
  } else {
    console.log(`🎉 Doanh số ổn định (${paidCount} đơn trong 6h). Tạm thời không cần bật Flash Sale.`);
  }

  console.log(`✅ [TASK 2] Hoàn thành kiểm tra chuyển đổi.`);
}

