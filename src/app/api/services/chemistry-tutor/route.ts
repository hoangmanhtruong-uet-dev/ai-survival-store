import { NextRequest, NextResponse } from 'next/server';
import { solveChemistryProblem } from '@/lib/gemini';
import { mockStore } from '@/lib/mock-store';
import { getSupabaseClient } from '@/lib/supabase/client';

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

    // Giải bài toán bằng Gemini 3.5 Flash Lite
    const solution = await solveChemistryProblem(
      question || '',
      imageBase64,
      imageMimeType || 'image/jpeg'
    );

    // Ghi nhận log lên Live Feed
    const logMsg = '🔬 Trợ Giảng Hóa Mèo Dev vừa giải xong 1 câu bẫy Vận dụng cao và mách nước Casio 30s!';
    const supabase = getSupabaseClient();
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
