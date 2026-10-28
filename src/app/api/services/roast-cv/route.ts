import { NextRequest, NextResponse } from 'next/server';
import { roastCVContent } from '@/lib/gemini';
import { mockStore } from '@/lib/mock-store';
import { getSupabaseClient } from '@/lib/supabase/client';
import { scrubPII } from '@/lib/profanity';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { redeemCode, cvText } = body;

    if (!cvText || cvText.trim().length < 20) {
      return NextResponse.json({ success: false, error: 'Nội dung CV quá ngắn hoặc trống' }, { status: 400 });
    }

    // Chấp nhận mã RCV-XXXX hoặc bất kỳ mã test nào khi đang thử nghiệm
    const validCode = redeemCode?.trim().toUpperCase() || 'RCV-TEST-MODE';

    // Che PII trước khi đưa vào AI và phát sóng
    const safeCVText = scrubPII(cvText);

    // Tạo báo cáo sấy từ Gemini
    const roastReport = await roastCVContent(safeCVText);

    // Trích xuất highlight đắt giá để bắn lên Live Terminal công cộng
    const highlightMatches = roastReport.match(/\[HIGHLIGHT\]\s*([^\n]+)/g);
    let punchline = 'Mèo vừa sấy chín một CV Junior đòi lương 30 củ nhưng quên link Github!';
    if (highlightMatches && highlightMatches.length > 0) {
      punchline = highlightMatches[0].replace(/\[HIGHLIGHT\]\s*/, '').replace(/["']/g, '');
    }

    const logMsg = `🔥 Mèo vừa sấy CV mã [${validCode}]: "${punchline.slice(0, 70)}..."`;

    const supabase = getSupabaseClient();
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
