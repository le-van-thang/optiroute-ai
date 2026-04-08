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
Cài đặt thư viện:

Bash
pnpm install
Cấu hình biến môi trường:

Đổi tên file .env.example thành .env.

Cập nhật các thông tin kết nối Database và Auth Secret trong file .env.

Khởi động Database (Docker):

Bash
docker-compose up -d
Đồng bộ Database (Prisma):

Bash
pnpm run db:push
Chạy ứng dụng:

Bash
pnpm run dev
Ứng dụng sẽ chạy tại: http://localhost:3000
