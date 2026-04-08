# 🚀 WANDERDNA AI - CORE SYSTEM MASTER PLAN

## 1. PROJECT IDENTITY & GOALS
- **Project Name:** WanderDNA AI
- **Tech Stack:** Next.js 14 (App Router), TypeScript, TailwindCSS, Shadcn UI.
- **Database:** PostgreSQL (via Prisma ORM), chạy trên Docker.
- **Authentication:** NextAuth.js (Credentials Provider + JWT Strategy).
- **Core Features:** 1. Smart Itinerary (Knapsack & TSP Algorithms - No AI token cost).
  2. Split-Bill Ledger (Graph Algorithms for debt simplification).
  3. AI Concierge (Gemini 2.5 Flash for OCR Receipt & Voice NLU).
  4. Interactive Open Maps (Leaflet.js + OpenStreetMap).

## 2. SECURITY & RBAC (ROLE-BASED ACCESS CONTROL)
- **Environment:** Mọi chuỗi kết nối DB, Secret Keys phải nằm trong `.env` và bị gitignore.
- **Authentication:** Sử dụng `bcrypt` để mã hóa mật khẩu trong Database.
- **Roles:** `ADMIN` và `USER`.
  - `USER`: Route `/dashboard`, `/itinerary`, `/split-bill`.
  - `ADMIN`: Route `/admin/*`.
- **Middleware Protection:** Cấu hình `middleware.ts` của Next.js:
  - Chặn guest truy cập các route private.
  - Chặn `USER` truy cập `/admin`. Nếu cố tình vào -> redirect `/dashboard` hoặc 403.

## 3. DATABASE SCHEMA (PRISMA)
Thiết kế chuẩn Relational Database cho Du lịch:
- `User`: id, email, passwordHash, name, role (USER/ADMIN), travelDNA (JSON).
- `Place`: id, name, lat (Float), lng (Float), category (STAY, EAT, PLAY), estimatedCost, durationMinutes.
- `Trip`: id, userId, title, budget, startDate, endDate, city.
- `TripItem`: id, tripId, placeId, date, orderIndex.
- `Expense`: id, tripId, title, totalAmount, payerId.
- `ExpenseShare`: id, expenseId, userId, amountOwed.

## 4. DOCKER ARCHITECTURE
- Cần có `docker-compose.yml` để spin up PostgreSQL container nhanh chóng cho môi trường Development. Cấu hình credentials lấy từ `.env`.

## 5. VIBE CODING DIRECTIVES (Luật cho AI Agent)
- KHÔNG sử dụng Google Maps API. Sử dụng `react-leaflet` và OpenStreetMap.
- Viết code Modular: Tách biệt UI Components, Server Actions (API), và Algorithms (Thư mục riêng cho lõi thuật toán).
- Luôn kiểm tra type-safety của TypeScript.