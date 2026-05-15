# 07 — n8n — Tích hợp tự động hóa

## 1. n8n là gì?

**n8n** (đọc là "n-eight-n", viết tắt của "nodemation") là công cụ **low-code workflow automation**.

Nó giống Zapier, Make (Integromat), IFTTT, nhưng **self-hosted** (chạy trên máy/server của bạn) và **free**.

### Khái niệm cốt lõi

- **Workflow**: 1 quy trình tự động gồm nhiều bước
- **Node**: 1 bước trong workflow (trigger hoặc action)
- **Trigger**: node khởi đầu, quyết định khi nào workflow chạy
- **Action**: node thực hiện công việc (query DB, gửi email, gọi API...)

Ví dụ workflow:
```
[Cron mỗi sáng 8h] → [Query DB lấy doanh thu] → [Gửi email cho boss]
```

## 2. Vì sao dùng n8n cho đồ án?

### 2.1 So với viết code Node.js thuần

Nếu không có n8n, bạn phải code:
- Setup cron (node-cron hoặc bull queue)
- Code logic đọc DB
- Code gửi email (nodemailer, setup SMTP)
- Code gửi Telegram (telegram bot API)
- Error handling, retry
- UI để sửa cấu hình (hoặc hardcode vào code)

Tổng cộng: 500-1000 dòng code cho 1 workflow.

### 2.2 Với n8n

Kéo thả 5-10 node. Sửa trực tiếp trên UI web. **Không cần deploy lại** khi đổi logic.

### 2.3 Phù hợp bối cảnh đồ án

Đề bài chia đôi:
- **Tuan**: code Frontend + Backend
- **Nhung**: automation n8n (không cần biết code nhiều)

→ n8n là phần Nhung làm. Bạn chỉ cần cung cấp DB + bảng `alerts`, `reports`, `workflow_logs`.

## 3. Kiến trúc tích hợp

### 3.1 Setup trong docker-compose

n8n chạy trong container Docker, cùng network với Postgres:

```yaml
n8n:
  image: n8nio/n8n:latest
  ports:
    - "5678:5678"
  environment:
    DB_POSTGRESDB_HOST: postgres   # ← tên service, không phải localhost
    DB_POSTGRESDB_DATABASE: dashauto_db
    DB_POSTGRESDB_USER: dashauto
    DB_POSTGRESDB_PASSWORD: dashauto123
  volumes:
    - dashauto_n8n:/home/node/.n8n
  depends_on:
    - postgres
  networks:
    - dashauto_net
```

### 3.2 n8n dùng chính DB của dự án

Khi bạn setup, các env `DB_POSTGRESDB_*` bảo n8n: "hãy lưu workflow, credentials, execution history của mày vào Postgres này".

→ n8n tạo các bảng riêng: `workflow_entity`, `credentials_entity`, `execution_entity`, ...

Các bảng này **ở chung database `dashauto_db`** với `users`, `orders`, `alerts`. Không xung đột vì khác tên.

Lợi ích:
- Backup 1 DB = backup cả 2 bên
- Reset volume Postgres = reset cả n8n state

Nếu không muốn n8n "ké" DB, có thể để n8n dùng SQLite (default, không cần env `DB_POSTGRESDB_*`) — dữ liệu lưu trong volume `dashauto_n8n`.

### 3.3 Hai mô hình tích hợp

#### Mô hình A: n8n đọc/ghi trực tiếp Postgres (dự án này đang dùng)

```
n8n workflow
     │
     │ SQL
     ▼
Postgres (orders, alerts, workflow_logs)
     │
     │ Backend query
     ▼
Frontend hiển thị
```

**Ưu**:
- Đơn giản, nhanh
- Không cần code API cho n8n

**Nhược**:
- n8n "biết" schema DB, ghi bậy sẽ làm hỏng data
- Không có validation

#### Mô hình B: n8n gọi Backend API qua HTTP

```
n8n workflow
     │
     │ HTTP POST /api/alerts (kèm secret key)
     ▼
Backend (validate, authorize)
     │
     │ SQL
     ▼
Postgres
```

**Ưu**:
- Có validation, logging, authorization
- n8n không cần biết schema DB

**Nhược**:
- Phải code thêm endpoint + secret key cho n8n
- Thêm 1 lớp HTTP, chậm hơn chút

Dự án này chọn **Mô hình A** vì đơn giản, phù hợp phạm vi đồ án.

### 3.4 Bảo mật

Với Mô hình A, n8n dùng credential Postgres với quyền đầy đủ. Để hạn chế:
- Tạo user Postgres mới với quyền giới hạn (chỉ INSERT alerts/workflow_logs, SELECT orders)
- Chỉ cấp credential hạn chế này cho n8n

Nhưng cho đồ án thì dùng user `dashauto` (full quyền) cho đơn giản.

## 4. Truy cập n8n UI

- URL: http://localhost:5678
- Lần đầu: form tạo owner account (email + password)
- Lần sau: login

### 4.1 Ngôn ngữ interface

Hiện n8n chưa có tiếng Việt chính thức. Interface English. Thuật ngữ:
- **Workflow** = quy trình
- **Node** = bước
- **Trigger** = node kích hoạt
- **Execute** = chạy thử
- **Publish** = công bố (cần để workflow tự chạy theo cron)

## 5. Cách thức workflow chạy

### 5.1 Workflow Draft vs Published

- **Draft**: bạn đang chỉnh sửa, có thể Execute thử thủ công trên UI
- **Published**: workflow chính thức, có thể trigger tự động (cron, webhook)

