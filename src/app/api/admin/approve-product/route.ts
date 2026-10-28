import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase/client';
import { GoogleGenAI } from '@google/genai';
import { sendTelegramNotification } from '@/lib/telegram';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const action = searchParams.get('action') || 'approve';

  if (!id) {
    return new NextResponse('Thiếu ID ý tưởng cần duyệt', { status: 400 });
  }

  const supabase = getSupabaseAdminClient() || getSupabaseClient();

  if (action === 'reject') {
    if (supabase) {
      await supabase.from('market_insights').update({ status: 'REJECTED' }).eq('id', id);
    }
    return new NextResponse(
      '<html><body style="font-family:sans-serif;background:#09090b;color:#f43f5e;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;"><h1>🗑️ Đã Hủy Ý Tưởng Này!</h1><p style="color:#a1a1aa;">Bạn có thể đóng tab này lại.</p></body></html>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  // Lấy thông tin insight
  let insight: {
    proposed_product_id: string;
    proposed_product_name: string;
    proposed_description: string;
    proposed_price: number;
    target_audience: string;
    market_pain_point: string;
    proposed_outline: string;
  } | null = null;

  if (supabase) {
    const { data } = await supabase.from('market_insights').select('*').eq('id', id).single();
    if (data) {
      insight = data;
      await supabase.from('market_insights').update({ status: 'APPROVED', reviewed_at: new Date().toISOString() }).eq('id', id);
    }
  }

  if (!insight) {
    insight = {
      proposed_product_id: 'CASIO-30S',
      proposed_product_name: 'Bí Kíp Bấm Máy Casio 30s Cân Mọi Bài Toán Hóa THPT',
      target_audience: 'Học sinh ôn thi THPT Quốc Gia',
      market_pain_point: 'Bị bẫy mất điểm oan ở câu Vận dụng cao',
      proposed_price: 29000,
      proposed_description: 'Trọn bộ kỹ thuật bấm máy Casio 580/880 giải siêu tốc Este, Peptit, Đồ thị trong 30 giây.',
      proposed_outline: '1. Kỹ thuật Casio Este\n2. Kỹ thuật Peptit\n3. Kỹ thuật Đồ thị\n4. Bảng công thức tra nhanh\n5. Đề rèn luyện',
    };
  }

  // Gọi Gemini biên soạn nội dung
  const apiKey = (process.env.GEMINI_API_KEY || '').split(/[,;\n]/)[0].trim();
  let markdown = `# ${insight.proposed_product_name}\n\n> *Tác giả: Mèo Dev | Bản quyền thực chiến 2026*\n\n## 1. Giới thiệu & Bản đồ tư duy\nTài liệu độc quyền giúp bạn bứt phá kiến thức nhanh chóng.\n\n## 2. Kỹ thuật thực chiến cốt lõi\n- Phương pháp 30 giây\n- Công thức tra nhanh\n\n> [!TIP]\n> Hãy luyện tập 15 phút mỗi ngày để thành thạo kỹ năng này!`;

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
Bạn là "Mèo Dev". Hãy biên soạn toàn văn cuốn cẩm nang thực chiến (Markdown):
- Tên: ${insight.proposed_product_name}
- Nỗi đau: ${insight.market_pain_point}
- Mục lục:
${insight.proposed_outline}

Yêu cầu: Có bảng tra cứu nhanh, hộp cảnh báo > [!WARNING] và ví dụ cụ thể.
`;
      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        contents: prompt,
      });
      if (response.text) {
        markdown = response.text;
      }
    } catch {
      // Fallback markdown
    }
  }

  // Nạp vào bảng products
  if (supabase) {
    await supabase.from('products').upsert({
      id: insight.proposed_product_id,
      name: insight.proposed_product_name,
      description: insight.proposed_description,
      price: Number(insight.proposed_price),
      type: 'EBOOK',
      content_markdown: markdown,
      icon: '📚',
      badge: 'Vừa Ra Lò',
      is_active: true,
      sort_order: 40,
    });

    await supabase.from('live_logs').insert({
      type: 'SYSTEM',
      message: `🚀 [SẢN PHẨM MỚI] Boss vừa bấm duyệt qua Web! Mèo Dev đã hoàn thành: "${insight.proposed_product_name}" (${insight.proposed_price.toLocaleString('vi-VN')}đ)! Mời ghé xem!`,
    });
  }

  await sendTelegramNotification(
    `🎉 <b>MÈO DEV ĐÃ XUẤT BẢN THÀNH CÔNG SẢN PHẨM MỚI!</b>\n\n` +
    `📦 <b>Gói:</b> <code>${insight.proposed_product_id}</code> - <b>${insight.proposed_product_name}</b>\n` +
    `💰 <b>Giá bán:</b> <code>${Number(insight.proposed_price).toLocaleString('vi-VN')} VNĐ</code>\n` +
    `👉 Khách vào Web đã có thể mua và đọc trực tiếp ngay!`
  );

  return new NextResponse(
    `<html><head><meta charset="utf-8"><title>Duyệt Thành Công</title></head><body style="font-family:sans-serif;background:#09090b;color:#10b981;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;text-align:center;padding:20px;"><div style="background:#18181b;border:1px solid #27272a;border-radius:24px;padding:32px;max-width:500px;"><h1 style="margin:0 0 12px 0;">🎉 ĐÃ DUYỆT & MỞ BÁN!</h1><p style="color:#e4e4e7;font-size:16px;margin:0 0 16px 0;">Sản phẩm <b>${insight.proposed_product_name}</b> (${Number(insight.proposed_price).toLocaleString('vi-VN')}đ) đã được nạp lên Store!</p><a href="/" style="display:inline-block;background:#10b981;color:#09090b;font-weight:bold;padding:10px 20px;border-radius:12px;text-decoration:none;">Về Trang Chủ Xem Sản Phẩm</a></div></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}
