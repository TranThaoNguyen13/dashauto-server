# 03 — Docker Compose giải thích chi tiết

## 1. Docker là gì? Vì sao dùng?

**Vấn đề**: Cài Postgres trực tiếp lên Windows khá mệt — phải download, cài đặt, cấu hình user/permission, lỡ lỗi phải gỡ đi cài lại. Cài n8n còn phức tạp hơn vì cần Node.js, port, permission...

**Docker**: đóng gói phần mềm + hệ điều hành + dependencies vào 1 "container" — 1 đơn vị chạy được trên mọi máy có cài Docker. Không làm "bẩn" máy host.

Ví dụ:
- Không có Docker: cài Postgres → phải cài PostgreSQL setup từ website postgres.org → chọn port, password, data path...
- Có Docker: `docker run postgres` → xong, có Postgres chạy.

## 2. Docker Compose là gì?

Docker có lệnh `docker run` chạy 1 container. Nhưng dự án chúng ta có 2 container (Postgres + n8n) và chúng cần:
- Chạy cùng mạng để giao tiếp với nhau
- Cấu hình env giống nhau (DB user/pass)
- Start/stop cùng nhau

→ **Docker Compose** cho phép khai báo tất cả vào 1 file `docker-compose.yml`, rồi `docker compose up -d` sẽ dựng cả cụm.

## 3. Đọc từng dòng file `docker-compose.yml`

File nằm ở `dashauto-server/docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: dashauto-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER:-dashauto}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-dashauto123}
      POSTGRES_DB: ${DB_NAME:-dashauto_db}
    ports:
      - "${DB_PORT:-5432}:5432"
    volumes:
      - dashauto_pgdata:/var/lib/postgresql/data
    networks:
      - dashauto_net

  n8n:
    image: n8nio/n8n:latest
    container_name: dashauto-n8n
    restart: unless-stopped
    environment:
      N8N_BASIC_AUTH_ACTIVE: "true"
      N8N_BASIC_AUTH_USER: ${N8N_USER:-admin}
      N8N_BASIC_AUTH_PASSWORD: ${N8N_PASSWORD:-admin123}
      N8N_HOST: localhost
      N8N_PORT: 5678
      N8N_PROTOCOL: http
      WEBHOOK_URL: http://localhost:5678/
      GENERIC_TIMEZONE: Asia/Ho_Chi_Minh
      DB_POSTGRESDB_HOST: postgres
      DB_POSTGRESDB_PORT: 5432
      DB_POSTGRESDB_DATABASE: ${DB_NAME:-dashauto_db}
      DB_POSTGRESDB_USER: ${DB_USER:-dashauto}
      DB_POSTGRESDB_PASSWORD: ${DB_PASSWORD:-dashauto123}
    ports:
      - "5678:5678"
    volumes:
      - dashauto_n8n:/home/node/.n8n
    depends_on:
      - postgres
    networks:
      - dashauto_net

volumes:
  dashauto_pgdata:
  dashauto_n8n:

networks:
  dashauto_net:
    driver: bridge
```

### 3.1 `services:` — khai báo các container

Mỗi mục con là 1 container. Chúng ta có 2: `postgres` và `n8n`.

### 3.2 Service `postgres`

```yaml
image: postgres:16-alpine
```
- `postgres` là tên image trên Docker Hub
- `:16-alpine` là tag — bản Postgres 16 trên Alpine Linux (nhẹ, ~150MB thay vì ~400MB bản full Debian)

```yaml
container_name: dashauto-postgres
```
Đặt tên container cố định để dễ xem/exec. Không đặt thì Docker tự sinh tên kiểu `dashauto-server_postgres_1`.

```yaml
restart: unless-stopped
```
Nếu container crash hoặc máy khởi động lại, Docker tự chạy lại container. Trừ khi bạn chủ động stop.

```yaml
environment:
  POSTGRES_USER: ${DB_USER:-dashauto}
```
Biến môi trường truyền vào container. Postgres image dùng 3 biến `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` để tạo user + database lần đầu.

- Cú pháp `${DB_USER:-dashauto}` nghĩa là: lấy giá trị `DB_USER` từ file `.env` của host, nếu không có thì dùng mặc định `dashauto`.

```yaml
ports:
  - "${DB_PORT:-5432}:5432"
```
Map port host:container. `5432:5432` nghĩa là từ máy host gọi `localhost:5432` sẽ đến port 5432 trong container.

```yaml
volumes:
  - dashauto_pgdata:/var/lib/postgresql/data
```
Postgres lưu data ở `/var/lib/postgresql/data`. Volume `dashauto_pgdata` map thư mục đó ra volume được Docker quản lý. **Nếu không có volume, data sẽ mất khi container xoá**.

```yaml
networks:
  - dashauto_net
```
Gán container vào mạng `dashauto_net`. Xem phần 4 dưới.

### 3.3 Service `n8n`

```yaml
image: n8nio/n8n:latest
```
Image chính thức của n8n.

```yaml
N8N_BASIC_AUTH_ACTIVE: "true"
N8N_BASIC_AUTH_USER: admin
N8N_BASIC_AUTH_PASSWORD: admin123
```
Bật basic auth cho UI n8n. Ai truy cập http://localhost:5678 phải nhập user/pass.

