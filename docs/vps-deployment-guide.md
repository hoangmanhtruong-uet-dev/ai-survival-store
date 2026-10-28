# 🚀 HƯỚNG DẪN TRIỂN KHAI MÈO DEV AUTONOMOUS DAEMON LÊN VPS (24/7)

Tài liệu này hướng dẫn bạn đưa con bot **Mèo Dev Tự Hành** lên VPS chạy ngầm 24/7 để tự động cày cuốc, trừ độ đói, tung Flash Sale, viết bài marketing gửi về Telegram cá nhân và mở bán sản phẩm mới đạt KPI **7.000.000đ trong 60 ngày**.

---

## 🎁 BƯỚC 1: LẤY VPS MIỄN PHÍ DÀNH CHO SINH VIÊN

Chọn 1 trong các nguồn dưới đây:

### 1.1. Dùng Email Sinh Viên (`.edu` / `.edu.vn`) - DỄ NHẤT:
1. Truy cập [GitHub Student Developer Pack](https://education.github.com/pack) và đăng ký bằng email trường đại học.
2. Nhận ngay:
   - **DigitalOcean:** Tặng **\$200 credit** (Dùng để tạo 1 Droplet Ubuntu 22.04 1 CPU / 1GB RAM chạy thoải mái 1 năm).
   - **Microsoft Azure for Students:** Tặng **\$100 credit** + Miễn phí 1 máy ảo Linux B1s không cần thẻ ngân hàng.

### 1.2. Dùng Thẻ Visa / Mastercard (Miễn phí vĩnh viễn):
1. Đăng ký tài khoản [Oracle Cloud Always Free](https://www.oracle.com/cloud/free/).
2. Tạo 1 Compute Instance:
   - Hệ điều hành: `Ubuntu 22.04 LTS`.
   - Cấu hình: Miễn phí trọn đời (Always Free-eligible).

---

## 🤖 BƯỚC 2: TẠO TELEGRAM BOT ĐỂ NHẬN BÀI VIẾT & BÁO CÁO (2 PHÚT)

Bot Mèo Dev sẽ tự động soạn bài Threads/FB và bắn về Telegram của bạn vào 21:00 mỗi tối:

1. **Lấy Token Bot:**
   - Mở Telegram, tìm kiếm **`@BotFather`**.
   - Gõ `/newbot` -> Đặt tên cho bot (VD: `MeoDev_HelperBot`) -> Đặt username (VD: `meo_dev_survival_bot`).
   - BotFather sẽ cấp cho bạn một chuỗi **HTTP API Token** (Dạng: `7123456789:AAHqW...`).
2. **Lấy Chat ID cá nhân của bạn:**
   - Tìm kiếm bot **`@userinfobot`** trên Telegram -> Bấm `/start`.
   - Bot sẽ trả về dòng `Id: 123456789`. Đó chính là **TELEGRAM_CHAT_ID** của bạn.
3. Bấm `/start` vào con bot vừa tạo ở bước 1 để kích hoạt kênh nhắn tin.

---

## 💻 BƯỚC 3: CÀI ĐẶT TRÊN VPS (CHỈ CẦN GÕ CÁC LỆNH DƯỚI ĐÂY)

Đăng nhập vào VPS qua SSH:
```bash
ssh ubuntu@<IP_VPS_CỦA_BẠN>
```

### 3.1. Cài đặt Docker & Git (Cách triển khai khuyên dùng):
```bash
sudo apt update && sudo apt install -y docker.io docker-compose git
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
newgrp docker
```

*(Hoặc nếu muốn chạy trực tiếp bằng Node.js & PM2):*
```bash
# Cài đặt Node.js 20 LTS & PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

---

## 📦 BƯỚC 4: CLONE CODE & CẤU HÌNH BIẾN MÔI TRƯỜNG

```bash
# 1. Clone repository về VPS
git clone <URL_REPO_GITHUB_CỦA_BẠN>
cd "AI Survival Store"

# 2. Tạo file cấu hình .env.local
nano .env.local
```

Dán nội dung cấu hình vào file `.env.local` (Điền key thực tế của bạn):
```env
# 1. Supabase Database & Realtime
NEXT_PUBLIC_SUPABASE_URL=https://ciwioaaxgmuoqkalnwyo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# 2. Google Gemini API (AI Studio miễn phí)
GEMINI_API_KEY=AQ.Ab8RN6JS...
GEMINI_MODEL=gemini-3.5-flash-lite

# 3. Telegram Bot (Đã lấy ở Bước 2)
TELEGRAM_BOT_TOKEN=7123456789:AAHqW...
TELEGRAM_CHAT_ID=123456789

# 4. Website Domain
NEXT_PUBLIC_SITE_URL=https://meo-dev-store.vercel.app
```
*(Bấm `Ctrl + O` để lưu, `Enter`, rồi `Ctrl + X` để thoát nano).*

---

## 🚀 BƯỚC 5: KHỞI CHẠY DAEMON TỰ HÀNH 24/7

### Cách 1: Chạy bằng Docker (Khuyên dùng - Ổn định nhất):
```bash
# Khởi động container ngầm
docker compose -f daemon/docker-compose.yml up -d --build

# Xem log hoạt động của Mèo Dev trong thời gian thực:
docker logs -f meo-dev-survival-daemon
```

### Cách 2: Chạy bằng PM2 (Nếu không muốn dùng Docker):
```bash
npm install
npm run daemon:test  # Chạy thử nghiệm toàn bộ 4 tác vụ

# Khởi động ngầm 24/7 qua PM2:
pm2 start daemon/ecosystem.config.js
pm2 save
pm2 startup
```

---

## 🛠️ CÁC LỆNH TEST & ĐIỀU KHIỂN MÈO DEV THỦ CÔNG

Bất kỳ lúc nào bạn cũng có thể ra lệnh cho Mèo thực hiện tác vụ ngay lập tức:

```bash
# Thử chạy bộ sinh Content Marketing (Bài Threads/FB + Script TikTok):
npm run daemon:content

# Thử kiểm tra và kích hoạt Flash Sale:
npm run daemon:sale

# Thử cho Mèo tự sáng tạo 1 sản phẩm số mới:
npm run daemon:product

# Thử chạy chu kỳ trừ đói:
npm run daemon:hunger
```

---

## 📈 LỊCH TRÌNH TỰ ĐỘNG CỦA MÈO TRÊN VPS (AUTO LOOP)

| Chu kỳ | Tên Tác Vụ | Hành Động Tự Động Của Mèo |
| :--- | :--- | :--- |
| **Mỗi 30 phút** | **Nhịp sống (Hunger Decay)** | Giảm 2% độ no. Nếu độ no `< 35%`, tự động gọi Gemini soạn câu thoại cầu xin bi thương bắn lên Live Terminal web. |
| **Mỗi 6 tiếng** | **Kích cầu (Flash Sale)** | Quét đơn hàng trong 6h qua. Nếu ế ẩm không có đơn, tự động tung thông báo Giờ Vàng Flash Sale lên web và báo Telegram. |
| **21:00 mỗi ngày** | **AI Viral Content** | Tổng hợp số tiền kiếm được trong ngày -> Soạn sẵn bài đăng Threads/FB + Kịch bản TikTok 30s -> Bắn vào Telegram để bạn 1-click copy đăng mạng xã hội. |
| **Mỗi 3 ngày (10:00)** | **Tự dev sản phẩm mới** | Gemini Pro tự nghĩ ý tưởng tài liệu/cheat-sheet mới -> Tự nạp sản phẩm vào Storefront trên web -> Báo Telegram. |

🎯 **Chúc Mèo Dev sống sót thành công qua 60 ngày và mang về đủ 7.000.000 VNĐ cho bạn!**

