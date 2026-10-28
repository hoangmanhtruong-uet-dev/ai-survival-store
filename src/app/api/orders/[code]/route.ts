import { NextRequest, NextResponse } from 'next/server';
import { mockStore } from '@/lib/mock-store';
import { getSupabaseClient } from '@/lib/supabase/client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const cleanCode = code?.toUpperCase().trim();

    if (!cleanCode) {
      return NextResponse.json({ success: false, error: 'Thiếu mã đơn' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('orders')
        .select('*, product:products(*)')
        .eq('order_code', cleanCode)
        .single();

      if (!error && data) {
        return NextResponse.json({ success: true, order: data });
      }
    }

    const order = mockStore.getOrderByCode(cleanCode);
    if (!order) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy đơn hàng' }, { status: 404 });
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
