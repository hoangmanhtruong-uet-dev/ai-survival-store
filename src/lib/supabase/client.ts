import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(url && anonKey && url.startsWith('http') && !url.includes('placeholder'));
}

let supabaseInstance: SupabaseClient | null = null;
let supabaseAdminInstance: SupabaseClient | null = null;

/**
 * Trả về Supabase Client.
 * Trên Server (Node.js/Next Route Handlers): Ưu tiên SUPABASE_SERVICE_ROLE_KEY để bypass RLS,
 * đảm bảo quyền ghi orders, campaign_stats và live_logs khi thanh toán thành công.
 * Trên Client (Browser): Luôn dùng NEXT_PUBLIC_SUPABASE_ANON_KEY để kết nối Realtime.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const isServer = typeof window === 'undefined';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (isServer && serviceKey) {
    if (!supabaseAdminInstance) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      supabaseAdminInstance = createClient(url, serviceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }
    return supabaseAdminInstance;
  }

  if (!supabaseInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || serviceKey!;
    supabaseInstance = createClient(url, key);
  }
  return supabaseInstance;
}

/**
 * Supabase Admin Client với toàn quyền Service Role (chỉ chạy trên Server).
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !url.startsWith('http') || url.includes('placeholder')) {
    return null;
  }
  if (!supabaseAdminInstance) {
    supabaseAdminInstance = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseAdminInstance;
}
