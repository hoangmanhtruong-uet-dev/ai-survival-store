import { NextRequest, NextResponse } from 'next/server';
import { solveChemistryProblem } from '@/lib/gemini';
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

    const supabase = getSupabaseAdminClient() || getSupabaseClient();
    if (supabase) {
      const cleanToken = typeof userToken === 'string' ? userToken.trim().toUpperCase() : '';
      if (!cleanToken) {
        return NextResponse.json(
          { success: false, error: 'Tính năng Trợ Giảng AI 24/7 chỉ dành riêng cho chủ sở hữu Gói Thủ Khoa Hóa (CHEM-149)! Vui lòng đăng ký gói để mở khóa.' },
          { status: 403 }
        );
      }

      // Format token có thể là MEO-XXXX hoặc CHM-XXXX
      const exactCode = cleanToken.startsWith('CHM-') ? `MEO-${cleanToken.replace('CHM-', '')}` : cleanToken;
      
      const { data: order } = await supabase
        .from('orders')
        .select('id, status, product_id, order_code, redeem_code')
        .eq('status', 'PAID')
        .or(`order_code.eq.${exactCode},redeem_code.eq.${cleanToken}`)
        .single();

      const isDevBypass = process.env.NODE_ENV === 'development' && cleanToken.startsWith('CHM-TEST');

      if (!order && !isDevBypass) {
        return NextResponse.json(
          { success: false, error: 'Mã Token Trợ Giảng không hợp lệ hoặc đơn hàng chưa kích hoạt!' },
          { status: 403 }
        );
      }

      // Kiểm tra gói mua có bao gồm quyền trợ giảng (CHEM-149)
      if (order && order.product_id !== 'CHEM-149') {
        return NextResponse.json(
          { success: false, error: 'Chỉ gói Thủ Khoa Hóa (CHEM-149) mới có quyền sử dụng Trợ Giảng AI 24/7.' },
          { status: 403 }
        );
      }
    }

    // Giải bài toán bằng Gemini 3.5 Flash Lite
    const solution = await solveChemistryProblem(
      question || '',
      imageBase64,
      imageMimeType || 'image/jpeg'
    );

    // Ghi nhận log lên Live Feed
    const logMsg = '🔬 Trợ Giảng Hóa Mèo Dev vừa giải xong 1 câu bẫy Vận dụng cao và mách nước Casio 30s!';
    if (supabase) {
      await supabase.from('live_logs').insert({
        type: 'TASK_DONE',
        message: logMsg,
        meta: { userToken, hasImage: Boolean(imageBase64) },
      });
    } else {
      mockStore.addLog('TASK_DONE', logMsg, { userToken, hasImage: Boolean(imageBase64) });
    }

    return NextResponse.json({
      success: true,
      solution,
      model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
    });
  } catch (error) {
    console.error('[Chemistry Tutor API Error]', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
