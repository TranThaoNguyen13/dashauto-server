const db = require("../db");
const alertService = require("./alert.service");

const REPORT_WINDOWS = {
  daily: {
    start: "date_trunc('day', NOW()) - INTERVAL '1 day'",
    end: "date_trunc('day', NOW())",
  },
  weekly: {
    start: "date_trunc('week', NOW()) - INTERVAL '1 week'",
    end: "date_trunc('week', NOW())",
  },
  monthly: {
    start: "date_trunc('month', NOW()) - INTERVAL '1 month'",
    end: "date_trunc('month', NOW())",
  },
};

function getWindow(reportType) {
  const window = REPORT_WINDOWS[reportType];
  if (!window) {
    const err = new Error("report_type khong hop le (daily, weekly, monthly)");
    err.status = 400;
    throw err;
  }
  return window;
}

exports.generateReport = async ({ reportType }) => {
  const window = getWindow(reportType);
  const where = `created_at >= ${window.start} AND created_at < ${window.end}`;

  const summaryResult = await db.query(
    `SELECT COUNT(*)::int AS total_orders,
            COALESCE(SUM(total_amount), 0)::float AS total_revenue
     FROM orders
     WHERE ${where}`
  );

  const ordersResult = await db.query(
    `SELECT order_code, customer_name, total_amount, status, region, created_at
     FROM orders
     WHERE ${where}
     ORDER BY created_at DESC`
  );

  const summary = summaryResult.rows[0];

  return {
    report_type: reportType,
    total_orders: summary.total_orders,
    total_revenue: Number(summary.total_revenue),
    orders: ordersResult.rows,
  };
};

exports.saveReport = async ({ title, type, content, emailStatus }) => {
  const normalizedTitle = String(title || "").trim();
  const normalizedType = String(type || "").trim();

  if (!normalizedTitle || !normalizedType) {
    const err = new Error("title va type la bat buoc");
    err.status = 400;
    throw err;
  }

  const result = await db.query(
    `INSERT INTO reports (title, type, content, email_status)
     VALUES ($1, $2, $3, $4)
     RETURNING id, title, type, content, email_status, created_at`,
    [normalizedTitle, normalizedType, content || null, emailStatus || "pending"]
  );

  return result.rows[0];
};

exports.saveWorkflowLog = async ({ workflowName, status, message }) => {
  if (!workflowName || !status) {
    const err = new Error("workflow_name va status la bat buoc");
    err.status = 400;
    throw err;
  }

  const result = await db.query(
    `INSERT INTO workflow_logs (workflow_name, status, message)
     VALUES ($1, $2, $3)
     RETURNING id, workflow_name, status, message, executed_at`,
    [workflowName, status, message || null]
  );

  return result.rows[0];
};

exports.getHourlyOrdersStats = async () => {
  const result = await db.query(
    `SELECT
       COUNT(*) FILTER (
         WHERE status = 'completed'
         AND created_at >= NOW() - INTERVAL '1 hour'
       ) AS completed_orders,
       COUNT(*) FILTER (
         WHERE created_at >= NOW() - INTERVAL '1 hour'
       ) AS total_orders,
       COALESCE(SUM(total_amount) FILTER (
         WHERE status = 'completed'
         AND created_at >= NOW() - INTERVAL '1 hour'
       ), 0) AS total_revenue
     FROM orders`
  );

  const row = result.rows[0];
  return {
    completed_orders: Number(row.completed_orders),
    total_orders: Number(row.total_orders),
    total_revenue: Number(row.total_revenue),
  };
};

exports.createAlert = async (body) => {
  return alertService.create({
    type: body.type,
    message: body.message,
    severity: body.severity,
    status: body.status,
  });
};
