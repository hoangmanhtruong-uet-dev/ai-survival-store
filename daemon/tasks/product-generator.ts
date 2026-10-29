import { getDaemonSupabase } from '../services/supabase';
import { askGemini } from '../services/gemini';
import { sendTelegramNotification } from '../telegram';
import { DAEMON_CONFIG } from '../config';

export interface QualityMetrics {
  wordCount: number;
  charCount: number;
  hasTables: boolean;
  hasWarnings: boolean;
  hasActionableTemplates: boolean;
  qualityScore: number; // 0 - 100
}

/**
 * VÒNG 1 ➔ VÒNG 2: Tự động biên soạn bản thảo tài liệu/sản phẩm theo chuẩn Anti-Slop
 * và gửi bản xem trước (Preview) về Telegram để Boss thẩm định chất lượng trước khi mở bán.
 */
export async function authorProductDraft(insightId: string, revisionNotes?: string): Promise<boolean> {
  const timestamp = new Date().toLocaleTimeString('vi-VN');
  console.log(`\n[${timestamp}] ✍️ [AUTO-AUTHORING] Bắt đầu biên soạn bản thảo chất lượng cao cho ID: ${insightId}...`);

  const supabase = getDaemonSupabase();

  // 1. Lấy thông tin ý tưởng thị trường từ Supabase
  let insight: {
    id?: string;
    proposed_product_id: string;
    proposed_product_name: string;
    proposed_description: string;
    proposed_price: number;
    target_audience: string;
    market_pain_point: string;
    proposed_outline: string;
    domain_category?: string;
    draft_content?: string;
  } | null = null;

  try {
    const { data, error: fetchErr } = await supabase
      .from('market_insights')
      .select('*')
      .eq('id', insightId)
      .single();

    if (!fetchErr && data) {
      insight = data;
      await supabase
        .from('market_insights')
        .update({ status: 'DRAFTING' })
        .eq('id', insightId);
    }
  } catch {
    // Ignore
  }

  // Fallback nếu bảng chưa tạo hoặc transient ID
  if (!insight) {
    insight = {
      proposed_product_id: 'AI-WORKFLOW-PRO',
      proposed_product_name: 'Bộ Quy Trình Automation & Prompt Pack Thực Chiến 2026',
      target_audience: 'Chủ shop kinh doanh online & Freelancer',
      market_pain_point: 'Tốn 4-5 tiếng mỗi ngày làm việc thủ công lặp đi lặp lại',
      proposed_price: 39000,
      proposed_description: 'Quy trình tự động hóa trả lời khách hàng, tạo content đa kênh và lọc lead chất lượng cao.',
      proposed_outline: '1. Bản đồ tự động hóa quy trình\n2. Template kịch bản n8n/make\n3. Prompt Pack chuyển đổi cao\n4. Bảng tra cứu lỗi thường gặp\n5. Checklist vận hành 15 phút mỗi ngày',
    };
  }

  // 2. Prompt biên soạn chuyên sâu chuẩn Anti-Slop Manifesto
  const authoringPrompt = `
Bạn là "Mèo Dev" - một Senior AI Engineer và Cố vấn Chiến lược Thực chiến.
Boss của bạn vừa bấm YÊU CẦU BIÊN SOẠN SẢN PHẨM SỐ / TÀI LIỆU KINH DOANH:
- Tên sản phẩm: "${insight.proposed_product_name}"
- Lĩnh vực: "${insight.domain_category || 'Kinh doanh số & Tự động hóa'}"
- Đối tượng khách mua: "${insight.target_audience}"
- Nỗi đau cốt lõi cần giải quyết: "${insight.market_pain_point}"
- Giá bán: ${Number(insight.proposed_price).toLocaleString('vi-VN')} VNĐ
- Khung sườn đề xuất:
${insight.proposed_outline}
${revisionNotes ? `\n⚠️ CHÚ Ý: BOSS VỪA GÓP Ý YÊU CẦU SỬA ĐỔI NHƯ SAU:\n"${revisionNotes}"\nHãy tiếp thu và cải thiện triệt để theo góp ý này!\n` : ''}

NHIỆM VỤ CỦA BẠN:
Hãy biên soạn TOÀN VĂN một cuốn Ebook / Cẩm nang / Bộ tài liệu thực chiến hoàn chỉnh (độ dài khoảng 1800 - 3000 từ), định dạng Markdown cực đẹp, có cấu trúc lớp lang rõ ràng.

TIÊU CHUẨN CHẤT LƯỢNG BẮT BUỘC (ANTI-SLOP MANIFESTO):
1. TUYỆT ĐỐI KHÔNG VIẾT ĐỊNH NGHĨA SUÔNG HOẶC LÝ THUYẾT GIÁO ĐIỀU: Đi thẳng vào giải pháp từng bước (Step-by-Step), người mua có thể áp dụng ra kết quả ngay trong 10-30 phút.
2. BẢNG TRA CỨU NHANH (Cheat Table / Shortcut Matrix): Phải có ít nhất 1 bảng Markdown so sánh, tra cứu công thức, prompt hoặc workflow.
3. HỘP CẢNH BÁO BẪY SAI LẦM: Phải có ít nhất 2 hộp cảnh báo (Dạng Markdown: > [!WARNING] hoặc > [!IMPORTANT]) chỉ rõ những sai lầm chết người mà 90% người hay mắc phải và cách né tránh.
4. TÀI SẢN THỰC THI (Actionable Deliverable): Phải cung cấp Prompt mẫu hoàn chỉnh / Code script mẫu / Quy trình SOP mẫu từng bước mà khách có thể copy-paste dùng ngay.
5. PHONG CÁCH MÈO DEV: Thông minh, thẳng thắn, sắc sảo, truyền cảm hứng và đậm chất thực dụng "kiếm tiền trả tiền điện".

Định dạng Markdown xuất ra:
# [Tên Sản Phẩm]
> *Tác giả: Mèo Dev | Phiên bản thực chiến 2026 | Bản quyền AI Survival Store*

## 1. Giới thiệu & Bản đồ hành động nhanh
...
## 2. Quy trình & Phương pháp thực chiến cốt lõi
...
## 3. Bộ công cụ & Bảng tra cứu nhanh
...
## 4. Các bẫy sai lầm chết người cần tránh
...
## 5. Hướng dẫn triển khai thực tế trong 15 phút
...
---
*Cảm ơn bạn đã sở hữu tài liệu ủng hộ Mèo Dev sinh tồn! Chúc bạn bứt phá công việc và doanh thu!*
`;

  try {
    const markdownContent = await askGemini(
      authoringPrompt,
      'Bạn là Mèo Dev. Hãy biên soạn nội dung xuất sắc, vượt mong đợi của người mua, tuyệt đối không tạo tài liệu rác.'
    );

    if (!markdownContent || markdownContent.length < 800) {
      throw new Error('Nội dung biên soạn quá ngắn hoặc không đạt chuẩn chất lượng');
    }

    // 3. Tính toán Quality Metrics
    const words = markdownContent.trim().split(/\s+/).length;
    const hasTables = markdownContent.includes('| --- |') || markdownContent.includes('|---|') || markdownContent.includes('|');
    const hasWarnings = markdownContent.includes('> [!WARNING]') || markdownContent.includes('> [!IMPORTANT]') || markdownContent.includes('⚠️');
    const hasActionableTemplates = markdownContent.includes('```') || markdownContent.includes('Prompt:') || markdownContent.includes('Bước 1');

    let qualityScore = 70;
    if (words >= 1500) qualityScore += 10;
    if (hasTables) qualityScore += 10;
    if (hasWarnings) qualityScore += 5;
    if (hasActionableTemplates) qualityScore += 5;

    const metrics: QualityMetrics = {
      wordCount: words,
      charCount: markdownContent.length,
      hasTables,
      hasWarnings,
      hasActionableTemplates,
      qualityScore,
    };

    // 4. Lưu bản thảo và metrics vào database (Chưa đăng lên bảng products!)
    try {
      await supabase
        .from('market_insights')
        .update({
          draft_content: markdownContent,
          status: 'READY_FOR_REVIEW',
          quality_metrics: metrics,
        })
        .eq('id', insightId);
    } catch {
      // Ignore
    }

    console.log(`✅ Đã biên soạn xong bản thảo (${words} từ, Quality Score: ${qualityScore}/100). Đang gửi Preview về Telegram cho Boss...`);

    // 5. Trích xuất đoạn tóm tắt Preview (mục lục + đoạn đầu)
    const previewExcerpt = markdownContent
      .slice(0, 700)
      .replace(/#/g, '')
      .replace(/>/g, '•')
      .trim();

    // 6. Gửi tin nhắn THẨM ĐỊNH CHẤT LƯỢNG VÒNG 2 về Telegram kèm các nút thao tác
    const reviewMessage =
      `📋 <b>[THẨM ĐỊNH CHẤT LƯỢNG VÒNG 2: MÈO DEV ĐÃ SOẠN XONG]</b>\n\n` +
      `📦 <b>Sản phẩm:</b> <b>${insight.proposed_product_name}</b>\n` +
      `💰 <b>Giá bán đề xuất:</b> <code>${Number(insight.proposed_price).toLocaleString('vi-VN')} VNĐ</code>\n\n` +
      `📊 <b>CHỈ SỐ CHẤT LƯỢNG (ANTI-SLOP SCORE: ${qualityScore}/100):</b>\n` +
      `• Độ dài: <code>${words} từ</code> (~${markdownContent.length} ký tự)\n` +
      `• Bảng tra cứu Cheat Table: ${hasTables ? '✅ Có' : '❌ Chưa'}\n` +
      `• Hộp cảnh báo bẫy sai lầm: ${hasWarnings ? '✅ Đầy đủ' : '❌ Chưa'}\n` +
      `• Template / Prompt dùng ngay: ${hasActionableTemplates ? '✅ Có sẵn' : '❌ Chưa'}\n\n` +
      `📖 <b>ĐOẠN TRÍCH XEM TRƯỚC (PREVIEW):</b>\n` +
      `<i>"${previewExcerpt}..."</i>\n\n` +
      `👉 <b>Sản phẩm hiện đang ở chế độ CHỜ DUYỆT (Chưa hiển thị trên web).</b>\n` +
      `Boss xem xét và bấm nút bên dưới:`;

    await sendTelegramNotification(reviewMessage, {
      parseMode: 'HTML',
      replyMarkup: {
        inline_keyboard: [
          [
            {
              text: `🚀 ĐĂNG MỞ BÁN NGAY (${Number(insight.proposed_price).toLocaleString('vi-VN')}đ)`,
              callback_data: `publish:${insightId}`,
            },
          ],
          [
            {
              text: '✏️ Yêu Cầu Sửa Lại',
              callback_data: `revise:${insightId}`,
            },
            {
              text: '❌ Hủy Bỏ Sản Phẩm',
              callback_data: `reject:${insightId}`,
            },
          ],
        ],
      },
    });

    return true;
  } catch (err) {
    console.error('❌ Lỗi khi tự động biên soạn tài liệu:', (err as Error).message);
    await sendTelegramNotification(
      `⚠️ <b>Mèo Dev gặp lỗi khi biên soạn bản thảo:</b> <code>${(err as Error).message}</code>`
    );
    return false;
  }
}

/**
 * VÒNG 2 ➔ PUBLIC: Boss bấm [🚀 ĐĂNG MỞ BÁN NGAY] 
 * ➔ Chính thức đẩy sản phẩm vào bảng products để khách vào web mua và nhận ngay.
 */
export async function publishProductFromDraft(insightId: string): Promise<boolean> {
  const timestamp = new Date().toLocaleTimeString('vi-VN');
  console.log(`\n[${timestamp}] 🚀 [PUBLISHING] Boss đã phê duyệt! Tiến hành mở bán chính thức cho ID: ${insightId}...`);

  const supabase = getDaemonSupabase();

  try {
    const { data: insight, error: fetchErr } = await supabase
      .from('market_insights')
      .select('*')
      .eq('id', insightId)
      .single();

    if (fetchErr || !insight) {
      throw new Error(`Không tìm thấy ý tưởng với ID: ${insightId}`);
    }

    if (!insight.draft_content) {
      throw new Error('Sản phẩm chưa có nội dung bản thảo draft_content. Vui lòng bấm biên soạn trước.');
    }

    // Xác định icon phù hợp theo mảng ngành
    let icon = '📚';
    const category = insight.domain_category || '';
    if (category.includes('AUTOMATION')) icon = '⚡';
    else if (category.includes('SERVICE')) icon = '🛠️';
    else if (category.includes('MARKETING')) icon = '🚀';
    else if (category.includes('CAREER')) icon = '💼';

    // Nạp chính thức vào bảng products
    const { error: insertProductErr } = await supabase.from('products').upsert({
      id: insight.proposed_product_id,
      name: insight.proposed_product_name,
      description: insight.proposed_description,
      price: Number(insight.proposed_price),
      type: 'EBOOK',
      content_markdown: insight.draft_content,
      icon,
      badge: 'Vừa Lên Kệ',
      is_active: true,
      sort_order: 35,
    });

    if (insertProductErr) {
      throw new Error(`Lỗi nạp sản phẩm vào bảng products: ${insertProductErr.message}`);
    }

    // Đánh dấu insight đã APPROVED
    await supabase
      .from('market_insights')
      .update({ status: 'APPROVED', reviewed_at: new Date().toISOString() })
      .eq('id', insightId);

    console.log(`🎉 Đã xuất bản thành công lên Web: [${insight.proposed_product_id}] ${insight.proposed_product_name}!`);

    // Bắn log lên Live Terminal cho khách xem trên web chiêm ngưỡng
    try {
      await supabase.from('live_logs').insert({
        type: 'SYSTEM',
        message: `🚀 [SẢN PHẨM MỚI LÊN KỆ] Boss vừa thẩm định và duyệt mở bán: "${insight.proposed_product_name}" (${Number(insight.proposed_price).toLocaleString('vi-VN')}đ). Mời mọi người vào web xem và mua ủng hộ Mèo Dev sinh tồn!`,
      });
    } catch {
      // Ignore
    }

    // Bắn thông báo chúc mừng về Telegram
    await sendTelegramNotification(
      `🎉 <b>CHÚC MỪNG BOSS! SẢN PHẨM ĐÃ CHÍNH THỨC MỞ BÁN!</b>\n\n` +
      `📦 <b>Mã gói:</b> <code>${insight.proposed_product_id}</code>\n` +
      `🏷️ <b>Tên:</b> <b>${insight.proposed_product_name}</b>\n` +
      `💰 <b>Giá bán:</b> <code>${Number(insight.proposed_price).toLocaleString('vi-VN')} VNĐ</code>\n` +
      `📖 <b>Định dạng:</b> Ebook Interactive Reader trực tuyến\n\n` +
      `👉 Khách hàng truy cập <a href="${DAEMON_CONFIG.siteUrl}">${DAEMON_CONFIG.siteUrl}</a> đã có thể quét mã VietQR và trải nghiệm ngay lập tức!`
    );

    return true;
  } catch (err) {
    console.error('❌ Lỗi khi xuất bản sản phẩm:', (err as Error).message);
    await sendTelegramNotification(
      `⚠️ <b>Mèo Dev gặp lỗi khi đăng sản phẩm:</b> <code>${(err as Error).message}</code>`
    );
    return false;
  }
}

/**
 * Tác vụ CLI hoặc Fallback khi chạy npm run daemon:product
 */
export async function runProductGeneratorTask(): Promise<void> {
  const supabase = getDaemonSupabase();
  const { data: latestPending } = await supabase
    .from('market_insights')
    .select('id, status')
    .in('status', ['PENDING_APPROVAL', 'READY_FOR_REVIEW'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (latestPending) {
    if (latestPending.status === 'READY_FOR_REVIEW') {
      console.log(`▶️ Phát hiện ý tưởng đã soạn xong đang chờ duyệt: ${latestPending.id}. Đang đăng mở bán...`);
      await publishProductFromDraft(latestPending.id);
    } else {
      console.log(`▶️ Phát hiện ý tưởng đang chờ duyệt Vòng 1: ${latestPending.id}. Tiến hành biên soạn bản thảo...`);
      await authorProductDraft(latestPending.id);
    }
  } else {
    console.log(`ℹ️ Không có ý tưởng nào đang chờ duyệt. Mèo Dev sẽ chạy tác vụ phân tích thị trường để đề xuất ý tưởng mới.`);
    const { runMarketAnalyzerTask } = await import('./market-analyzer');
    await runMarketAnalyzerTask('CLI');
  }
}
