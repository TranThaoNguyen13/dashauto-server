const db = require("./index");

const products = [
  { name: "Laptop Dell XPS 13", sku: "DELL-XPS13", price: 25000000, category: "Laptop" },
  { name: "iPhone 15 Pro", sku: "IP15-PRO", price: 28000000, category: "Phone" },
  { name: "Samsung Galaxy S24", sku: "SS-S24", price: 22000000, category: "Phone" },
  { name: "AirPods Pro 2", sku: "APP-2", price: 6000000, category: "Accessory" },
  { name: "Magic Mouse", sku: "MM-1", price: 2500000, category: "Accessory" },
  { name: "MacBook Pro 14", sku: "MBP-14", price: 45000000, category: "Laptop" },
];

const regions = ["Ha Noi", "Ho Chi Minh", "Da Nang", "Hai Phong"];
const statuses = ["completed", "completed", "completed", "pending", "cancelled"];

function randomDate(daysBack) {
  const now = new Date();
  const offset = Math.floor(Math.random() * daysBack);
  now.setDate(now.getDate() - offset);
  now.setHours(Math.floor(Math.random() * 24));
  return now;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
  const { rows } = await db.query("SELECT COUNT(*) FROM products");
  if (parseInt(rows[0].count) > 0) {
    console.log("Seed data da ton tai, bo qua");
    await db.pool.end();
    return;
  }

  console.log("Seeding products...");
  const productIds = [];
  for (const p of products) {
    const r = await db.query(
      "INSERT INTO products (name, sku, price, category) VALUES ($1,$2,$3,$4) RETURNING id",
      [p.name, p.sku, p.price, p.category]
    );
    productIds.push({ id: r.rows[0].id, price: p.price });
  }

  const userRes = await db.query("SELECT id FROM users LIMIT 1");
  const userId = userRes.rows[0]?.id || null;

  console.log("Seeding orders...");
  for (let i = 1; i <= 60; i++) {
    const status = pick(statuses);
    const region = pick(regions);
    const createdAt = randomDate(30);

    const itemsCount = 1 + Math.floor(Math.random() * 3);
    let total = 0;
    const items = [];
    for (let j = 0; j < itemsCount; j++) {
      const product = pick(productIds);
      const qty = 1 + Math.floor(Math.random() * 3);
      items.push({ product_id: product.id, quantity: qty, unit_price: product.price });
      total += product.price * qty;
    }

    const orderRes = await db.query(
      `INSERT INTO orders (order_code, customer_name, total_amount, status, region, employee_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [`ORD-${String(i).padStart(4, "0")}`, `Khach hang ${i}`, total, status, region, userId, createdAt]
    );
    const orderId = orderRes.rows[0].id;

    for (const item of items) {
      await db.query(
        "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1,$2,$3,$4)",
        [orderId, item.product_id, item.quantity, item.unit_price]
      );
    }
  }

  console.log("Seeding reports...");
  const reportTypes = ["daily", "weekly", "monthly"];
  const emailStatuses = ["success", "success", "success", "failed"];
  for (let i = 1; i <= 10; i++) {
    await db.query(
      `INSERT INTO reports (title, type, content, email_status, created_by, created_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        `Bao cao ${i}`,
        pick(reportTypes),
        `Noi dung tom tat bao cao so ${i}`,
        pick(emailStatuses),
        userId,
        randomDate(15),
      ]
    );
  }

  console.log("Seeding alerts...");
  const alertTypes = ["low_revenue", "high_return_rate", "workflow_error"];
  const severities = ["info", "warning", "critical"];
  const alertStatuses = ["open", "open", "resolved"];
  for (let i = 1; i <= 8; i++) {
    await db.query(
      `INSERT INTO alerts (type, message, severity, status, created_at)
       VALUES ($1,$2,$3,$4,$5)`,
      [
        pick(alertTypes),
        `Canh bao mau so ${i}`,
        pick(severities),
        pick(alertStatuses),
        randomDate(10),
      ]
    );
  }

  console.log("Seeding workflow logs...");
  const workflows = ["sync_orders", "daily_report", "send_alert_email", "backup_db"];
  const logStatuses = ["success", "success", "success", "failed"];
  for (let i = 1; i <= 20; i++) {
    await db.query(
      `INSERT INTO workflow_logs (workflow_name, status, message, executed_at)
       VALUES ($1,$2,$3,$4)`,
      [pick(workflows), pick(logStatuses), `Execution ${i}`, randomDate(7)]
    );
  }

  console.log("Seed done");
  await db.pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
