import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/mock-store';
import { getSupabaseClient } from '@/lib/supabase/client';

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    let logs = [];

    const sanitizeLogMeta = (meta?: Record<string, unknown>) => {
      if (!meta) return meta;
      const sanitized = { ...meta };
      if (typeof sanitized.buyerEmail === 'string') {
        sanitized.buyerEmail = sanitized.buyerEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3');
      }
      if (typeof sanitized.orderCode === 'string' && sanitized.orderCode.length > 5) {
        sanitized.orderCode = `${sanitized.orderCode.slice(0, 4)}***`;
      }
      if (typeof sanitized.redeemCode === 'string' && sanitized.redeemCode.length > 5) {
        sanitized.redeemCode = `${sanitized.redeemCode.slice(0, 3)}***${sanitized.redeemCode.slice(-2)}`;
      }
      return sanitized;
    };

    if (supabase) {
      const { data } = await supabase
        .from('live_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(25);

      // SEC-05 & SEC-10: Mask PII email, orderCode và redeemCode nếu có trong meta của log
      logs = (data || []).map((log) => ({
        ...log,
        meta: sanitizeLogMeta(log.meta as Record<string, unknown> | undefined),
      })).reverse();
    } else {
      logs = mockStore.getLiveLogs(25).map((log) => ({
        ...log,
        meta: sanitizeLogMeta(log.meta),
      }));
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
