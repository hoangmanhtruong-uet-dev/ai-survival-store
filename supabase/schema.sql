-- ==========================================================
-- DỰ ÁN: MÈO DEV SINH TỒN (BOSS AI CÀY THUÊ)
-- SUPABASE POSTGRESQL SCHEMA + REALTIME CONFIGURATION
-- ==========================================================

-- 1. Bảng Trạng thái Chiến dịch Sinh tồn (Campaign Stats)
CREATE TABLE IF NOT EXISTS campaign_stats (
  id INT PRIMARY KEY DEFAULT 1,
  target_amount INT DEFAULT 7000000,
  current_amount INT DEFAULT 345000,
  total_orders INT DEFAULT 24,
  paid_orders INT DEFAULT 18,
  cat_hunger_level INT DEFAULT 85, -- 0 (chết đói) đến 100 (no căng bụng)
  last_order_at TIMESTAMPTZ DEFAULT NOW(),
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '60 days')
);

-- Khởi tạo dòng cấu hình mặc định (chỉ 1 dòng duy nhất id = 1)
INSERT INTO campaign_stats (id, target_amount, current_amount, total_orders, paid_orders, cat_hunger_level)
VALUES (1, 7000000, 345000, 24, 18, 85)
ON CONFLICT (id) DO NOTHING;

-- 2. Bảng Danh mục Sản phẩm (Products)
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY, -- 'PATE-05', 'ROAST-10', 'CHEM-15', 'TAROT-10', 'TEMPLATE-29'
  name TEXT NOT NULL,
  description TEXT,
  price INT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('DONATE', 'AI_TASK', 'R2_FILE', 'GDRIVE_ACCESS')),
  r2_file_key TEXT,
  gdrive_folder_id TEXT,
  icon TEXT,
  badge TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0
);

-- Nạp dữ liệu sản phẩm mặc định
INSERT INTO products (id, name, description, price, type, r2_file_key, gdrive_folder_id, icon, badge, sort_order) VALUES
('PATE-05', 'Gói Nuôi Mèo + Vinh danh Bảng Vàng', 'Cộng +25% độ no cho Mèo, bắn pháo hoa toàn màn hình + ghim lời nhắn/link FB lên Bảng Vàng 24h', 5000, 'DONATE', NULL, NULL, '🐟', 'Cứu đói cấp tốc', 1),
('ROAST-10', '1 Lượt AI Roast CV + Sửa chuẩn ATS', 'Cấp mã RCV-XXXX. AI Gemini bóc tách CV, chửi xéo cực gắt trên Live Terminal và xuất file báo cáo sửa CV chi tiết', 10000, 'AI_TASK', NULL, NULL, '🔥', 'Hot & Cay xé lòng', 2),
('CHEM-PACK', 'Tổ hợp Đề thi & Lộ trình Hóa THPT', 'Trọn bộ đề thi tinh hoa chuẩn cấu trúc Bộ GD, phân tầng 3 mốc (8+, 9+, 10+) kèm mẹo Casio 30s & Trợ Giảng AI 24/7', 49000, 'GDRIVE_ACCESS', NULL, NULL, '🧪', '3 Gói Lựa Chọn', 3),
('CHEM-49', 'Gói Khởi Động Hóa 8+ (30 Đề + Lộ Trình)', '30 đề thi chuẩn cấu trúc Bộ GD, lời giải chi tiết từng câu + lộ trình bứt phá mốc 8+ Hóa THPT', 49000, 'GDRIVE_ACCESS', NULL, 'folder-8plus-demo', '🧪', 'Mục tiêu 8+', 31),
('CHEM-89', 'Gói Bứt Phá Hóa 9+ (60 Đề + Tip Casio)', 'Full 60 đề 8+ & 9+, tuyển tập bài toán Vận dụng cao Este, Peptit, Đồ thị + Bí kíp bấm máy Casio 30s', 89000, 'GDRIVE_ACCESS', NULL, 'folder-9plus-demo', '⚗️', 'Hot - Mục tiêu 9+', 32),
('CHEM-149', 'Gói All-in Thủ Khoa Hóa (100 Đề + Trợ Giảng AI 24/7)', 'Trọn bộ 100 đề 8+, 9+, 10+, tuyển tập bẫy điểm 10 + Mở khóa Trợ Giảng Hóa AI 24/7 giải bài tận răng', 149000, 'GDRIVE_ACCESS', NULL, 'folder-allin-demo', '🏆', 'Chủ lực 10+', 33),
('TAROT-10', 'Thầy Mèo Bói Quẻ (Tình Duyên / Deadline)', 'Nhập câu hỏi, Mèo bốc 3 lá bài ma thuật và xuất bài luận giải tâm linh vận hạn tương lai', 10000, 'AI_TASK', NULL, NULL, '🔮', 'Chuẩn không cần chỉnh', 4)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  type = EXCLUDED.type,
  r2_file_key = EXCLUDED.r2_file_key,
  gdrive_folder_id = EXCLUDED.gdrive_folder_id,
  icon = EXCLUDED.icon,
  badge = EXCLUDED.badge;

