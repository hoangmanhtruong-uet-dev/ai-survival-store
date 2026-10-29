import { getDaemonSupabase } from '../services/supabase';
import { askGeminiWithSearch } from '../services/gemini';
import { sendTelegramNotification } from '../telegram';
import { DAEMON_CONFIG } from '../config';

export interface ProposedMarketProduct {
  domain_category: string;
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

export interface MarketDomainConfig {
  cycle: string;
  category: string;
  title: string;
  description: string;
  searchDirectives: string;
}

export const MARKET_DOMAINS: MarketDomainConfig[] = [
  {
    cycle: '00:00',
    category: 'AUTOMATION_TOOLS',
    title: 'Công Cụ Số & Automation Thực Chiến',
    description: 'SaaS micro-scripts, n8n/make templates, scripts cào data, bot tự động hóa quy trình',
    searchDirectives: 'tool tự động hóa AI workflow n8n make script cào dữ liệu giải pháp tự động công việc Việt Nam 2026',
  },
  {
    cycle: '04:00',
    category: 'FREELANCE_SERVICES',
    title: 'Dịch Vụ Freelance & Tech Agency',
    description: 'Dịch vụ setup bot chăm sóc khách hàng, audit tối ưu database, outsource kỹ thuật cho shop/doanh nghiệp nhỏ',
    searchDirectives: 'dịch vụ outsource AI chatbot chăm sóc khách hàng setup CRM tối ưu chi phí cho shop online',
  },
  {
    cycle: '08:00',
    category: 'DIGITAL_BUSINESS_ASSETS',
    title: 'Tài Sản & Sản Phẩm Số Kinh Doanh',
    description: 'Prompt engineering packs chuyên sâu, Notion OS quản lý tài chính/kinh doanh, SOP quy trình chuẩn',
    searchDirectives: 'Notion template quản lý kinh doanh bán lẻ prompt pack AI thực chiến cẩm nang SOP quy trình',
  },
  {
    cycle: '12:00',
    category: 'GROWTH_MARKETING',
    title: 'Giải Pháp Tăng Trưởng & Marketing Online',
    description: 'Kịch bản video TikTok 30s triệu view, bộ content hook chuyển đổi cao cho Threads/Facebook, template chạy ads',
    searchDirectives: 'kịch bản tiktok viral bán hàng template content threads facebook ads chuyển đổi cao xu hướng 2026',
  },
  {
    cycle: '16:00',
    category: 'CAREER_SKILLS',
    title: 'Kỹ Năng & Nghề Nghiệp Đắt Giá',
    description: 'CV ATS vượt vòng lọc tuyển dụng, bộ câu hỏi & lời giải phỏng vấn kỹ thuật/kinh doanh, cẩm nang bứt phá thu nhập',
    searchDirectives: 'bộ câu hỏi phỏng vấn fresher junior IT kinh doanh mẫu CV ATS bẫy tuyển dụng lương cao thực chiến',
  },
  {
    cycle: '20:00',
    category: 'HOT_TRENDS',
    title: 'Xu Hướng Nóng & Cơ Hội Bán Hàng Trực Tiếp',
    description: 'Google Trends nóng nhất tại Việt Nam, sản phẩm giải quyết nỗi đau cấp bách nhất trên thị trường',
    searchDirectives: 'xu hướng kinh doanh online kiếm tiền hot trend việt nam giải pháp bán hàng thực tế ngách tiềm năng',
  },
];

export async function runMarketAnalyzerTask(cycleLabel?: string, customTopic?: string): Promise<ProposedMarketProduct | null> {
  const timestamp = new Date().toLocaleTimeString('vi-VN');
  const hour = new Date().getHours();
  const cycle = cycleLabel || `${hour}:00`;

  // Xác định mảng thị trường quét
  let selectedDomain: MarketDomainConfig;
  if (customTopic) {
    selectedDomain = {
      cycle,
      category: 'CUSTOM_ORDER',
      title: `Theo yêu cầu của Boss: "${customTopic}"`,
      description: `Phân tích chuyên sâu mảng ${customTopic}`,
      searchDirectives: `${customTopic} xu hướng nhu cầu thị trường Việt Nam 2026 cơ hội dịch vụ kinh doanh`,
    };
  } else {
    // Tìm cấu hình domain tương ứng theo giờ (0, 4, 8, 12, 16, 20)
    const matched = MARKET_DOMAINS.find((d) => {
      const targetHour = parseInt(d.cycle.split(':')[0], 10);
      return Math.abs(hour - targetHour) <= 2;
    });
    selectedDomain = matched || MARKET_DOMAINS[0];
  }

  console.log(`\n[${timestamp}] 🔍 [MARKET ANALYZER - CA ${cycle}] Mèo Dev quét mảng: "${selectedDomain.title}"...`);

  const supabase = getDaemonSupabase();

  // 1. Lấy danh sách sản phẩm hiện có và insight đã tạo để tránh trùng lặp
  const { data: existingProducts } = await supabase.from('products').select('id, name');
  const { data: previousInsights } = await supabase
    .from('market_insights')
    .select('proposed_product_id, proposed_product_name')
    .order('created_at', { ascending: false })
    .limit(15);

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

  // 3. Prompt nghiên cứu thị trường đa ngành kết hợp Google Search Grounding
  const prompt = `
Bạn là "Mèo Dev", một AI lập trình viên thực dụng, thông minh đang sinh tồn và cày KPI 7.000.000 VNĐ.
Mục tiêu của bạn: Tra cứu xu hướng THỰC TẾ mới nhất tại Việt Nam bằng Google Search Grounding để tìm ra ĐÚNG 1 KHOẢNG TRỐNG THỊ TRƯỜNG để làm SẢN PHẨM SỐ hoặc DỊCH VỤ CÀY THUÊ mà người dùng (cá nhân kinh doanh, freelancer, shop online, học sinh/sinh viên, dân văn phòng) sẵn sàng bỏ từ 19.000đ đến 99.000đ mua ngay lập tức.

MẢNG NGÀNH ƯU TIÊN LẦN NÀY:
- Lĩnh vực: ${selectedDomain.title}
- Mô tả: ${selectedDomain.description}
- Hướng tra cứu Google: ${selectedDomain.searchDirectives}

CÁC SẢN PHẨM ĐÃ CÓ (TUYỆT ĐỐI KHÔNG ĐƯỢC TRÙNG LẶP):
${existingNames.map((n) => `- ${n}`).join('\n')}

Yêu cầu phân tích và trả về ĐÚNG định dạng JSON hợp lệ (không kèm markdown \`\`\`json):
{
  "domain_category": "${selectedDomain.category}",
  "trend_summary": "Tóm tắt ngắn 1-2 câu về xu hướng/nhu cầu thực tế bạn vừa tìm thấy đang rất nóng tại Việt Nam",
  "target_audience": "Đối tượng khách hàng cụ thể (VD: Chủ shop thời trang online / Freelancer viết lách / Người mới bắt đầu học AI / Dân văn phòng xử lý Excel)",
  "market_pain_point": "Nỗi đau cấp bách nhất khiến họ sẵn sàng trả tiền để giải quyết ngay lập tức (1 câu)",
  "proposed_product_id": "MÃ_GÓI_VIẾT_HOA_NGẮN_GỌN",
  "proposed_product_name": "Tên sản phẩm/dịch vụ giật tít, đánh trúng tâm lý, cam kết hiệu quả rõ ràng",
  "proposed_price": 29000,
  "proposed_description": "Mô tả giá trị cốt lõi giải quyết vấn đề (1-2 câu)",
  "proposed_outline": "Mục lục chi tiết 5 phần của sản phẩm thực chiến (hoặc các bước quy trình dịch vụ cụ thể)",
  "marketing_angle": "Góc tiếp cận giật gân để viết bài viral Threads / TikTok / Facebook kéo khách"
}
`;

  try {
    const { text: rawAiResponse } = await askGeminiWithSearch(
      prompt,
      'Bạn là Giám đốc Nghiên cứu Thị trường & Lập trình viên AI Mèo Dev. Hãy phân tích sắc bén, thực dụng, tuyệt đối không tạo sản phẩm lý thuyết suông.'
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
    result.domain_category = result.domain_category || selectedDomain.category;

    // Nếu trước đó có ý tưởng cũ đang pending, đánh dấu là SUPERSEDED
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
        domain_category: result.domain_category,
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
      console.warn('⚠️ Ghi chú: Hãy chạy file "supabase/migration-telegram-chat.sql" trong Supabase để tối ưu bảng market_insights!');
    } else {
      insightId = insertedInsight.id;
    }

    console.log(`✨ Phân tích xong [${selectedDomain.title}]: "${result.proposed_product_name}" (${Number(result.proposed_price).toLocaleString('vi-VN')}đ)`);

    // 5. Bắn log lên Live Terminal
    try {
      await supabase.from('live_logs').insert({
        type: 'SYSTEM',
        message: `🔍 [MARKET RADAR - ${selectedDomain.title}] Vừa quét xu hướng: "${result.trend_summary.slice(0, 50)}...". Đã đề xuất ý tưởng "${result.proposed_product_name}" (${Number(result.proposed_price).toLocaleString('vi-VN')}đ) gửi Boss thẩm định!`,
      });
    } catch {
      // Ignore
    }

    // 6. Gửi tin nhắn Telegram kèm Inline Keyboard cho Boss duyệt Vòng 1 (Viết thử)
    const reminderText = existingPending
      ? `\n⚠️ <i>(Lưu ý: Ý tưởng ca trước "${existingPending.proposed_product_name}" đã được cập nhật sang ý tưởng mới này)</i>\n`
      : '';

    const message =
      `💡 <b>[MÈO DEV MARKET RADAR - CA ${cycle}]</b>\n` +
      `📁 <b>Mảng:</b> <code>${selectedDomain.title}</code>\n\n` +
      `🔥 <b>Xu hướng thị trường:</b>\n<i>${result.trend_summary}</i>\n\n` +
      `🎯 <b>Khách hàng mục tiêu:</b> ${result.target_audience}\n` +
      `⚡ <b>Nỗi đau cấp bách:</b> ${result.market_pain_point}\n\n` +
      `📦 <b>ĐỀ XUẤT SẢN PHẨM / DỊCH VỤ:</b>\n` +
      `• <b>Mã:</b> <code>${result.proposed_product_id}</code>\n` +
      `• <b>Tên:</b> <b>${result.proposed_product_name}</b>\n` +
      `• <b>Giá bán đề xuất:</b> <code>${Number(result.proposed_price).toLocaleString('vi-VN')} VNĐ</code>\n` +
      `• <b>Mô tả:</b> ${result.proposed_description}\n\n` +
      `📌 <b>Dàn bài / Quy trình:</b>\n<code>${result.proposed_outline}</code>\n\n` +
      `📣 <b>Góc Marketing Viral:</b> <i>"${result.marketing_angle}"</i>\n` +
      reminderText +
      `\n👇 <b>Quy trình kiểm duyệt 2 vòng:</b>\n` +
      `Bấm [✍️ Bắt Đầu Viết Thử] để Mèo Dev biên soạn toàn văn chất lượng cao và gửi lại cho Boss xem trước trước khi đăng lên web!\n` +
      `<i>(Hoặc duyệt qua Web: <a href="${DAEMON_CONFIG.siteUrl}/api/admin/approve-product?id=${insightId}&action=approve">Bấm Vào Đây</a>)</i>`;

    await sendTelegramNotification(message, {
      parseMode: 'HTML',
      replyMarkup: {
        inline_keyboard: [
          [
            {
              text: `✍️ Bắt Đầu Viết Thử (${Number(result.proposed_price).toLocaleString('vi-VN')}đ)`,
              callback_data: `approve:${insightId}`,
            },
            {
              text: '🔄 Đổi Ý Tưởng Khác',
              callback_data: `reroll:${insightId}`,
            },
          ],
          [
            {
              text: '❌ Bỏ Qua Lần Này',
              callback_data: `reject:${insightId}`,
            },
          ],
        ],
      },
    });

    console.log(`📨 Đã gửi đề xuất ý tưởng về Telegram kèm nút phê duyệt Vòng 1!`);
    return result;
  } catch (error) {
    console.error('❌ Lỗi khi phân tích thị trường:', (error as Error).message);
    return null;
  }
}
