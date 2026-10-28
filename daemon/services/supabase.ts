import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DAEMON_CONFIG } from '../config';

let client: SupabaseClient | null = null;

export function getDaemonSupabase(): SupabaseClient {
  if (!client) {
    if (!DAEMON_CONFIG.supabaseUrl || !DAEMON_CONFIG.supabaseServiceKey) {
      throw new Error('Thiếu cấu hình Supabase URL hoặc Service Role Key trong .env.local');
    }
    client = createClient(DAEMON_CONFIG.supabaseUrl, DAEMON_CONFIG.supabaseServiceKey, {
      auth: { persistSession: false },
    });
  }
  return client;
}

