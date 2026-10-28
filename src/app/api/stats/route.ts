import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/mock-store';
import { getSupabaseClient } from '@/lib/supabase/client';

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('campaign_stats')
        .select('*')
        .eq('id', 1)
        .single();

      if (!error && data) {
        return NextResponse.json({ success: true, stats: data });
      }
    }

    const stats = mockStore.getCampaignStats();
    return NextResponse.json({ success: true, stats });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
