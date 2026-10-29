import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase/client';
import { mockStore } from '@/lib/mock-store';
import { ActivationCode } from '@/types';

// Danh sách các Master Codes mặc định của Boss và Hệ thống (Luôn hoạt động dù chưa có DB)
const BUILTIN_MASTER_CODES: Record<string, { service: string; maxUses: number; description: string }> = {
  'RCV-BOSS-2026': {
    service: 'ROAST-10',
    maxUses: 99999,
    description: 'Mã Master Key đặc quyền của Boss Mèo Dev',
  },
  'RCV-VIP-MEODEV': {
    service: 'ROAST-10',
    maxUses: 1000,
    description: 'Mã VIP dành tặng đối tác và cộng đồng',
  },
  'RCV-FREE-TEST': {
    service: 'ROAST-10',
    maxUses: 999999,
    description: 'Mã dùng thử và kiểm thử hệ thống',
  },
};

/**
 * Lấy danh sách các mã kích hoạt từ biến môi trường nếu có
 * (ví dụ: ROAST_CV_ACTIVATION_CODES="RCV-VIP1,RCV-VIP2,ROAST-PRO")
 */
function getEnvMasterCodes(): Set<string> {
  const envCodes = process.env.ROAST_CV_ACTIVATION_CODES || '';
  const list = envCodes
    .split(',')
    .map((c) => c.trim().toUpperCase())
    .filter((c) => c.length > 0);
  return new Set(list);
}

/**
 * Sinh mã kích hoạt mới định dạng RCV-[TAG]-[NUMBER]
 * VD: RCV-BOSS-8492 hoặc RCV-9281
 */
export function generateActivationCode(prefix = 'RCV', customTag?: string): string {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  if (customTag && customTag.trim()) {
    const cleanTag = customTag.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    return `${prefix}-${cleanTag}-${randomNum}`;
  }
  return `${prefix}-${randomNum}`;
}

export interface VerifyActivationResult {
  valid: boolean;
  error?: string;
  source?: 'MASTER_KEY' | 'ACTIVATION_TABLE' | 'ORDER_RECORD' | 'MOCK_STORE';
  codeData?: Partial<ActivationCode>;
  isMasterKey?: boolean;
}

/**
 * Xác thực và sử dụng 1 lượt mã kích hoạt
 */
export async function verifyAndConsumeActivationCode(
  inputCode: string,
  serviceType: string = 'ROAST-10'
): Promise<VerifyActivationResult> {
  const code = (inputCode || '').trim().toUpperCase();

  if (!code) {
    return { valid: false, error: 'Vui lòng cung cấp mã kích hoạt' };
  }

  // 1. Kiểm tra Master Codes của Boss & Dev
  if (BUILTIN_MASTER_CODES[code]) {
    const master = BUILTIN_MASTER_CODES[code];
    if (master.service === 'ALL' || master.service === serviceType) {
      return {
        valid: true,
        source: 'MASTER_KEY',
        isMasterKey: true,
        codeData: {
          code,
          service_type: master.service,
          max_uses: master.maxUses,
          used_count: 1,
          is_active: true,
          note: master.description,
        },
      };
    }
  }

  const envCodes = getEnvMasterCodes();
  if (envCodes.has(code)) {
    return {
      valid: true,
      source: 'MASTER_KEY',
      isMasterKey: true,
      codeData: {
        code,
        service_type: serviceType,
        max_uses: 9999,
        used_count: 1,
        is_active: true,
        note: 'Mã kích hoạt từ biến môi trường máy chủ',
      },
    };
  }

  // Hỗ trợ mã test trên môi trường development
  if (process.env.NODE_ENV === 'development' && (code === 'RCV-FREE-TEST' || code.startsWith('RCV-TEST'))) {
    return {
      valid: true,
      source: 'MASTER_KEY',
      isMasterKey: true,
      codeData: {
        code,
        service_type: serviceType,
        max_uses: 99999,
        used_count: 0,
        is_active: true,
      },
    };
  }

  // 2. Tra cứu trong bảng activation_codes của Supabase
  const supabase = getSupabaseAdminClient() || getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('activation_codes')
        .select('*')
        .eq('code', code)
        .single();

      if (!error && data) {
        // Kiểm tra trạng thái hoạt động
        if (!data.is_active) {
          return { valid: false, error: 'Mã kích hoạt này đã bị vô hiệu hóa hoặc đã sử dụng hết lượt.' };
        }

        // Kiểm tra loại dịch vụ
        if (data.service_type !== 'ALL' && data.service_type !== serviceType) {
          return {
            valid: false,
            error: `Mã này chỉ áp dụng cho dịch vụ ${data.service_type}, không áp dụng cho ${serviceType}.`,
          };
        }

        // Kiểm tra hạn sử dụng
        if (data.expires_at) {
          const expireTime = new Date(data.expires_at).getTime();
          if (Date.now() > expireTime) {
            return { valid: false, error: 'Mã kích hoạt này đã hết hạn sử dụng.' };
          }
        }

        // Kiểm tra số lượt sử dụng
        if (data.max_uses > 0 && data.used_count >= data.max_uses) {
          return { valid: false, error: 'Mã kích hoạt này đã dùng hết số lượt cho phép.' };
        }

        // Tiêu thụ 1 lượt
        const newUsedCount = (data.used_count || 0) + 1;
        const willDeactivate = data.max_uses > 0 && newUsedCount >= data.max_uses;

        await supabase
          .from('activation_codes')
          .update({
            used_count: newUsedCount,
            is_active: !willDeactivate,
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.id);

        return {
          valid: true,
          source: 'ACTIVATION_TABLE',
          codeData: {
            ...data,
            used_count: newUsedCount,
            is_active: !willDeactivate,
          },
        };
      }
    } catch (dbErr) {
      console.warn('[Activation Code] Tra cứu bảng activation_codes thất bại hoặc bảng chưa tạo:', (dbErr as Error).message);
    }

    // 2.2 Fallback tra cứu trong bảng orders đã thanh toán (PAID) của Supabase
    try {
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .or(`redeem_code.eq.${code},order_code.eq.${code}`)
        .eq('status', 'PAID')
        .single();

      if (order) {
        if (order.product_id !== 'ROAST-10' && serviceType === 'ROAST-10') {
          return {
            valid: false,
            error: 'Mã đơn hàng này không thuộc Gói Sấy CV (ROAST-10)! Vui lòng sử dụng đúng mã đơn mua gói sấy CV.',
          };
        }

        return {
          valid: true,
          source: 'ORDER_RECORD',
          codeData: {
            code,
            service_type: order.product_id,
            max_uses: 1,
            used_count: order.is_redeemed ? 1 : 0,
            is_active: !order.is_redeemed,
            note: order.buyer_note || order.buyer_name,
          },
        };
      }
    } catch {
      // Ignore
    }
  }

  // 3. Fallback kiểm tra trong mockStore in-memory
  const mockCheck = mockStore.verifyAndConsumeActivationCode?.(code, serviceType);
  if (mockCheck && mockCheck.valid) {
    return {
      valid: true,
      source: 'MOCK_STORE',
      codeData: mockCheck.codeData,
    };
  }

  return {
    valid: false,
    error: 'Mã kích hoạt không tồn tại hoặc đã hết hạn. Vui lòng kiểm tra lại!',
  };
}

