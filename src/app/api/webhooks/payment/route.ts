import { NextRequest, NextResponse } from 'next/server';
import { mockStore } from '@/lib/mock-store';
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase/client';
import { extractOrderCode, generateRedeemCode } from '@/lib/vietqr';
import { grantDriveAccess, getChemistryFolderId } from '@/lib/google-drive';
import { sendTelegramNotification } from '@/lib/telegram';
import { isPayOSConfigured, getPayOSClient, verifyPayOSWebhook } from '@/lib/payos';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // Hỗ trợ confirm webhook nếu PayOS gửi tới URL này
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

    // 1. Xác thực chữ ký và token bảo mật (SEC-06 & ENV-03)
    const isPayOSPayload = Boolean(payload.signature || (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data) && payload.data.orderCode));
    
    if (isPayOSPayload) {
      if (isPayOSConfigured()) {
        const verified = await verifyPayOSWebhook(payload);
        if (!verified) {
          return NextResponse.json({ success: false, error: 'Chữ ký PayOS không hợp lệ' }, { status: 400 });
        }
      } else if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ success: false, error: 'PayOS chưa được cấu hình' }, { status: 500 });
      }
    } else if (payload.orderCode && !payload.data && !payload.content && !payload.transferAmount) {
      // Trường hợp Dev Simulator: Tuyệt đối chỉ cho phép trên local dev
      if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ success: false, error: 'Dev Simulator bị vô hiệu hóa trên môi trường production' }, { status: 403 });
      }
    } else {
      // Trường hợp SePay / Casso: Bắt buộc xác thực bí mật PAYMENT_WEBHOOK_SECRET
      const authHeader = req.headers.get('authorization') || req.headers.get('x-api-key') || '';
      const configuredSecret = process.env.PAYMENT_WEBHOOK_SECRET;
      const token = authHeader.replace(/^Apikey\s+/i, '').replace(/^Bearer\s+/i, '').trim();

      if (configuredSecret) {
        if (token !== configuredSecret) {
          return NextResponse.json({ success: false, error: 'Unauthorized webhook call' }, { status: 401 });
        }
      } else if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ success: false, error: 'PAYMENT_WEBHOOK_SECRET chưa được cấu hình' }, { status: 500 });
      }
    }

    // 2. Chuẩn hóa trích xuất dữ liệu từ SePay hoặc Casso hoặc PayOS hoặc Dev Simulator
    let content = '';
    let transferAmount = 0;
    let rawOrderCode: string | null = null;
    let paymentMeta = payload;
    let gatewayName = 'VietQR';

    // Trường hợp 1: Dev Simulator trực tiếp (chỉ trên dev)
    if (payload.orderCode && !payload.data && !payload.content && !payload.transferAmount) {
      if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ success: false, error: 'Dev Simulator bị vô hiệu hóa trên môi trường production' }, { status: 403 });
      }
      rawOrderCode = payload.orderCode;
      transferAmount = Number(payload.amount || 0);
      gatewayName = 'Simulator';
    }
    // Trường hợp 2: Casso Webhook ({ error: 0, data: [...] })
    else if (payload.data && Array.isArray(payload.data) && payload.data.length > 0) {
      const item = payload.data[0];
      content = item.description || '';
      transferAmount = Number(item.amount || 0);
      paymentMeta = item;
      gatewayName = 'Casso';
    }
    // Trường hợp 3: SePay Webhook ({ id, content, transferAmount, ... })
    else if (payload.content !== undefined || payload.transferAmount !== undefined) {
      content = payload.content || '';
      transferAmount = Number(payload.transferAmount || 0);
      paymentMeta = payload;
      gatewayName = 'SePay';
    }
    // Trường hợp 4: PayOS Webhook ({ code: "00", data: { orderCode, amount, description, ... }, signature: "..." })
    else if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data) && payload.data.orderCode) {
      content = payload.data.description || '';
      transferAmount = Number(payload.data.amount || 0);
      rawOrderCode = `MEO-${payload.data.orderCode}`;
      paymentMeta = payload.data;
      gatewayName = 'PayOS';
    }

    // Nếu chưa có trực tiếp orderCode thì bóc tách bằng Regex từ content/description
    const orderCode = rawOrderCode ? rawOrderCode.toUpperCase().trim() : extractOrderCode(content);

    if (!orderCode) {
      return NextResponse.json({
        success: false,
        message: 'Bỏ qua: Không tìm thấy cú pháp mã đơn MEO-XXXX trong nội dung chuyển khoản',
        content,
      });
    }

    // 3. Xử lý cập nhật đơn hàng (Sử dụng Admin Client có toàn quyền bypass RLS)
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
          return NextResponse.json({ success: true, message: 'Đơn hàng này đã được thanh toán trước đó', orderCode });
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
            payment_meta: paymentMeta,
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
            message: `💰 TING TING! Nhận thành công +${actualAmount.toLocaleString('vi-VN')}đ cho đơn ${orderCode} qua ${gatewayName}! Mèo được tiếp máu!`,
            meta: { orderCode, amount: actualAmount, buyerName: existingOrder.buyer_name, gateway: gatewayName },
          });

          // Báo về Telegram
          await sendTelegramNotification(
            `💰 <b>TING TING! MÈO DEV ĐƯỢC TIẾP MÁU!</b>\n` +
            `Nhận: <b>+${actualAmount.toLocaleString('vi-VN')}đ</b> qua ${gatewayName}\n` +
            `Mã đơn: <code>${orderCode}</code>\n` +
            `Người mua: <b>${existingOrder.buyer_name || 'Ẩn danh'}</b>\n` +
            (existingOrder.ref_code ? `Nguồn (Ref): <code>${existingOrder.ref_code}</code>\n` : '') +
            `Ghi chú: ${existingOrder.buyer_note || 'Không có'}\n\n` +
            `🐾 Mèo Dev đã no hơn và đang tiếp tục cày việc!`
          );
        }
      } else {
        // AUTO-CAPTURE KHI ĐƠN CHƯA CÓ TRONG DB
        const actualAmount = transferAmount > 0 ? transferAmount : 5000;
        const defaultProductId = 'PATE-05';

        const { data: createdOrder, error: insertErr } = await supabase
          .from('orders')
          .insert({
            order_code: orderCode,
            product_id: defaultProductId,
            amount: actualAmount,
            buyer_name: 'Ân nhân giấu tên',
            buyer_note: content || `Ủng hộ qua ${gatewayName}`,
            status: 'PAID',
            paid_at: new Date().toISOString(),
            payment_meta: paymentMeta,
          })
          .select('*, product:products(*)')
          .single();

        if (insertErr) {
          console.error('Error auto-creating paid order in payment webhook:', insertErr);
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
            message: `💰 TING TING! Nhận thành công +${actualAmount.toLocaleString('vi-VN')}đ cho đơn ${orderCode} qua ${gatewayName}! Mèo được tiếp máu!`,
            meta: { orderCode, amount: actualAmount, buyerName: 'Ân nhân giấu tên', gateway: gatewayName },
          });

          await sendTelegramNotification(
            `💰 <b>TING TING! MÈO DEV ĐƯỢC TIẾP MÁU (AUTO-CAPTURE)!</b>\n` +
            `Nhận: <b>+${actualAmount.toLocaleString('vi-VN')}đ</b> qua ${gatewayName}\n` +
            `Mã đơn: <code>${orderCode}</code>\n` +
            `Nội dung CK: ${content}\n\n` +
            `🐾 Đã cộng trực tiếp vào mục tiêu 7 triệu!`
          );
        }
      }
    }

    // Fallback Mock Store
    if (!updatedOrder) {
      updatedOrder = mockStore.markOrderAsPaid(orderCode, transferAmount, paymentMeta);
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
      message: `Cập nhật thanh toán thành công cho đơn ${orderCode}!`,
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Payment webhook error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
