# 08 — Tạo n8n Workflow — Từng bước chi tiết

Tài liệu này hướng dẫn tạo 3 workflow đã có trong dự án. Người mới chưa biết n8n đọc theo có thể làm được.

## 0. Trước khi bắt đầu

1. Docker đang chạy: `docker ps` thấy `dashauto-n8n` và `dashauto-postgres`
2. Truy cập: http://localhost:5678 → đã tạo owner account
3. Đã thấy màn hình **Overview** (list workflow)

## Workflow 1: Test Postgres — Làm quen với n8n

Mục tiêu: kéo thả 2 node, chạy thủ công, đọc đơn hàng từ DB.

### Bước 1: Tạo workflow mới

- Click nút **"Create Workflow"** (hoặc dấu `+` góc trên trái)
- Hiện màn hình canvas trống, panel bên phải hỏi "What triggers this workflow?"

### Bước 2: Chọn Trigger

Ở panel bên phải, click **"Trigger manually"** (dòng đầu tiên).

→ Trên canvas xuất hiện node **"When clicking 'Execute workflow'"** (hình cursor).

### Bước 3: Thêm node Postgres

1. Hover chuột vào bên phải node trigger → xuất hiện dấu `+` → click
2. Panel search xuất hiện → gõ `postgres`
3. Click node **"Postgres"** (có logo con voi xanh)
4. Chọn action **"Execute a SQL query"**

Panel node Postgres mở ra.

### Bước 4: Tạo credential Postgres

Click **"Set up credential"** ở ô Credential.

Điền form:
| Field | Giá trị |
|---|---|
| Host | `postgres` ⚠️ không phải `localhost` |
| Database | `dashauto_db` |
| User | `dashauto` |
| Password | `dashauto123` |
| Port | `5432` |
| SSL | disable |

Click **Save**.  
→ Banner xanh "Connection tested successfully" = OK.

### Bước 5: Nhập SQL

Quay lại panel node Postgres:
- **Operation**: `Execute Query`
- **Query**: xoá số `1` đang có, gõ:
```sql
SELECT COUNT(*) AS total_orders FROM orders;
```

### Bước 6: Chạy thử

Click nút **Execute step** (cam, góc trên phải).

Panel OUTPUT bên phải hiện:
```json
[{ "total_orders": 60 }]
```

### Bước 7: Lưu (đổi tên tuỳ chọn)

- Click "My workflow" góc trên trái → sửa thành `Test Postgres`
- n8n **auto-save** liên tục nên không cần nhấn Save

Xong workflow đầu tiên. Có thể xoá sau nếu không cần.

---

## Workflow 2: Cron Heartbeat — Tự chạy mỗi phút

Mục tiêu: workflow tự động ghi 1 log vào `workflow_logs` mỗi phút để verify cron.

### Bước 1: Tạo workflow mới

Click `+` ở góc trên trái n8n (logo) → hoặc vào **Overview** → **Create Workflow**.

### Bước 2: Schedule Trigger

Ở panel "What triggers this workflow?", click **"On a schedule"** (dòng thứ 3).

Node Schedule Trigger mở ra:
- **Trigger Interval**: `Minutes`
- **Minutes Between Triggers**: `1`

Đóng panel (✕).

### Bước 3: Node Postgres INSERT log

1. Click `+` sau Schedule → gõ `postgres` → **Postgres → Execute a SQL query**
2. Credential: chọn **Postgres account** (credential đã tạo ở workflow trước)
3. Query:
```sql
INSERT INTO workflow_logs (workflow_name, status, message)
VALUES ('cron_heartbeat', 'success', 'Cron chay luc ' || NOW())
RETURNING *;
```

### Bước 4: Execute step test

Click **Execute step** → nhìn OUTPUT có 1 row mới được INSERT.

### Bước 5: Đổi tên workflow

Click "My workflow" → gõ `Cron Heartbeat` → Enter.

