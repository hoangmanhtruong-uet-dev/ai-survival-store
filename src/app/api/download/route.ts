import { NextRequest, NextResponse } from 'next/server';
import { mockStore } from '@/lib/mock-store';
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase/client';
import { getDownloadUrlForFile } from '@/lib/r2';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderCode = searchParams.get('code')?.toUpperCase().trim();
    const fileKey = searchParams.get('key')?.trim();
    const isPreview = searchParams.get('preview') === 'true' || fileKey?.includes('preview') || orderCode === 'PREVIEW';

    if (!fileKey) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin file cần tải' }, { status: 400 });
    }

    // 1. Nếu là bản Preview miễn phí: Cho phép tải ngay lập tức, không cần order code
    if (isPreview) {
      const downloadUrl = await getDownloadUrlForFile(fileKey);
      return NextResponse.redirect(new URL(downloadUrl, req.url));
    }

    // 2. Nếu là bản Full có tính phí: Bắt buộc phải có mã đơn hàng hợp lệ
    if (!orderCode) {
      return NextResponse.json({ success: false, error: 'Vui lòng cung cấp mã đơn hàng đã thanh toán' }, { status: 400 });
    }

    // Kiểm tra đơn hàng đã thanh toán trong DB
    const supabase = getSupabaseAdminClient() || getSupabaseClient();
    let isPaid = false;

    if (supabase) {
      const { data } = await supabase.from('orders').select('status').eq('order_code', orderCode).single();
      isPaid = data?.status === 'PAID';
    } else {
      const order = mockStore.getOrderByCode(orderCode);
      isPaid = order?.status === 'PAID';
    }

    if (!isPaid) {
      return NextResponse.json(
        { success: false, error: 'Đơn hàng chưa thanh toán hoặc mã không hợp lệ! Vui lòng quét mã QR thanh toán để mở khóa bản Full.' },
        { status: 403 }
      );
    }

    const downloadUrl = await getDownloadUrlForFile(fileKey);
    return NextResponse.redirect(new URL(downloadUrl, req.url));
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
