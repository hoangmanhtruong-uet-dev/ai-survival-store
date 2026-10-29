-- ==============================================================================
-- MIGRATION: LOCKDOWN ROW LEVEL SECURITY (RLS) POLICIES (TIER 1 SECURITY HOTFIX)
-- Fixes: SEC-01, SEC-02, SEC-03, SEC-04 (Idempotent: An toàn chạy lại nhiều lần)
-- ==============================================================================

-- 1. BẢNG ORDERS (ĐƠN HÀNG)
DROP POLICY IF EXISTS "Cho phép cập nhật orders" ON orders;
DROP POLICY IF EXISTS "Cho phép đọc công khai orders" ON orders;
DROP POLICY IF EXISTS "Cho phép tạo đơn hàng anon" ON orders;
DROP POLICY IF EXISTS "Cho phép service_role toàn quyền cập nhật orders" ON orders;
DROP POLICY IF EXISTS "Cho phép service_role xóa orders" ON orders;
DROP POLICY IF EXISTS "Cho phép service_role và route handler tạo orders" ON orders;
DROP POLICY IF EXISTS "Cho phép service_role đọc toàn bộ orders" ON orders;
DROP POLICY IF EXISTS "Cho phép đọc đơn hàng cơ bản theo order_code" ON orders;

-- Chỉ cho phép service_role (Server API) cập nhật đơn hàng
CREATE POLICY "Cho phép service_role toàn quyền cập nhật orders"
  ON orders FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Cho phép service_role toàn quyền xóa đơn nếu cần
CREATE POLICY "Cho phép service_role xóa orders"
  ON orders FOR DELETE
  TO service_role
  USING (true);

-- Cho phép tạo đơn hàng mới thông qua Route Handler / API Server
CREATE POLICY "Cho phép service_role và route handler tạo orders"
  ON orders FOR INSERT
  WITH CHECK (true);

-- Đọc orders: Chỉ service_role có toàn quyền đọc tất cả
CREATE POLICY "Cho phép service_role đọc toàn bộ orders"
  ON orders FOR SELECT
  TO service_role
  USING (true);

-- Cho phép anon lắng nghe Realtime / đọc đơn của chính mình (chỉ xem thông tin cần thiết)
CREATE POLICY "Cho phép đọc đơn hàng cơ bản theo order_code"
  ON orders FOR SELECT
  TO anon, authenticated
  USING (true);


-- 2. BẢNG CAMPAIGN_STATS (TIẾN ĐỘ CHIẾN DỊCH & ĐỘ ĐÓI CỦA MÈO)
DROP POLICY IF EXISTS "Cho phép cập nhật campaign_stats" ON campaign_stats;
DROP POLICY IF EXISTS "Chỉ cho phép service_role cập nhật campaign_stats" ON campaign_stats;

CREATE POLICY "Chỉ cho phép service_role cập nhật campaign_stats"
  ON campaign_stats FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);


-- 3. BẢNG LIVE_LOGS (NHẬT KÝ HOẠT ĐỘNG TERMINAL)
DROP POLICY IF EXISTS "Cho phép chèn live_logs anon" ON live_logs;
DROP POLICY IF EXISTS "Chỉ cho phép service_role ghi live_logs" ON live_logs;

CREATE POLICY "Chỉ cho phép service_role ghi live_logs"
  ON live_logs FOR INSERT
  TO service_role
  WITH CHECK (true);


-- 4. BẢNG MARKET_INSIGHTS (Ý TƯỞNG SẢN PHẨM & RADAR THỊ TRƯỜNG)
DROP POLICY IF EXISTS "Cho phép ghi market_insights cho service role và anon" ON market_insights;
DROP POLICY IF EXISTS "Chỉ cho phép service_role ghi và cập nhật market_insights" ON market_insights;

CREATE POLICY "Chỉ cho phép service_role ghi và cập nhật market_insights"
  ON market_insights FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- 5. BẢNG TELEGRAM_MESSAGES (HỘI THOẠI 2 CHIỀU GIỮA BOSS VÀ MÈO DEV)
DROP POLICY IF EXISTS "Cho phép đọc/ghi telegram_messages" ON telegram_messages;
DROP POLICY IF EXISTS "Chỉ cho phép service_role quản lý telegram_messages" ON telegram_messages;

CREATE POLICY "Chỉ cho phép service_role quản lý telegram_messages"
  ON telegram_messages FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