### Bước 6: Publish

Góc trên phải có nút **Publish**. Click nó (hoặc Shift+P).

Sau khi Publish, workflow chuyển trạng thái **Active** → n8n sẽ tự chạy mỗi phút.

### Bước 7: Kiểm tra

Frontend:
- Mở http://localhost:5173/workflows
- Đợi 2-3 phút, refresh
- Card **`cron_heartbeat`** xuất hiện
- Số successful runs tăng dần

Hoặc pgAdmin:
```sql
SELECT * FROM workflow_logs
WHERE workflow_name = 'cron_heartbeat'
ORDER BY executed_at DESC
LIMIT 10;
```

### Muốn dừng

Vào workflow → **Unpublish** (Ctrl+U).

---

## Workflow 3: Hourly Orders Check — Có rẽ nhánh IF

Mục tiêu: cron 2 phút, đếm đơn trong 1 giờ qua, nếu không có đơn thì tạo cảnh báo.

### Bước 1: Tạo workflow mới

Create Workflow → **On a schedule** → Minutes → 2 phút.

### Bước 2: Node Postgres đếm đơn

1. Click `+` sau Schedule → Postgres → Execute a SQL query
2. Credential: Postgres account
3. Query:
```sql
SELECT COUNT(*) AS recent_orders
FROM orders
WHERE created_at >= NOW() - INTERVAL '1 hour';
```

4. Execute step → OUTPUT `{ recent_orders: 0 }` (vì không có đơn mới)

### Bước 3: Node IF — rẽ nhánh

1. Click `+` sau Postgres → gõ `if` → chọn node **IF**
2. Panel IF mở, phần **Conditions**:
   - **Value 1**: click vào ô, bấm icon `fx` hoặc gõ `{{`. n8n hiện tree data từ node trước → chọn **Execute a SQL query → recent_orders**. Ô tự điền `{{ $json.recent_orders }}`
   - Bên cạnh Value 1, chữ **T** (Type). Click → đổi thành **Number**
   - **Operator**: click "is equal to" → chọn **"Less than"** (hoặc `<`)
   - **Value 2**: `1`
3. Bật toggle **"Convert types where required"** (đảm bảo string "0" từ Postgres convert thành number 0)
4. Execute step → OUTPUT có 2 tab:
   - **True Branch**: 1 item (vì 0 < 1)
   - **False Branch**: empty
5. Đóng panel

### Bước 4: Nhánh TRUE — Insert Alert + Log

#### 4.1 Node INSERT alert

1. Hover đầu mũi tên **true** của IF → dấu `+` → click → Postgres → Execute a SQL query
2. Credential: Postgres account
3. Query:
```sql
INSERT INTO alerts (type, message, severity, status)
VALUES ('low_order_rate', 'Khong co don hang trong 1 gio qua - phat hien boi n8n', 'warning', 'open');
```
4. Execute step → INSERT thành công

#### 4.2 Node INSERT log failed

1. Click `+` sau node INSERT alert
2. Postgres → Execute a SQL query
3. Credential: Postgres account
4. Query:
```sql
INSERT INTO workflow_logs (workflow_name, status, message)
VALUES ('hourly_orders_check', 'failed', 'Khong co don trong 1h qua - da tao alert');
```

### Bước 5: Nhánh FALSE — Insert Log success

1. Hover đầu mũi tên **false** của IF → `+` → Postgres → Execute a SQL query
2. Query:
```sql
INSERT INTO workflow_logs (workflow_name, status, message)
VALUES ('hourly_orders_check', 'success', 'Co don hang trong 1h qua - binh thuong');
```

### Bước 6: Đổi tên + Publish

- Đổi tên: `Hourly Orders Check`
- Publish (Shift+P)

### Bước 7: Quan sát kết quả

Sau 2-4 phút:

- http://localhost:5173/alerts → xuất hiện alert mới `low_order_rate` mỗi 2 phút
- http://localhost:5173/workflows → card `hourly_orders_check` số failed tăng dần

