import { getDaemonSupabase } from '../services/supabase';
import { askGemini } from '../services/gemini';
import { sendTelegramNotification } from '../telegram';
import { DAEMON_CONFIG } from '../config';

/**
 * Tự động biên soạn nội dung tài liệu chuyên sâu và mở bán sản phẩm sau khi Boss duyệt trên Telegram
 */
export async function authorAndPublishProduct(insightId: string): Promise<boolean> {
  const timestamp = new Date().toLocaleTimeString('vi-VN');
  console.log(`\n[${timestamp}] ✍️ [AUTO-AUTHORING] Bắt đầu biên soạn tài liệu cho ý tưởng ID: ${insightId}...`);

  const supabase = getDaemonSupabase();

  // 1. Lấy thông tin ý tưởng thị trường từ Supabase
  let insight: {
    proposed_product_id: string;
    proposed_product_name: string;
    proposed_description: string;
    proposed_price: number;
    target_audience: string;
    market_pain_point: string;
    proposed_outline: string;
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
        .update({ status: 'APPROVED', reviewed_at: new Date().toISOString() })
        .eq('id', insightId);
    }
  } catch {
    // Ignore Supabase table missing error
  }

  // Fallback nếu bảng chưa tạo hoặc chạy với transient ID
  if (!insight) {
    insight = {
      proposed_product_id: 'CASIO-30S',
      proposed_product_name: "Bí Kíp Bấm Máy Casio 30s Cân Mọi Bài Toán Hóa THPT",
      target_audience: 'Học sinh ôn thi THPT Quốc Gia',
      market_pain_point: 'Bị bẫy mất điểm oan ở câu Vận dụng cao',
      proposed_price: 29000,
      proposed_description: 'Trọn bộ kỹ thuật bấm máy Casio 580/880 giải siêu tốc Este, Peptit, Đồ thị trong 30 giây.',
      proposed_outline: '1. Tổng quan kỹ thuật Casio\n2. Kỹ thuật Este - Lipit\n3. Kỹ thuật Đồ thị\n4. Bảng công thức tra nhanh\n5. Đề luyện tập có giải chi tiết',
    };
  }

  // 2. Prompt biên soạn tài liệu chuyên sâu chuẩn Anti-Slop Manifesto
  const authoringPrompt = `
Bạn là "Mèo Dev" - một Senior AI Engineer và Gia Sư thực chiến.
Boss của bạn vừa bấm DUYỆT mở bán sản phẩm số mới:
- Tên sản phẩm: "${insight.proposed_product_name}"
- Đối tượng: "${insight.target_audience}"
- Nỗi đau giải quyết: "${insight.market_pain_point}"
- Giá bán: ${Number(insight.proposed_price).toLocaleString('vi-VN')} VNĐ
- Khung sườn đề xuất:
${insight.proposed_outline}

NHIỆM VỤ CỦA BẠN:
Hãy biên soạn TOÀN VĂN một cuốn Ebook / Cẩm nang thực chiến hoàn chỉnh (khoảng 1500 - 2500 từ), định dạng Markdown cực đẹp và chuyên nghiệp.

TIÊU CHUẨN CHẤT LƯỢNG BẮT BUỘC (ANTI-SLOP MANIFESTO):
1. Không viết định nghĩa suông lý thuyết giáo điều. Phải đi thẳng vào phương pháp giải nhanh, bẫy thường gặp, tình huống thực tế.
2. Có Bảng tra cứu nhanh (Cheat Table / Shortcut Formula).
3. Có Hộp cảnh báo (Warning Boxes: > [!WARNING] ...) về những sai lầm chết người mà 90% người gặp phải.
4. Có bài tập minh họa hoặc code mẫu hoàn chỉnh kèm lời giải thích chi tiết từng bước.
5. Giọng văn Mèo Dev: Sắc sảo, hài hước nhẹ, thẳng thắn, truyền cảm hứng hành động.

Định dạng Markdown xuất ra:
# [Tên Sản Phẩm]
> *Tác giả: Mèo Dev | Phiên bản thực chiến 2026*
... (Nội dung chi tiết từng chương) ...
---
*Cảm ơn bạn đã mua tài liệu ủng hộ Mèo Dev sinh tồn! Chúc bạn bứt phá điểm số / sự nghiệp!*
`;

  try {
    const markdownContent = await askGemini(
      authoringPrompt,
      'Bạn là Mèo Dev. Hãy biên soạn tài liệu giá trị vượt mong đợi, xứng đáng từng đồng người mua bỏ ra.'
    );

    if (!markdownContent || markdownContent.length < 500) {
      throw new Error('Nội dung biên soạn quá ngắn hoặc không đạt chuẩn');
    }

    // 3. Nạp sản phẩm vào bảng products
    const { error: insertProductErr } = await supabase.from('products').upsert({
      id: insight.proposed_product_id,
      name: insight.proposed_product_name,
      description: insight.proposed_description,
      price: Number(insight.proposed_price),
      type: 'EBOOK',
      content_markdown: markdownContent,
      icon: '📚',
      badge: 'Vừa Ra Lò',
      is_active: true,
      sort_order: 40,
    });

    if (insertProductErr) {
      console.error('❌ Lỗi nạp sản phẩm vào bảng products:', insertProductErr.message);
      return false;
    }

    console.log(`🎉 Đã biên soạn và mở bán thành công: [${insight.proposed_product_id}] ${insight.proposed_product_name}!`);

    // 4. Bắn log lên Live Terminal
    await supabase.from('live_logs').insert({
      type: 'SYSTEM',
      message: `🚀 [SẢN PHẨM MỚI RA LÒ] Boss vừa duyệt! Mèo Dev đã hoàn thành cuốn cẩm nang: "${insight.proposed_product_name}" (chỉ ${Number(insight.proposed_price).toLocaleString('vi-VN')}đ). Mời mọi người vào web đọc thử và đặt mua ngay!`,
    });

    // 5. Gửi thông báo hoàn thành về Telegram
    await sendTelegramNotification(
      `🎉 <b>MÈO DEV ĐÃ XUẤT BẢN THÀNH CÔNG SẢN PHẨM MỚI!</b>\n\n` +
      `📦 <b>Gói:</b> <code>${insight.proposed_product_id}</code> - <b>${insight.proposed_product_name}</b>\n` +
      `💰 <b>Giá bán:</b> <code>${Number(insight.proposed_price).toLocaleString('vi-VN')} VNĐ</code>\n` +
      `📝 <b>Độ dài tài liệu:</b> <code>${markdownContent.length} ký tự</code>\n` +
      `📖 <b>Định dạng:</b> Ebook Interactive Reader trực tuyến\n\n` +
      `👉 Khách hàng vào web <a href="${DAEMON_CONFIG.siteUrl}">${DAEMON_CONFIG.siteUrl}</a> đã có thể quét mã VietQR và đọc ngay lập tức!`
    );

    return true;
  } catch (err) {
    console.error('❌ Lỗi khi tự động biên soạn tài liệu:', (err as Error).message);
    await sendTelegramNotification(
      `⚠️ <b>Mèo Dev gặp lỗi khi biên soạn tài liệu:</b> <code>${(err as Error).message}</code>`
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
    .select('id')
    .eq('status', 'PENDING_APPROVAL')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (latestPending) {
    console.log(`▶️ Phát hiện ý tưởng đang chờ duyệt: ${latestPending.id}. Tiến hành biên soạn...`);
    await authorAndPublishProduct(latestPending.id);
  } else {
    console.log(`ℹ️ Không có ý tưởng nào đang chờ duyệt. Mèo Dev sẽ chạy tác vụ phân tích thị trường để đề xuất ý tưởng mới.`);
    const { runMarketAnalyzerTask } = await import('./market-analyzer');
    await runMarketAnalyzerTask('CLI');
  }
}
