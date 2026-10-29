-- ==========================================================
-- DỰ ÁN: MÈO DEV SINH TỒN
-- MIGRATION: THÊM CỘT TỰ CỨU ĐÓI & RESET ĐỘ NO BỤNG
-- ==========================================================

-- 1. Thêm cột auto_feed_enabled (Mặc định bật: tự cứu đói khi < 20%)
ALTER TABLE campaign_stats 
ADD COLUMN IF NOT EXISTS auto_feed_enabled BOOLEAN DEFAULT true;

-- 2. Thêm cột last_hunger_reset_at để ghi nhận lịch sử reset
ALTER TABLE campaign_stats 
ADD COLUMN IF NOT EXISTS last_hunger_reset_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Cập nhật dòng mặc định (id = 1)
UPDATE campaign_stats 
SET 
  auto_feed_enabled = COALESCE(auto_feed_enabled, true),
  last_hunger_reset_at = COALESCE(last_hunger_reset_at, NOW())
WHERE id = 1;
