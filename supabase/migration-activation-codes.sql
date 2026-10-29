-- ==========================================================
-- DỰ ÁN: MÈO DEV SINH TỒN (AI SURVIVAL STORE)
-- SUPABASE MIGRATION: ACTIVATION CODES CHO AI ROAST CV & DỊCH VỤ SỐ
-- ==========================================================

CREATE TABLE IF NOT EXISTS activation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- VD: 'RCV-BOSS-8921', 'RCV-VIP-2026'
  service_type TEXT NOT NULL DEFAULT 'ROAST-10', -- 'ROAST-10', 'TAROT-10', 'CHEM-PACK', 'ALL'
  max_uses INT NOT NULL DEFAULT 1, -- Số lượt dùng (-1 hoặc số lớn cho nhiều lượt)
  used_count INT NOT NULL DEFAULT 0, -- Số lượt đã kích hoạt
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ, -- NULL: Vĩnh viễn không hết hạn
  created_by TEXT DEFAULT 'Boss Telegram',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index tra cứu cực nhanh
CREATE INDEX IF NOT EXISTS idx_activation_codes_code ON activation_codes(code);
CREATE INDEX IF NOT EXISTS idx_activation_codes_service ON activation_codes(service_type);
CREATE INDEX IF NOT EXISTS idx_activation_codes_active ON activation_codes(is_active);

-- Kích hoạt RLS
ALTER TABLE activation_codes ENABLE ROW LEVEL SECURITY;

-- 1. Cho phép đọc công khai (để API kiểm tra mã)
CREATE POLICY "Cho phép đọc activation_codes" ON activation_codes
  FOR SELECT USING (true);

-- 2. Cho phép service_role quản lý toàn bộ
CREATE POLICY "Chỉ service_role quản lý activation_codes" ON activation_codes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Khởi tạo một số mã kích hoạt mặc định phục vụ Boss & VIP
INSERT INTO activation_codes (code, service_type, max_uses, used_count, is_active, created_by, note)
VALUES
  ('RCV-BOSS-2026', 'ROAST-10', 9999, 0, true, 'Boss Mèo Dev', 'Mã Master Key cho Boss sấy CV không giới hạn'),
  ('RCV-VIP-MEODEV', 'ROAST-10', 500, 0, true, 'Boss Mèo Dev', 'Mã VIP dành tặng cộng đồng Mèo Dev'),
  ('RCV-FREE-TEST', 'ROAST-10', 999999, 0, true, 'System', 'Mã dùng thử và kiểm thử hệ thống')
ON CONFLICT (code) DO NOTHING;
