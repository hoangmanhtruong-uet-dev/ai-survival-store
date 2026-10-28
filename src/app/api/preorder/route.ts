import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase/client';
import { sendTelegramNotification } from '@/lib/telegram';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body.email?.trim().toLowerCase();
    const packageId = body.packageId || 'CHEM-PACK';
    const name = body.name?.trim() || 'Học sinh 2k8';

    if (!email || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'Email không hợp lệ' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient() || getSupabaseClient();
    const maskedEmail = email.replace(/(.{2})(.*)(?=@)/, '$1***');

    if (supabase) {
      // 1. Thử lưu vào bảng preorders nếu có, hoặc lưu vào bảng orders với amount = 0
      const orderCode = `PRE-${Math.floor(1000 + Math.random() * 9000)}`;
      try {
        await supabase.from('orders').insert({
          order_code: orderCode,
          product_id: packageId,
          amount: 0,
          status: 'PENDING',
          buyer_name: name,
          buyer_email: email,
          buyer_note: 'ĐĂNG KÝ SỚM PRE-ORDER 0Đ (NHẬN VOUCHER 20%)',
          is_redeemed: false,
        });
      } catch {
        // Ignore fallback
      }

      // 2. Bắn log lên Live Terminal
      try {
        await supabase.from('live_logs').insert({
          type: 'SYSTEM',
          message: `🎯 [ĐĂNG KÝ SỚM] Học sinh (${maskedEmail}) vừa đăng ký giữ chỗ Gói Đề Hóa & nhận quà thi thử Free!`,
        });
      } catch {
        // Ignore
      }
    }

    // 3. Gửi thông báo về Telegram cho chủ nhân
    await sendTelegramNotification(
      `🎯 <b>CÓ HỌC SINH ĐĂNG KÝ SỚM GÓI ĐỀ HÓA!</b>\n\n` +
      `• <b>Họ tên:</b> ${name}\n` +
      `• <b>Gmail:</b> <code>${email}</code>\n` +
      `• <b>Gói quan tâm:</b> <code>${packageId}</code>\n\n` +
      `<i>Mèo Dev đã lưu danh sách và cấp mã Voucher <b>MEO20</b> cho bạn học sinh này!</i>`
    );

    return NextResponse.json({
      success: true,
      message: 'Đăng ký giữ chỗ thành công! Chúc bạn ôn thi tốt!',
      voucher: 'MEO20',
      previewDownloadUrl: '/api/download?preview=true&key=chem-12-lo-trinh.pdf',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
