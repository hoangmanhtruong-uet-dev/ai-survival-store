import { NextRequest, NextResponse } from 'next/server';
import { mockStore } from '@/lib/mock-store';
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase/client';
import { Order } from '@/types';

function sanitizePublicOrder(order: Order | Record<string, unknown>): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { payment_meta, ...safeOrder } = order as Record<string, unknown>;

  if (typeof safeOrder.buyer_email === 'string' && safeOrder.buyer_email) {
    safeOrder.buyer_email = safeOrder.buyer_email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
  }

  return safeOrder;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const cleanCode = code?.toUpperCase().trim();

    if (!cleanCode || !/^MEO-[A-Z0-9]{4,10}$/i.test(cleanCode)) {
      return NextResponse.json({ success: false, error: 'Mã đơn hàng không đúng định dạng (VD: MEO-XXXXXX)' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient() || getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('orders')
        .select('*, product:products(*)')
        .eq('order_code', cleanCode)
        .single();

      if (!error && data) {
        return NextResponse.json({ success: true, order: sanitizePublicOrder(data) });
      }
    }

    const order = mockStore.getOrderByCode(cleanCode);
    if (!order) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy đơn hàng' }, { status: 404 });
    }

    return NextResponse.json({ success: true, order: sanitizePublicOrder(order) });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
