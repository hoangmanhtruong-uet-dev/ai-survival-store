import { NextRequest, NextResponse } from 'next/server';
import { mockStore } from '@/lib/mock-store';
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase/client';
import { getDownloadUrlForFile } from '@/lib/r2';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderCode = searchParams.get('code')?.toUpperCase().trim();
    const fileKey = searchParams.get('key')?.trim();

    if (!fileKey) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin file cần tải' }, { status: 400 });
    }

    // 1. Bản Preview miễn phí (SEC-07: Chỉ cho phép file preview thực sự có hậu tố -preview.pdf)
    const isExplicitPreview = searchParams.get('preview') === 'true';
    if (isExplicitPreview) {
      if (!fileKey.toLowerCase().endsWith('-preview.pdf')) {
        return NextResponse.json(
          { success: false, error: 'Chỉ được phép xem trước các tài liệu preview mẫu.' },
          { status: 403 }
        );
      }
      const downloadUrl = await getDownloadUrlForFile(fileKey);
      return NextResponse.redirect(new URL(downloadUrl, req.url));
    }

    // 2. Nếu là bản Full có tính phí: Bắt buộc phải có mã đơn hàng hợp lệ
    if (!orderCode) {
      return NextResponse.json({ success: false, error: 'Vui lòng cung cấp mã đơn hàng đã thanh toán' }, { status: 400 });
    }

    // Kiểm tra đơn hàng đã thanh toán trong DB và đúng sản phẩm đã mua (SEC-07: Product Binding)
    const supabase = getSupabaseAdminClient() || getSupabaseClient();
    let isPaid = false;
    let allowedFileKey: string | null = null;

    if (supabase) {
      const { data } = await supabase
        .from('orders')
        .select('status, product:products(r2_file_key)')
        .eq('order_code', orderCode)
        .single();

      isPaid = data?.status === 'PAID';
      const productObj = Array.isArray(data?.product) ? data.product[0] : data?.product;
      allowedFileKey = (productObj as { r2_file_key?: string } | null)?.r2_file_key || null;
    } else {
      const order = mockStore.getOrderByCode(orderCode);
      isPaid = order?.status === 'PAID';
      allowedFileKey = order?.product?.r2_file_key || null;
    }

    if (!isPaid) {
      return NextResponse.json(
        { success: false, error: 'Đơn hàng chưa thanh toán hoặc mã không hợp lệ! Vui lòng quét mã QR thanh toán để mở khóa bản Full.' },
        { status: 403 }
      );
    }

    if (!allowedFileKey || allowedFileKey !== fileKey) {
      return NextResponse.json(
        { success: false, error: 'Tệp tải về không thuộc sản phẩm trong đơn hàng đã thanh toán!' },
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
