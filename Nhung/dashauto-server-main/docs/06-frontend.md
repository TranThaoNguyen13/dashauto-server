# 06 — Frontend — React + Vite

## 1. Cấu trúc thư mục

```
dashauto-client/
├── public/
│   └── favicon.svg
├── src/
│   ├── main.jsx              # Entry point React
│   ├── App.jsx               # Routing
│   ├── index.css             # Global styles
│   ├── components/
│   │   ├── Layout.jsx        # Sidebar + topbar
│   │   ├── Layout.css
│   │   ├── ProtectedRoute.jsx
│   │   ├── DateRangeFilter.jsx
│   │   ├── DateRangeFilter.css
│   │   ├── RevenueChart.jsx
│   │   ├── TopProductsChart.jsx
│   │   └── KpiChart.jsx
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Login.css
│   │   ├── Register.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Dashboard.css
│   │   ├── Reports.jsx
│   │   ├── Reports.css
│   │   ├── Alerts.jsx
│   │   ├── Workflows.jsx
│   │   └── Workflows.css
│   └── services/             # API wrappers
│       ├── api.js            # Axios instance + interceptor
│       ├── auth.service.js
│       ├── dashboard.service.js
│       ├── report.service.js
│       ├── alert.service.js
│       └── workflow.service.js
├── index.html
├── package.json
├── vite.config.js
├── .env
└── .env.example
```

## 2. Vite — dev server nhanh

### 2.1 Vite vs Create-React-App

| Tiêu chí | CRA (deprecated) | Vite |
|---|---|---|
| Khởi động dev | ~15-30s | ~300ms |
| Hot reload | Vài giây | < 100ms |
| Build | Webpack (chậm) | esbuild + Rollup (nhanh) |

Hiện dùng Vite 8.

### 2.2 Chạy dev

```bash
npm run dev    # Cổng mặc định 5173
npm run build  # Build vào dist/
npm run preview # Preview bản build
```

## 3. Routing — react-router-dom v7

### 3.1 `App.jsx`

```javascript
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/workflows" element={<Workflows />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

### 3.2 Nested routes với Layout

```
<ProtectedRoute>      ← kiểm tra token
  <Layout>            ← sidebar + topbar
    <Outlet />        ← page con hiển thị ở đây (Dashboard, Reports, ...)
  </Layout>
</ProtectedRoute>
```

`<Outlet />` trong Layout là chỗ render page con. React Router tự động thay thế theo URL.

### 3.3 ProtectedRoute

```javascript
import { Navigate } from "react-router-dom";
import { getToken } from "../services/auth.service";

function ProtectedRoute({ children }) {
  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
```

Không có token → đá về `/login`.

## 4. Axios + Interceptor

### 4.1 `api.js`

```javascript
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
});

// Request interceptor: tự gắn token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: nếu 401 → logout
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;
```

### 4.2 Lợi ích

- Mọi request tự có `Authorization` header, không cần code lặp
- Token hết hạn → tự logout → redirect login
- `import.meta.env.VITE_API_URL` đọc từ `.env` của Vite (biến phải có tiền tố `VITE_`)

## 5. Service layer

Mỗi domain có 1 file service wrap axios calls:

```javascript
// auth.service.js
import api from "./api";

export const login = async (username, password) => {
  const { data } = await api.post("/auth/login", { username, password });
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
  return data;
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

export const getToken = () => localStorage.getItem("token");

export const getUser = () => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};
```

Page chỉ cần import rồi gọi, không cần biết endpoint nào.

## 6. State management — chỉ dùng useState

Dự án chưa cần Redux/Zustand. Chỉ dùng:
- `useState` cho state component
- `useEffect` cho side effect (fetch API)
- `localStorage` cho auth (token + user)

Với app nhỏ thế này là đủ. Nếu sau có nhiều trang chia sẻ state phức tạp → cân nhắc context hoặc zustand.

## 7. Component Pattern — Dashboard

```javascript
function Dashboard() {
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (dateRange.from) params.from = dateRange.from;
    if (dateRange.to) params.to = dateRange.to;
    getStats(params)
      .then(setStats)
      .finally(() => setLoading(false));
  }, [dateRange.from, dateRange.to]);

  return (
    <div>
      <h1>Dashboard</h1>
      <DateRangeFilter from={dateRange.from} to={dateRange.to} onChange={setDateRange} />
      {/* stats cards + charts */}
    </div>
  );
}
```

Pattern phổ biến:
- `useState` state
- `useEffect` fetch khi mount hoặc deps thay đổi
- Truyền state xuống child component qua props

## 8. Charts — Recharts

Thư viện biểu đồ React-first, API đơn giản.

### 8.1 Line chart (doanh thu)

```javascript
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 40 }}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="label" />
    <YAxis tickFormatter={formatMoney} />
    <Tooltip formatter={(v) => formatMoney(v) + " d"} />
    <Line type="monotone" dataKey="revenue" stroke="#4a90e2" strokeWidth={2} />
  </LineChart>
