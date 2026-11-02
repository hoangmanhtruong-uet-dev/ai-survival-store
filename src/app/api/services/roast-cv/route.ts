import { NextRequest, NextResponse } from 'next/server';
import { mockStore } from '@/lib/mock-store';
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase/client';
import { scrubPII } from '@/lib/profanity';
import { verifyAndConsumeActivationCode } from '@/lib/activation-code';
import {
  roastCVContentAdvanced,
  checkIpRateLimit,
  SpicyLevel,
  ExperienceLevel,
  RoastStructuredData,
} from '@/lib/cv-roaster';

export async function POST(req: NextRequest) {
  try {
    // 1. In-memory Rate Limiting per IP to prevent spam & protect Gemini quota
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const clientIp = (forwardedFor ? forwardedFor.split(',')[0].trim() : realIp) || '127.0.0.1';

    const rateCheck = checkIpRateLimit(clientIp, 15, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Mèo Dev đang quá tải vì sấy quá nhiều CV cùng lúc! Huynh đài vui lòng chờ 1 phút rồi bấm lại nhé.',
        },
        { status: 429 }
      );
    }

    // 2. Parse request body
    const body = await req.json();
    const {
      redeemCode,
      cvText,
      pdfBase64,
      targetRole,
      spicyLevel,
      experienceLevel,
      language,
    } = body;

    // 3. Validate inputs
    const validCode = typeof redeemCode === 'string' ? redeemCode.trim().toUpperCase() : '';
    if (!validCode) {
      return NextResponse.json(
        {
          success: false,
          error: 'Vui lòng nhập mã kích hoạt hoặc quét mã đơn hàng 10.000đ (ROAST-10) để sấy CV.',
        },
        { status: 400 }
      );
    }

    const hasText = typeof cvText === 'string' && cvText.trim().length >= 10;
    const hasPdf = typeof pdfBase64 === 'string' && pdfBase64.trim().length > 50;

    if (!hasText && !hasPdf) {
      return NextResponse.json(
        {
          success: false,
          error: 'Vui lòng nhập nội dung CV (tối thiểu 10 ký tự) hoặc tải lên file PDF hợp lệ.',
        },
        { status: 400 }
      );
    }

    // Chặn payload quá khổ để chống DoS
    if (cvText && typeof cvText === 'string' && cvText.length > 40000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Nội dung CV quá dài (tối đa 40.000 ký tự)! Vui lòng tóm gọn lại phần kinh nghiệm chính.',
        },
        { status: 400 }
      );
    }

    if (pdfBase64 && typeof pdfBase64 === 'string' && pdfBase64.length > 14 * 1024 * 1024) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tệp PDF đính kèm vượt quá giới hạn 10MB! Vui lòng nén file hoặc dùng file dung lượng nhỏ hơn.',
        },
        { status: 400 }
      );
    }

    const cleanTargetRole = typeof targetRole === 'string' ? targetRole.trim().slice(0, 80) : undefined;
    const cleanSpicyLevel: SpicyLevel = ['MILD', 'MEDIUM', 'SAVAGE'].includes(spicyLevel) ? spicyLevel : 'SAVAGE';
    const cleanExpLevel: ExperienceLevel = ['intern', 'fresher', 'junior', 'middle', 'senior', 'lead'].includes(experienceLevel)
      ? experienceLevel
      : 'junior';

    // 4. Kiểm tra mã kích hoạt (Activation Code / VIP Key) HOẶC Đơn hàng thanh toán (SEC-08 & SEC-04)
    const supabase = getSupabaseAdminClient() || getSupabaseClient();
    let isAuthorized = false;
    let authSource = '';

    // 4.1 Thử xác thực qua hệ thống Mã kích hoạt chuyên biệt hoặc đơn hàng đã thanh toán
    const activationCheck = await verifyAndConsumeActivationCode(validCode, 'ROAST-10');
    if (activationCheck.valid && activationCheck.codeData?.is_active !== false) {
      isAuthorized = true;
      authSource = activationCheck.source || 'ACTIVATION_CODE';
    } else {
      // SEC-04: Nếu mã/đơn đã được sử dụng trước đó, trả lại kết quả đã lưu trong database thay vì sấy lại
      if (supabase) {
        const { data: cachedOrder } = await supabase
          .from('orders')
          .select('*')
          .or(`redeem_code.eq.${validCode},order_code.eq.${validCode}`)
          .eq('status', 'PAID')
          .single();

        if (cachedOrder && cachedOrder.is_redeemed && cachedOrder.ai_result) {
          const cachedResult = cachedOrder.ai_result as Record<string, unknown>;
          const cachedReport = (cachedResult.roastReport as string) || (cachedResult.report as string);
          if (cachedReport) {
            return NextResponse.json({
              success: true,
              report: cachedReport,
              highlight: (cachedResult.highlight as string) || 'Báo cáo sấy CV trước đó đã được tải lại thành công.',
              score: (cachedResult.score as number) ?? (cachedResult.atsScore as number) ?? 50,
              atsScore: (cachedResult.atsScore as number) ?? (cachedResult.score as number) ?? 50,
              verdict: (cachedResult.verdict as string) || 'Báo cáo đã lưu',
              structuredData: (cachedResult.structuredData as RoastStructuredData) || undefined,
              targetRole: (cachedResult.targetRole as string) || cleanTargetRole,
              spicyLevel: (cachedResult.spicyLevel as SpicyLevel) || cleanSpicyLevel,
              cached: true,
              message: 'Mã này đã từng được sử dụng. Báo cáo sấy CV trước đó đã được tải lại thành công từ cơ sở dữ liệu.',
            });
          }
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error:
            activationCheck.error ||
            'Mã kích hoạt không hợp lệ, đã hết lượt sử dụng hoặc đơn hàng chưa thanh toán! Vui lòng kiểm tra lại mã hoặc quét mã 10k ủng hộ Mèo Dev.',
        },
        { status: 403 }
      );
    }

    // 5. Che thông tin cá nhân (PII) trước khi đưa vào AI và phát sóng Live Feed
    const safeCVText = cvText ? scrubPII(cvText) : 'File PDF đính kèm';

    // 6. Thực thi sấy CV với Gemini AI (hỗ trợ Key Rotation & Fallback Engine)
    const result = await roastCVContentAdvanced(safeCVText, pdfBase64, {
      targetRole: cleanTargetRole,
      spicyLevel: cleanSpicyLevel,
      experienceLevel: cleanExpLevel,
      language: language === 'en' ? 'en' : 'vi',
    });

    // 7. Ghi nhận log lên Live Terminal công cộng
    const roleTag = cleanTargetRole ? ` [${cleanTargetRole.slice(0, 25)}]` : '';
    const logMsg = `🔥 Mèo vừa sấy chín CV${roleTag} (ATS: ${result.atsScore}/100): "${result.highlight.slice(0, 65)}..."`;

    const maskedRedeemCode = validCode.length > 5 
      ? `${validCode.slice(0, 3)}***${validCode.slice(-2)}` 
      : '***';

    if (supabase) {
      await supabase.from('live_logs').insert({
        type: 'TASK_DONE',
        message: logMsg,
        meta: {
          redeemCode: maskedRedeemCode,
          authSource,
          atsScore: result.atsScore,
          targetRole: cleanTargetRole,
          spicyLevel: cleanSpicyLevel,
        },
      });

      // Đánh dấu mã/đơn đã dùng (SEC-08) và lưu kết quả đầy đủ
      await supabase
        .from('orders')
        .update({
          is_redeemed: true,
          ai_result: {
            roastReport: result.report,
            report: result.report,
            highlight: result.highlight,
            score: result.score,
            atsScore: result.atsScore,
            verdict: result.verdict,
            structuredData: result.structuredData,
            targetRole: cleanTargetRole,
            spicyLevel: cleanSpicyLevel,
            redeemed_at: new Date().toISOString(),
          },
        })
        .or(`redeem_code.eq.${validCode},order_code.eq.${validCode}`);
    } else {
      mockStore.addLog('TASK_DONE', logMsg, { atsScore: result.atsScore, authSource });
      const mockOrder = mockStore.getOrderByCode(validCode);
      if (mockOrder) {
        mockOrder.is_redeemed = true;
        mockOrder.ai_result = {
          report: result.report,
          score: result.score,
          atsScore: result.atsScore,
        };
      }
    }

    // 8. Trả về kết quả hoàn chỉnh, tương thích ngược 100% với frontend cũ
    return NextResponse.json({
      success: true,
      report: result.report,
      highlight: result.highlight,
      score: result.score,
      atsScore: result.atsScore,
      verdict: result.verdict,
      structuredData: result.structuredData,
      targetRole: cleanTargetRole,
      spicyLevel: cleanSpicyLevel,
    });
  } catch (error) {
    console.error('[Roast CV API Error]', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Có lỗi xảy ra khi xử lý CV' },
      { status: 500 }
    );
  }
}
