import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase/client';
import { GoogleGenAI } from '@google/genai';
import { sendTelegramNotification } from '@/lib/telegram';

function verifyAdminToken(req: NextRequest, tokenFromQueryOrBody?: string | null): boolean {
  const adminSecret = process.env.ADMIN_SECRET_KEY || process.env.PAYMENT_WEBHOOK_SECRET;
  if (!adminSecret) return false;

  const authHeader = req.headers.get('authorization') || req.headers.get('x-admin-token') || '';
  const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();

  const token = (tokenFromQueryOrBody || bearerToken).trim();
  return token === adminSecret;
}

// GET: Hiển thị giao diện xác nhận duyệt sản phẩm cho Admin (Ngăn chặn crawler/prefetch tự ý kích hoạt)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const token = searchParams.get('token');

  if (!id) {
    return new NextResponse('Thiếu ID ý tưởng cần duyệt', { status: 400 });
  }

  if (!verifyAdminToken(req, token)) {
    return new NextResponse(
      '<html><body style="font-family:sans-serif;background:#09090b;color:#f43f5e;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;"><h1>⛔ 401 Unauthorized</h1><p>Bạn không có quyền truy cập endpoint quản trị này.</p></body></html>',
      { status: 401, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  const supabase = getSupabaseAdminClient() || getSupabaseClient();
  let insight = null;
  if (supabase) {
    const { data } = await supabase.from('market_insights').select('*').eq('id', id).single();
    insight = data;
  }

  if (!insight) {
    return new NextResponse(
      '<html><body style="font-family:sans-serif;background:#09090b;color:#e4e4e7;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;"><h1>🔍 Không tìm thấy ý tưởng</h1><p>Ý tưởng này không tồn tại trong hệ thống hoặc đã bị xóa.</p></body></html>',
      { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Xác nhận Duyệt Sản Phẩm - Mèo Dev</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #09090b; color: #f4f4f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
    .card { background: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 32px; max-width: 560px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    h1 { margin-top: 0; font-size: 20px; color: #10b981; display: flex; align-items: center; gap: 8px; }
    .badge { display: inline-block; background: #27272a; color: #38bdf8; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 12px; }
    .detail { background: #09090b; border: 1px solid #27272a; border-radius: 10px; padding: 16px; margin: 16px 0; font-size: 14px; line-height: 1.6; }
    .price { color: #f59e0b; font-weight: bold; font-size: 18px; margin: 8px 0; }
    .btn-group { display: flex; gap: 12px; margin-top: 24px; }
    button { flex: 1; padding: 12px 20px; border-radius: 10px; border: none; font-weight: bold; font-size: 15px; cursor: pointer; transition: 0.2s; }
    .btn-approve { background: #10b981; color: #09090b; }
    .btn-approve:hover { background: #059669; }
    .btn-reject { background: #27272a; color: #ef4444; }
    .btn-reject:hover { background: #3f3f46; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Ca phân tích: ${insight.cycle_time || 'Gần nhất'}</div>
    <h1>🚀 Xác nhận Duyệt Mở Bán Sản Phẩm</h1>
    <div class="detail">
      <div><b>Mã:</b> <code>${insight.proposed_product_id}</code></div>
      <div><b>Tên sản phẩm:</b> <b>${insight.proposed_product_name}</b></div>
      <div class="price">Giá bán: ${Number(insight.proposed_price).toLocaleString('vi-VN')} VNĐ</div>
      <p style="color:#a1a1aa; margin: 8px 0 0 0;">${insight.proposed_description || 'Không có mô tả'}</p>
    </div>

    <form method="POST" action="/api/admin/approve-product">
      <input type="hidden" name="id" value="${id}">
      <input type="hidden" name="token" value="${token || ''}">
      <div class="btn-group">
        <button type="submit" name="action" value="approve" class="btn-approve">✓ Duyệt & Xuất Bản Ngay</button>
        <button type="submit" name="action" value="reject" class="btn-reject">✕ Từ Chối / Hủy</button>
      </div>
    </form>
  </div>
</body>
</html>`;

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

// POST: Thực hiện mutation phê duyệt hoặc từ chối sản phẩm (SEC-05)
export async function POST(req: NextRequest) {
  let id: string | null = null;
  let action = 'approve';
  let token: string | null = null;

  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const body = await req.json();
    id = body.id;
    action = body.action || 'approve';
    token = body.token;
  } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    id = formData.get('id') as string;
    action = (formData.get('action') as string) || 'approve';
    token = formData.get('token') as string;
  } else {
    const { searchParams } = new URL(req.url);
    id = searchParams.get('id');
    action = searchParams.get('action') || 'approve';
    token = searchParams.get('token');
  }

  if (!id) {
    return NextResponse.json({ success: false, error: 'Thiếu ID ý tưởng cần duyệt' }, { status: 400 });
  }

  if (!verifyAdminToken(req, token)) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Token quản trị không hợp lệ' }, { status: 401 });
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

  // Lấy thông tin insight từ DB (SEC-05: Tuyệt đối không fallback dữ liệu giả định)
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Dịch vụ CSDL Supabase không khả dụng' }, { status: 500 });
  }

  const { data: insight } = await supabase.from('market_insights').select('*').eq('id', id).single();
  if (!insight) {
    return NextResponse.json({ success: false, error: 'Không tìm thấy ý tưởng sản phẩm trong hệ thống' }, { status: 404 });
  }

  await supabase.from('market_insights').update({ status: 'APPROVED', reviewed_at: new Date().toISOString() }).eq('id', id);

  // Gọi Gemini biên soạn nội dung nếu chưa có sẵn draft_content
  let markdown = insight.draft_content;
  if (!markdown) {
    const apiKey = (process.env.GEMINI_API_KEY || '').split(/[,;\n]/)[0].trim();
    markdown = `# ${insight.proposed_product_name}\n\n> *Tác giả: Mèo Dev | Bản quyền thực chiến 2026*\n\n## 1. Giới thiệu & Bản đồ tư duy\nTài liệu độc quyền giúp bạn bứt phá kiến thức nhanh chóng.\n\n## 2. Kỹ thuật thực chiến cốt lõi\n- Phương pháp 30 giây\n- Công thức tra nhanh\n\n> [!TIP]\n> Hãy luyện tập 15 phút mỗi ngày để thành thạo kỹ năng này!`;

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
          model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
          contents: prompt,
        });
        if (response.text) {
          markdown = response.text;
        }
      } catch {
        // Giữ fallback markdown
      }
    }
  }

  // Nạp vào bảng products
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
    message: `🚀 [SẢN PHẨM MỚI] Boss vừa bấm duyệt qua Web! Mèo Dev đã hoàn thành: "${insight.proposed_product_name}" (${Number(insight.proposed_price).toLocaleString('vi-VN')}đ)! Mời ghé xem!`,
  });

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