> ⚠️ Từ n8n v1.0+, basic auth hơi khác — n8n có hệ thống tài khoản riêng (form "Set up owner account" lần đầu). Biến này có thể không hiệu lực với version mới nhất.

```yaml
DB_POSTGRESDB_HOST: postgres
```
⚠️ **QUAN TRỌNG**: host là `postgres` (tên service), không phải `localhost`. Vì n8n chạy **trong container**, `localhost` của nó là chính nó, không phải host machine.

`postgres` được Docker Compose đăng ký như DNS trong mạng `dashauto_net` → n8n gọi `postgres:5432` sẽ đúng tới container Postgres.

```yaml
depends_on:
  - postgres
```
Đảm bảo Postgres khởi động **trước** n8n. Không thì n8n chạy lên tìm DB chưa có → lỗi.

> ⚠️ `depends_on` chỉ đợi container START, không đợi Postgres sẵn sàng nhận query. Với n8n hơi lâu khởi động nên thực tế vẫn OK.

## 4. Network — giải thích kỹ

```yaml
networks:
  dashauto_net:
    driver: bridge
```

Đây là **điểm mấu chốt** để 2 container giao tiếp với nhau.

### 4.1 Không có network riêng

Docker mặc định tạo 1 bridge network chung nhưng không có DNS tự động giữa các container. Nếu không khai báo `networks:`, 2 container vẫn chạy được nhưng không gọi nhau bằng tên service được.

### 4.2 Có custom network `dashauto_net`

Khi cả `postgres` và `n8n` cùng join `dashauto_net`, Docker Compose tự tạo DNS entry:
- `postgres` → IP của container postgres
- `n8n` → IP của container n8n

→ Từ n8n, `ping postgres` hoặc connect `postgres:5432` đều work.

### 4.3 Tại sao không dùng IP trực tiếp?

IP của container mỗi lần restart có thể đổi. Dùng tên service ổn định hơn.

### 4.4 Nếu có nhiều dự án

Mỗi dự án có `docker-compose.yml` riêng sẽ tạo network riêng (thường trùng tên thư mục), không xung đột nhau.

## 5. Volumes — lưu data bền vững

```yaml
volumes:
  dashauto_pgdata:
  dashauto_n8n:
```

### 5.1 Volume vs Bind mount

- **Volume** (`dashauto_pgdata:/path`): Docker quản lý, lưu ở đâu đó trong hệ thống Docker. Không cần biết đường dẫn thật.
- **Bind mount** (`/home/user/data:/path`): map vào thư mục cụ thể trên host. Thường dùng khi cần truy cập file trực tiếp.

Dự án này dùng volume vì đơn giản, không cần access trực tiếp.

### 5.2 Quản lý volume

```bash
docker volume ls                       # Liệt kê
docker volume inspect dashauto-server_dashauto_pgdata  # Xem chi tiết
docker volume rm dashauto-server_dashauto_pgdata       # Xoá (MẤT DATA!)
```

### 5.3 Backup volume

Postgres có thể backup bằng `pg_dump`:

```bash
docker exec dashauto-postgres pg_dump -U dashauto dashauto_db > backup.sql
```

Restore:

```bash
docker exec -i dashauto-postgres psql -U dashauto dashauto_db < backup.sql
```

## 6. Các lệnh Docker Compose hay dùng

```bash
# Start
docker compose up -d              # detached mode
docker compose up                 # foreground, thấy log

# Stop
docker compose stop               # Stop nhưng giữ container
docker compose down               # Stop + xoá container (giữ volume)
docker compose down -v            # Xoá cả volume (MẤT DATA)

# Xem
docker compose ps                 # Container của compose này
docker ps                         # Tất cả container đang chạy
docker compose logs               # Log tất cả service
docker compose logs -f postgres   # Log postgres, theo dõi real-time
docker compose logs --tail=50     # 50 dòng cuối

# Restart
docker compose restart            # Restart tất cả
docker compose restart n8n        # Chỉ n8n

# Exec (vào bên trong container)
docker compose exec postgres bash
docker compose exec postgres psql -U dashauto -d dashauto_db

# Tái tạo sau khi sửa docker-compose.yml
docker compose up -d --force-recreate
```

## 7. Tại sao có cả Postgres + n8n trong 1 file?

Để:
1. Cả 2 start cùng lúc bằng 1 lệnh
2. Tự động cùng network nên giao tiếp được
3. Ngừng cả 2 cùng lúc khi `down`
4. Biến môi trường (user/pass DB) định nghĩa 1 chỗ, dùng cho cả 2

Nếu tách 2 file `docker-compose.yml` riêng thì phải tự tạo network chung và import.

## 8. Kiểm tra hiểu

1. **Vì sao n8n dùng `postgres` làm host mà không phải `localhost`?**
   → Vì n8n chạy trong container, `localhost` = chính container đó. `postgres` là tên service DNS trong network Docker.

2. **Xoá volume bằng lệnh gì?**
   → `docker compose down -v` (cảnh báo: mất data!)

3. **Nếu `docker compose up -d` mà n8n lỗi, cách debug?**
   → `docker compose logs n8n` xem error message. Thường là DB chưa sẵn sàng.

4. **Dashauto-server/docker-compose.yml có thể đặt ở root thay vì server không?**
   → Có, chỉ cần đổi đường dẫn `docker compose` chạy. Hiện đặt trong server vì server "sở hữu" DB setup.
