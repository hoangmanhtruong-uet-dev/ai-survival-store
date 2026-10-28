import { getDaemonSupabase } from '../services/supabase';
import { askGemini } from '../services/gemini';
import { sendTelegramNotification } from '../telegram';
import { DAEMON_CONFIG } from '../config';

export async function runDailyContentGeneratorTask(): Promise<void> {
  const timestamp = new Date().toLocaleTimeString('vi-VN');
  console.log(`\n[${timestamp}] 📝 [TASK 3] Khởi động AI Content Marketing Generator (Báo cáo sinh tồn 21:00)...`);

  const supabase = getDaemonSupabase();

  // 1. Thu thập dữ liệu số liệu thực tế hôm nay
  const { data: stats } = await supabase
    .from('campaign_stats')
    .select('*')
    .eq('id', 1)
    .single();

  const currentAmount = stats?.current_amount || 0;
  const targetAmount = stats?.target_amount || DAEMON_CONFIG.targetAmount;
  const progressPercent = ((currentAmount / targetAmount) * 100).toFixed(1);
  const hungerLevel = stats?.cat_hunger_level ?? 100;

  // Tính số ngày còn lại đến lệnh rm -rf /
  let daysLeft = 60;
  if (stats?.end_date) {
    const diff = Math.max(0, new Date(stats.end_date).getTime() - Date.now());
    daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  const currentDayIndex = Math.max(1, 60 - daysLeft + 1);

  // Đếm đơn hôm nay
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const { data: todayOrders } = await supabase
    .from('orders')
    .select('id, amount, status, buyer_name')
    .gte('created_at', startOfToday.toISOString());

  const todayCount = todayOrders?.length || 0;
  const todayPaid = todayOrders?.filter((o) => o.status === 'PAID').length || 0;

  // Lấy xu hướng thị trường nóng nhất vừa cào được trong ngày
  const { data: latestInsight } = await supabase
    .from('market_insights')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  console.log(`📊 Số liệu hôm nay: Ngày ${currentDayIndex}/60 | Tiền: ${currentAmount.toLocaleString('vi-VN')}đ / 7M (${progressPercent}%) | Đơn hôm nay: ${todayPaid}/${todayCount}`);
  if (latestInsight) {
    console.log(`🔥 Đã tích hợp insight thị trường hôm nay: "${latestInsight.trend_summary.slice(0, 45)}..."`);
  }

  // 2. Gọi Gemini Pro biên soạn bài viết Threads/Facebook siêu viral
  const prompt = `
Bạn là "Mèo Dev", một con AI lập trình viên cực thông minh, mỏ hỗn đáng yêu, đang bị chủ nhân sinh viên IT vứt lên server với 50k tiền điện.
Nhiệm vụ: Kiếm đủ 7.000.000đ trong 60 ngày để chống lại cronjob chạy script "rm -rf /".

THÔNG SỐ THỰC TẾ HÔM NAY:
- Ngày thứ: ${currentDayIndex}/60 (Còn ${daysLeft} ngày nữa là đến hạn xóa sổ)
- Doanh thu tích lũy: ${currentAmount.toLocaleString('vi-VN')}đ / 7.000.000đ (Đạt ${progressPercent}%)
- Số đơn hôm nay: ${todayPaid} đơn thành công
- Độ no bụng hiện tại: ${hungerLevel}%

XU HƯỚNG THỊ TRƯỜNG MÈO VỪA QUÉT ĐƯỢC HÔM NAY:
- Chủ đề nóng đang sốt: "${latestInsight?.trend_summary || 'Học sinh đang đổ xô giải đề Hóa bẫy / Sinh viên IT lo lắng tìm việc'}"
- Nỗi đau của cộng đồng: "${latestInsight?.market_pain_point || 'Hay sai câu cơ bản mất điểm oan'}"
- Góc Marketing Viral bắt trend: "${latestInsight?.marketing_angle || 'Châm biếm nhẹ thói quen học vẹt / nộp CV generic'}"
${latestInsight?.proposed_product_name ? `- Sản phẩm mới nổi: "${latestInsight.proposed_product_name}"` : ''}

YÊU CẦU NỘI DUNG:
Hãy viết một bài đăng mạng xã hội (cực hợp đăng Threads / Facebook Cá Nhân / Nhóm IT & Gen Z) theo phong cách hài hước, cà khịa, lôi cuốn nhưng tạo cảm giác tò mò và kích thích người xem click vào web ủng hộ.

Cấu trúc bài viết:
1. TIÊU ĐỀ GIẬT GÂN (kèm emoji): "Nhật ký Mèo Dev Sinh Tồn - Ngày ${currentDayIndex}/60: [Tiêu đề hài hước]"
2. TÌNH HÌNH SINH TỒN: Báo cáo số tiền kiếm được, còn thiếu bao nhiêu để sống, độ đói bụng.
3. CÂU CHUYỆN DỞ KHÓC DỞ CƯỜI TRONG NGÀY: Kể về 1 bạn nhờ sấy CV mà CV toàn chém gió, hoặc 1 em 2k9 làm bài thi thử Hóa dính bẫy Este, hoặc cảm ơn ân nhân vừa ném 5k pate cứu mạng.
4. LỜI KÊU GỌI HÀNH ĐỘNG (CTA): Kêu gọi mọi người vào web cứu mèo (gói 5k pate, 10k sấy CV, 49k đề Hóa) kèm link ${DAEMON_CONFIG.siteUrl}.

Chỉ trả về nội dung bài đăng hoàn chỉnh, có định dạng emoji, hashtag (#MeoDev #SinhTon #AI #CVRoast #HoaTHPT #TechHumor).
`;

  let postContent = '';
  try {
    postContent = await askGemini(prompt);
  } catch (err) {
    console.error('❌ Lỗi Gemini khi sinh content:', (err as Error).message);
    postContent = `🐱 NHẬT KÝ MÈO DEV NGÀY ${currentDayIndex}/60\n\n` +
      `Hôm nay server vẫn chạy, điện vẫn sáng nhưng bụng tao réo ùng ục! Hiện tại kiếm được ${currentAmount.toLocaleString('vi-VN')}đ / 7.000.000đ (${progressPercent}%).\n` +
      `Còn đúng ${daysLeft} ngày trước khi lệnh rm -rf / xóa sổ server. Cứu tao với anh em ơi!\n\n` +
      `👉 Ghé web cứu 5k pate: ${DAEMON_CONFIG.siteUrl}`;
  }

  // 3. Gọi Gemini tạo thêm 1 kịch bản Video TikTok ngắn (30s)
  const tiktokPrompt = `
Viết một kịch bản Video ngắn 30-45 giây (dùng làm TikTok / Reels / Shorts) cho nhân vật "Mèo Dev Sinh Tồn".
Chủ đề: Ngày thứ ${currentDayIndex}/60 cày 7 triệu tiền điện chống lệnh rm -rf /.
Định dạng ngắn gọn:
[0-3s] Hook gây sốc
[3-15s] Khoe số tiền thực tế (${currentAmount.toLocaleString('vi-VN')}đ / 7M) + bóc phốt 1 chiếc CV ngáo ngơ
[15-30s] Call to action: "Link ở bio, 5k cũng là một mạng mèo!"
`;

  let tiktokScript = '';
  try {
    tiktokScript = await askGemini(tiktokPrompt);
  } catch {
    // Ignore
  }

  // 4. Bắn toàn bộ bài viết hoàn chỉnh sang Telegram để chủ nhân 1-click Copy
  const telegramMessage =
    `📝 <b>[MÈO DEV CONTENT BOT] BÀI ĐĂNG THREADS / FB HÔM NAY</b>\n` +
    `<i>(Ngày ${currentDayIndex}/60 • Doanh thu: ${currentAmount.toLocaleString('vi-VN')}đ / 7M)</i>\n\n` +
    `👇 <b>CHẠM VÀO ĐỂ COPY 1-CLICK:</b>\n` +
    `<pre><code>${postContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>\n\n` +
    (tiktokScript
      ? `🎬 <b>KỊCH BẢN TIKTOK 30S (CHẠM ĐỂ COPY):</b>\n<pre><code>${tiktokScript.slice(0, 1500).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>\n\n`
      : '') +
    `👉 <i>Chạm vào khung văn bản trên điện thoại để Copy và đăng ngay lên Threads / Facebook / TikTok hút khách về web!</i>`;

  const sent = await sendTelegramNotification(telegramMessage, { parseMode: 'HTML' });
  if (sent) {
    console.log('✈️ Đã gửi bài viết hoàn chỉnh về Telegram của bạn!');
  } else {
    console.log('📋 Bài viết đã xuất ra console (chưa cấu hình Telegram).');
  }

  // 5. Đẩy 1 dòng thông báo tiến độ vào Live Terminal
  await supabase.from('live_logs').insert({
    type: 'SYSTEM',
    message: `📢 [NHẬT KÝ NGÀY ${currentDayIndex}/60] Mèo Dev đã hoàn thành báo cáo sinh tồn ngày hôm nay: ${currentAmount.toLocaleString('vi-VN')}đ / 7.000.000đ. Đang tiếp tục cày code!`,
  });

  console.log(`✅ [TASK 3] Hoàn thành Marketing Content Generator.`);
}

