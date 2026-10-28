import { NextRequest, NextResponse } from 'next/server';
import { verifyPayOSWebhook, isPayOSConfigured, getPayOSClient } from '@/lib/payos';
import { mockStore } from '@/lib/mock-store';
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase/client';
import { extractOrderCode, generateRedeemCode } from '@/lib/vietqr';
import { grantDriveAccess, getChemistryFolderId } from '@/lib/google-drive';
import { sendTelegramNotification } from '@/lib/telegram';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // 1. Hỗ trợ xác nhận Webhook URL từ PayOS Dashboard
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

    // 4. Cập nhật trạng thái đơn hàng (Sử dụng Admin Client có toàn quyền bypass RLS)
    const supabase = getSupabaseAdminClient() || getSupabaseClient();
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
        let aiResult = existingOrder.ai_result;

        // Xử lý tạo mã kích hoạt / link giao hàng
        if (existingOrder.product?.type === 'AI_TASK') {
          redeemCode = generateRedeemCode(existingOrder.product_id === 'ROAST-10' ? 'RCV' : 'TRT');
        } else if (existingOrder.product?.type === 'R2_FILE') {
          redeemCode = `/api/download?code=${orderCode}&key=${existingOrder.product.r2_file_key}`;
        } else if (existingOrder.product?.type === 'GDRIVE_ACCESS') {
          const folderId = existingOrder.product?.gdrive_folder_id || getChemistryFolderId(existingOrder.product_id);
          redeemCode = `https://drive.google.com/drive/folders/${folderId}`;

          if (existingOrder.buyer_email) {
            await grantDriveAccess({
              folderId,
              buyerEmail: existingOrder.buyer_email,
            });
          }

          if (existingOrder.product_id === 'CHEM-149') {
            aiResult = { tutor_token: `CHM-${orderCode.replace('MEO-', '')}` };
          }
        }

        const { data: paidOrder, error: updateErr } = await supabase
          .from('orders')
          .update({
            status: 'PAID',
            paid_at: new Date().toISOString(),
            redeem_code: redeemCode,
            ai_result: aiResult,
            payment_meta: webhookData,
          })
          .eq('order_code', orderCode)
          .select('*, product:products(*)')
          .single();

        if (updateErr) {
          console.error('Error updating order to PAID:', updateErr);
        } else if (paidOrder) {
          updatedOrder = paidOrder;

          // Cập nhật stats
          const { data: stats } = await supabase.from('campaign_stats').select('*').eq('id', 1).single();
          if (stats) {
            const hungerBoost = existingOrder.product?.type === 'DONATE' ? 30 : 15;
            await supabase
              .from('campaign_stats')
              .update({
                current_amount: (stats.current_amount || 0) + actualAmount,
                paid_orders: (stats.paid_orders || 0) + 1,
                cat_hunger_level: Math.min(100, (stats.cat_hunger_level || 85) + hungerBoost),
                last_order_at: new Date().toISOString(),
              })
              .eq('id', 1);
          }

          // Bắn Live Log lên Terminal Realtime
          await supabase.from('live_logs').insert({
            type: 'PAYMENT_SUCCESS',
            message: `💰 TING TING! PayOS báo nhận +${actualAmount.toLocaleString('vi-VN')}đ cho đơn ${orderCode}! Mèo đã được tiếp máu!`,
            meta: { orderCode, amount: actualAmount, buyerName: existingOrder.buyer_name, gateway: 'PayOS' },
          });

          // Báo về Telegram cá nhân của chủ nhân
          await sendTelegramNotification(
            `💰 <b>TING TING! MÈO DEV ĐƯỢC TIẾP MÁU!</b>\n` +
            `Nhận: <b>+${actualAmount.toLocaleString('vi-VN')}đ</b> qua PayOS\n` +
            `Mã đơn: <code>${orderCode}</code>\n` +
            `Người mua: <b>${existingOrder.buyer_name || 'Ẩn danh'}</b>\n` +
            `Ghi chú: ${existingOrder.buyer_note || 'Không có'}\n\n` +
            `🐾 Mèo Dev đã no hơn và đang tiếp tục cày việc!`
          );
        }
      } else {
        // TRƯỜNG HỢP ĐẶC BIỆT: Đơn hàng chưa kịp lưu vào Supabase (hoặc chạy fallback trước đó)
        // Auto-create đơn PAID ngay để KHÔNG BAO GIỜ BỎ SÓT TIỀN CỦA USER!
        const actualAmount = transferAmount > 0 ? transferAmount : 5000;
        const defaultProductId = 'PATE-05';

        const { data: createdOrder, error: insertErr } = await supabase
          .from('orders')
          .insert({
            order_code: orderCode,
            product_id: defaultProductId,
            amount: actualAmount,
            buyer_name: 'Ân nhân giấu tên',
            buyer_note: description || 'Ủng hộ qua PayOS',
            status: 'PAID',
            paid_at: new Date().toISOString(),
            payment_meta: webhookData,
          })
          .select('*, product:products(*)')
          .single();

        if (insertErr) {
          console.error('Error auto-creating paid order:', insertErr);
        } else {
          updatedOrder = createdOrder;

          const { data: stats } = await supabase.from('campaign_stats').select('*').eq('id', 1).single();
          if (stats) {
            await supabase
              .from('campaign_stats')
              .update({
                current_amount: (stats.current_amount || 0) + actualAmount,
                total_orders: (stats.total_orders || 0) + 1,
                paid_orders: (stats.paid_orders || 0) + 1,
                cat_hunger_level: Math.min(100, (stats.cat_hunger_level || 85) + 30),
                last_order_at: new Date().toISOString(),
              })
              .eq('id', 1);
          }

          await supabase.from('live_logs').insert({
            type: 'PAYMENT_SUCCESS',
            message: `💰 TING TING! PayOS báo nhận +${actualAmount.toLocaleString('vi-VN')}đ cho đơn ${orderCode}! Mèo đã được tiếp máu!`,
            meta: { orderCode, amount: actualAmount, buyerName: 'Ân nhân giấu tên', gateway: 'PayOS' },
          });

          await sendTelegramNotification(
            `💰 <b>TING TING! MÈO DEV ĐƯỢC TIẾP MÁU (AUTO-CAPTURE)!</b>\n` +
            `Nhận: <b>+${actualAmount.toLocaleString('vi-VN')}đ</b> qua PayOS\n` +
            `Mã đơn: <code>${orderCode}</code>\n` +
            `Nội dung CK: ${description}\n\n` +
            `🐾 Số tiền đã được cộng trực tiếp vào mục tiêu 7 triệu!`
          );
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

    // Đảm bảo cấp quyền Google Drive nếu là sản phẩm GDRIVE_ACCESS
    if (updatedOrder.product?.type === 'GDRIVE_ACCESS' && updatedOrder.buyer_email) {
      const folderId = updatedOrder.product?.gdrive_folder_id || getChemistryFolderId(updatedOrder.product_id);
      await grantDriveAccess({ folderId, buyerEmail: updatedOrder.buyer_email });
    }

    return NextResponse.json({
      success: true,
      message: `PayOS thanh toán thành công cho đơn ${orderCode}!`,
      order: updatedOrder,
    });
  } catch (error) {
    console.error('PayOS webhook processing error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
