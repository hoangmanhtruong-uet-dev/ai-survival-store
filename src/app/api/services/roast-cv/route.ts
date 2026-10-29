import { NextRequest, NextResponse } from 'next/server';
import { roastCVContent } from '@/lib/gemini';
import { mockStore } from '@/lib/mock-store';
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase/client';
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

    const supabase = getSupabaseAdminClient() || getSupabaseClient();
    if (supabase) {
      const isDevBypass = process.env.NODE_ENV === 'development' && validCode === 'RCV-FREE-TEST';
      
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .or(`redeem_code.eq.${validCode},order_code.eq.${validCode}`)
        .eq('status', 'PAID')
        .single();

      if (!order && !isDevBypass) {
        return NextResponse.json(
          { success: false, error: 'Mã kích hoạt không hợp lệ hoặc đơn hàng chưa thanh toán! Vui lòng quét mã 10k để ủng hộ Mèo Dev.' },
          { status: 403 }
        );
      }

      // SEC-08: Kiểm tra chống tái sử dụng token (Trả về kết quả đã sấy trước đó nếu có)
      if (order && order.is_redeemed && order.ai_result?.roastReport) {
        return NextResponse.json({
          success: true,
          report: order.ai_result.roastReport,
          cached: true,
          message: 'Báo cáo sấy CV trước đó đã được tải lại thành công.',
        });
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
      // Đánh dấu mã đã dùng (SEC-08)
      await supabase
        .from('orders')
        .update({ is_redeemed: true, ai_result: { roastReport } })
        .or(`redeem_code.eq.${validCode},order_code.eq.${validCode}`);
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
