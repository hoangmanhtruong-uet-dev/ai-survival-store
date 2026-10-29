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
    const validCode = redeemCode?.trim().toUpperCase();

    const supabase = getSupabaseAdminClient() || getSupabaseClient();
    if (supabase) {
      if (!validCode) {
        return NextResponse.json({ success: false, error: 'Vui lòng quét mã 10k để nhận mã bốc quẻ Tarot từ Thầy Mèo!' }, { status: 403 });
      }

      const isDevBypass = process.env.NODE_ENV === 'development' && validCode === 'TRT-FREE-TEST';

      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .or(`redeem_code.eq.${validCode},order_code.eq.${validCode}`)
        .eq('status', 'PAID')
        .single();

      if (!order && !isDevBypass) {
        return NextResponse.json(
          { success: false, error: 'Mã bói quẻ không hợp lệ hoặc đơn hàng chưa thanh toán! Vui lòng quét mã 10k ủng hộ Mèo.' },
          { status: 403 }
        );
      }

      // SEC-08: Kiểm tra chống tái sử dụng token (Trả về kết quả quẻ trước đó nếu có)
      if (order && order.is_redeemed && order.ai_result) {
        return NextResponse.json({
          success: true,
          ...order.ai_result,
          cached: true,
          message: 'Quẻ Tarot trước đó đã được tải lại thành công.',
        });
      }
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
