import { NextRequest, NextResponse } from 'next/server';
import {
  createActivationCodeRecord,
  listRecentActivationCodes,
} from '@/lib/activation-code';

function verifyAdmin(req: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET_KEY || process.env.PAYMENT_WEBHOOK_SECRET;
  if (!adminSecret) {
    // Môi trường dev hoặc chưa cài secret thì cho phép nếu gọi nội bộ
    return process.env.NODE_ENV === 'development';
  }

  const authHeader = req.headers.get('authorization') || req.headers.get('x-admin-token') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const queryToken = req.nextUrl.searchParams.get('token') || '';

  return token === adminSecret || queryToken === adminSecret;
}

// GET: Lấy danh sách các mã kích hoạt
export async function GET(req: NextRequest) {
  try {
    if (!verifyAdmin(req)) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Quyền Admin không hợp lệ' }, { status: 401 });
    }

    const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get('limit')) || 30));
    const codes = await listRecentActivationCodes(limit);

    return NextResponse.json({
      success: true,
      count: codes.length,
      data: codes,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST: Tạo mã kích hoạt mới cho AI Roast CV hoặc các dịch vụ khác
export async function POST(req: NextRequest) {
  try {
    if (!verifyAdmin(req)) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Quyền Admin không hợp lệ' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      code,
      serviceType = 'ROAST-10',
      maxUses = 1,
      expiresDays,
      createdBy = 'Admin Portal',
      note = 'Cấp mã kích hoạt thủ công',
    } = body;

    const result = await createActivationCodeRecord({
      code,
      serviceType,
      maxUses: Number(maxUses) || 1,
      expiresDays: expiresDays ? Number(expiresDays) : undefined,
      createdBy,
      note,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Không thể tạo mã kích hoạt' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Đã tạo thành công mã kích hoạt [${result.code}] cho dịch vụ ${serviceType}!`,
      code: result.code,
      data: result.record,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
