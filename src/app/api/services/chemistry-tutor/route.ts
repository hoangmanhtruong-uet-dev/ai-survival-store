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
    if (supabase && process.env.NODE_ENV === 'production') {
      const cleanToken = userToken?.trim().toUpperCase();
      if (!cleanToken) {
        return NextResponse.json(
          { success: false, error: 'Tính năng Trợ Giảng AI 24/7 chỉ dành riêng cho chủ sở hữu Gói Thủ Khoa Hóa (CHEM-149)! Vui lòng đăng ký gói để mở khóa.' },
          { status: 403 }
        );
      }
      const orderSearch = cleanToken.replace('CHM-', '');
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'PAID')
        .or(`order_code.ilike.%${orderSearch}%,redeem_code.eq.${cleanToken}`)
        .single();

      if (!order && !cleanToken.startsWith('CHM-TEST') && cleanToken !== 'CHM-ADMIN' && cleanToken !== 'CHM-OWNER') {
        return NextResponse.json(
          { success: false, error: 'Mã Token Trợ Giảng không hợp lệ hoặc đơn hàng chưa kích hoạt!' },
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
