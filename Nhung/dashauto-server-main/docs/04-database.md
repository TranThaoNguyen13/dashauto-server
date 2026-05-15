# 04 — Database — PostgreSQL

## 1. Vì sao chọn PostgreSQL?

| Lý do | Giải thích |
|---|---|
| Hỗ trợ tốt phân tích | `DATE_TRUNC`, `INTERVAL`, window functions — cần cho dashboard |
| Mã nguồn mở, free | Không phí license |
| Type system mạnh | `NUMERIC(14,2)` cho tiền, `TIMESTAMP` với timezone |
| Hỗ trợ JSON | Lưu field phức tạp khi cần |
| n8n tương thích | n8n native Postgres node |

MySQL/SQLite cũng chạy được, nhưng Postgres mạnh hơn về analytics.

## 2. Schema — 7 bảng

### 2.1 `users` — Tài khoản đăng nhập

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,  -- bcrypt hash
  role VARCHAR(20) NOT NULL DEFAULT 'viewer',  -- admin|manager|viewer
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

- `password` lưu dạng hash bcrypt, KHÔNG lưu plain text
- `role` phân quyền 3 cấp

### 2.2 `products` — Sản phẩm

```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  sku VARCHAR(50) UNIQUE,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2.3 `orders` — Đơn hàng

```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  order_code VARCHAR(50) UNIQUE NOT NULL,
  customer_name VARCHAR(200),
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending|completed|cancelled
  region VARCHAR(100),                             -- Ha Noi, HCM, Da Nang, Hai Phong
  employee_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

- `region` + `employee_id` phục vụ KPI chart (khu vực / nhân viên)
- `status = completed` mới được tính vào doanh thu

### 2.4 `order_items` — Chi tiết đơn

```sql
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL
);
```

- `ON DELETE CASCADE` — xoá order thì items tự xoá theo
- `unit_price` snapshot tại lúc bán (không lấy `products.price` vì giá thay đổi)

### 2.5 `reports` — Báo cáo

