import { NextRequest, NextResponse } from 'next/server';
import { mockStore } from '@/lib/mock-store';
import { getSupabaseClient } from '@/lib/supabase/client';
import { generateVietQRUrl, generateOrderCode } from '@/lib/vietqr';
import { sanitizeBuyerName, filterProfanity } from '@/lib/profanity';
import { isPayOSConfigured, createPayOSPaymentLink } from '@/lib/payos';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, buyerName, buyerNote, customAmount, buyerSocialLink } = body;

    if (!productId) {
      return NextResponse.json({ success: false, error: 'Thiếu mã sản phẩm (productId)' }, { status: 400 });
    }

    const cleanName = sanitizeBuyerName(buyerName);
    const cleanNote = buyerNote ? filterProfanity(buyerNote) : '';
    const supabase = getSupabaseClient();

    let order;

    if (supabase) {
      const { data: prodData } = await supabase.from('products').select('*').eq('id', productId).single();
      const productPrice = customAmount || prodData?.price || 5000;
      const orderCode = generateOrderCode();

      const { data: newOrder, error } = await supabase
        .from('orders')
        .insert({
          order_code: orderCode,
          product_id: productId,
          amount: productPrice,
          buyer_name: cleanName,
          buyer_note: cleanNote,
          buyer_social_link: buyerSocialLink || '',
          status: 'PENDING',
        })
        .select('*, product:products(*)')
        .single();

      if (!error && newOrder) {
        order = newOrder;
        await supabase.from('live_logs').insert({
          type: 'ORDER_CREATED',
          message: `🧾 Đã tạo đơn ${orderCode} (${prodData?.name || productId} - ${productPrice.toLocaleString('vi-VN')}đ) - Chờ thanh toán...`,
          meta: { orderCode, amount: productPrice, productId },
        });
      }
    }

    if (!order) {
      order = mockStore.createOrder(productId, cleanName, cleanNote, customAmount);
    }

    // Mặc định sinh link VietQR
    let qrUrl = generateVietQRUrl(order.amount, order.order_code);
    let checkoutUrl: string | undefined = undefined;
    let isPayOS = false;

    // Nếu cấu hình PayOS thì gọi PayOS API tạo Payment Link
    if (isPayOSConfigured()) {
      const origin = req.nextUrl.origin;
      const payOSRes = await createPayOSPaymentLink({
        orderCodeStr: order.order_code,
        amount: order.amount,
        productName: order.product?.name || productId,
        origin,
      });

      if (payOSRes) {
        checkoutUrl = payOSRes.checkoutUrl;
        isPayOS = true;
        // Nếu PayOS trả về qrCode (chuỗi VietQR) ta có thể dùng hoặc giữ ảnh VietQR
        if (payOSRes.qrCode && payOSRes.qrCode.startsWith('http')) {
          qrUrl = payOSRes.qrCode;
        }
      }
    }

    return NextResponse.json({
      success: true,
      order,
      qrUrl,
      checkoutUrl,
      isPayOS,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
