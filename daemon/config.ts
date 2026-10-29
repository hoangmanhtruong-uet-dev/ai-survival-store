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
  geminiModel: process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite',

  // Telegram Notifications
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID || '',

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

