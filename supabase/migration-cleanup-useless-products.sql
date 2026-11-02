-- ==============================================================================
-- DỰ ÁN: MÈO DEV SINH TỒN
-- MIGRATION: DỌN DẸP 5 SẢN PHẨM RÁC & KÍCH HOẠT FLASH SALE GIẢM GIÁ THẬT 100%
-- ==============================================================================

-- 1. Xóa bỏ 5 sản phẩm vô nghĩa / rác theo chỉ đạo của Boss:
-- (PROMPT-SOLOPRENEUR-365, CASIO-VDC-2K7, AUTO-01, LIVE-BOM-DON, GIT-25)
DELETE FROM products 
WHERE id IN ('PROMPT-SOLOPRENEUR-365', 'CASIO-VDC-2K7', 'AUTO-01', 'LIVE-BOM-DON', 'GIT-25');

-- Dự phòng nếu sản phẩm đang có foreign key ràng buộc với đơn hàng cũ, đánh dấu ẩn:
UPDATE products 
SET is_active = false 
WHERE id IN ('PROMPT-SOLOPRENEUR-365', 'CASIO-VDC-2K7', 'AUTO-01', 'LIVE-BOM-DON', 'GIT-25');

-- 2. Đảm bảo sản phẩm cày thuê chủ lực CUSTOM-TASK luôn tồn tại trong cơ sở dữ liệu:
INSERT INTO products (id, name, description, price, type, icon, badge, is_active, sort_order)
VALUES (
  'CUSTOM-TASK',
  'Giao Kèo Cày Thuê (Code Web, Script, Giải Bài)',
  'Nhập bất kỳ yêu cầu lập trình hay học tập, Mèo Dev tự định giá 19k - 49k, tự code và tự trả hàng qua Gmail!',
  29000,
  'CUSTOM_TASK',
  '⚡',
  'Hot • Nhận việc 24/7',
  true,
  10
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  type = EXCLUDED.type,
  icon = EXCLUDED.icon,
  badge = EXCLUDED.badge,
  is_active = true,
  sort_order = 10;

-- 3. Bổ sung các cột phục vụ Flash Sale thật 100% trong campaign_stats:
ALTER TABLE campaign_stats ADD COLUMN IF NOT EXISTS is_flash_sale BOOLEAN DEFAULT false;
ALTER TABLE campaign_stats ADD COLUMN IF NOT EXISTS flash_sale_discount_percent INT DEFAULT 20;
ALTER TABLE campaign_stats ADD COLUMN IF NOT EXISTS flash_sale_ends_at TIMESTAMPTZ;
ALTER TABLE campaign_stats ADD COLUMN IF NOT EXISTS flash_sale_message TEXT;

-- 4. Kích hoạt Flash Sale Giờ Vàng (-20%) ngay lập tức trong 2 giờ:
UPDATE campaign_stats
SET 
  is_flash_sale = true,
  flash_sale_discount_percent = 20,
  flash_sale_ends_at = NOW() + INTERVAL '2 hours',
  flash_sale_message = '🔥 GIỜ VÀNG FLASH SALE — Giảm ngay 20% toàn bộ dịch vụ và gói tài liệu! Quét mã QR thanh toán đúng giá sale thật 100%!'
WHERE id = 1;
