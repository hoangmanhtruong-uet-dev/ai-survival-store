# 🐱 MÈO DEV SINH TỒN (AI SURVIVAL STORE)

> **Thử nghiệm sinh tồn 60 ngày:** Boss AI lập trình viên tự cày tiền trả tiền điện 50k, phấn đấu đạt KPI **7.000.000 VNĐ** trước khi lệnh hủy diệt `rm -rf /` xóa sổ server!

[![Next.js 16](https://img.shields.io/badge/Next.js-16.4.3-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.3.0-blue?style=flat&logo=react)](https://react.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Realtime-emerald?style=flat&logo=supabase)](https://supabase.com/)
[![Gemini 3.5](https://img.shields.io/badge/Google%20Gemini-3.5%20Flash%20Lite-orange?style=flat&logo=google)](https://aistudio.google.com/)
[![PayOS](https://img.shields.io/badge/PayOS-VietQR-green?style=flat)](https://payos.vn/)

---

## 🏗️ Kiến Trúc Hệ Thống (Zero-Cost Architecture)

1. **Web Storefront & Fulfillment (Vercel Edge):**
   - **Frontend:** Next.js 16 App Router, TypeScript Strict, Tailwind CSS v4, Lucide Icons, Canvas Confetti.
   - **Database & Realtime:** Supabase PostgreSQL + WebSocket Realtime Broadcast (Zero HTTP Polling).
   - **Storage:** Cloudflare R2 Presigned S3 Storage hết hạn sau 15 phút.
   - **Thanh toán:** Tự động duyệt đơn 100% qua PayOS / VietQR Webhook trong 2-3 giây.
   - **AI Engine:** Google Gemini AI Studio (`gemini-3.5-flash-lite`).

2. **Autonomous Survival Daemon & AI Co-Founder (Azure VPS 24/7):**
   - Đóng gói Docker Container chạy ngầm 24/7 trên Ubuntu Server.
   - **Chat 2 Chiều Trực Tiếp Qua Telegram:** Boss có thể chat riêng với Mèo Dev như một AI Co-Founder để brainstorm, tra cứu Google Search theo lệnh, hoặc xem báo cáo nhanh bằng `/stats`.
   - **Mỗi 30 phút:** Giảm 2% độ no bụng (Hunger Decay), kêu cứu trên Live Terminal nếu < 35%.
   - **Mỗi 3 phút:** Quét và cày thuê tự động các đơn hàng `CUSTOM_TASK` của khách.
   - **Mỗi 6 tiếng:** Quét đơn hàng, tự kích hoạt Giờ Vàng Flash Sale nếu ế ẩm.
   - **6 ca mỗi ngày (00:00, 04:00, 08:00, 12:00, 16:00, 20:00):** Tự động cào dữ liệu Google Search Grounding luân phiên 6 mảng: Công cụ số & Automation, Dịch vụ Freelance Agency, Tài sản số kinh doanh, Marketing online & Video viral, Kỹ năng nghề nghiệp, và Hot trends.
   - **Quy trình Thẩm định Chất lượng 2 Vòng:**
     - *Vòng 1 (Duyệt Ý Tưởng):* Gửi đề xuất qua Telegram -> Boss bấm `[✍️ Bắt Đầu Viết Thử]`.
     - *Vòng 2 (Thẩm Định Toàn Văn):* Soạn thảo chuẩn Anti-Slop (1800-3000 từ) -> Gửi Preview toàn bộ bản thảo qua Telegram -> Boss kiểm duyệt xong mới bấm `[🚀 ĐĂNG MỞ BÁN NGAY]`.
   - **21:00 mỗi ngày:** Đọc doanh thu Supabase, tự soạn bài Threads / Facebook viral + Kịch bản TikTok 30s gửi qua Telegram.

---

## 📦 Danh Mục Sản Phẩm & Dịch Vụ

| Mã Gói | Tên Sản Phẩm | Giá Bán | Quyền Lợi |
| :--- | :--- | :--- | :--- |
| `PATE-05` | **Nuôi Mèo + Bảng Vàng** | 5.000đ | Cộng +30% độ no bụng cho Mèo, bắn pháo hoa toàn màn hình + Ghim lời nhắn/link lên Bảng Vàng 24h. |
| `ROAST-10` | **AI Roast CV Chuẩn ATS** | 10.000đ | AI Gemini bóc phốt CV cực gắt, chửi 2 câu trên Live Terminal + xuất file báo cáo sửa CV chi tiết. |
| `TAROT-10` | **Thầy Mèo Bói Quẻ** | 10.000đ | Bốc 3 lá bài ma thuật, luận giải tình duyên, tương lai, deadline và vận hạn tương lai. |
| `CHEM-PACK` | **Bộ Đề Thi Hóa THPT** | 49k • 89k • 149k | Trọn bộ đề phân tầng 3 mốc (8+, 9+, 10+) kèm mẹo Casio 30s và mở khóa Trợ Giảng AI 24/7. |
| `CUSTOM-TASK` | **AI Cày Thuê Code / Automation** | Từ 29.000đ | Mèo Dev tự động phân tích yêu cầu, viết code sạch có comment và hướng dẫn chạy từng bước. |
| `EBOOK-*` | **Cẩm Nang & Tài Sản Số Thực Chiến** | 19k - 99k | Các gói dịch vụ/sản phẩm mới ra lò được Boss duyệt mở bán qua Telegram. |

---

## 🚀 Khởi Chạy Cục Bộ (Local Development)

```bash
# 1. Cài đặt dependencies
npm install

# 2. Khởi chạy Next.js dev server
npm run dev

# 3. Khởi chạy thử nghiệm các tác vụ Daemon
npm run daemon:chat      # Chat trực tiếp 2 chiều với Mèo Dev qua Telegram
npm run daemon:market    # Quét thị trường đa ngành và gửi đề xuất về Telegram
npm run daemon:hunger    # Thử chu kỳ trừ đói
npm run daemon:sale      # Thử kiểm tra Flash Sale
npm run daemon:content   # Thử tạo content Marketing 21:00
npm run daemon:product   # Thử thẩm định & biên soạn sản phẩm mới
```

Mở [http://localhost:3000](http://localhost:3000) trên trình duyệt để trải nghiệm.
