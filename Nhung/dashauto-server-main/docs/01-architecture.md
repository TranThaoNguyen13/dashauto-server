# 01 — Kiến trúc hệ thống

## 1. Tổng quan các thành phần

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MÁY TÍNH CỦA BẠN                             │
│                                                                       │
│  ┌────────────────────┐                   ┌──────────────────────┐  │
│  │  Trình duyệt       │                   │  pgAdmin 4 (GUI)     │  │
│  │  (Chrome/Edge)     │                   │  (Tuỳ chọn - xem DB) │  │
│  └────────┬───────────┘                   └──────────┬───────────┘  │
│           │                                           │               │
│           │ :5173, :5678                              │ :5432         │
│           ▼                                           ▼               │
│  ╔════════════════════╗                    ┌─────────────────────┐  │
│  ║  Frontend React    ║                    │                     │  │
│  ║  npm run dev       ║                    │                     │  │
│  ║  (Vite dev server) ║                    │                     │  │
│  ║  :5173             ║                    │                     │  │
│  ╚════════╤═══════════╝                    │                     │  │
│           │ HTTP + JWT                     │                     │  │
│           │                                │                     │  │
│           ▼                                │                     │  │
│  ╔════════════════════╗                    │    Dùng chung       │  │
│  ║  Backend Express   ║                    │    network Docker   │  │
│  ║  node index.js     ║                    │    dashauto_net     │  │
│  ║  :5000             ║                    │                     │  │
│  ╚════════╤═══════════╝                    │                     │  │
│           │                                │                     │  │
│           │ pg driver                      │                     │  │
│           │ (host: localhost)              │                     │  │
│           ▼                                │                     │  │
│   ┌──────────────────┐                     │                     │  │
│   │ DOCKER DESKTOP   │                     │                     │  │
│   │                  │                     │                     │  │
│   │  ┌────────────┐  │                     │                     │  │
│   │  │ postgres   │◄─┼─────────────────────┘                     │  │
│   │  │ container  │  │     (host: postgres                        │  │
│   │  │ :5432      │◄─┼──── từ trong docker)                      │  │
│   │  └────────────┘  │                                            │  │
│   │                  │                                            │  │
│   │  ┌────────────┐  │                                            │  │
│   │  │ n8n        │──┘                                            │  │
│   │  │ container  │                                               │  │
│   │  │ :5678      │                                               │  │
│   │  └────────────┘                                               │  │
│   └──────────────────┘                                            │  │
└─────────────────────────────────────────────────────────────────────┘
```

## 2. Các port đang dùng

| Port | Service | Ai gọi vào |
|---|---|---|
| 5173 | Frontend Vite dev server | Người dùng qua browser |
| 5000 | Backend Express | Frontend gọi API |
| 5432 | PostgreSQL | Backend gọi (từ host), n8n gọi (từ docker network) |
| 5678 | n8n UI | Nhung qua browser |

## 3. Luồng dữ liệu ví dụ

### 3.1 Luồng "Người dùng mở trang Dashboard"

```
1. Người dùng mở http://localhost:5173/dashboard
2. React render Dashboard component
3. useEffect() gọi API: GET http://localhost:5000/api/dashboard/stats
4. Axios interceptor gắn header: Authorization: Bearer <JWT>
5. Backend middleware authenticate xác thực JWT
6. dashboard.service chạy 5 câu SQL song song trên Postgres (Promise.all)
7. Backend trả JSON: { totalRevenue, totalOrders, productsSold, ... }
8. Frontend setState → render 5 thẻ số + 3 biểu đồ
```

### 3.2 Luồng "n8n tự phát hiện bất thường"

```
1. n8n cron trigger kích hoạt mỗi 2 phút
2. Node Postgres query: SELECT COUNT(*) FROM orders WHERE created_at >= NOW() - INTERVAL '1 hour'
3. Node IF kiểm tra: nếu count < 1
4. Rẽ nhánh TRUE:
   a. Node Postgres INSERT 1 dòng vào bảng alerts (type='low_order_rate')
   b. Node Postgres INSERT 1 dòng vào bảng workflow_logs (status='failed')
5. Không có code Frontend/Backend nào can thiệp
6. Lần sau người dùng F5 trang /alerts → Backend query bảng alerts → thấy alert mới
```

Đây chính là **sức mạnh của n8n**: hệ thống tự phát hiện và ghi nhận, không cần Backend viết code logic cron.

## 4. Networking — host vs container

Đây là điểm **gây nhầm lẫn nhất** cho người mới. Hiểu đúng rất quan trọng.

### Từ Backend (chạy trên máy host) → Postgres (chạy trong Docker)

```
Backend dùng: localhost:5432
```

Vì trong `docker-compose.yml` có dòng `ports: "5432:5432"`. Docker "mở cửa" port của container ra host, nên từ host truy cập `localhost:5432` sẽ tới đúng Postgres.

### Từ n8n (chạy trong Docker) → Postgres (cũng chạy trong Docker)

```
n8n dùng: postgres:5432
```

`postgres` ở đây là **tên service** trong docker-compose, **không phải hostname DNS**. Docker Compose tự động tạo 1 mạng nội bộ (network `dashauto_net`) và đăng ký DNS trong mạng đó — mỗi service có thể gọi service khác bằng tên.

Nếu n8n dùng `localhost` → trỏ vào chính container n8n (không phải host) → fail.

### Từ pgAdmin 4 (máy host) → Postgres (trong Docker)

```
pgAdmin dùng: localhost:5432
```

(Giống Backend)

### Minh hoạ

```
                    ┌─── Host machine ───┐
                    │                    │
                    │ Backend            │
                    │ pgAdmin            │──► localhost:5432 ──┐
                    │                    │                      │
                    └────────────────────┘                      │
                                                                ▼
                    ┌─── Docker network: dashauto_net ──────────────────┐
                    │                                                    │
                    │  ┌─────────────┐         ┌─────────────────┐     │
                    │  │ postgres    │◄────────│ n8n             │     │
                    │  │ container   │  postgres:5432             │     │
                    │  └─────────────┘         └─────────────────┘     │
                    │                                                    │
                    └────────────────────────────────────────────────────┘
```

## 5. Dữ liệu persist ở đâu

| Dữ liệu | Lưu ở | Mất khi? |
|---|---|---|
| Postgres data (users, orders, alerts, ...) | Docker volume `dashauto_pgdata` | Chỉ mất khi `docker volume rm` |
| n8n workflow, credentials | Postgres (n8n dùng chung DB) + volume `dashauto_n8n` | Chỉ mất khi xoá volume |
| JWT token | Browser `localStorage` | Mất khi logout hoặc token hết hạn (24h) |
| User login info | Browser `localStorage` (user object) | Mất khi logout |

## 6. Ngôn ngữ / framework đã chọn

| Lựa chọn | Tại sao |
|---|---|
| **React + Vite** | Vite nhanh hơn CRA rất nhiều, HMR mượt, setup 1 lệnh |
| **Express 5** | Tối giản, phổ biến, dễ học, MVP cho dự án nhỏ |
| **PostgreSQL** | Hỗ trợ `DATE_TRUNC`, `INTERVAL`, window function — cần cho dashboard analytics. Mysql/Sqlite hơi yếu phần này. |
| **n8n** | Low-code, kéo thả. Phù hợp để Nhung không cần biết code vẫn làm được automation |
| **JWT** | Stateless, không cần session store. Phù hợp SPA |
| **Recharts** | React-first, API đơn giản, nhẹ |
| **Docker Compose** | Chạy nhiều service 1 lệnh, cấu hình declarative, dễ tái tạo |
