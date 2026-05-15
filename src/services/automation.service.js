const db = require("../db");
const alertService = require("./alert.service");
const aiService = require("./ai.service");

const REPORT_WINDOWS = {
  today: {
    start: "date_trunc('day', NOW())",
    end: "date_trunc('day', NOW()) + INTERVAL '1 day'",
  },
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
    const err = new Error("report_type khong hop le (today, daily, weekly, monthly)");
    err.status = 400;
    throw err;
  }
  return window;
}

exports.analyzeReport = async (payload) => {
  let comparison = null;
  try {
    comparison = await exports.getRevenueComparison();
  } catch {
    comparison = null;
  }

  return aiService.analyzeSalesReport({
    report_type: payload.reportType || payload.report_type,
    report_title: payload.reportTitle || payload.report_title,
    total_orders: Number(payload.totalOrders ?? payload.total_orders ?? 0),
    total_revenue: Number(payload.totalRevenue ?? payload.total_revenue ?? 0),
    orders: payload.orders || [],
    comparison,
  });
};

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

exports.getRevenueComparison = async () => {
  // So cung khung gio: hom nay tu 00:00 -> NOW vs hom qua cung do dai (khong so ca ngay hom qua)
  const result = await db.query(
    `SELECT
       EXTRACT(EPOCH FROM (NOW() - date_trunc('day', NOW()))) / 3600.0 AS hours_elapsed,
       COUNT(*) FILTER (
         WHERE status = 'completed'
         AND created_at >= date_trunc('day', NOW())
       ) AS current_orders,
       COALESCE(SUM(total_amount) FILTER (
         WHERE status = 'completed'
         AND created_at >= date_trunc('day', NOW())
       ), 0) AS current_revenue,
       COUNT(*) FILTER (
         WHERE status = 'cancelled'
         AND created_at >= date_trunc('day', NOW())
       ) AS current_cancelled,
       COUNT(*) FILTER (
         WHERE created_at >= date_trunc('day', NOW())
       ) AS current_total_orders,
       COUNT(*) FILTER (
         WHERE status = 'completed'
         AND created_at >= date_trunc('day', NOW()) - INTERVAL '1 day'
         AND created_at < date_trunc('day', NOW()) - INTERVAL '1 day'
           + (NOW() - date_trunc('day', NOW()))
       ) AS previous_orders,
       COALESCE(SUM(total_amount) FILTER (
         WHERE status = 'completed'
         AND created_at >= date_trunc('day', NOW()) - INTERVAL '1 day'
         AND created_at < date_trunc('day', NOW()) - INTERVAL '1 day'
           + (NOW() - date_trunc('day', NOW()))
       ), 0) AS previous_revenue
     FROM orders`
  );

  const row = result.rows[0];
  return {
    comparison_mode: "same_time_window",
    hours_elapsed: Number(row.hours_elapsed),
    current_orders: Number(row.current_orders),
    current_revenue: Number(row.current_revenue),
    current_cancelled: Number(row.current_cancelled),
    current_total_orders: Number(row.current_total_orders),
    previous_orders: Number(row.previous_orders),
    previous_revenue: Number(row.previous_revenue),
  };
};

exports.getOpenAlert = async ({ type }) => {
  const alert = await alertService.findOpenByType(type);
  return alert || {};
};

exports.updateAlert = async (id, body) => {
  return alertService.updateOpen(id, {
    message: body.message,
    severity: body.severity,
  });
};

exports.createOrder = async (body) => {
  const orderCode = String(body.order_code || "").trim();
  if (!orderCode) {
    const err = new Error("order_code la bat buoc");
    err.status = 400;
    throw err;
  }

  try {
    const result = await db.query(
      `INSERT INTO orders (order_code, customer_name, total_amount, status, region, employee_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::timestamptz, NOW()))
       RETURNING id, order_code, customer_name, total_amount, status, region, created_at`,
      [
        orderCode,
        body.customer_name || null,
        Number(body.total_amount ?? 0),
        body.status || "completed",
        body.region || null,
        body.employee_id || null,
        body.created_at || null,
      ]
    );

    return result.rows[0];
  } catch (err) {
    if (err.code === "23505") {
      const duplicate = new Error("order_code da ton tai");
      duplicate.status = 409;
      throw duplicate;
    }
    throw err;
  }
};
