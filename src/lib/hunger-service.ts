import { getSupabaseClient, getSupabaseAdminClient } from './supabase/client';
import { mockStore } from './mock-store';

export interface ResetHungerOptions {
  level?: number;
  source?: string;
  reason?: string;
}

export interface ResetHungerResult {
  success: boolean;
  previousHunger: number;
  newHunger: number;
  source: string;
  message: string;
  error?: string;
}

export interface HungerInfo {
  hunger: number;
  autoFeed: boolean;
  isStarving: boolean;
  lastReset?: string | null;
}

/**
 * Lấy thông tin trạng thái độ no bụng hiện tại của Mèo Dev
 */
export async function getHungerInfo(): Promise<HungerInfo> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('campaign_stats')
        .select('*')
        .eq('id', 1)
        .single();

      if (!error && data) {
        const hunger = data.cat_hunger_level ?? 100;
        return {
          hunger,
          autoFeed: data.auto_feed_enabled ?? true,
          isStarving: hunger <= 20,
          lastReset: data.last_hunger_reset_at || null,
        };
      }
    } catch {
      // Fallback xuống mockStore
    }
  }

  const mockStats = mockStore.getCampaignStats();
  return {
    hunger: mockStats.cat_hunger_level,
    autoFeed: mockStore.getAutoFeed(),
    isStarving: mockStats.cat_hunger_level <= 20,
    lastReset: mockStats.last_hunger_reset_at || null,
  };
}

/**
 * Thực hiện reset độ no bụng của Mèo Dev (mặc định 100%)
 * Cập nhật đồng bộ cả Supabase và mockStore, đồng thời đẩy log Live Terminal.
 */
export async function resetCatHunger(options: ResetHungerOptions = {}): Promise<ResetHungerResult> {
  const targetLevel = Math.max(0, Math.min(100, Math.round(options.level ?? 100)));
  const source = options.source || 'Boss Telegram';
  const reason = options.reason || 'Nạp đầy bình pate cứu đói';

  let previousHunger = 100;
  const nowIso = new Date().toISOString();

  // 1. Thao tác với Supabase
  const supabase = getSupabaseAdminClient() || getSupabaseClient();
  let supabaseSuccess = false;

  if (supabase) {
    try {
      // Lấy độ no bụng trước khi reset
      const { data: stats } = await supabase
        .from('campaign_stats')
        .select('cat_hunger_level')
        .eq('id', 1)
        .single();

      if (stats && typeof stats.cat_hunger_level === 'number') {
        previousHunger = stats.cat_hunger_level;
      }

      // Thử cập nhật kèm cả last_hunger_reset_at
      let updateRes = await supabase
        .from('campaign_stats')
        .update({
          cat_hunger_level: targetLevel,
          last_hunger_reset_at: nowIso,
          last_order_at: nowIso,
        })
        .eq('id', 1);

      // Nếu bảng Supabase chưa chạy migration cột last_hunger_reset_at, fallback update chỉ cat_hunger_level
      if (updateRes.error) {
        updateRes = await supabase
          .from('campaign_stats')
          .update({
            cat_hunger_level: targetLevel,
            last_order_at: nowIso,
          })
          .eq('id', 1);
      }

      if (!updateRes.error) {
        supabaseSuccess = true;
      }

      // Ghi nhận log vào Live Terminal (Realtime)
      const logMessage = `🐟 [CỨU ĐÓI] ${source} đã nạp đầy bình Pate! Độ no bụng Mèo Dev hồi sinh: ${previousHunger}% ➜ ${targetLevel}% 🚀 (${reason})`;
      await supabase.from('live_logs').insert({
        type: 'SYSTEM',
        message: logMessage,
        meta: {
          previousHunger,
          newHunger: targetLevel,
          source,
          reason,
          resetAt: nowIso,
        },
      });
    } catch (err) {
      console.warn('⚠️ Lỗi khi cập nhật Supabase trong resetCatHunger:', (err as Error).message);
    }
  }

  // 2. Đồng bộ mockStore
  const mockRes = mockStore.resetHunger(targetLevel, source);
  if (!supabaseSuccess) {
    previousHunger = mockRes.previous;
  }

  return {
    success: true,
    previousHunger,
    newHunger: targetLevel,
    source,
    message: `Đã reset độ no bụng thành công từ ${previousHunger}% lên ${targetLevel}%. Mèo Dev đã no căng bụng!`,
  };
}

/**
 * Cập nhật cấu hình tự cứu đói (Auto-Feed)
 */
export async function setAutoFeed(enabled: boolean): Promise<boolean> {
  const supabase = getSupabaseAdminClient() || getSupabaseClient();
  if (supabase) {
    try {
      await supabase
        .from('campaign_stats')
        .update({ auto_feed_enabled: enabled })
        .eq('id', 1);

      await supabase.from('live_logs').insert({
        type: 'SYSTEM',
        message: `⚙️ [CẤU HÌNH] Chế độ tự cứu đói khẩn cấp (Auto-Feed) đã ${enabled ? 'BẬT 🟢' : 'TẮT 🔴'}.`,
        meta: { auto_feed_enabled: enabled },
      });
    } catch {
      // Ignore nếu chưa có cột
    }
  }

  mockStore.setAutoFeed(enabled);
  return enabled;
}
