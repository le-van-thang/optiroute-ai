Markdown
# 🗺️ OptiRoute AI - Smart Itinerary & Expense Tracker

OptiRoute AI là một ứng dụng web thông minh giúp người dùng tự động lên kế hoạch lịch trình du lịch tối ưu và quản lý chi phí chia sẻ giữa các thành viên một cách minh bạch, hiệu quả.

## ✨ Tính năng nổi bật (Features)
- 🔐 **Authentication:** Hệ thống đăng nhập/đăng ký bảo mật cao (Hỗ trợ Credentials, Google, Facebook OAuth). Phân quyền người dùng (Role-Based Access Control).
- 📍 **Smart Itinerary Planner:** Sắp xếp lịch trình du lịch thông minh, tối ưu hóa quãng đường di chuyển.
- 💰 **Split-Bill Ledger:** Quản lý chi phí chuyến đi, tự động tính toán và chia tiền thông minh giữa các thành viên.
- 🤖 **AI Concierge:** Trợ lý ảo AI hỗ trợ gợi ý địa điểm và giải đáp thắc mắc du lịch.
- 🗺️ **Interactive Maps:** Tích hợp bản đồ trực quan để theo dõi lộ trình.

## 🛠️ Công nghệ sử dụng (Tech Stack)
- **Framework:** Next.js 14 (App Router)
- **Ngôn ngữ:** TypeScript
- **Giao diện:** Tailwind CSS, Framer Motion, Lucide Icons
- **Database:** PostgreSQL (chạy qua Docker)
- **ORM:** Prisma
- **Bảo mật:** NextAuth.js v4, Bcryptjs

## 🚀 Hướng dẫn cài đặt (Getting Started)

### Yêu cầu hệ thống (Prerequisites)
- Node.js (phiên bản 18+).
- `pnpm` (Package manager).
- Docker Desktop (để chạy database cục bộ).

### Các bước chạy dự án cục bộ (Installation)

1. **Clone repository:**
```bash
git clone [https://github.com/le-van-thang/optiroute-ai.git](https://github.com/le-van-thang/optiroute-ai.git)
cd optiroute-ai
```

2. **Cài đặt thư viện:**
```bash
pnpm install
```

3. **Cấu hình biến môi trường:**
- Đổi tên file `.env.example` thành `.env`.
- Cập nhật các thông tin kết nối Database và Auth Secret trong file `.env`.

4. **Khởi động Database (Docker):**
```bash
docker-compose up -d
```

5. **Đồng bộ Database (Prisma):**
```bash
pnpm run db:push
```

6. **Chạy ứng dụng:**
```bash
pnpm run dev
```
Ứng dụng sẽ chạy tại: `http://localhost:3000`

## 📁 Tài liệu tham khảo nội bộ
Vui lòng tham khảo file `MASTER_PLAN.md` để xem cấu trúc chi tiết, sơ đồ thuật toán và lộ trình phát triển của dự án.
```

***

Sau khi dán xong, bạn bấm nút **Preview** (Xem trước) ở trên GitHub. Đảm bảo 100% bạn sẽ thấy các dòng code màu đen tách biệt, chuyên nghiệp y như các dự án lớn. Khớp phát là bấm **Commit changes** (Lưu lại) là xong luôn. 

Giao diện xong, code lưu GitHub xong, giờ bạn có muốn mình gọi Antigravity dậy để quất luôn Giai đoạn 4 (Thuật toán lõi) cho nóng không?
