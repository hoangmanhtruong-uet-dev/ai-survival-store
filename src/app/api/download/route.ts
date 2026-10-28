import { NextRequest, NextResponse } from 'next/server';
import { mockStore } from '@/lib/mock-store';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getDownloadUrlForFile } from '@/lib/r2';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderCode = searchParams.get('code')?.toUpperCase().trim();
    const fileKey = searchParams.get('key')?.trim();

    if (!orderCode || !fileKey) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin mã đơn hoặc file' }, { status: 400 });
    }

    // Kiểm tra đơn hàng đã thanh toán chưa
    const supabase = getSupabaseClient();
    let isPaid = false;

    if (supabase) {
      const { data } = await supabase.from('orders').select('status').eq('order_code', orderCode).single();
      isPaid = data?.status === 'PAID';
    } else {
      const order = mockStore.getOrderByCode(orderCode);
      isPaid = order?.status === 'PAID';
    }

    const isTestMode = orderCode === 'TEST' || searchParams.get('test') === 'true';

    if (!isPaid && !isTestMode) {
      // Trong giai đoạn test thử nghiệm, tự động cho phép tải file luôn
      const downloadUrl = await getDownloadUrlForFile(fileKey);
      return NextResponse.redirect(new URL(downloadUrl, req.url));
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
