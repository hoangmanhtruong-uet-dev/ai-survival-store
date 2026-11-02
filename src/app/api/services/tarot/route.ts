import { NextRequest, NextResponse } from 'next/server';
import { getTarotReading } from '@/lib/gemini';
import { mockStore } from '@/lib/mock-store';
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase/client';
import { filterProfanity } from '@/lib/profanity';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { redeemCode, question, birthDate, category, selectedCardIds } = body;

    if (!question || question.trim().length < 3) {
      return NextResponse.json({ success: false, error: 'Vui lòng nhập câu hỏi cần bói quẻ' }, { status: 400 });
    }

    const cleanQuestion = filterProfanity(question.trim());
    const cleanBirthDate = birthDate || '2000-01-01';

    // SEC-07: Chuẩn hóa và làm sạch redeemCode
    const rawCode = typeof redeemCode === 'string' ? redeemCode.trim().toUpperCase() : '';
    const validCode = rawCode.replace(/[^A-Z0-9\-_]/g, '');

    if (!validCode) {
      return NextResponse.json({ success: false, error: 'Vui lòng quét mã 10k để nhận mã bốc quẻ Tarot từ Thầy Mèo!' }, { status: 403 });
    }

    const isDevBypass = process.env.NODE_ENV === 'development' && validCode === 'TRT-FREE-TEST';
    const supabase = getSupabaseAdminClient() || getSupabaseClient();
    let isAuthorized = false;

    if (supabase) {
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .or(`redeem_code.eq.${validCode},order_code.eq.${validCode}`)
        .eq('status', 'PAID')
        .single();

      if (order) {
        // LOGIC-07: Xác thực đơn hàng thuộc gói TAROT-10
        if (order.product_id !== 'TAROT-10' && !isDevBypass) {
          return NextResponse.json(
            { success: false, error: 'Mã đơn hàng này không thuộc Gói Bói Tarot (TAROT-10)! Vui lòng sử dụng đúng mã đơn mua dịch vụ Tarot.' },
            { status: 403 }
          );
        }

        // SEC-04: Trả lại quẻ cũ nếu token đã từng được sử dụng
        if (order.is_redeemed && order.ai_result) {
          return NextResponse.json({
            success: true,
            ...order.ai_result,
            cached: true,
            message: 'Quẻ Tarot trước đó đã được tải lại thành công từ cơ sở dữ liệu.',
          });
        }

        isAuthorized = true;
      }
    } else {
      const mockOrder = mockStore.getOrderByCode(validCode);
      if (mockOrder && mockOrder.status === 'PAID') {
        if (mockOrder.product_id !== 'TAROT-10' && !isDevBypass) {
          return NextResponse.json(
            { success: false, error: 'Mã đơn hàng này không thuộc Gói Bói Tarot (TAROT-10)!' },
            { status: 403 }
          );
        }
        if (mockOrder.is_redeemed && mockOrder.ai_result) {
          return NextResponse.json({
            success: true,
            ...mockOrder.ai_result,
            cached: true,
            message: 'Quẻ Tarot trước đó đã được tải lại thành công.',
          });
        }
        isAuthorized = true;
      }
    }

    if (!isAuthorized && !isDevBypass) {
      return NextResponse.json(
        { success: false, error: 'Mã bói quẻ không hợp lệ hoặc đơn hàng chưa thanh toán! Vui lòng quét mã 10k ủng hộ Mèo.' },
        { status: 403 }
      );
    }

    const result = await getTarotReading(cleanQuestion, cleanBirthDate, category, selectedCardIds);
    const logMsg = `🔮 Thầy Mèo vừa bốc 3 lá luận quẻ [${category || 'Tổng quan'}]: "${cleanQuestion.slice(0, 40)}..."`;

    if (supabase) {
      await supabase.from('live_logs').insert({
        type: 'TASK_DONE',
        message: logMsg,
      });
      if (validCode) {
        await supabase
          .from('orders')
          .update({ is_redeemed: true, ai_result: result })
          .or(`redeem_code.eq.${validCode},order_code.eq.${validCode}`);
      }
    } else {
      mockStore.addLog('TASK_DONE', logMsg);
      const mockOrder = mockStore.getOrderByCode(validCode);
      if (mockOrder) {
        mockOrder.is_redeemed = true;
        mockOrder.ai_result = result as unknown as Record<string, unknown>;
      }
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
