# 02 — Hướng dẫn setup từ zero

Mục tiêu: người mới hoàn toàn có thể làm theo và chạy được dự án.

## 1. Yêu cầu phần mềm

| Phần mềm | Link tải | Tại sao cần |
|---|---|---|
| **Node.js 20+** | https://nodejs.org | Chạy Backend (Express) và Frontend (Vite) |
| **Docker Desktop** | https://www.docker.com/products/docker-desktop | Chạy Postgres + n8n trong container |
| **Git** | https://git-scm.com | Quản lý source code |
| **VS Code** (gợi ý) | https://code.visualstudio.com | Edit code |
| **pgAdmin 4** (tuỳ chọn) | https://www.pgadmin.org | GUI xem/quản lý Postgres |

Kiểm tra cài đặt:

```bash
node --version    # v20.x trở lên
npm --version     # 10.x trở lên
docker --version  # 24.x trở lên
git --version
```

## 2. Cấu trúc thư mục dự án

```
c:/Tuan/Nhung/
├── dashauto-client/    # Frontend React
├── dashauto-server/    # Backend Express + docker-compose
└── docs/               # Thư mục này
```

## 3. Chuẩn bị file môi trường (.env)

### 3.1 Backend

Trong `dashauto-server/`, tạo file `.env` copy từ `.env.example`:

```bash
cd dashauto-server
cp .env.example .env
```

Nội dung `.env`:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=dashauto-secret-key

DB_HOST=localhost
DB_PORT=5432
DB_USER=dashauto
DB_PASSWORD=dashauto123
DB_NAME=dashauto_db

N8N_USER=admin
N8N_PASSWORD=admin123
```

> ⚠️ File `.env` KHÔNG commit vào git (đã có trong `.gitignore`). File `.env.example` thì commit để người khác biết cần những biến gì.

### 3.2 Frontend

Trong `dashauto-client/`, tạo file `.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

## 4. Thứ tự khởi động dự án

```
1. Start Docker Desktop
2. Start container Postgres + n8n  (docker compose up -d)
3. Cài dependencies Backend        (npm install)
4. Migrate + seed DB               (npm run migrate && npm run seed)
5. Chạy Backend                    (npm run dev)
6. Cài dependencies Frontend       (npm install)
7. Chạy Frontend                   (npm run dev)
8. Thiết lập n8n owner account     (mở browser lần đầu)
```

## 5. Step-by-step

### Bước 1: Khởi động Docker Desktop

Mở Docker Desktop từ Start Menu. Đợi icon whale ở taskbar **không còn nhấp nháy** mới là xong.

### Bước 2: Start Postgres + n8n

```bash
cd dashauto-server
docker compose up -d
```

Giải thích:
- `docker compose up` - đọc file `docker-compose.yml` và tạo/chạy các container
- `-d` (detached) - chạy nền, không chiếm terminal

Kiểm tra:

```bash
docker ps
```

Phải thấy 2 container: `dashauto-postgres` (port 5432) và `dashauto-n8n` (port 5678).

> Lần đầu chạy sẽ mất vài phút vì Docker tải image về (~150MB Postgres + ~800MB n8n).

### Bước 3: Cài dependencies Backend

```bash
cd dashauto-server
npm install
```

Cài tất cả packages trong `package.json`:
- `express`, `cors` — HTTP server
- `pg` — Postgres driver
- `bcryptjs`, `jsonwebtoken` — auth
- `dotenv` — load `.env`

### Bước 4: Migrate + seed DB

```bash
npm run migrate   # Tạo các bảng
npm run seed      # Thêm dữ liệu mẫu (6 products, 60 orders, v.v.)
```

Xem [04-database.md](04-database.md) để hiểu chi tiết.

### Bước 5: Chạy Backend

```bash
npm run dev
```

Thấy dòng:
```
DB connected at ...
Server running on port 5000 [development]
```

Mở browser: http://localhost:5000 → thấy JSON `{"message":"DashAuto Server is running"}`

> ⚠️ Terminal này **giữ nguyên** (đừng đóng), mở terminal khác cho bước sau.

### Bước 6: Cài dependencies Frontend

Mở terminal mới:

```bash
cd dashauto-client
npm install
```

Cài:
- `react`, `react-dom`, `react-router-dom`
- `axios` — gọi API
- `recharts` — vẽ biểu đồ
- `vite` — dev server

### Bước 7: Chạy Frontend

```bash
npm run dev
```

Thấy:
```
VITE v8.x.x  ready in 300 ms
➜  Local:   http://localhost:5173/
```

Mở browser: http://localhost:5173

### Bước 8: Login

Backend đã có user `admin` từ seed (nếu bạn đã `npm run seed`). Nhưng thực ra seed không tạo user — user bạn tạo qua register lúc đầu đã được lưu.

Nếu chưa có user, vào `http://localhost:5173/register` để đăng ký tài khoản đầu tiên:
- Username: `admin`
- Password: `123456`
- Role: Admin

Sau đó login.

### Bước 9: Thiết lập n8n (lần đầu)

Mở: http://localhost:5678

Lần đầu sẽ hiện form **"Set up owner account"**:
- Email: tự nhập (ví dụ `admin@dashauto.local`)
- First/Last name: tự nhập
- Password: tự nhập (nhớ ghi lại)

Bấm Next, skip khảo sát. Xong.

## 6. Các lệnh thường dùng

### Backend

```bash
cd dashauto-server
npm run dev          # Chạy dev (tự reload)
npm start            # Chạy production mode
npm run migrate      # Chạy migrations
npm run seed         # Seed dữ liệu mẫu
```

### Frontend

```bash
cd dashauto-client
npm run dev          # Dev server HMR
npm run build        # Build production vào dist/
npm run preview      # Preview dist/
npm run lint         # Chạy ESLint
```

### Docker

```bash
cd dashauto-server
docker compose up -d          # Start containers
docker compose down           # Stop + xoá containers (giữ volume)
docker compose down -v        # Stop + xoá cả volume (MẤT DATA!)
docker compose logs postgres  # Xem log container postgres
docker compose logs -f n8n    # Theo dõi log n8n real-time
docker compose restart        # Restart tất cả
docker ps                     # Liệt kê container đang chạy
```

## 7. Tắt hệ thống

Khi xong việc, tắt theo thứ tự ngược:

```bash
# Terminal Frontend: Ctrl+C
# Terminal Backend: Ctrl+C

cd dashauto-server
docker compose down

# Tắt Docker Desktop (tuỳ chọn, có thể để chạy nền)
```

> Chỉ `docker compose down` thôi là **không mất data** vì data lưu trong volume.

## 8. Reset toàn bộ DB (khi cần)

Khi muốn xoá hết DB làm lại từ đầu:

```bash
cd dashauto-server
docker compose down -v        # -v xoá volume dữ liệu
docker compose up -d
npm run migrate
npm run seed
```

⚠️ Cảnh báo: Lệnh này **XOÁ TẤT CẢ** (cả workflow n8n đã tạo).

## 9. Checklist sau khi setup

- [ ] `docker ps` thấy 2 container
- [ ] http://localhost:5000 → `{"message": "DashAuto Server is running"}`
- [ ] http://localhost:5173 → thấy trang login
- [ ] http://localhost:5678 → thấy giao diện n8n
- [ ] pgAdmin 4 kết nối được `localhost:5432` user `dashauto`
- [ ] Login frontend → vào dashboard thấy 5 thẻ số + 3 biểu đồ có dữ liệu