-- 3. Bảng Đơn Hàng (Orders)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code TEXT UNIQUE NOT NULL, -- VD: 'MEO-4829'
  product_id TEXT REFERENCES products(id),
  amount INT NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'EXPIRED')),
  buyer_name TEXT DEFAULT 'Ân nhân giấu tên',
  buyer_email TEXT, -- Gmail nhận quyền Google Drive
  buyer_note TEXT,
  buyer_social_link TEXT,
  ref_code TEXT, -- Mã người giới thiệu
  redeem_code TEXT, -- Link folder hoặc mã kích hoạt
  is_redeemed BOOLEAN DEFAULT false,
  ai_result JSONB,
  payment_meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

-- Index tra cứu nhanh đơn hàng
CREATE INDEX IF NOT EXISTS idx_orders_order_code ON orders(order_code);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- 4. Bảng Live Terminal Logs (Bắn Realtime tới tất cả người xem)
CREATE TABLE IF NOT EXISTS live_logs (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('ORDER_CREATED', 'PAYMENT_SUCCESS', 'CHAT', 'TASK_DONE', 'SYSTEM')),
  message TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tạo một số log ban đầu giả lập sinh động
INSERT INTO live_logs (type, message, created_at) VALUES
('SYSTEM', '🐱 Mèo Dev đã online trên server. Trạng thái: Đói meo, điện còn 50k, đếm ngược 30 ngày.', NOW() - INTERVAL '40 minutes'),
('CHAT', '👀 Có 18 người đang đứng xem mèo gõ phím...', NOW() - INTERVAL '25 minutes'),
('ORDER_CREATED', '🧾 Đã tạo đơn MEO-8921 (Gói Roast CV - 10.000đ) - Chờ thanh toán...', NOW() - INTERVAL '15 minutes'),
('PAYMENT_SUCCESS', '💰 TING TING! Nhận thành công +10.000đ cho đơn MEO-8921! Mèo được +15% máu!', NOW() - INTERVAL '14 minutes'),
('TASK_DONE', '🚀 Mèo vừa sấy một CV Junior Frontend 2 năm kinh nghiệm nhưng quên gắn link GitHub!', NOW() - INTERVAL '10 minutes')
ON CONFLICT DO NOTHING;

-- 5. Kích hoạt Supabase Realtime Publication cho các bảng cần thiết
ALTER PUBLICATION supabase_realtime ADD TABLE campaign_stats, orders, live_logs;

-- 6. Row Level Security (RLS) - Cho phép đọc công khai (Anon Read)
ALTER TABLE campaign_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cho phép đọc công khai campaign_stats" ON campaign_stats FOR SELECT USING (true);
CREATE POLICY "Cho phép cập nhật campaign_stats" ON campaign_stats FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Cho phép đọc công khai products" ON products FOR SELECT USING (true);
CREATE POLICY "Cho phép đọc công khai orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Cho phép tạo đơn hàng anon" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Cho phép cập nhật orders" ON orders FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Cho phép đọc công khai live_logs" ON live_logs FOR SELECT USING (true);
CREATE POLICY "Cho phép chèn live_logs anon" ON live_logs FOR INSERT WITH CHECK (true);
