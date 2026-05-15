const db = require("../db");

const VALID_GROUPS = ["day", "month"];

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

exports.getRevenue = async ({ groupBy = "day", from, to } = {}) => {
  if (!VALID_GROUPS.includes(groupBy)) {
    throw { status: 400, message: "groupBy phai la 'day' hoac 'month'" };
  }

  const { params, clauses } = buildDateFilter("created_at", from, to);
  const where = ["status = 'completed'", ...clauses];

  const result = await db.query(
    `SELECT DATE_TRUNC('${groupBy}', created_at) AS period,
            COALESCE(SUM(total_amount), 0) AS revenue,
            COUNT(*) AS orders
     FROM orders
     WHERE ${where.join(" AND ")}
     GROUP BY period
     ORDER BY period ASC`,
    params
  );

  return result.rows.map((r) => ({
    period: r.period,
    revenue: Number(r.revenue),
    orders: Number(r.orders),
  }));
};

exports.getKpi = async ({ by = "region", from, to } = {}) => {
  if (by === "region") {
    const { params, clauses } = buildDateFilter("created_at", from, to);
    const where = ["status = 'completed'", ...clauses];

    const result = await db.query(
      `SELECT COALESCE(region, 'Unknown') AS label,
              COUNT(*) AS orders,
              COALESCE(SUM(total_amount), 0) AS revenue
       FROM orders
       WHERE ${where.join(" AND ")}
       GROUP BY region
       ORDER BY revenue DESC`,
      params
    );
    return result.rows.map((r) => ({
      label: r.label,
      orders: Number(r.orders),
      revenue: Number(r.revenue),
    }));
  }

  if (by === "employee") {
    const { params, clauses } = buildDateFilter("o.created_at", from, to);
    const where = ["o.status = 'completed'", ...clauses];

    const result = await db.query(
      `SELECT COALESCE(u.username, 'Unknown') AS label,
              COUNT(o.id) AS orders,
              COALESCE(SUM(o.total_amount), 0) AS revenue
       FROM orders o
       LEFT JOIN users u ON u.id = o.employee_id
       WHERE ${where.join(" AND ")}
       GROUP BY u.username
       ORDER BY revenue DESC`,
      params
    );
    return result.rows.map((r) => ({
      label: r.label,
      orders: Number(r.orders),
      revenue: Number(r.revenue),
    }));
  }

  throw { status: 400, message: "by phai la 'region' hoac 'employee'" };
};

exports.getTopProducts = async ({ limit = 5, from, to } = {}) => {
  const lim = Math.min(Math.max(parseInt(limit) || 5, 1), 50);

  const { params, clauses } = buildDateFilter("o.created_at", from, to);
  const where = ["o.status = 'completed'", ...clauses];
  params.push(lim);

  const result = await db.query(
    `SELECT p.id, p.name, p.category,
            SUM(oi.quantity) AS quantity_sold,
            SUM(oi.quantity * oi.unit_price) AS revenue
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN products p ON p.id = oi.product_id
     WHERE ${where.join(" AND ")}
     GROUP BY p.id, p.name, p.category
     ORDER BY quantity_sold DESC
     LIMIT $${params.length}`,
    params
  );

  return result.rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    quantitySold: Number(r.quantity_sold),
    revenue: Number(r.revenue),
  }));
};

exports.getStats = async ({ from, to } = {}) => {
  const orderFilter = buildDateFilter("created_at", from, to);
  const reportFilter = buildDateFilter("created_at", from, to);
  const alertFilter = buildDateFilter("created_at", from, to);

  const orderWhere = ["status = 'completed'", ...orderFilter.clauses].join(" AND ");
  const allOrderWhere = orderFilter.clauses.length
    ? orderFilter.clauses.join(" AND ")
    : "TRUE";
  const reportWhere = reportFilter.clauses.length
    ? reportFilter.clauses.join(" AND ")
    : "TRUE";
  const alertWhere = ["status = 'open'", ...alertFilter.clauses].join(" AND ");

  const revenueQ = db.query(
    `SELECT COALESCE(SUM(total_amount), 0) AS total FROM orders WHERE ${orderWhere}`,
    orderFilter.params
  );
  const ordersQ = db.query(
    `SELECT COUNT(*) AS total FROM orders WHERE ${allOrderWhere}`,
    orderFilter.params
  );
  const productsSoldQ = db.query(
    `SELECT COALESCE(SUM(oi.quantity), 0) AS total
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.status = 'completed' ${orderFilter.clauses.length ? "AND " + orderFilter.clauses.map((c) => c.replace("created_at", "o.created_at")).join(" AND ") : ""}`,
    orderFilter.params
  );
  const reportsQ = db.query(
    `SELECT COUNT(*) AS total FROM reports WHERE ${reportWhere}`,
    reportFilter.params
  );
  const alertsQ = db.query(
    `SELECT COUNT(*) AS total FROM alerts WHERE ${alertWhere}`,
    alertFilter.params
  );

  const [revenue, orders, productsSold, reports, alerts] = await Promise.all([
    revenueQ,
    ordersQ,
    productsSoldQ,
    reportsQ,
    alertsQ,
  ]);

  return {
    totalRevenue: Number(revenue.rows[0].total),
    totalOrders: Number(orders.rows[0].total),
    productsSold: Number(productsSold.rows[0].total),
    totalReports: Number(reports.rows[0].total),
    openAlerts: Number(alerts.rows[0].total),
  };
};
