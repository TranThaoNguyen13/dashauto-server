# 05 — Backend — Express + JWT

## 1. Cấu trúc thư mục

```
dashauto-server/
├── src/
│   ├── app.js                      # Khởi tạo Express, middleware, routes
│   ├── config/
│   │   └── index.js                # Đọc .env, export config object
│   ├── db/
│   │   ├── index.js                # pg Pool + export query()
│   │   ├── migrate.js              # Script chạy migrations
│   │   ├── seed.js                 # Script seed data
│   │   └── migrations/
│   │       ├── 001_create_users.sql
│   │       └── 002_create_business_tables.sql
│   ├── middlewares/
│   │   └── auth.middleware.js      # authenticate, authorize
│   ├── controllers/                # Nhận req, gọi service, trả res
│   │   ├── auth.controller.js
│   │   ├── dashboard.controller.js
│   │   ├── report.controller.js
│   │   ├── alert.controller.js
│   │   └── workflow.controller.js
│   ├── services/                   # Business logic + query DB
│   │   ├── auth.service.js
│   │   ├── dashboard.service.js
│   │   ├── report.service.js
│   │   ├── alert.service.js
│   │   └── workflow.service.js
│   └── routes/                     # Định nghĩa endpoint
│       ├── auth.routes.js
│       ├── dashboard.routes.js
│       ├── report.routes.js
│       ├── alert.routes.js
│       └── workflow.routes.js
├── docker-compose.yml
├── index.js                        # Entry point (node index.js)
├── package.json
├── .env
└── .env.example
```

## 2. Pattern MVC: Route → Controller → Service

```
HTTP request                                     Response
     │                                               ▲
     ▼                                               │
   Route (định nghĩa URL + method)                   │
     │                                               │
     ▼                                               │
   Middleware (auth, authorize)                      │
     │                                               │
     ▼                                               │
   Controller (nhận req, gọi service)                │
     │                                               │
     ▼                                               │
   Service (logic + query DB)                        │
     │                                               │
     ▼                                               │
   DB (pg Pool)                                      │
     │                                               │
     └───────── kết quả ────────────────────────────┘
```

### Vì sao tách Controller / Service?

- **Controller** chỉ lo HTTP (req, res, status code)
- **Service** chỉ lo business logic + DB query
- → Service có thể **tái dùng** ở nhiều controller, hoặc test độc lập không cần HTTP

## 3. Entry point và config

### 3.1 `index.js`

```javascript
const app = require("./src/app");
const config = require("./src/config");
const db = require("./src/db");

async function start() {
  try {
    const result = await db.query("SELECT NOW()");
    console.log(`DB connected at ${result.rows[0].now}`);
  } catch (err) {
    console.error("DB connection failed:", err.message);
    process.exit(1);
  }

  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port} [${config.nodeEnv}]`);
  });
}

start();
```

Kiểm tra DB connect trước khi listen. Nếu DB lỗi → exit luôn, tránh chạy server "ma".

### 3.2 `src/config/index.js`

```javascript
require("dotenv").config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  jwtSecret: process.env.JWT_SECRET || "dashauto-secret-key",
  db: {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || "dashauto",
    password: process.env.DB_PASSWORD || "dashauto123",
    database: process.env.DB_NAME || "dashauto_db",
  },
};
```

Mọi biến môi trường tập trung ở đây, các file khác import từ đây thay vì `process.env.XXX` rải rác.

### 3.3 `src/app.js`

```javascript
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());                    // Cho phép Frontend từ origin khác gọi vào
app.use(express.json());            // Parse JSON body

app.get("/", (req, res) => {
  res.json({ message: "DashAuto Server is running" });
});

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/dashboard", require("./routes/dashboard.routes"));
app.use("/api/reports", require("./routes/report.routes"));
app.use("/api/alerts", require("./routes/alert.routes"));
app.use("/api/workflows", require("./routes/workflow.routes"));

module.exports = app;
```

## 4. Auth — JWT

### 4.1 Register flow

```
POST /api/auth/register
{ username, password, role }
     │
     ▼
auth.service.register()
  - Check username tồn tại chưa → nếu có → 400
  - bcrypt.hash(password, 10)
  - INSERT users RETURNING id
     │
     ▼
Response: { userId: N }
```

### 4.2 Login flow

```
POST /api/auth/login
{ username, password }
     │
     ▼
auth.service.login()
  - SELECT user WHERE username = ?
  - bcrypt.compare(password, user.password)
  - jwt.sign({ id, username, role }, SECRET, { expiresIn: '24h' })
     │
     ▼
