import { NextRequest, NextResponse } from 'next/server';
import { mockStore } from '@/lib/mock-store';
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase/client';
import { scrubPII } from '@/lib/profanity';
import { verifyAndConsumeActivationCode } from '@/lib/activation-code';
import { Order } from '@/types';
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

    // 4. Kiểm tra mã kích hoạt (Activation Code / VIP Key) HOẶC Đơn hàng thanh toán (SEC-08)
    const supabase = getSupabaseAdminClient() || getSupabaseClient();
    let isAuthorized = false;
    let authSource = '';
    let associatedOrder: Order | null = null;

    // 4.1 Thử xác thực qua hệ thống Mã kích hoạt chuyên biệt (Activation Codes / Master Keys)
    const activationCheck = await verifyAndConsumeActivationCode(validCode, 'ROAST-10');
    if (activationCheck.valid) {
      isAuthorized = true;
      authSource = activationCheck.source || 'ACTIVATION_CODE';
    }

    // 4.2 Nếu không phải mã kích hoạt chuyên biệt, kiểm tra đơn hàng đã thanh toán qua Supabase hoặc mockStore
    if (!isAuthorized) {
      if (supabase) {
        const isDevBypass =
          process.env.NODE_ENV === 'development' &&
          (validCode === 'RCV-FREE-TEST' || validCode.startsWith('RCV-TEST'));

        const { data: order } = await supabase
          .from('orders')
          .select('*')
          .or(`redeem_code.eq.${validCode},order_code.eq.${validCode}`)
          .eq('status', 'PAID')
          .single();

        if (order) {
          // Xác thực đơn hàng thuộc gói ROAST-10
          if (order.product_id !== 'ROAST-10' && !isDevBypass) {
            return NextResponse.json(
              {
                success: false,
                error: 'Mã đơn hàng này không thuộc Gói Sấy CV (ROAST-10)! Vui lòng sử dụng đúng mã đơn mua gói sấy CV.',
              },
              { status: 403 }
            );
          }

          associatedOrder = order;
          isAuthorized = true;
          authSource = 'ORDER_PAID';

          // SEC-08: Kiểm tra chống tái sử dụng token (Trả về kết quả đã sấy trước đó nếu có)
          if (order.is_redeemed && order.ai_result) {
            const cachedResult = order.ai_result as Record<string, unknown>;
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
                message: 'Báo cáo sấy CV trước đó đã được tải lại thành công từ cơ sở dữ liệu.',
              });
            }
          }
        } else if (isDevBypass) {
          isAuthorized = true;
          authSource = 'DEV_BYPASS';
        }
      } else {
        // Fallback kiểm tra trong mockStore
        const mockOrder = mockStore.getOrderByCode(validCode);
        if (mockOrder && mockOrder.status === 'PAID') {
          isAuthorized = true;
          associatedOrder = mockOrder;
          authSource = 'MOCK_STORE';
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

    if (supabase) {
      await supabase.from('live_logs').insert({
        type: 'TASK_DONE',
        message: logMsg,
        meta: {
          redeemCode: validCode,
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
      if (associatedOrder) {
        associatedOrder.is_redeemed = true;
        associatedOrder.ai_result = {
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