### Workflow canvas nhìn như

```
Schedule (2 min) → Postgres (count) → IF ┬─ true  → INSERT alert → INSERT log failed
                                          └─ false → INSERT log success
```

### Bước 8: Dừng khi không demo nữa

Unpublish (Ctrl+U). Hoặc đổi threshold cho realistic hơn:
- Thay `< 1` thành `< 10` và query trong 24h thay vì 1h
- Workflow sẽ không trigger alert mỗi lần nữa

---

## Lưu ý chung khi tạo workflow n8n

### L1: `localhost` vs `postgres`

Trong credential Postgres: PHẢI dùng `postgres` (tên service docker). Dùng `localhost` sẽ fail vì n8n nghĩ localhost là chính container của nó.

### L2: Type comparison trong IF

Postgres trả về `COUNT(*)` dạng **bigint** → n8n nhận dưới dạng **string `"0"`**. So sánh string với number sẽ sai. 2 cách fix:

- Đổi type của Value 1 thành **Number** (click chữ `T` bên trái operator)
- Bật toggle **"Convert types where required"**

Nên bật cả 2 cho chắc.

### L3: Expression n8n

Trong các trường text/SQL, dùng `{{ ... }}` để chèn expression:
- `{{ $json.field }}` — field của item hiện tại
- `{{ $('Node Name').item.json.field }}` — field từ node tên "Node Name"
- `{{ new Date().toISOString() }}` — JavaScript tuỳ ý

### L4: Draft vs Published

- Workflow Draft: chỉ chạy khi bấm "Execute workflow" thủ công
- Workflow Published: tự chạy theo trigger (cron, webhook)
- **Muốn cron chạy tự động → phải Publish**

### L5: Executions tab

Khi có lỗi, xem tab **Executions** của workflow → click 1 execution → xem input/output từng node. Thường lỗi SQL syntax hoặc credential sai.

### L6: Không chạy ẩu INSERT/UPDATE/DELETE

Khi testing, nhớ workflow đang connect tới DB thật (không có DB test/staging). Nếu viết `DELETE FROM orders` mà không WHERE, mất toàn bộ đơn hàng.

### L7: Cron expression

Ngoài `Every X minutes`, có thể dùng custom cron:
- `0 7 * * *` — 7h sáng hàng ngày
- `0 */2 * * *` — mỗi 2 giờ tròn (0h, 2h, 4h...)
- `0 9 * * 1` — 9h sáng thứ 2 hàng tuần

## Các workflow gợi ý làm tiếp

### Daily Report — báo cáo doanh thu hôm qua

```
Schedule (0 7 * * *) 
  → Postgres: SELECT SUM(total_amount), COUNT(*) FROM orders WHERE DATE(created_at) = CURRENT_DATE - 1
  → Set: build báo cáo text
  → Postgres: INSERT INTO reports (title, type, content, email_status)
  → Gmail (optional): gửi email cho sếp
  → Postgres: INSERT INTO workflow_logs
```

### Low Revenue Alert — doanh thu thấp thì cảnh báo

```
Schedule (0 * * * *) 
  → Postgres: SELECT SUM(total_amount) FROM orders WHERE created_at >= CURRENT_DATE
  → IF: revenue < 100_000_000
      TRUE: INSERT alerts + Telegram gửi message
      FALSE: nothing
  → Postgres: INSERT workflow_logs
```

### Order Status Monitor — canh cancelled tăng đột biến

```
Schedule (every 30 min)
  → Postgres: đếm cancelled trong 1h qua
  → IF: > 10
      TRUE: alert critical + email
```

## Tài liệu tham khảo

- https://docs.n8n.io/workflows/ — workflow basics
- https://docs.n8n.io/nodes/ — list các node có sẵn
- https://docs.n8n.io/code/expressions/ — expression syntax
