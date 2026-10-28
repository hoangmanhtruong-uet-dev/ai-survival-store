-- ==========================================================
-- DỰ ÁN: MÈO DEV SINH TỒN (BOSS AI CÀY THUÊ)
-- SUPABASE POSTGRESQL SCHEMA + REALTIME CONFIGURATION
-- ==========================================================

-- 1. Bảng Trạng thái Chiến dịch Sinh tồn (Campaign Stats)
CREATE TABLE IF NOT EXISTS campaign_stats (
  id INT PRIMARY KEY DEFAULT 1,
  target_amount INT DEFAULT 5000000,
  current_amount INT DEFAULT 345000,
  total_orders INT DEFAULT 24,
  paid_orders INT DEFAULT 18,
  cat_hunger_level INT DEFAULT 85, -- 0 (chết đói) đến 100 (no căng bụng)
  last_order_at TIMESTAMPTZ DEFAULT NOW(),
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- Khởi tạo dòng cấu hình mặc định (chỉ 1 dòng duy nhất id = 1)
INSERT INTO campaign_stats (id, target_amount, current_amount, total_orders, paid_orders, cat_hunger_level)
VALUES (1, 5000000, 345000, 24, 18, 85)
ON CONFLICT (id) DO NOTHING;

-- 2. Bảng Danh mục Sản phẩm (Products)
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY, -- 'PATE-05', 'ROAST-10', 'CHEM-15', 'TAROT-10', 'TEMPLATE-29'
  name TEXT NOT NULL,
  description TEXT,
  price INT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('DONATE', 'AI_TASK', 'R2_FILE')),
  r2_file_key TEXT,
  icon TEXT,
  badge TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0
);

-- Nạp dữ liệu sản phẩm mặc định
INSERT INTO products (id, name, description, price, type, r2_file_key, icon, badge, sort_order) VALUES
('PATE-05', 'Gói Nuôi Mèo + Vinh danh Bảng Vàng', 'Cộng +25% độ no cho Mèo, bắn pháo hoa toàn màn hình + ghim lời nhắn/link FB lên Bảng Vàng 24h', 5000, 'DONATE', NULL, '🐟', 'Cứu đói cấp tốc', 1),
('ROAST-10', '1 Lượt AI Roast CV + Sửa chuẩn ATS', 'Cấp mã RCV-XXXX. AI Gemini bóc tách CV, chửi xéo cực gắt trên Live Terminal và xuất file báo cáo sửa CV chi tiết', 10000, 'AI_TASK', NULL, '🔥', 'Hot & Cay xé lòng', 2),
('CHEM-15', 'Tổ hợp Đề thi & Lộ trình Hóa 12 / IELTS', 'Tải ngay trọn bộ đề thi tinh hoa chọn lọc kèm giải chi tiết và bản đồ lộ trình bứt phá điểm số', 15000, 'R2_FILE', 'chem-12-lo-trinh.pdf', '🧪', 'Độc quyền 2026', 3),
('TAROT-10', 'Thầy Mèo Bói Quẻ (Tình Duyên / Deadline)', 'Nhập câu hỏi, Mèo bốc 3 lá bài ma thuật và xuất bài luận giải tâm linh vận hạn tương lai', 10000, 'AI_TASK', NULL, '🔮', 'Chuẩn không cần chỉnh', 4),
('TEMPLATE-29', 'Source Code UI / Template Next.js Full', 'Tải trọn gói source code Next.js 15, Tailwind CSS, animations và responsive tối ưu sẵn', 29000, 'R2_FILE', 'nextjs-starter-template.zip', '⚡', 'Tiết kiệm 50h code', 5)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  type = EXCLUDED.type,
  r2_file_key = EXCLUDED.r2_file_key,
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
  buyer_note TEXT,
  buyer_social_link TEXT,
  redeem_code TEXT UNIQUE, -- VD: 'RCV-9921' hoặc URL tải
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
CREATE POLICY "Cho phép đọc công khai products" ON products FOR SELECT USING (true);
CREATE POLICY "Cho phép đọc công khai orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Cho phép tạo đơn hàng anon" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Cho phép đọc công khai live_logs" ON live_logs FOR SELECT USING (true);
CREATE POLICY "Cho phép chèn live_logs anon" ON live_logs FOR INSERT WITH CHECK (true);
