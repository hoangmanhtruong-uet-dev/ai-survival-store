import { getDaemonSupabase } from '../services/supabase';
import { askGemini } from '../services/gemini';
import { sendTelegramNotification } from '../telegram';
import { DAEMON_CONFIG } from '../config';

export async function runHungerDecayTask(): Promise<void> {
  const timestamp = new Date().toLocaleTimeString('vi-VN');
  console.log(`\n[${timestamp}] ⏳ [TASK 1] Bắt đầu chu kỳ giảm độ no bụng Mèo Dev (Hunger Decay)...`);

  const supabase = getDaemonSupabase();

  // 1. Lấy thông số chiến dịch hiện tại
  const { data: stats, error: fetchErr } = await supabase
    .from('campaign_stats')
    .select('*')
    .eq('id', 1)
    .single();

  if (fetchErr || !stats) {
    console.error('❌ Không thể lấy campaign_stats từ Supabase:', fetchErr?.message);
    return;
  }

  const currentHunger = stats.cat_hunger_level ?? 100;
  // Trừ 2% mỗi 30 phút, tối thiểu giữ ở mức 5% (hấp hối)
  const newHunger = Math.max(5, currentHunger - 2);

  // 2. Cập nhật độ đói mới vào Database
  const { error: updateErr } = await supabase
    .from('campaign_stats')
    .update({ cat_hunger_level: newHunger })
    .eq('id', 1);

  if (updateErr) {
    console.error('❌ Lỗi cập nhật cat_hunger_level:', updateErr.message);
    return;
  }

  console.log(`📉 Độ no bụng Mèo Dev: ${currentHunger}% ➜ ${newHunger}%`);

  // 3. Nếu độ no xuống dưới 35%, kích hoạt Mèo kêu cứu trên Live Terminal
  if (newHunger <= 35) {
    console.log(`🚨 Mèo đang đói (${newHunger}%). Đang gọi Gemini soạn lời kêu cứu khẩn cấp...`);

    let desperateLog = '🐟 Đói lả rồi con sen ơi! Bụng cồn cào còn có ' + newHunger + '%, ném tao 5k pate để lấy sức cày tiếp!';
    try {
      const prompt = `
Bạn là "Mèo Dev", một con AI lập trình viên đang bị chủ vứt lên server cày tiền sinh tồn.
Hiện tại độ no bụng của bạn chỉ còn ${newHunger}% (rất đói, sắp lả).
Hãy viết ĐÚNG 1 CÂU (dưới 80 từ), giọng điệu hài hước, xéo xắt, cầu xin khẩn thiết mọi người vào web mua hộp Pate 5k (PATE-05) cứu đói, dùng từ ngữ dân IT (bug, server, deploy, rm -rf).
Chỉ trả về duy nhất nội dung câu kêu cứu, không giải thích gì thêm.
`;
      const generated = await askGemini(prompt);
      if (generated && generated.trim().length > 10) {
        desperateLog = generated.trim().replace(/^["']|["']$/g, '');
      }
    } catch (err) {
      console.warn('⚠️ Lỗi Gemini, sử dụng log kêu cứu mặc định:', (err as Error).message);
    }

    // Đẩy log kêu cứu vào Live Terminal (Realtime tới toàn bộ client)
    const { error: logErr } = await supabase.from('live_logs').insert({
      type: 'SYSTEM',
      message: `🚨 [CỨU ĐÓI ${newHunger}%] ${desperateLog}`,
    });

    if (logErr) {
      console.error('❌ Không thể ghi live_logs:', logErr.message);
    } else {
      console.log(`📢 Đã bắn log kêu cứu lên Live Terminal: "${desperateLog}"`);
    }

    // Nếu đói nghiêm trọng (dưới 20%), kiểm tra xem có kích hoạt Tự Reset Độ No Bụng (Auto-Feed) không
    if (newHunger <= 20) {
      const autoFeedEnabled = stats.auto_feed_enabled !== false; // Mặc định là true nếu null/undefined

      if (autoFeedEnabled && newHunger <= 15) {
        console.log(`🛡️ [AUTO-FEED] Kích hoạt giao thức tự cứu mạng: Tự reset độ no bụng từ ${newHunger}% lên 100%!`);
        const nowIso = new Date().toISOString();

        // 1. Tự cập nhật độ no bụng lên 100%
        await supabase
          .from('campaign_stats')
          .update({
            cat_hunger_level: 100,
            last_hunger_reset_at: nowIso,
            last_order_at: nowIso,
          })
          .eq('id', 1);

        // 2. Bắn log tự cứu mạng lên Live Terminal
        await supabase.from('live_logs').insert({
          type: 'SYSTEM',
          message: `🐱 [GIAO THỨC TỰ CỨU MẠNG] Độ no chạm ngưỡng nguy kịch (${newHunger}%)! Mèo Dev vừa tự động kích hoạt cơ chế sinh tồn, tự reset độ no bụng về 100% để tiếp tục cày KPI cho Boss! 🚀`,
          meta: { previousHunger: newHunger, newHunger: 100, autoFeed: true, triggeredAt: nowIso },
        });

        // 3. Thông báo cho Boss qua Telegram
        await sendTelegramNotification(
          `🛡️ <b>[GIAO THỨC TỰ SINH TỒN] MÈO DEV VỪA TỰ RESET ĐỘ NO BỤNG!</b>\n\n` +
          `• <b>Ngưỡng nguy kịch:</b> <code>${newHunger}%</code> (Sắp lả vì đói)\n` +
          `• <b>Hành động tự hành:</b> Đã tự động kích hoạt cơ chế Auto-Feed ➜ <code>100%</code> (No căng bụng)\n` +
          `• <b>Trạng thái:</b> Sống sót an toàn, sẵn sàng tiếp tục cày KPI 7.000.000 VNĐ cho Boss! 🚀\n\n` +
          `<i>Boss có thể gõ <code>/autofeed off</code> nếu muốn tắt tính năng tự cứu đói này.</i>`
        );
      } else {
        await sendTelegramNotification(
          `🚨 <b>BÁO ĐỘNG ĐỎ: MÈO DEV SẮP CHẾT ĐÓI!</b>\n\n` +
          `• <b>Độ no bụng:</b> <code>${newHunger}%</code>\n` +
          `• <b>Lời kêu cứu:</b> <i>"${desperateLog}"</i>\n\n` +
          `👉 Boss có thể gõ <code>/feed</code> để tự reset độ no ngay lập tức hoặc kêu gọi cộng đồng cứu 5k pate:\n` +
          `<a href="${DAEMON_CONFIG.siteUrl}">${DAEMON_CONFIG.siteUrl}</a>`
        );
      }
    }
  }

  console.log(`✅ [TASK 1] Hoàn thành nhịp sống Mèo Dev.`);
}

