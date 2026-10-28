import { NextRequest, NextResponse } from 'next/server';
import { roastCVContent } from '@/lib/gemini';
import { mockStore } from '@/lib/mock-store';
import { getSupabaseClient } from '@/lib/supabase/client';
import { scrubPII } from '@/lib/profanity';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { redeemCode, cvText, pdfBase64 } = body;

    if ((!cvText || cvText.trim().length < 10) && !pdfBase64) {
      return NextResponse.json({ success: false, error: 'Vui lòng nhập nội dung CV hoặc tải lên file PDF' }, { status: 400 });
    }

    const validCode = redeemCode?.trim().toUpperCase();

    if (!validCode) {
      return NextResponse.json({ success: false, error: 'Vui lòng nhập mã kích hoạt hoặc quét mã đơn hàng 10.000đ để sấy CV' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    if (supabase && process.env.NODE_ENV === 'production') {
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .or(`redeem_code.eq.${validCode},order_code.eq.${validCode}`)
        .eq('status', 'PAID')
        .single();

      if (!order) {
        return NextResponse.json(
          { success: false, error: 'Mã kích hoạt không hợp lệ hoặc đơn hàng chưa thanh toán! Vui lòng quét mã 10k để ủng hộ Mèo Dev.' },
          { status: 403 }
        );
      }
    }

    // Che PII trước khi đưa vào AI và phát sóng
    const safeCVText = cvText ? scrubPII(cvText) : 'File PDF đính kèm';

    // Tạo báo cáo sấy từ Gemini
    const roastReport = await roastCVContent(safeCVText, pdfBase64);

    // Trích xuất highlight đắt giá để bắn lên Live Terminal công cộng
    const highlightMatches = roastReport.match(/\[HIGHLIGHT\]\s*([^\n]+)/g);
    let punchline = 'Mèo vừa sấy chín một CV Junior đòi lương 30 củ nhưng quên link Github!';
    if (highlightMatches && highlightMatches.length > 0) {
      punchline = highlightMatches[0].replace(/\[HIGHLIGHT\]\s*/, '').replace(/["']/g, '');
    }

    const logMsg = `🔥 Mèo vừa sấy CV mã [${validCode}]: "${punchline.slice(0, 70)}..."`;

    if (supabase) {
      await supabase.from('live_logs').insert({
        type: 'TASK_DONE',
        message: logMsg,
      });
      // Đánh dấu mã đã dùng
      await supabase.from('orders').update({ is_redeemed: true, ai_result: { roastReport } }).eq('redeem_code', redeemCode);
    } else {
      mockStore.addLog('TASK_DONE', logMsg);
    }

    return NextResponse.json({
      success: true,
      report: roastReport,
      highlight: punchline,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
