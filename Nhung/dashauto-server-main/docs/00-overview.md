# 00 — Tổng quan dự án DashAuto

## Dự án này giải quyết bài toán gì?

Các công ty vừa và nhỏ thường xuyên phải:
- Theo dõi doanh thu, đơn hàng, sản phẩm bán chạy
- Phát hiện bất thường (doanh thu thấp, tỷ lệ hoàn hàng cao, lỗi hệ thống)
- Gửi báo cáo định kỳ cho quản lý qua email
- Ghi log các tiến trình tự động

Làm thủ công tất cả những việc này rất tốn thời gian. **DashAuto** là dashboard kết hợp với công cụ tự động hoá **n8n** để:

1. Hiển thị số liệu real-time lên giao diện web
2. Tự động phát hiện bất thường → ghi cảnh báo → gửi thông báo
3. Tự tạo và gửi báo cáo định kỳ
4. Quản trị viên chỉ cần mở dashboard là thấy sức khỏe hệ thống

## 4 thành phần trong hệ thống

```
┌──────────────┐    HTTP      ┌──────────────┐    SQL     ┌──────────────┐
│   Frontend   │ ───────────► │   Backend    │ ────────► │  PostgreSQL  │
│  React+Vite  │  JWT auth    │   Express    │           │   Database   │
│  :5173       │              │   :5000      │           │   :5432      │
└──────────────┘              └──────────────┘           └──────▲───────┘
                                                                │
                                                          SQL   │ (direct)
                                                                │
                                                         ┌──────┴───────┐
                                                         │     n8n      │
                                                         │  Automation  │
                                                         │   :5678      │
                                                         └──────────────┘
```

| Thành phần | Công nghệ | Vai trò |
|---|---|---|
| **Frontend** | React 19 + Vite + React Router + Recharts | Giao diện người dùng, biểu đồ, bảng số liệu |
| **Backend** | Node.js + Express 5 + JWT + bcrypt | Xác thực, cung cấp API cho Frontend |
| **Database** | PostgreSQL 16 | Lưu users, orders, products, reports, alerts, workflow_logs |
| **Automation** | n8n (Docker) | Chạy định kỳ, quét DB, tự ghi alert/log, gửi email |

## Hai vai trò trong đồ án

| Vai trò | Người phụ trách | Nội dung |
|---|---|---|
| **Full-stack Dev** | Tuấn | Frontend (React), Backend (Express), Database, Docker |
| **Automation** | Nhung | n8n workflows: cron, phát hiện bất thường, gửi email |

## Các chức năng chính (theo đề bài)

### Frontend
- ✅ Đăng nhập / Đăng ký / Phân quyền (admin / manager / viewer)
- ✅ Dashboard 5 thẻ thống kê (doanh thu, đơn hàng, sản phẩm, báo cáo, cảnh báo)
- ✅ 3 biểu đồ: doanh thu theo ngày/tháng, top sản phẩm, KPI khu vực/nhân viên
- ✅ Bộ lọc khoảng ngày (7/30/90 ngày hoặc tuỳ chọn)
- ✅ Trang Lịch sử báo cáo (filter theo loại, trạng thái email)
- ✅ Trang Cảnh báo (filter theo mức độ, trạng thái, có nút resolve)
- ✅ Trang Automation (summary + log chi tiết từ n8n)

### Backend
- ✅ Xác thực JWT + middleware phân quyền
- ✅ API Dashboard: stats, revenue, top-products, KPI (tất cả hỗ trợ filter `from/to`)
- ✅ API Reports, Alerts, Workflow logs
- ✅ Kết nối Postgres bằng connection pool
- ✅ Migration system đơn giản tự viết
- ✅ Seed data mẫu

### n8n
- ✅ Chạy trong Docker, cùng network với Postgres
- ✅ Đọc/ghi trực tiếp vào Postgres (low-code approach)
- ✅ Workflow cron `cron_heartbeat` — mỗi phút ghi 1 log
- ✅ Workflow cron `hourly_orders_check` — phát hiện thiếu đơn → tự tạo alert

## Thứ tự file trong docs này

Đọc theo thứ tự sẽ hiểu toàn bộ dự án từ zero:

1. [00-overview.md](00-overview.md) ← bạn đang ở đây
2. [01-architecture.md](01-architecture.md) — sơ đồ + luồng dữ liệu
3. [02-setup.md](02-setup.md) — cài và chạy dự án từ đầu
4. [03-docker-compose.md](03-docker-compose.md) — docker-compose giải thích
5. [04-database.md](04-database.md) — schema, migration, seed
6. [05-backend.md](05-backend.md) — Express, JWT, API
7. [06-frontend.md](06-frontend.md) — React, routing, charts
8. [07-n8n-integration.md](07-n8n-integration.md) — n8n là gì, vì sao dùng
9. [08-n8n-workflows.md](08-n8n-workflows.md) — từng bước tạo workflow
10. [09-troubleshooting.md](09-troubleshooting.md) — lỗi thường gặp

## Kiểm tra nhanh hệ thống đang chạy đúng

Sau khi setup xong, bạn mở 4 URL sau:

| URL | Mô tả | Kỳ vọng |
|---|---|---|
| http://localhost:5173 | Frontend | Redirect `/login` |
| http://localhost:5000 | Backend health | `{"message": "DashAuto Server is running"}` |
| http://localhost:5678 | n8n UI | Form login hoặc canvas |
| pgAdmin 4 → `localhost:5432` | Database | Thấy 6 bảng nghiệp vụ + bảng `users` |
