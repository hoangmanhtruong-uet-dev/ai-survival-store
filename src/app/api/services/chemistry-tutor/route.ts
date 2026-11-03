import { NextRequest, NextResponse } from 'next/server';
import { solveChemistryProblem, getGeminiModel } from '@/lib/gemini';
import { mockStore } from '@/lib/mock-store';
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, imageBase64, imageMimeType, userToken } = body;

    if (!question && !imageBase64) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng nhập nội dung câu hỏi hoặc tải ảnh đề bài!' },
        { status: 400 }
      );
    }

    // SEC-07: Khử nguy cơ PostgREST Filter Injection và chuẩn hóa Token
    const rawToken = typeof userToken === 'string' ? userToken.trim().toUpperCase() : '';
    const cleanToken = rawToken.replace(/[^A-Z0-9\-_]/g, '');

    if (!cleanToken || cleanToken.length < 4 || cleanToken.length > 25) {
      return NextResponse.json(
        { success: false, error: 'Tính năng Trợ Giảng AI 24/7 chỉ dành riêng cho chủ sở hữu Gói Thủ Khoa Hóa (CHEM-149)! Vui lòng nhập token hợp lệ.' },
        { status: 403 }
      );
    }

    const isDevBypass = process.env.NODE_ENV === 'development' && cleanToken.startsWith('CHM-TEST');
    const exactCode = cleanToken.startsWith('CHM-') ? `MEO-${cleanToken.replace('CHM-', '')}` : cleanToken;

    const supabase = getSupabaseAdminClient() || getSupabaseClient();
    let isAuthorized = false;

    if (supabase) {
      const { data: order } = await supabase
        .from('orders')
        .select('id, status, product_id, order_code, redeem_code')
        .eq('status', 'PAID')
        .or(`order_code.eq.${exactCode},redeem_code.eq.${cleanToken}`)
        .single();

      if (order) {
        if (order.product_id === 'CHEM-149') {
          isAuthorized = true;
        } else {
          return NextResponse.json(
            { success: false, error: 'Chỉ gói Thủ Khoa Hóa (CHEM-149) mới có quyền sử dụng Trợ Giảng AI 24/7.' },
            { status: 403 }
          );
        }
      }
    } else {
      const mockOrder = mockStore.getOrderByCode(exactCode) || mockStore.getOrderByCode(cleanToken);
      if (mockOrder && mockOrder.status === 'PAID' && mockOrder.product_id === 'CHEM-149') {
        isAuthorized = true;
      }
    }

    if (!isAuthorized && !isDevBypass) {
      return NextResponse.json(
        { success: false, error: 'Mã Token Trợ Giảng không hợp lệ hoặc đơn hàng chưa kích hoạt gói CHEM-149!' },
        { status: 403 }
      );
    }

    // Giải bài toán bằng Gemini
    const solution = await solveChemistryProblem(
      question || '',
      imageBase64,
      imageMimeType || 'image/jpeg'
    );

    // Ghi nhận log lên Live Feed
    const logMsg = '🔬 Trợ Giảng Hóa Mèo Dev vừa giải xong 1 câu bẫy Vận dụng cao và mách nước Casio 30s!';
    const maskedToken = cleanToken.length > 5 ? `${cleanToken.slice(0, 4)}***` : '***';

    if (supabase) {
      await supabase.from('live_logs').insert({
        type: 'TASK_DONE',
        message: logMsg,
        meta: { userToken: maskedToken, hasImage: Boolean(imageBase64) },
      });
    } else {
      mockStore.addLog('TASK_DONE', logMsg, { userToken: maskedToken, hasImage: Boolean(imageBase64) });
    }

    return NextResponse.json({
      success: true,
      solution,
      model: getGeminiModel(),
    });
  } catch (error) {
    console.error('[Chemistry Tutor API Error]', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
