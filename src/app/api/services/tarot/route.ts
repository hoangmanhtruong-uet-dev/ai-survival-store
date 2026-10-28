import { NextRequest, NextResponse } from 'next/server';
import { getTarotReading } from '@/lib/gemini';
import { mockStore } from '@/lib/mock-store';
import { getSupabaseClient } from '@/lib/supabase/client';
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

    const supabase = getSupabaseClient();
    if (supabase && process.env.NODE_ENV === 'production') {
      if (!validCode) {
        return NextResponse.json({ success: false, error: 'Vui lòng quét mã 10k để nhận mã bốc quẻ Tarot từ Thầy Mèo!' }, { status: 403 });
      }

      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .or(`redeem_code.eq.${validCode},order_code.eq.${validCode}`)
        .eq('status', 'PAID')
        .single();

      if (!order) {
        return NextResponse.json(
          { success: false, error: 'Mã bói quẻ không hợp lệ hoặc đơn hàng chưa thanh toán! Vui lòng quét mã 10k ủng hộ Mèo.' },
          { status: 403 }
        );
      }
    }

    const result = await getTarotReading(cleanQuestion, cleanBirthDate, category, selectedCardIds);

    const logMsg = `🔮 Thầy Mèo vừa bốc 3 lá luận quẻ [${category || 'Tổng quan'}]: "${cleanQuestion.slice(0, 40)}..."`;

    if (supabase) {
      await supabase.from('live_logs').insert({
        type: 'TASK_DONE',
        message: logMsg,
      });
      if (redeemCode) {
        await supabase.from('orders').update({ is_redeemed: true, ai_result: result }).eq('redeem_code', redeemCode);
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