</ResponsiveContainer>
```

### 8.2 Bar chart horizontal (top products)

```javascript
<BarChart layout="vertical" data={data}>
  <XAxis type="number" />
  <YAxis type="category" dataKey="name" width={140} />
  <Bar dataKey="quantitySold" fill="#50c878" />
</BarChart>
```

### 8.3 Bar chart 2 trục Y (KPI)

```javascript
<BarChart data={data}>
  <XAxis dataKey="label" />
  <YAxis yAxisId="left" tickFormatter={formatMoney} />
  <YAxis yAxisId="right" orientation="right" />
  <Bar yAxisId="left" dataKey="revenue" fill="#4a90e2" name="Doanh thu" />
  <Bar yAxisId="right" dataKey="orders" fill="#f5a623" name="So don" />
</BarChart>
```

## 9. Layout — Sidebar + Outlet

```javascript
function Layout() {
  const user = getUser();
  const handleLogout = () => { /* ... */ };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">DashAuto</div>
        <nav className="sidebar-nav">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/reports">Bao cao</NavLink>
          <NavLink to="/alerts">Canh bao</NavLink>
          <NavLink to="/workflows">Automation</NavLink>
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-user">
            <span>{user?.username} ({user?.role})</span>
            <button onClick={handleLogout}>Dang xuat</button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

`<NavLink>` tự thêm class `active` khi URL match → CSS style item đang chọn.

## 10. CSS — tối giản

Không dùng Tailwind/styled-components/MUI để giảm dependency. Chỉ dùng CSS thường, mỗi component 1 file CSS.

Naming convention đơn giản: `.page`, `.table`, `.badge`, `.stat-card`...

## 11. DateRangeFilter — component tái dùng

```javascript
function DateRangeFilter({ from, to, onChange }) {
  const setPreset = (days) => {
    const now = new Date();
    const fromDate = new Date();
    fromDate.setDate(now.getDate() - days + 1);
    onChange({
      from: fromDate.toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
    });
  };

  return (
    <div className="date-filter">
      <input type="date" value={from} onChange={(e) => onChange({ from: e.target.value, to })} />
      <input type="date" value={to} onChange={(e) => onChange({ from, to: e.target.value })} />
      <button onClick={() => setPreset(7)}>7 ngay</button>
      <button onClick={() => setPreset(30)}>30 ngay</button>
      <button onClick={() => onChange({ from: "", to: "" })}>Tat ca</button>
    </div>
  );
}
```

Props pattern **controlled component**: parent giữ state, truyền xuống `from/to`, nhận callback `onChange`.

## 12. Toàn bộ workflow 1 request (UX)

1. User vào `/dashboard`
2. ProtectedRoute check token → có → cho qua
3. Layout render (sidebar + topbar + Outlet)
4. Dashboard component mount
5. `useEffect` trigger → gọi `getStats()` → axios GET `/api/dashboard/stats`
6. Interceptor gắn token vào header
7. Nhận response → `setStats(data)`
8. Re-render: 5 stat cards + 3 charts (tự fetch riêng qua useEffect của chúng)
9. User đổi `DateRangeFilter` → `setDateRange()` → cả 5+3 component refetch với params mới

## 13. Build production

```bash
npm run build
```

Output: `dist/` — static files (HTML, JS, CSS) có thể deploy lên bất kỳ CDN/static host nào (Vercel, Netlify, Nginx).

Cần set `VITE_API_URL` đúng với backend production khi build.
