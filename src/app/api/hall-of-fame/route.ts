import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/mock-store';
import { getSupabaseClient } from '@/lib/supabase/client';

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    let donors = [];

    if (supabase) {
      const { data } = await supabase
        .from('orders')
        .select('id, order_code, product_id, amount, buyer_name, buyer_note, buyer_social_link, paid_at')
        .eq('status', 'PAID')
        .order('paid_at', { ascending: false })
        .limit(20);
      donors = data || [];
    } else {
      donors = mockStore.getHallOfFame();
    }

    return NextResponse.json({
      success: true,
      donors,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
