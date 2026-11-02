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

    // SEC-11: Khử nguy cơ Stored XSS trong buyer_social_link
    let cleanSocialLink = '';
    if (typeof buyerSocialLink === 'string' && buyerSocialLink.trim()) {
      const trimmed = buyerSocialLink.trim();
      if (/^https:\/\/(www\.)?(facebook|threads|github|t\.me|zalo\.me)\.com?\//i.test(trimmed)) {
        cleanSocialLink = trimmed;
      }
    }

    const supabase = getSupabaseAdminClient() || getSupabaseClient();
    let order;

    if (supabase) {
      const { data: prodData } = await supabase.from('products').select('*').eq('id', targetProductId).single();
      const { data: stats } = await supabase.from('campaign_stats').select('last_order_at').eq('id', 1).single();

      // LOGIC-06: Kiểm tra Flash Sale kích cầu thực tế (nếu > 6 tiếng chưa có đơn)
      const lastOrderTime = stats?.last_order_at ? new Date(stats.last_order_at).getTime() : 0;
      const isFlashSaleActive = !stats?.last_order_at || (Date.now() - lastOrderTime >= 6 * 60 * 60 * 1000);

      // SEC-09: Ngăn chặn sửa đổi giá tùy ý qua customAmount (chỉ áp dụng cho gói DONATE / PATE-05)
      const isDonation = prodData?.type === 'DONATE' || targetProductId === 'PATE-05';
      let productPrice = isDonation
        ? Math.max(5000, Number(customAmount) || prodData?.price || 5000)
        : (prodData?.price || 5000);

      // Áp dụng giảm giá 15% cho các gói học/tài liệu nếu đang Giờ Vàng Flash Sale
      if (isFlashSaleActive && !isDonation && productPrice > 20000) {
        productPrice = Math.round((productPrice * 0.85) / 1000) * 1000;
      }

      // LOGIC-03: Thử tạo đơn hàng với retry loop chống va chạm mã UNIQUE
      for (let attempt = 0; attempt < 3; attempt++) {
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
            buyer_social_link: cleanSocialLink,
            ref_code: cleanRef || null,
            status: 'PENDING',
          })
          .select('*, product:products(*)')
          .single();

        if (!error && newOrder) {
          order = newOrder;
          const maskedEmail = cleanEmail ? cleanEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3') : undefined;
          const maskedCode = `${orderCode.slice(0, 4)}***`;

          await supabase.from('live_logs').insert({
            type: 'ORDER_CREATED',
            message: `🧾 Đã tạo đơn ${orderCode} (${prodData?.name || targetProductId} - ${productPrice.toLocaleString('vi-VN')}đ)${isFlashSaleActive && !isDonation ? ' [⚡ GIỜ VÀNG -15%]' : ''} - Chờ thanh toán...`,
            meta: { orderCode: maskedCode, amount: productPrice, productId: targetProductId, buyerEmail: maskedEmail },
          });
          break;
        } else {
          console.warn(`[Order Create Attempt ${attempt + 1}/3 Failed]`, error?.message);
        }
      }
    }

    if (!order) {
      order = mockStore.createOrder(targetProductId, cleanName, cleanNote, customAmount, cleanEmail, cleanRef);
    }

    // Mặc định sinh link VietQR
    let qrUrl = generateVietQRUrl(order.amount, order.order_code);
    let checkoutUrl: string | undefined = undefined;
    let isPayOS = false;
    let payOSRes: Awaited<ReturnType<typeof createPayOSPaymentLink>> = null;

    // Nếu cấu hình PayOS thì gọi PayOS API tạo Payment Link
    if (isPayOSConfigured()) {
      const origin = req.nextUrl.origin;
      payOSRes = await createPayOSPaymentLink({
        orderCodeStr: order.order_code,
        amount: order.amount,
        productName: order.product?.name || productId,
        origin,
      });

      if (payOSRes) {
        checkoutUrl = payOSRes.checkoutUrl;
        isPayOS = true;
        if (payOSRes.directQrUrl) {
          qrUrl = payOSRes.directQrUrl;
        }
      }
    }

    return NextResponse.json({
      success: true,
      order,
      qrUrl,
      checkoutUrl,
      isPayOS,
      payosAccount: isPayOS && payOSRes ? {
        bankId: 'MBBank (PayOS)',
        accountNo: payOSRes.accountNumber,
        accountName: payOSRes.accountName,
      } : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
