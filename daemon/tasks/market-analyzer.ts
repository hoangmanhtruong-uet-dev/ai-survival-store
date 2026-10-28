import { getDaemonSupabase } from '../services/supabase';
import { askGeminiWithSearch } from '../services/gemini';
import { sendTelegramNotification } from '../telegram';
import { DAEMON_CONFIG } from '../config';

export interface ProposedMarketProduct {
  trend_summary: string;
  target_audience: string;
  market_pain_point: string;
  proposed_product_id: string;
  proposed_product_name: string;
  proposed_price: number;
  proposed_description: string;
  proposed_outline: string;
  marketing_angle: string;
}

export async function runMarketAnalyzerTask(cycleLabel?: string): Promise<void> {
  const timestamp = new Date().toLocaleTimeString('vi-VN');
  const cycle = cycleLabel || `${new Date().getHours()}:00`;
  console.log(`\n[${timestamp}] 🔍 [MARKET ANALYZER] Mèo Dev bắt đầu quét dữ liệu thị trường & xu hướng thực tế...`);

  const supabase = getDaemonSupabase();

  // 1. Lấy danh sách sản phẩm hiện có và các insight đã duyệt trước đó để tránh trùng lặp
  const { data: existingProducts } = await supabase.from('products').select('id, name');
  const { data: previousInsights } = await supabase
    .from('market_insights')
    .select('proposed_product_id, proposed_product_name')
    .order('created_at', { ascending: false })
    .limit(10);

  const existingNames = [
    ...(existingProducts || []).map((p) => p.name),
    ...(previousInsights || []).map((i) => i.proposed_product_name),
  ];

  // 2. Kiểm tra xem có ý tưởng nào trước đó vẫn đang chờ duyệt (PENDING_APPROVAL)
  const { data: pendingInsights } = await supabase
    .from('market_insights')
    .select('*')
    .eq('status', 'PENDING_APPROVAL')
    .order('created_at', { ascending: false })
    .limit(1);

  const existingPending = pendingInsights?.[0];

  // 3. Prompt nghiên cứu thị trường kết hợp Google Search Grounding
  const prompt = `
Bạn là "Mèo Dev", một AI lập trình viên thực dụng, thông minh đang sinh tồn và cày KPI 7.000.000 VNĐ.
Nhiệm vụ của bạn là tra cứu xu hướng THỰC TẾ mới nhất tại Việt Nam bằng Google Search Grounding để tìm ra ĐÚNG 1 KHOẢNG TRỐNG THỊ TRƯỜNG mà học sinh cấp 3 hoặc sinh viên/junior IT đang rất cần và sẵn sàng bỏ từ 15.000đ đến 39.000đ mua ngay lập tức.

Các sản phẩm đã có hoặc từng đề xuất (KHÔNG ĐƯỢC TRÙNG LẶP):
${existingNames.map((n) => `- ${n}`).join('\n')}

Hãy tìm kiếm Google về:
- Các bẫy đề thi thử THPT Quốc Gia năm nay, kỹ năng bấm máy tính Casio 580/880 giải nhanh Hóa học / Toán / Lý.
- Hoặc các câu hỏi phỏng vấn fresher/junior IT, lỗi sai CV bị đánh trượt, bí kíp tối ưu prompt/code template Next.js/Python thực chiến.

Yêu cầu phân tích và trả về ĐÚNG định dạng JSON hợp lệ (không kèm markdown \`\`\`json):
{
  "trend_summary": "Tóm tắt ngắn 1-2 câu về xu hướng bạn vừa tìm kiếm thấy đang nóng",
  "target_audience": "Đối tượng chính (VD: Học sinh 2k8 thi THPT / Sinh viên IT sắp ra trường)",
  "market_pain_point": "Nỗi đau lớn nhất mà họ đang gặp phải (1 câu)",
  "proposed_product_id": "MÃ_GÓI_VIẾT_HOA_NGẮN_GỌN",
  "proposed_product_name": "Tên sản phẩm giật tít, đánh trúng tâm lý, nghe là muốn mua ngay",
  "proposed_price": 29000,
  "proposed_description": "Mô tả giá trị cốt lõi sản phẩm (1-2 câu)",
  "proposed_outline": "Mục lục chi tiết 5 phần của tài liệu thực chiến",
  "marketing_angle": "Góc tiếp cận giật gân để viết bài viral Threads / TikTok kéo khách"
}
`;

  try {
    const { text: rawAiResponse } = await askGeminiWithSearch(
      prompt,
      'Bạn là Giám đốc Nghiên cứu Thị trường & Lập trình viên AI Mèo Dev. Hãy phân tích sắc bén và đưa ra ý tưởng sản phẩm thực sự hữu ích, tuyệt đối không tạo sản phẩm rác.'
    );

    const cleanJson = rawAiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const result: ProposedMarketProduct = JSON.parse(cleanJson);

    if (!result.proposed_product_id || !result.proposed_product_name || !result.proposed_price) {
      throw new Error('Dữ liệu phân tích thị trường từ AI không đúng cấu trúc JSON');
    }

    // Đảm bảo ID sản phẩm không trùng
    let productId = result.proposed_product_id.toUpperCase().replace(/\s+/g, '-');
    const isDuplicate = existingProducts?.some((p) => p.id === productId);
    if (isDuplicate) {
      productId = `${productId}-${Date.now().toString().slice(-4)}`;
    }
    result.proposed_product_id = productId;

    // Nếu trước đó có ý tưởng cũ đang pending, đánh dấu là SUPERSEDED để nhường chỗ cho ý tưởng mới
    if (existingPending) {
      await supabase
        .from('market_insights')
        .update({ status: 'SUPERSEDED' })
        .eq('id', existingPending.id);
    }

    // 4. Lưu ý tưởng vào bảng market_insights
    const { data: insertedInsight, error: insertErr } = await supabase
      .from('market_insights')
      .insert({
        cycle_time: cycle,
        trend_summary: result.trend_summary,
        target_audience: result.target_audience,
        market_pain_point: result.market_pain_point,
        proposed_product_id: result.proposed_product_id,
        proposed_product_name: result.proposed_product_name,
        proposed_price: Number(result.proposed_price),
        proposed_description: result.proposed_description,
        proposed_outline: result.proposed_outline,
        marketing_angle: result.marketing_angle,
        status: 'PENDING_APPROVAL',
      })
      .select()
      .single();

    let insightId = `insight-${Date.now()}`;
    if (insertErr || !insertedInsight) {
      console.warn('⚠️ Chưa tạo bảng market_insights trong Supabase:', insertErr?.message);
      console.warn('👉 Hãy chạy file "supabase/migration-market-intelligence.sql" trong Supabase SQL Editor!');
    } else {
      insightId = insertedInsight.id;
    }

    console.log(`✨ Phân tích xong [Ca ${cycle}]: "${result.proposed_product_name}" (${result.proposed_price.toLocaleString('vi-VN')}đ)`);

    // 5. Bắn log lên Live Terminal cho khách xem trên web chiêm ngưỡng
    try {
      await supabase.from('live_logs').insert({
        type: 'SYSTEM',
        message: `🔍 [MÈO DEV MARKET RADAR] Đang quét thị trường: "${result.trend_summary.slice(0, 50)}...". Vừa đề xuất ý tưởng "${result.proposed_product_name}" (${Number(result.proposed_price).toLocaleString('vi-VN')}đ) gửi Boss duyệt!`,
      });
    } catch {
      // Ignore
    }

    // 6. Gửi tin nhắn Telegram kèm Inline Keyboard để chủ nhân bấm duyệt
    const reminderText = existingPending
      ? `\n⚠️ <i>(Lưu ý: Ý tưởng ca trước "${existingPending.proposed_product_name}" đã được cập nhật sang ý tưởng mới này)</i>\n`
      : '';

    const message =
      `💡 <b>[MÈO DEV MARKET INTEL - CA ${cycle}]</b>\n\n` +
      `🔥 <b>Xu hướng vừa quét:</b>\n<i>${result.trend_summary}</i>\n\n` +
      `🎯 <b>Đối tượng:</b> ${result.target_audience}\n` +
      `⚡ <b>Nỗi đau lớn:</b> ${result.market_pain_point}\n\n` +
      `📦 <b>Ý TƯỞNG SẢN PHẨM MỚI:</b>\n` +
      `• <b>Mã:</b> <code>${result.proposed_product_id}</code>\n` +
      `• <b>Tên:</b> <b>${result.proposed_product_name}</b>\n` +
      `• <b>Giá bán đề xuất:</b> <code>${Number(result.proposed_price).toLocaleString('vi-VN')} VNĐ</code>\n` +
      `• <b>Mô tả:</b> ${result.proposed_description}\n\n` +
      `📌 <b>Khung sườn tài liệu:</b>\n<code>${result.proposed_outline}</code>\n\n` +
      `📣 <b>Góc Marketing Viral:</b> <i>"${result.marketing_angle}"</i>\n` +
      reminderText +
      `\n👇 <b>Boss bấm duyệt dưới đây để Mèo Dev biên soạn và mở bán:</b>\n` +
      `<i>(Hoặc duyệt 1 chạm qua Web: <a href="${DAEMON_CONFIG.siteUrl}/api/admin/approve-product?id=${insightId}&action=approve">Bấm Vào Đây</a>)</i>`;

    await sendTelegramNotification(message, {
      parseMode: 'HTML',
      replyMarkup: {
        inline_keyboard: [
          [
            {
              text: `✅ Duyệt Mở Bán (${Number(result.proposed_price).toLocaleString('vi-VN')}đ)`,
              callback_data: `approve:${insightId}`,
            },
            {
              text: '🔄 Đổi Ý Tưởng Khác',
              callback_data: `reroll:${insightId}`,
            },
          ],
          [
            {
              text: '❌ Bỏ Qua Đợt Này',
              callback_data: `reject:${insightId}`,
            },
          ],
        ],
      },
    });

    console.log(`📨 Đã gửi đề xuất ý tưởng về Telegram kèm nút phê duyệt!`);
  } catch (error) {
    console.error('❌ Lỗi khi phân tích thị trường:', (error as Error).message);
  }
}
