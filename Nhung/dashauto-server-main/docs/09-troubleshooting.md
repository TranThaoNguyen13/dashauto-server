# 09 — Troubleshooting — Các lỗi thường gặp

## 1. Docker

### 1.1 "Docker Desktop not running"

**Lỗi**:
```
unable to get image 'postgres:16-alpine': failed to connect to the docker API
```

**Nguyên nhân**: Docker Desktop chưa khởi động hoặc đang khởi động dở.

**Fix**: 
1. Mở Docker Desktop
2. Đợi icon whale ở taskbar không còn nhấp nháy (2-3 phút tuỳ máy)
3. Chạy lại lệnh

### 1.2 "Port already allocated"

**Lỗi**:
```
bind: address already in use
```

**Nguyên nhân**: Có service khác đã chiếm port 5432 (Postgres cài sẵn trên host) hoặc 5678.

**Fix** Windows:
```bash
# Tìm process đang chiếm port 5432
netstat -ano | findstr :5432

# Kill process (PID lấy từ lệnh trên)
taskkill //F //PID <PID>
```

Hoặc đổi port trong docker-compose:
```yaml
ports:
  - "5433:5432"  # Host port 5433, container vẫn 5432
```

Rồi sửa `.env` của Backend:
```
DB_PORT=5433
```

### 1.3 Container bị restart liên tục

**Check log**:
```bash
docker compose logs postgres
docker compose logs n8n
```

Thường gặp:
- Volume cũ còn data từ lần setup trước, conflict với user/pass mới → xoá volume:
  ```bash
  docker compose down -v
  docker compose up -d
  ```

## 2. Backend

### 2.1 "DB connection failed"

**Lỗi**:
```
DB connection failed: ECONNREFUSED 127.0.0.1:5432
```

**Nguyên nhân**: Postgres chưa start, hoặc port khác.

**Fix**:
1. `docker ps` — kiểm tra `dashauto-postgres` có trong list không
2. Nếu không: `docker compose up -d`
3. Nếu có nhưng vẫn fail: check `.env` có đúng `DB_HOST=localhost` và `DB_PORT=5432` không

### 2.2 "Port 5000 in use"

**Lỗi**:
```
Error: listen EADDRINUSE: address already in use :::5000
```

**Nguyên nhân**: Instance Backend cũ vẫn đang chạy.

**Fix**:
```bash
# Windows
netstat -ano | findstr :5000
taskkill //F //PID <PID>

# Hoặc mở Task Manager, kill process node.exe
```

### 2.3 Route trả 404 "Cannot GET /api/..."

**Nguyên nhân**: 
- Route chưa register trong `app.js`
- Backend cũ đang chạy (chưa reload code mới)

**Fix**:
- Check `src/app.js` có `app.use("/api/xxx", require("./routes/xxx.routes"))`
- Kill hết process Node cũ, chạy lại `npm run dev`

### 2.4 CORS error khi gọi từ Frontend

**Lỗi console browser**:
```
Access to XMLHttpRequest blocked by CORS policy
```