```sql
CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  type VARCHAR(50) NOT NULL,           -- daily|weekly|monthly
  content TEXT,
  file_url VARCHAR(500),
  email_status VARCHAR(20) DEFAULT 'pending',  -- success|failed|pending
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2.6 `alerts` — Cảnh báo

```sql
CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,           -- low_revenue|high_return_rate|workflow_error|low_order_rate
  message TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'info',   -- info|warning|critical
  status VARCHAR(20) NOT NULL DEFAULT 'open',     -- open|resolved
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);
```

- Được **n8n ghi vào** khi phát hiện bất thường
- Backend có API để mark `resolved`

### 2.7 `workflow_logs` — Log workflow tự động

```sql
CREATE TABLE workflow_logs (
  id SERIAL PRIMARY KEY,
  workflow_name VARCHAR(200) NOT NULL,
  status VARCHAR(20) NOT NULL,          -- success|failed
  message TEXT,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

- Được **n8n ghi** mỗi lần workflow chạy
- Trang Automation trên frontend đọc bảng này

### 2.8 Index

Để query nhanh:
```sql
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_workflow_logs_executed_at ON workflow_logs(executed_at);
```

## 3. Hệ thống Migration đơn giản

Chúng ta tự viết (không dùng framework như Knex/Prisma) để học:

### 3.1 File migration

Nằm ở `dashauto-server/src/db/migrations/`:

```
migrations/
├── 001_create_users.sql
└── 002_create_business_tables.sql
```

Thêm migration mới: tạo file `003_xxx.sql`, viết SQL. Dùng `IF NOT EXISTS` / `IF EXISTS` để idempotent (chạy lại nhiều lần cũng không lỗi).

### 3.2 Script chạy migration

`src/db/migrate.js`:

```javascript
const fs = require("fs");
const path = require("path");
const db = require("./index");

async function migrate() {
  const dir = path.join(__dirname, "migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    console.log(`Running ${file}...`);
    await db.query(sql);
  }

  console.log("Migrations done");
  await db.pool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
```

Logic: đọc toàn bộ file `.sql` trong thư mục, sort theo tên (001, 002, 003...), chạy lần lượt.

Chạy:
```bash
npm run migrate
```

### 3.3 Hạn chế

Hệ thống này **không track** migration nào đã chạy. Mỗi lần `npm run migrate` nó chạy lại TẤT CẢ file. Vì dùng `IF NOT EXISTS` nên không lỗi, nhưng:
- Không biết migration nào đã apply
- Không rollback được

Production nên dùng framework (Knex, Prisma, Flyway). Cho đồ án này đủ dùng.

## 4. Seed data

`src/db/seed.js` tạo dữ liệu mẫu:
- 6 products cố định (Dell XPS, iPhone, ...)
- 60 orders ngẫu nhiên (rải trong 30 ngày gần đây)
- 125 order_items
- 10 reports
- 8 alerts
- 20 workflow_logs

Chạy:
```bash
npm run seed
```

Script check: nếu đã có products thì skip, không chạy lại. Để seed lại phải `TRUNCATE` bảng trước hoặc reset DB.

## 5. Kết nối từ Node.js

File `src/db/index.js`:

```javascript
const { Pool } = require("pg");
const config = require("../config");

const pool = new Pool(config.db);

pool.on("error", (err) => {
  console.error("Postgres pool error:", err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
```

### 5.1 Connection pool

`pg.Pool` giữ nhiều connection mở sẵn để tái dùng. Mỗi request HTTP không cần mở mới connection → nhanh hơn.

Default: 10 connections cùng lúc.

### 5.2 Query có tham số

```javascript
// ĐÚNG: tham số hoá, chống SQL injection
await db.query("SELECT * FROM users WHERE username = $1", [username]);

// SAI: concat string, dễ bị SQL injection
await db.query(`SELECT * FROM users WHERE username = '${username}'`);
```

`$1`, `$2`, ... là placeholder của Postgres.

### 5.3 Ví dụ cách dùng

```javascript
// SELECT
const result = await db.query("SELECT * FROM users");
console.log(result.rows);        // Array<User>
console.log(result.rowCount);    // số dòng

// INSERT + lấy lại id
const r = await db.query(
  "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id",
  ["admin", "hashedPassword"]
);
console.log(r.rows[0].id);
```

## 6. Kết nối bằng pgAdmin 4

1. Cài pgAdmin 4 từ https://www.pgadmin.org/download/
2. Mở pgAdmin → Register → Server
3. Tab **General**: Name = `DashAuto`
4. Tab **Connection**:
   - Host: `localhost` (KHÔNG phải `localhost:5432`)
   - Port: `5432`
   - Maintenance database: `dashauto_db`
   - Username: `dashauto`
   - Password: `dashauto123`
5. Save

Bây giờ có thể:
- Xem tables trong Schemas → public → Tables
- Query: chuột phải DB → Query Tool
- Xem data: chuột phải table → View/Edit Data → All Rows

## 7. Query hữu ích

### Xem tổng quan

```sql
-- Đếm số record mỗi bảng
SELECT 'users' AS t, COUNT(*) FROM users
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'reports', COUNT(*) FROM reports
UNION ALL SELECT 'alerts', COUNT(*) FROM alerts
UNION ALL SELECT 'workflow_logs', COUNT(*) FROM workflow_logs;
```

### Xem orders có status gì

```sql
SELECT status, COUNT(*), SUM(total_amount)
FROM orders
GROUP BY status;
```

### Doanh thu theo ngày 30 ngày qua

```sql
SELECT DATE(created_at) AS day, SUM(total_amount) AS revenue
FROM orders
WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY day
ORDER BY day;
```

### Xoá dữ liệu test do n8n ghi

```sql
DELETE FROM workflow_logs WHERE workflow_name = 'test_from_n8n';
DELETE FROM alerts WHERE type = 'low_order_rate';
```

## 8. Reset DB khi cần làm lại

**Option 1: chỉ reset data, giữ schema**

```sql
TRUNCATE users, products, orders, order_items, reports, alerts, workflow_logs RESTART IDENTITY CASCADE;
```

Sau đó `npm run seed`.

**Option 2: xoá cả DB + recreate**

```bash
docker compose down -v   # Xoá cả volume
docker compose up -d
npm run migrate
npm run seed
```

## 9. Backup / Restore

**Backup**:
```bash
docker exec dashauto-postgres pg_dump -U dashauto -d dashauto_db > backup.sql
```

**Restore**:
```bash
docker exec -i dashauto-postgres psql -U dashauto -d dashauto_db < backup.sql
```