export interface CreateActivationCodeParams {
  code?: string;
  serviceType?: string;
  maxUses?: number;
  expiresDays?: number;
  createdBy?: string;
  note?: string;
}

/**
 * Tạo mới mã kích hoạt trong hệ thống (Supabase + mockStore)
 * Đồng thời tự động tạo 1 đơn hàng PAID đối ứng trong bảng orders để tương thích 2 chiều
 */
export async function createActivationCodeRecord(
  params: CreateActivationCodeParams = {}
): Promise<{ success: boolean; code: string; record?: ActivationCode; error?: string }> {
  const serviceType = params.serviceType || 'ROAST-10';
  const maxUses = params.maxUses !== undefined ? params.maxUses : 1;
  const createdBy = params.createdBy || 'Boss Telegram';
  const note = params.note || 'Mã kích hoạt cấp từ xa';

  const code = (
    params.code ? params.code.trim().toUpperCase() : generateActivationCode('RCV', createdBy.includes('Boss') ? 'BOSS' : undefined)
  );

  let expiresAt: string | null = null;
  if (params.expiresDays && params.expiresDays > 0) {
    expiresAt = new Date(Date.now() + params.expiresDays * 24 * 60 * 60 * 1000).toISOString();
  }

  const record: ActivationCode = {
    code,
    service_type: serviceType,
    max_uses: maxUses,
    used_count: 0,
    is_active: true,
    expires_at: expiresAt,
    created_by: createdBy,
    note,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Lưu vào mockStore
  mockStore.createActivationCode?.(record);

  // Lưu vào Supabase
  const supabase = getSupabaseAdminClient() || getSupabaseClient();
  if (supabase) {
    try {
      // 1. Lưu vào bảng activation_codes
      await supabase.from('activation_codes').insert({
        code: record.code,
        service_type: record.service_type,
        max_uses: record.max_uses,
        used_count: record.used_count,
        is_active: record.is_active,
        expires_at: record.expires_at,
        created_by: record.created_by,
        note: record.note,
      });

      // 2. Tạo một Order PAID dự phòng trong bảng orders với redeem_code chính là mã này
      // Giúp tương thích ngược 100% với bất kỳ API hoặc client cũ nào chỉ tra cứu orders
      const orderCode = `MEO-VIP-${Math.floor(1000 + Math.random() * 9000)}`;
      await supabase.from('orders').insert({
        order_code: orderCode,
        product_id: serviceType,
        amount: 0,
        status: 'PAID',
        buyer_name: `${createdBy} (Mã Kích Hoạt)`,
        buyer_note: note,
        redeem_code: code,
        is_redeemed: false,
        paid_at: new Date().toISOString(),
        payment_meta: {
          activation_code: code,
          created_by: createdBy,
          max_uses: maxUses,
        },
      });

      // Bắn log lên Live Terminal
      await supabase.from('live_logs').insert({
        type: 'SYSTEM',
        message: `🔑 Đã tạo mã kích hoạt mới [${code}] cho dịch vụ ${serviceType} (Cấp bởi ${createdBy})`,
        meta: { code, serviceType, maxUses, createdBy },
      });
    } catch (err) {
      console.warn('[Activation Code] Lỗi khi ghi Supabase:', (err as Error).message);
    }
  }

  return {
    success: true,
    code,
    record,
  };
}

/**
 * Lấy danh sách các mã kích hoạt gần đây
 */
export async function listRecentActivationCodes(limit = 20): Promise<ActivationCode[]> {
  const supabase = getSupabaseAdminClient() || getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('activation_codes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && data) {
        return data as ActivationCode[];
      }
    } catch {
      // Fallback
    }
  }

  return mockStore.getActivationCodes?.(limit) || [];
}