**Fix**: Backend đã có `app.use(cors())` — mặc định cho phép mọi origin. Nếu vẫn lỗi:
1. Check Backend có đang chạy không
2. Check URL Frontend gọi có đúng không (http://localhost:5000/api/...)

### 2.5 JWT token không hợp lệ

**Lỗi**: `401 Token khong hop le`

**Nguyên nhân**: 
- `JWT_SECRET` trên Backend thay đổi → token cũ không verify được
- Token đã hết hạn (24h)

**Fix**:
- Logout → login lại
- Hoặc xoá localStorage: DevTools → Application → Local Storage → clear

### 2.6 Migration không chạy được

**Lỗi**: `relation "users" already exists`

**Nguyên nhân**: Table đã tồn tại, migration cũ viết `CREATE TABLE` không có `IF NOT EXISTS`.

**Fix**: Sửa file SQL thêm `IF NOT EXISTS`:
```sql
CREATE TABLE IF NOT EXISTS users (...);
```

Hoặc reset DB:
```bash
docker compose down -v
docker compose up -d
npm run migrate
```

## 3. Frontend

### 3.1 "Failed to fetch" hoặc Network Error

**Nguyên nhân**: Backend chưa chạy.

**Fix**: Mở terminal khác, `cd dashauto-server && npm run dev`

### 3.2 Trang trắng, console báo lỗi React

**Xem cụ thể lỗi** trong DevTools Console. Thường là:
- Import sai tên component
- Route config sai
- Axios gọi API bị 401/500 không handle

### 3.3 Dev server chạy port khác 5173

Thấy log `Port 5173 is in use, trying another one...` → dev server chạy trên 5174 hoặc 5175.

**Fix**: Vào đúng port đó, hoặc kill process giữ 5173.

### 3.4 `.env` không được đọc

**Check**:
- Biến môi trường frontend PHẢI có tiền tố `VITE_` (Vite convention)
- File `.env` phải ở root của `dashauto-client/`, không phải trong `src/`
- Restart dev server sau khi sửa `.env` (Vite không hot-reload env)

### 3.5 Lỗi hint "CommonJS module" trong VSCode

**Message**: `File is a CommonJS module; it may be converted to an ES module`

**Đây là hint, không phải lỗi**. Backend dùng CommonJS (`require`) nhất quán. Bỏ qua.

## 4. Database / pgAdmin

### 4.1 pgAdmin "Unable to connect to server"

**Lỗi**: `failed to resolve host 'localhost:5432'`

**Nguyên nhân**: Nhập sai field — ghi cả `localhost:5432` vào ô Host.

**Fix**:
- Host: `localhost` (không có `:5432`)
- Port: `5432` (ô riêng)

### 4.2 Cột `created_at` sai timezone

**Lỗi**: Thời gian hiển thị lệch 7 tiếng so với giờ VN.

**Nguyên nhân**: Postgres trả timestamp UTC, Frontend format theo timezone local.

**Fix**: dùng `new Date(iso).toLocaleString('vi-VN')` — tự convert về giờ local.

### 4.3 Muốn xem hết bảng n8n tạo

```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

Sẽ thấy `users`, `orders`, ... + `workflow_entity`, `credentials_entity`, `execution_entity`, ...

Các bảng của n8n bắt đầu bằng `n8n_` hoặc các tên như `workflow_entity`.

## 5. n8n

### 5.1 Không truy cập được http://localhost:5678

**Check**:
- `docker ps` thấy `dashauto-n8n` status **Up**
- `docker logs dashauto-n8n` xem có lỗi không
- Firewall Windows block? Thử tắt firewall test

### 5.2 Credential Postgres trong n8n fail

**Lỗi thường gặp**: `ECONNREFUSED` hoặc `timeout`

**Fix**:
- Host: `postgres` (KHÔNG phải `localhost`)
- Cả 2 container `postgres` và `n8n` phải cùng network `dashauto_net`
- Check bằng:
  ```bash
  docker exec dashauto-n8n ping postgres
  ```
  Phải thấy phản hồi.

### 5.3 Cron workflow không chạy tự động

**Check**:
- Workflow có trạng thái **Published** chưa (góc trên phải)?
- Tab **Executions** có execution record không?

**Fix**:
- Bấm Publish (Shift+P)
- Nếu đã publish mà không chạy → disable và re-enable

### 5.4 IF node luôn đi nhánh sai

**Nguyên nhân**: String so sánh với Number không đúng. Ví dụ `"0" < 1` (string compare) ≠ `0 < 1` (number compare).

**Fix**:
- Đổi Type của Value 1 thành **Number** (chữ `T` bên trái operator)
- Bật toggle **Convert types where required**

### 5.5 Error "Stale data" trong expression

**Thường khi** dùng `{{ $json.field }}` nhưng field không tồn tại ở item hiện tại.

**Fix**: 
- Execute step lần lượt từng node để đảm bảo data truyền qua đúng
- Dùng `{{ $('Node Name').item.json.field }}` để rõ ràng hơn

### 5.6 n8n Docker restart mất workflow

**Không nên xảy ra** vì volume `dashauto_n8n` persist data.

**Nếu bị mất**: check có `docker compose down -v` nhầm không. Có thì data đi luôn.

Export workflow ra JSON (menu `...` → Download) để backup.

## 6. Git

### 6.1 `node_modules` bị track

**Nguyên nhân**: `.gitignore` chưa có `node_modules` hoặc tạo sau khi đã `git add`.

**Fix**:
```bash
git rm -r --cached node_modules
echo "node_modules/" >> .gitignore
git add .gitignore
git commit -m "chore: ignore node_modules"
```

### 6.2 `.env` bị commit nhầm (lộ secret)

**Fix ngay**:
```bash
git rm --cached .env
echo ".env" >> .gitignore
git commit -m "chore: remove .env from tracking"
```

Nếu đã push lên remote: đổi secret (JWT_SECRET, password DB, n8n password) ngay.

## 7. Reset toàn bộ về zero

Khi mọi thứ hỏng và muốn làm lại từ đầu:

```bash
# 1. Stop tất cả
cd dashauto-server
docker compose down -v    # Xoá volume

# 2. Xoá node_modules (optional)
cd dashauto-server && rm -rf node_modules
cd dashauto-client && rm -rf node_modules

# 3. Start lại
cd dashauto-server
docker compose up -d
npm install
npm run migrate
npm run seed
npm run dev

# Terminal khác
cd dashauto-client
npm install
npm run dev

# 4. Set up n8n owner account lần nữa
# http://localhost:5678
```

## 8. Khi không biết làm gì

### Checklist debug

1. **Đọc kỹ error message** — thường có gợi ý
2. **Check terminal log** backend, frontend, docker
3. **Check Network tab** DevTools → xem request/response
4. **Tìm Google** với error message, kèm tên lib (`recharts`, `express`, `n8n`)
5. **Stack Overflow + GitHub Issues** của project đó
6. **Hỏi ChatGPT/Claude** — copy error + context (phiên bản, code snippet)

### Đảm bảo làm 1 thứ 1 lúc

Khi debug, đừng sửa nhiều chỗ cùng lúc. Sửa 1, test, sửa tiếp.

### Xem docs thứ 02 (Setup) lại

Đôi khi chỉ là forget step nào đó trong setup.

### Restart + thử lại

Khi mọi thứ lạ lẫm:
- Ctrl+C backend/frontend
- `docker compose restart`
- Refresh browser
- Thử lại
