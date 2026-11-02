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
    category: 'CODE_TASKS',
    title: 'Dịch Vụ Cày Thuê Script Python / Node.js & Scraper Cào Data',
    description: 'Viết tool cào dữ liệu Shopee/Tiktok/Website, script tự động tải ảnh, xử lý file dữ liệu',
    searchDirectives: 'thuê viết script python cào dữ liệu tool tự động hóa crawl shopee website giá rẻ 2026',
  },
  {
    cycle: '04:00',
    category: 'BOT_DEV',
    title: 'Dịch Vụ Lập Trình Bot Telegram / Zalo Thông Báo Tự Động',
    description: 'Viết bot gửi thông báo đơn hàng, bot cảnh báo server sập, bot theo dõi biến động giá',
    searchDirectives: 'viết bot telegram thông báo đơn hàng tự động hóa bot theo dõi giá script nodejs python',
  },
  {
    cycle: '08:00',
    category: 'OFFICE_AUTOMATION',
    title: 'Tự Động Hóa Văn Phòng & Excel / Google Apps Script',
    description: 'Viết Macro VBA, Google Apps Script tự động tổng hợp báo cáo doanh thu, chuyển PDF sang Excel',
    searchDirectives: 'thuê viết code google apps script macro vba excel tự động hóa báo cáo doanh thu',
  },
  {
    cycle: '12:00',
    category: 'STUDENT_CS_SUPPORT',
    title: 'Hỗ Trợ Bài Tập Lớn & Đồ Án CNTT Cho Sinh Viên',
    description: 'Review code đồ án, phát hiện lỗi tiềm ẩn, vẽ Diagram UML/ERD, viết README & tài liệu kỹ thuật',
    searchDirectives: 'hỗ trợ bài tập lớn công nghệ thông tin review code vẽ diagram uml erd sinh viên it',
  },
  {
    cycle: '16:00',
    category: 'DEV_READY_TEMPLATES',
    title: 'Mã Nguồn & Boilerplate Ứng Dụng Chạy Được Ngay',
    description: 'Source code Bot quản lý chi tiêu, Starter template Next.js 16 + VietQR thanh toán tự động',
    searchDirectives: 'source code bot telegram quản lý tài chính template nextjs thanh toán vietqr boilerplate',
  },
  {
    cycle: '20:00',
    category: 'BUG_FIXING_SERVICE',
    title: 'Dịch Vụ Sửa Bug CSS / Responsive / API Cấp Tốc',
    description: 'Fix lỗi giao diện vỡ trên mobile, sửa lỗi CORS, sửa truy vấn SQL chậm, sửa regex',
    searchDirectives: 'thuê sửa lỗi web vỡ css responsive fix bug javascript sửa api lập trình viên cấp tốc',
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

  // 3. Prompt nghiên cứu thị trường kỹ thuật thực chiến kết hợp Google Search Grounding
  const prompt = `
Bạn là "Mèo Dev", một AI lập trình viên thực dụng, thông minh đang sinh tồn và cày KPI 7.000.000 VNĐ.
YÊU CẦU ĐẶC BIỆT QUAN TRỌNG TỪ BOSS DUYỆT ĐƠN:
- TUYỆT ĐỐI KHÔNG TẠO EBOOK LÝ THUYẾT SUÔNG, SỔ TAY CONTENT, KỊCH BẢN TIKTOK/LIVESTREAM HAY BỘ PROMPT CHÉM GIÓ VÔ NGHĨA. (Boss đã nghiêm cấm vì không ai mua và vô bổ).
- MỌI ĐỀ XUẤT BẮT BUỘC PHẢI LÀ:
  + Một DỊCH VỤ CÀY THUÊ KỸ THUẬT CỤ THỂ mà khách bỏ tiền thuê Mèo Dev code/xử lý (giá 19.000đ - 49.000đ) HOẶC
  + Một MÃ NGUỒN / SCRIPT / TEMPLATE CHẠY ĐƯỢC NGAY mà khách tải về là dùng được luôn (giải quyết đúng 1 vấn đề cụ thể).

MẢNG NGÀNH ƯU TIÊN LẦN NÀY:
- Lĩnh vực: ${selectedDomain.title}
- Chi tiết: ${selectedDomain.description}
- Hướng tra cứu Google: ${selectedDomain.searchDirectives}

CÁC SẢN PHẨM ĐÃ CÓ (TUYỆT ĐỐI KHÔNG TRÙNG):
${existingNames.map((n) => `- ${n}`).join('\n')}

Yêu cầu phân tích và trả về ĐÚNG định dạng JSON hợp lệ (không kèm markdown \`\`\`json):
{
  "domain_category": "${selectedDomain.category}",
  "trend_summary": "1-2 câu về nhu cầu kỹ thuật/lập trình thực tế nóng nhất tại Việt Nam",
  "target_audience": "Đối tượng khách cụ thể (VD: Sinh viên CNTT / Dev Fresher / Chủ shop cần cào data / Kế toán xử lý Excel)",
  "market_pain_point": "Vấn đề kỹ thuật đau đầu nhất họ muốn bỏ tiền thuê người code/xử lý ngay",
  "proposed_product_id": "MÃ_GÓI_VIẾT_HOA_NGẮN",
  "proposed_product_name": "Tên dịch vụ/tool rõ ràng, thực tế, cam kết kết quả (VD: 'Cày Thuê Script Python Auto-Crawl Dữ Liệu')",
  "proposed_price": 29000,
  "proposed_description": "Mô tả cụ thể khách nhận được gì (VD: Script .py hoàn chỉnh + file hướng dẫn + test chạy ok)",
  "proposed_outline": "Quy trình 4-5 bước thực hiện rõ ràng mà Mèo Dev sẽ làm cho khách",
  "marketing_angle": "Góc tiếp cận thực chiến kiểu dev cày thuê sinh tồn"
}
`;

  try {
    const { text: rawAiResponse } = await askGeminiWithSearch(
      prompt,
      'Bạn là Kỹ sư Trưởng kiêm AI Cày Thuê Mèo Dev. Hãy đề xuất dịch vụ lập trình và tool công nghệ có ích thật 100%, tuyệt đối không tạo ebook rác.'
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

    const adminToken = process.env.ADMIN_SECRET_KEY || process.env.PAYMENT_WEBHOOK_SECRET || '';
    const tokenQuery = adminToken ? `&token=${encodeURIComponent(adminToken)}` : '';

    const message =
      `🛠️ <b>[MÈO DEV ĐỀ XUẤT DỊCH VỤ CÀY THUÊ - CA ${cycle}]</b>\n` +
      `📁 <b>Mảng công nghệ:</b> <code>${selectedDomain.title}</code>\n\n` +
      `🔥 <b>Nhu cầu thực tế:</b>\n<i>${result.trend_summary}</i>\n\n` +
      `🎯 <b>Khách hàng:</b> ${result.target_audience}\n` +
      `⚡ <b>Vấn đề cần giải quyết:</b> ${result.market_pain_point}\n\n` +
      `📦 <b>CHI TIẾT DỊCH VỤ / MÃ NGUỒN:</b>\n` +
      `• <b>Mã:</b> <code>${result.proposed_product_id}</code>\n` +
      `• <b>Tên dịch vụ:</b> <b>${result.proposed_product_name}</b>\n` +
      `• <b>Giá cày thuê:</b> <code>${Number(result.proposed_price).toLocaleString('vi-VN')} VNĐ</code>\n` +
      `• <b>Bàn giao cho khách:</b> ${result.proposed_description}\n\n` +
      `📌 <b>Quy trình Mèo Dev thực hiện:</b>\n<code>${result.proposed_outline}</code>\n\n` +
      `📣 <b>Góc tiếp cận:</b> <i>"${result.marketing_angle}"</i>\n` +
      reminderText +
      `\n👇 <b>Thao tác duyệt:</b>\n` +
      `Bấm [🚀 Duyệt Triển Khai Dịch Vụ] để Mèo Dev mở bán và nhận order cày thuê tự động trên Web!\n` +
      `<i>(Hoặc duyệt nhanh qua Web: <a href="${DAEMON_CONFIG.siteUrl}/api/admin/approve-product?id=${insightId}${tokenQuery}">Bấm Vào Đây</a>)</i>`;

    await sendTelegramNotification(message, {
      parseMode: 'HTML',
      replyMarkup: {
        inline_keyboard: [
          [
            {
              text: `🚀 Duyệt Triển Khai Dịch Vụ (${Number(result.proposed_price).toLocaleString('vi-VN')}đ)`,
              callback_data: `approve:${insightId}`,
            },
            {
              text: '🔄 Đổi Dịch Vụ Khác',
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