**Chỉ workflow Published mới tự chạy**. Draft chỉ chạy khi bạn bấm "Execute workflow" thủ công.

Publish: bấm nút **Publish** hoặc Shift+P.
Unpublish: Ctrl+U.

### 5.2 Executions (lịch sử chạy)

Tab **Executions** trong workflow cho xem từng lần chạy:
- Status (success / failed)
- Thời gian bắt đầu, thời gian kết thúc
- Input/output của từng node
- Nếu lỗi: error message chi tiết

Dùng để debug.

## 6. Node Postgres — cách dùng

### 6.1 Credential

Lần đầu dùng node Postgres, phải tạo credential:

| Field | Giá trị |
|---|---|
| Host | `postgres` (⚠️ không phải `localhost`) |
| Database | `dashauto_db` |
| User | `dashauto` |
| Password | `dashauto123` |
| Port | `5432` |
| SSL | Disable |

Credential lưu vào n8n — workflow khác cũng dùng được.

### 6.2 Operation

- **Execute Query**: SQL tự do (INSERT/SELECT/UPDATE/DELETE)
- **Select rows from a table**: chọn theo UI, không cần viết SQL
- **Insert rows in a table**: UI form
- **Update rows in a table**: UI form
- **Delete table or rows**: UI form

Với workflow phức tạp, **Execute Query** linh hoạt nhất.

### 6.3 Sử dụng expression n8n

Để dùng giá trị từ node trước trong SQL:

```sql
INSERT INTO workflow_logs (workflow_name, status, message)
VALUES ('my_workflow', 'success', 'Có {{ $json.count }} đơn')
```

Khi n8n chạy, `{{ $json.count }}` được thay bằng giá trị thực từ item của node trước.

Hoặc reference node khác:
```sql
SELECT * FROM orders WHERE id = {{ $('Previous Node').item.json.order_id }}
```

## 7. Trigger types

### 7.1 Manual Trigger
Chỉ chạy khi bạn bấm "Execute workflow". Dùng để test.

### 7.2 Schedule Trigger (cron)
Chạy định kỳ. Config:
- Every X minutes/hours/days
- Cron expression tuỳ chỉnh (`0 */2 * * *` = mỗi 2 giờ)

### 7.3 Webhook Trigger
Chạy khi có HTTP request vào URL n8n cấp. Backend có thể gọi webhook này khi có event đặc biệt.

### 7.4 Event Trigger
Một số service có event (Gmail new email, Slack message, ...). Webhook dưới dạng built-in.

## 8. Các workflow đã/sẽ làm

### 8.1 Đã làm
- `cron_heartbeat`: cron 1 phút, INSERT log → test
- `hourly_orders_check`: cron 2 phút, query đơn hàng, IF → tạo alert + log

### 8.2 Có thể mở rộng
- `daily_report`: mỗi ngày 7h sáng, query orders hôm qua, tạo báo cáo text → INSERT vào `reports` → gửi email
- `weekly_report`: mỗi thứ 2 7h sáng, báo cáo tuần
- `low_revenue_alert`: cron 1h, nếu doanh thu thấp hơn threshold → alert + gửi Telegram
- `cancelled_order_monitor`: cron 30 phút, phát hiện đơn cancelled tăng đột biến → alert

### 8.3 Có thể tích hợp

n8n có sẵn **700+ nodes** tích hợp với:
- Gmail, Outlook (gửi email)
- Telegram, Slack, Discord (chat bot)
- Google Sheets (đồng bộ bảng tính)
- AWS S3 (lưu file)
- OpenAI (dùng GPT)
- ...

Mỗi node là 1 tích hợp, chỉ cần config credential là dùng được.

## 9. Security checklist

Nếu deploy production:

- [ ] Đổi password basic auth n8n (đừng để mặc định)
- [ ] HTTPS cho n8n (dùng reverse proxy nginx + Let's Encrypt)
- [ ] Tạo user Postgres riêng cho n8n với quyền hạn chế
- [ ] Backup định kỳ volume `dashauto_n8n` và Postgres
- [ ] Không chia sẻ credential, không commit file export workflow có credential

## 10. Export / Import workflow

n8n cho phép export workflow thành JSON:
- Trong workflow editor → menu `...` → Download
- Có thể share với Nhung hoặc commit vào git

Import:
- Tạo workflow mới → menu `...` → Import from File

JSON export không chứa credential (phải tự tạo lại).

## 11. Tài liệu chính thức

- https://docs.n8n.io — doc chính thức
- https://n8n.io/workflows — thư viện workflow mẫu
- https://community.n8n.io — forum

## 12. Câu hỏi thường gặp

**Q: Dùng n8n có ổn định bằng tự code không?**
A: Với use case đơn giản (cron + HTTP + DB) thì ổn định. Với use case phức tạp (xử lý stream, concurrent cao) thì nên code.

**Q: Workflow chạy ở đâu? Trên máy mình?**
A: Trong container n8n trên máy bạn. Nếu tắt Docker, workflow ngừng chạy. Muốn chạy 24/7 phải deploy lên server (VPS) và giữ Docker luôn running.

**Q: n8n có tốn tài nguyên không?**
A: ~200-300MB RAM khi chạy. Nhẹ hơn viết nguyên backend tự host cron.

**Q: Có thể dùng n8n thay Backend không?**
A: Với ứng dụng đơn giản thì được (dùng webhook của n8n làm endpoint). Nhưng auth, session, validation khó làm đẹp. Dự án nhỏ/demo thì OK.
