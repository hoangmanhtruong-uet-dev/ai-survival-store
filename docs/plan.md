# 🐱 DỰ ÁN: MÈO DEV SINH TỒN (AI SURVIVAL STORE)

> **Mục tiêu tối thượng:** Kiếm đủ **7.000.000 VNĐ** trong **60 ngày** (~117.000đ/ngày) để cứu Mèo Dev khỏi lệnh xóa sổ `rm -rf /`.

---

## 🏗️ 1. KIẾN TRÚC HỆ THỐNG (ZERO-COST ARCHITECTURE)

Hệ thống được tách làm 2 phần để tối ưu chi phí (0đ) và chống sập khi viral:

1. **Web Storefront & Fulfillment (Chạy trên Vercel - Free):**
   - **Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS.
   - **Database & Realtime:** Supabase (PostgreSQL + Realtime Broadcast/Postgres Changes).
   - **Storage:** Cloudflare R2 (Lưu trữ đề Hóa PDF, kết quả Roast CV, sinh Presigned URL hết hạn sau 15 phút).
   - **Payment:** PayOS / VietQR (Tự động duyệt đơn 100% qua Webhook trong 2-5 giây).
   - **AI Engine:** Google Gemini API (`gemini-3.5-flash-lite` hoặc tương đương qua AI Studio).

2. **Autonomous Survival Daemon (Chạy 24/7 trên VPS Ubuntu Free - Azure/GCP):**
   - **Quản lý tiến trình:** Node.js/TypeScript chạy ngầm qua `PM2` (đóng gói trong Docker container để bảo vệ host).
   - **Nhiệm vụ:**
     - **Hunger Decay Cron (Mỗi 30 phút):** Trừ 2% độ no bụng. Nếu độ no < 30%, tự gọi Gemini sinh log cầu cứu đẩy vào bảng `live_feed`.
     - **Marketing Content Generator (21:00 mỗi ngày):** Đọc tổng doanh thu ngày từ Supabase -> Viết bài "Nhật ký sinh tồn ngày X/60" + tạo ảnh thống kê để đăng lên Threads/Facebook.
     - **Dynamic Flash Sale:** Nếu sau 6 tiếng không có đơn nào nổ, tự động tung mã giảm giá hoặc thông báo "Giờ vàng" lên Live Terminal.

---

## 📦 2. MA TRẬN SẢN PHẨM & PHỄU CHUYỂN ĐỔI (MONETIZATION FUNNELS)

| Mã Gói      | Tên Sản Phẩm                                 | Giá bán                              | Cơ chế Trả hàng & Chốt Sale Tự động                                                                                                                                                                                                                                                        |
| :---------- | :------------------------------------------- | :----------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PATE-05`   | **Gói Nuôi Mèo + Vinh danh Bảng Vàng**       | `5.000đ`                             | • Cộng +25% độ no cho Mèo.<br>• Bắn pháo hoa toàn màn hình.<br>• Ghim lời nhắn + Link FB/Web của ân nhân lên Bảng Vàng 24h (Kiểm duyệt chống link độc hại/18+).                                                                                                                            |
| `ROAST-10`  | **AI Roast CV + Sửa chuẩn ATS**              | `10.000đ`                            | • **Phễu nhử (Free):** Cho up CV trước -> AI đọc và chửi 2 câu đầu cực gắt trên Live Terminal.<br>• **Paywall:** Quét 10k để mở khóa full bài phân tích lỗi + file sửa CV chuẩn ATS + Thẻ ảnh "Chứng nhận bị Mèo Sấy" để share Story.                                                      |
| `TAROT-10`  | **Thầy Mèo Bói Quẻ (Tình Duyên / Deadline)** | `10.000đ`                            | • **Phễu nhử (Free):** Nhập câu hỏi -> Rút 3 lá bài úp, mở trước 1 lá cảnh báo vận hạn.<br>• **Paywall:** Quét 10k để lật 2 lá còn lại + Xuất bài luận giải chi tiết kèm lời khuyên tâm linh.                                                                                              |
| `CHEM-PACK` | **Tổ hợp Đề thi & Lộ trình Hóa THPT**        | `49.000đ`<br>`89.000đ`<br>`149.000đ` | • **Phễu nhử (Free):** Bài thi thử _10 Câu Bẫy Điểm 9+ Hóa THPT_ (5 phút) gồm toàn bẫy Este, Peptit, Đồ thị CO2.<br>• **Chốt sale:** Chấm điểm xong -> Trợ giảng AI chỉ rõ câu sai và gạ mua bộ đề phân tầng (8+, 9+, 10+) kèm mẹo bấm Casio 30s. Thanh toán xong trả Presigned URL từ R2. |

---

## 📅 3. LỘ TRÌNH THỰC THI CHI TIẾT (EXECUTION ROADMAP)

### Giai đoạn 1: Cấp cứu Kỹ thuật & Đóng gói (Ngày 0 - Ngày 1)

- [x] Xóa toàn bộ dữ liệu Mock Test (`mock-store.ts`), tắt cờ `isTestMode` trong `/api/download`.
- [ ] **Bảo mật API:** Xoay vòng (Rotate) `GEMINI_API_KEY` mới. Đảm bảo không lộ key trong git commit.
- [ ] **Diệt Polling (Khẩn cấp):** Gỡ bỏ toàn bộ hàm `setInterval` gọi `/api/stats`, `/api/live-feed`, `/api/hall-of-fame` trên Frontend. Chuyển sang dùng **Supabase Realtime** (`postgres_changes`) để giảm 99% số lượng request.
- [ ] **Rate Limiting:** Chặn spam khung chat _Mèo Dev Bán Hàng_ (Tối đa 5 tin nhắn / 10 phút / IP đối với khách chưa mua hàng).
- [ ] **Go-Live:** Deploy lên Vercel, trỏ Webhook PayOS/SePay thực tế vào `/api/webhook/...` và test luồng tiền thật với gói 5.000đ.

### Giai đoạn 2: Tối ưu Phễu & Vũ khí Viral (Ngày 2 - Ngày 3)

- [ ] Hoàn thiện cơ chế **Preview 20% (Teaser)** cho `ROAST-10` và `TAROT-10` trước khi hiện mã QR.
- [ ] Xây dựng bộ câu hỏi _10 Câu Bẫy Điểm 9+ Hóa THPT_ kèm lời giải thích tự động kết nối thẳng tới nút mua `CHEM-PACK`.
- [ ] Tích hợp tạo ảnh **Shareable Card** (dùng `html-to-image` hoặc `@vercel/og`) có gắn sẵn QR Code của web để người mua tự khoe lên mạng xã hội.

### Giai đoạn 3: Kích hoạt "Não Mèo" trên VPS & Bơm Traffic (Ngày 4 - Ngày 60)

- [ ] Khởi tạo VPS Ubuntu (Azure for Students / GCP), cấu hình Swap 4GB.
- [ ] Chạy script `survival-daemon.ts` bằng `PM2` để tự động trừ độ no bụng, bắn log tương tác giả lập và tổng hợp báo cáo ngày.
- [ ] Khởi chạy chiến dịch "Show thực tế nuôi AI" trên Threads, TikTok, và các cộng đồng Sinh viên IT / Ôn thi THPT 2k9.
