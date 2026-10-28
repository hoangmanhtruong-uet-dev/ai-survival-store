import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DAEMON_CONFIG } from '../config';
import WebSocket from 'ws';

// Đảm bảo WebSocket luôn có sẵn trên mọi phiên bản Node.js (Node 18, 20, 22+)
if (typeof globalThis.WebSocket === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).WebSocket = WebSocket;
}

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

