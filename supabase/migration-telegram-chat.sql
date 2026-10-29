-- ==========================================================
-- MIGRATION: TELEGRAM TWO-WAY CHAT & 2-STAGE QUALITY APPROVAL
-- ==========================================================

-- 1. Bảng lưu trữ lịch sử hội thoại 2 chiều giữa Boss và Mèo Dev
CREATE TABLE IF NOT EXISTS telegram_messages (
  id BIGSERIAL PRIMARY KEY,
  chat_id TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('user', 'assistant', 'system')),
  sender_name TEXT,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index để truy xuất lịch sử chat nhanh theo chat_id và thời gian
CREATE INDEX IF NOT EXISTS idx_telegram_messages_chat_created 
  ON telegram_messages(chat_id, created_at DESC);

-- Kích hoạt Row Level Security (RLS)
ALTER TABLE telegram_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cho phép đọc/ghi telegram_messages" 
  ON telegram_messages FOR ALL USING (true) WITH CHECK (true);

-- 2. Bổ sung các cột phục vụ Quy trình thẩm định chất lượng 2 vòng cho market_insights
ALTER TABLE market_insights ADD COLUMN IF NOT EXISTS draft_content TEXT;
ALTER TABLE market_insights ADD COLUMN IF NOT EXISTS quality_metrics JSONB DEFAULT '{}'::jsonb;
ALTER TABLE market_insights ADD COLUMN IF NOT EXISTS authoring_feedback TEXT;
ALTER TABLE market_insights ADD COLUMN IF NOT EXISTS domain_category TEXT;

-- Mở rộng trạng thái của market_insights để hỗ trợ READY_FOR_REVIEW
ALTER TABLE market_insights DROP CONSTRAINT IF EXISTS market_insights_status_check;
ALTER TABLE market_insights ADD CONSTRAINT market_insights_status_check 
  CHECK (status IN ('PENDING_APPROVAL', 'DRAFTING', 'READY_FOR_REVIEW', 'APPROVED', 'REJECTED', 'SUPERSEDED'));
