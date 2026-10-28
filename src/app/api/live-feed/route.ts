import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/mock-store';
import { getSupabaseClient } from '@/lib/supabase/client';

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    let logs = [];

    if (supabase) {
      const { data } = await supabase
        .from('live_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(25);
      logs = (data || []).reverse();
    } else {
      logs = mockStore.getLiveLogs(25);
    }

    // Giả lập số mắt xem trực tiếp đang theo dõi Mèo Dev (dao động tự nhiên)
    const baseViewers = 18;
    const jitter = Math.floor(Math.sin(Date.now() / 15000) * 6);
    const viewerCount = Math.max(8, baseViewers + jitter);

    return NextResponse.json({
      success: true,
      logs,
      viewerCount,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
