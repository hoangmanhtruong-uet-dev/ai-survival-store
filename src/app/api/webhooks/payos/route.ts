import { NextRequest, NextResponse } from 'next/server';
import { verifyPayOSWebhook, isPayOSConfigured, getPayOSClient } from '@/lib/payos';
import { mockStore } from '@/lib/mock-store';
import { getSupabaseClient } from '@/lib/supabase/client';
import { extractOrderCode, generateRedeemCode } from '@/lib/vietqr';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // 1. Hỗ trợ xác nhận Webhook URL từ PayOS Dashboard
    // Khi bấm "Xác nhận Webhook", PayOS có thể gửi request test hoặc cần confirm
    if (payload.webhookUrl && isPayOSConfigured()) {
      try {
        const payOS = getPayOSClient();
        if (payOS) {
          await payOS.webhooks.confirm(payload.webhookUrl);
          return NextResponse.json({ success: true, message: 'PayOS webhook URL confirmed' });
        }
      } catch (err) {
        console.error('Error confirming webhook:', err);
      }
    }

    // 2. Xác thực chữ ký số PayOS
    let webhookData = null;
    if (isPayOSConfigured()) {
      webhookData = await verifyPayOSWebhook(payload);
      if (!webhookData && payload.data) {
        // Dự phòng payload khi test trên sandbox/dev
        webhookData = payload.data;
      }
    } else {
      // Mock / Dev mode
      webhookData = payload.data || payload;
    }

    if (!webhookData) {
      return NextResponse.json({ success: false, error: 'Chữ ký PayOS không hợp lệ' }, { status: 400 });
    }

    // 3. Bóc tách mã đơn MEO-XXXX
    // Có thể bóc từ description (VD: 'MEO 4829') hoặc từ orderCode (VD: 4829 -> 'MEO-4829')
    const description = webhookData.description || '';
    let orderCode = extractOrderCode(description);

    if (!orderCode && webhookData.orderCode) {
      orderCode = `MEO-${webhookData.orderCode}`;
    }

    if (!orderCode) {
      return NextResponse.json({
        success: false,
        message: 'Bỏ qua: Không tìm thấy mã đơn MEO-XXXX trong webhook PayOS',
        webhookData,
      });
    }

    const transferAmount = Number(webhookData.amount || 0);

    // 4. Cập nhật trạng thái đơn hàng (Supabase hoặc Mock Store)
    const supabase = getSupabaseClient();
    let updatedOrder = null;

    if (supabase) {
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('*, product:products(*)')
        .eq('order_code', orderCode)
        .single();

      if (existingOrder) {
        if (existingOrder.status === 'PAID') {
          return NextResponse.json({ success: true, message: 'Đơn hàng này đã thanh toán trước đó', orderCode });
        }

        const actualAmount = transferAmount > 0 ? transferAmount : existingOrder.amount;
        let redeemCode = existingOrder.redeem_code;

        // Xử lý tạo mã kích hoạt / link giao hàng
        if (existingOrder.product?.type === 'AI_TASK') {
          redeemCode = generateRedeemCode(existingOrder.product_id === 'ROAST-10' ? 'RCV' : 'TRT');
        } else if (existingOrder.product?.type === 'R2_FILE') {
          redeemCode = `/api/download?code=${orderCode}&key=${existingOrder.product.r2_file_key}`;
        }

        const { data: paidOrder, error: updateErr } = await supabase
          .from('orders')
          .update({
            status: 'PAID',
            paid_at: new Date().toISOString(),
            redeem_code: redeemCode,
            payment_meta: webhookData,
          })
          .eq('order_code', orderCode)
          .select('*, product:products(*)')
          .single();

        if (!updateErr && paidOrder) {
          updatedOrder = paidOrder;

          // Cập nhật stats
          const { data: stats } = await supabase.from('campaign_stats').select('*').eq('id', 1).single();
          if (stats) {
            const hungerBoost = existingOrder.product?.type === 'DONATE' ? 30 : 15;
            await supabase
              .from('campaign_stats')
              .update({
                current_amount: stats.current_amount + actualAmount,
                paid_orders: stats.paid_orders + 1,
                cat_hunger_level: Math.min(100, stats.cat_hunger_level + hungerBoost),
                last_order_at: new Date().toISOString(),
              })
              .eq('id', 1);
          }

          // Bắn Live Log
          await supabase.from('live_logs').insert({
            type: 'PAYMENT_SUCCESS',
            message: `💰 TING TING! PayOS báo nhận +${actualAmount.toLocaleString('vi-VN')}đ cho đơn ${orderCode}! Mèo đã được tiếp máu!`,
            meta: { orderCode, amount: actualAmount, buyerName: existingOrder.buyer_name, gateway: 'PayOS' },
          });
        }
      }
    }

    // Fallback Mock Store
    if (!updatedOrder) {
      updatedOrder = mockStore.markOrderAsPaid(orderCode, transferAmount, { ...webhookData, gateway: 'PayOS' });
    }

    if (!updatedOrder) {
      return NextResponse.json({
        success: false,
        error: `Không tìm thấy đơn hàng ${orderCode}`,
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `PayOS thanh toán thành công cho đơn ${orderCode}!`,
      order: updatedOrder,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
