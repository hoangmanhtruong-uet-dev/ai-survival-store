import { NextRequest, NextResponse } from 'next/server';
import { resetCatHunger, getHungerInfo, setAutoFeed } from '@/lib/hunger-service';

function verifyAdmin(req: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET_KEY || process.env.PAYMENT_WEBHOOK_SECRET;
  if (!adminSecret) {
    // Môi trường dev hoặc chưa cài secret thì cho phép
    return true;
  }

  const authHeader = req.headers.get('authorization') || req.headers.get('x-admin-token') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const queryToken = req.nextUrl.searchParams.get('token') || '';

  return token === adminSecret || queryToken === adminSecret;
}

/**
 * GET: Lấy trạng thái độ no bụng hiện tại của Mèo Dev
 */
export async function GET(req: NextRequest) {
  try {
    if (!verifyAdmin(req)) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Quyền truy cập không hợp lệ' }, { status: 401 });
    }

    const info = await getHungerInfo();
    return NextResponse.json({
      success: true,
      data: info,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST: Reset độ no bụng của Mèo Dev (mặc định 100%) hoặc cấu hình auto-feed
 */
export async function POST(req: NextRequest) {
  try {
    if (!verifyAdmin(req)) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Quyền truy cập không hợp lệ' }, { status: 401 });
    }

    let body: {
      level?: number;
      source?: string;
      reason?: string;
      auto_feed?: boolean;
    } = {};

    try {
      body = await req.json();
    } catch {
      // Body rỗng -> dùng mặc định
    }

    // Nếu có cờ auto_feed, cấu hình trước
    if (typeof body.auto_feed === 'boolean') {
      await setAutoFeed(body.auto_feed);
    }

    const result = await resetCatHunger({
      level: body.level ?? 100,
      source: body.source || 'Admin Web API',
      reason: body.reason || 'Kích hoạt từ API Reset Hunger',
    });

    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
