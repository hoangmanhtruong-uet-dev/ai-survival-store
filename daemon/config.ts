import dotenv from 'dotenv';
import path from 'path';

// Nạp file .env.local từ thư mục gốc
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const DAEMON_CONFIG = {
  // Supabase
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',

  // Gemini AI
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash',

  // Telegram Notifications
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID || '',

  // Meta Social Publishing (Facebook Fanpage & Threads API)
  facebookPageId: process.env.FB_PAGE_ID || '',
  facebookPageAccessToken: process.env.FB_PAGE_ACCESS_TOKEN || '',
  threadsUserId: process.env.THREADS_USER_ID || '',
  threadsAccessToken: process.env.THREADS_ACCESS_TOKEN || '',

  // Website & Info
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://ai-survival-store.vercel.app',
  targetAmount: 7000000,
  survivalDays: 60,
};

export function validateDaemonConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!DAEMON_CONFIG.supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!DAEMON_CONFIG.supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!DAEMON_CONFIG.geminiApiKey) missing.push('GEMINI_API_KEY');

  return {
    valid: missing.length === 0,
    missing,
  };
}