Response: { token, user: { id, username, role } }
```

### 4.3 Middleware `authenticate`

```javascript
exports.authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Thieu token" });
  }

  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    return res.status(401).json({ message: "Token khong hop le" });
  }
};
```

Mọi route protected chỉ cần `router.use(authenticate)` hoặc `router.get("/x", authenticate, handler)`.

Sau khi authenticate thành công, `req.user = { id, username, role }` — các middleware/handler phía sau dùng được.

### 4.4 Middleware `authorize`

```javascript
exports.authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Khong co quyen truy cap" });
  }
  next();
};
```

Dùng:
```javascript
router.patch("/:id/resolve", authorize("admin", "manager"), alertController.resolve);
```

Chỉ `admin` hoặc `manager` mới được gọi. Viewer bị 403.

## 5. Service pattern — ví dụ

### 5.1 `auth.service.js`

```javascript
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../config");
const db = require("../db");

exports.register = async ({ username, password, role }) => {
  const existed = await db.query("SELECT id FROM users WHERE username = $1", [username]);
  if (existed.rowCount > 0) {
    throw { status: 400, message: "Username da ton tai" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await db.query(
    "INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id",
    [username, hashedPassword, role || "viewer"]
  );

  return { userId: result.rows[0].id };
};

exports.login = async ({ username, password }) => {
  const result = await db.query(
    "SELECT id, username, password, role FROM users WHERE username = $1",
    [username]
  );

  if (result.rowCount === 0) {
    throw { status: 401, message: "Sai username hoac password" };
  }

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw { status: 401, message: "Sai username hoac password" };
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    config.jwtSecret,
    { expiresIn: "24h" }
  );

  return { token, user: { id: user.id, username: user.username, role: user.role } };
};
```

### 5.2 `auth.controller.js`

```javascript
const authService = require("../services/auth.service");

exports.register = async (req, res) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({ message: "Dang ky thanh cong", ...result });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};
```

Controller rất mỏng: gọi service, xử lý error → response.

## 6. Các endpoint hiện có

### Auth
| Method | URL | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/auth/register` | - | Đăng ký |
| POST | `/api/auth/login` | - | Đăng nhập, trả JWT |

### Dashboard
| Method | URL | Auth | Query |
|---|---|---|---|
| GET | `/api/dashboard/stats` | ✓ | `from`, `to` |
| GET | `/api/dashboard/revenue` | ✓ | `groupBy=day\|month`, `from`, `to` |
| GET | `/api/dashboard/top-products` | ✓ | `limit=5`, `from`, `to` |
| GET | `/api/dashboard/kpi` | ✓ | `by=region\|employee`, `from`, `to` |

### Reports
| Method | URL | Auth | Query |
|---|---|---|---|
| GET | `/api/reports` | ✓ | `type`, `emailStatus`, `limit`, `offset` |

### Alerts
| Method | URL | Auth | Role |
|---|---|---|---|
| GET | `/api/alerts` | ✓ | all |
| PATCH | `/api/alerts/:id/resolve` | ✓ | admin, manager |

### Workflows
| Method | URL | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/workflows` | ✓ | List log với filter |
| GET | `/api/workflows/summary` | ✓ | Tóm tắt theo workflow_name |

## 7. Error handling pattern

Service throw error object `{ status, message }`:

```javascript
throw { status: 404, message: "Khong tim thay" };
```

Controller catch và map status:

```javascript
try {
  // ...
} catch (err) {
  res.status(err.status || 500).json({ message: err.message });
}
```

Lỗi không có `status` → mặc định 500.

## 8. Date filter pattern

Hàm helper trong `dashboard.service.js`:

```javascript
const buildDateFilter = (column, from, to, startParam = 0) => {
  const params = [];
  const clauses = [];
  if (from) {
    params.push(from);
    clauses.push(`${column} >= $${startParam + params.length}`);
  }
  if (to) {
    params.push(to);
    clauses.push(`${column} <= $${startParam + params.length}`);
  }
  return { params, clauses };
};
```

Dùng:
```javascript
const { params, clauses } = buildDateFilter("created_at", from, to);
const where = ["status = 'completed'", ...clauses];

await db.query(
  `SELECT ... FROM orders WHERE ${where.join(" AND ")}`,
  params
);
```

## 9. Chạy dev vs production

### Dev
```bash
npm run dev    # node --watch index.js (auto reload khi sửa code)
```

### Production
```bash
NODE_ENV=production npm start
```

Để deploy thật cần thêm:
- HTTPS / reverse proxy (nginx)
- Process manager (PM2)
- CORS whitelist (thay `cors()` bằng `cors({ origin: 'https://yourdomain.com' })`)
- Helmet (bảo mật headers)
- Rate limiter

Ngoài scope đồ án.
