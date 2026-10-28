-- ==========================================================
-- MIGRATION: MARKET INTELLIGENCE & EBOOK AUTO-FULFILLMENT
-- ==========================================================

-- 1. Mở rộng cột và loại sản phẩm trong bảng products
ALTER TABLE products ADD COLUMN IF NOT EXISTS content_markdown TEXT;

-- Mở rộng ràng buộc kiểu sản phẩm để hỗ trợ EBOOK và CUSTOM_TASK
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_type_check;
ALTER TABLE products ADD CONSTRAINT products_type_check 
  CHECK (type IN ('DONATE', 'AI_TASK', 'R2_FILE', 'GDRIVE_ACCESS', 'CUSTOM_TASK', 'EBOOK'));

-- 2. Tạo bảng lưu trữ thông tin phân tích thị trường (Market Insights)
CREATE TABLE IF NOT EXISTS market_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_time TEXT, -- '08:00', '14:00', '20:00'
  trend_summary TEXT NOT NULL,
  target_audience TEXT DEFAULT 'Học sinh THPT & Sinh viên IT',
  market_pain_point TEXT,
  proposed_product_id TEXT NOT NULL,
  proposed_product_name TEXT NOT NULL,
  proposed_price INT NOT NULL DEFAULT 29000,
  proposed_description TEXT,
  proposed_outline TEXT,
  marketing_angle TEXT,
  status TEXT DEFAULT 'PENDING_APPROVAL' CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUPERSEDED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- Index tra cứu nhanh
CREATE INDEX IF NOT EXISTS idx_market_insights_status ON market_insights(status);
CREATE INDEX IF NOT EXISTS idx_market_insights_created_at ON market_insights(created_at DESC);

-- 3. Cấu hình Row Level Security (RLS) cho market_insights
ALTER TABLE market_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cho phép đọc công khai market_insights" ON market_insights FOR SELECT USING (true);
CREATE POLICY "Cho phép ghi market_insights cho service role và anon" ON market_insights FOR ALL USING (true) WITH CHECK (true);

-- 4. Kích hoạt Supabase Realtime cho market_insights
ALTER PUBLICATION supabase_realtime ADD TABLE market_insights;
