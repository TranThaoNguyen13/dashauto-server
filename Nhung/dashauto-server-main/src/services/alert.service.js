const db = require("../db");

exports.list = async ({ type, severity, status, limit = 50, offset = 0 } = {}) => {
  const lim = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
  const off = Math.max(parseInt(offset) || 0, 0);

  const params = [];
  const where = [];

  if (type) {
    params.push(type);
    where.push(`type = $${params.length}`);
  }
  if (severity) {
    params.push(severity);
    where.push(`severity = $${params.length}`);
  }
  if (status) {
    params.push(status);
    where.push(`status = $${params.length}`);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countResult = await db.query(
    `SELECT COUNT(*) AS total FROM alerts ${whereClause}`,
    params
  );

  params.push(lim, off);
  const listResult = await db.query(
    `SELECT id, type, message, severity, status, created_at, resolved_at
     FROM alerts
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    total: Number(countResult.rows[0].total),
    items: listResult.rows,
  };
};

exports.create = async ({ type, message, severity = "high", status = "open" }) => {
  if (!type || !message) {
    throw { status: 400, message: "Thieu type hoac message" };
  }

  const result = await db.query(
    `INSERT INTO alerts (type, message, severity, status)
     VALUES ($1, $2, $3, $4)
     RETURNING id, type, message, severity, status, created_at`,
    [type, message, severity, status]
  );

  return result.rows[0];
};

exports.resolve = async (id) => {
  const result = await db.query(
    `UPDATE alerts
     SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND status = 'open'
     RETURNING id, status, resolved_at`,
    [id]
  );

  if (result.rowCount === 0) {
    throw { status: 404, message: "Khong tim thay canh bao dang mo" };
  }

  return result.rows[0];
};