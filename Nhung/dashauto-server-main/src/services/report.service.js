const db = require("../db");

exports.list = async ({ type, emailStatus, limit = 50, offset = 0 } = {}) => {
  const lim = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
  const off = Math.max(parseInt(offset) || 0, 0);

  const params = [];
  const where = [];

  if (type) {
    params.push(type);
    where.push(`type = $${params.length}`);
  }
  if (emailStatus) {
    params.push(emailStatus);
    where.push(`email_status = $${params.length}`);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countResult = await db.query(
    `SELECT COUNT(*) AS total FROM reports ${whereClause}`,
    params
  );

  params.push(lim, off);
  const listResult = await db.query(
    `SELECT r.id, r.title, r.type, r.content, r.file_url, r.email_status,
            r.created_at, u.username AS created_by_username
     FROM reports r
     LEFT JOIN users u ON u.id = r.created_by
     ${whereClause}
     ORDER BY r.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    total: Number(countResult.rows[0].total),
    items: listResult.rows,
  };
};
