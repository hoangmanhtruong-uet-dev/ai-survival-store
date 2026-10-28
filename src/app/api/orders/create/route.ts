import { NextRequest, NextResponse } from 'next/server';
import { mockStore } from '@/lib/mock-store';
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase/client';
import { generateVietQRUrl, generateOrderCode } from '@/lib/vietqr';
import { sanitizeBuyerName, filterProfanity } from '@/lib/profanity';
import { isPayOSConfigured, createPayOSPaymentLink } from '@/lib/payos';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, buyerName, buyerEmail, buyerNote, customAmount, buyerSocialLink, refCode } = body;

    if (!productId) {
      return NextResponse.json({ success: false, error: 'Thiếu mã sản phẩm (productId)' }, { status: 400 });
    }

    // Nếu truyền mã gói chung CHEM-PACK thì mặc định gán vào gói All-in CHEM-149
    const targetProductId = productId === 'CHEM-PACK' ? 'CHEM-149' : productId;

    const cleanName = sanitizeBuyerName(buyerName);
    const cleanNote = buyerNote ? filterProfanity(buyerNote) : '';
    const cleanEmail = buyerEmail ? buyerEmail.trim().toLowerCase() : undefined;
    const cleanRef = refCode ? refCode.trim().toUpperCase() : undefined;
    const supabase = getSupabaseAdminClient() || getSupabaseClient();

    let order;

    if (supabase) {
      const { data: prodData } = await supabase.from('products').select('*').eq('id', targetProductId).single();
      const productPrice = customAmount || prodData?.price || 5000;
      const orderCode = generateOrderCode();

      const { data: newOrder, error } = await supabase
        .from('orders')
        .insert({
          order_code: orderCode,
          product_id: targetProductId,
          amount: productPrice,
          buyer_name: cleanName,
          buyer_email: cleanEmail || null,
          buyer_note: cleanNote,
          buyer_social_link: buyerSocialLink || '',
          ref_code: cleanRef || null,
          status: 'PENDING',
        })
        .select('*, product:products(*)')
        .single();

      if (error) {
        console.error('Error inserting order into Supabase:', error);
      } else if (newOrder) {
        order = newOrder;
        await supabase.from('live_logs').insert({
          type: 'ORDER_CREATED',
          message: `🧾 Đã tạo đơn ${orderCode} (${prodData?.name || targetProductId} - ${productPrice.toLocaleString('vi-VN')}đ) - Chờ thanh toán...`,
          meta: { orderCode, amount: productPrice, productId: targetProductId, buyerEmail: cleanEmail },
        });
      }
    }

    if (!order) {
      order = mockStore.createOrder(targetProductId, cleanName, cleanNote, customAmount, cleanEmail, cleanRef);
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
