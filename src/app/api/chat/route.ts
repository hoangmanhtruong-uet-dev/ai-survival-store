import { NextRequest, NextResponse } from 'next/server';
import { chatWithCatDev } from '@/lib/gemini';
import { mockStore } from '@/lib/mock-store';
import { getSupabaseClient } from '@/lib/supabase/client';
import { filterProfanity } from '@/lib/profanity';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history, guestId } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ success: false, error: 'Tin nhắn không hợp lệ' }, { status: 400 });
    }

    const cleanMessage = filterProfanity(message.trim());
    const displayGuest = guestId ? `Khách #${guestId.slice(-4).toUpperCase()}` : 'Khách vãng lai';

    // Bắn log lên Live Feed Terminal (chỉ tóm tắt dưới 50 ký tự)
    const logSummary = cleanMessage.length > 50 ? `${cleanMessage.slice(0, 50)}...` : cleanMessage;
    const logText = `💬 ${displayGuest} vừa hỏi: "${logSummary}"`;

    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('live_logs').insert({
        type: 'CHAT',
        message: logText,
      });
    } else {
      mockStore.addLog('CHAT', logText);
    }

    // Xử lý câu trả lời từ AI Mèo Dev
    const result = await chatWithCatDev(cleanMessage, history || []);

    return NextResponse.json({
      success: true,
      reply: result.reply,
      toolCallData: result.toolCallData,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
