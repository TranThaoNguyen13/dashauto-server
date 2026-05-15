const db = require("../db");

exports.list = async (query) => {
  const { status, region } = query;

  const conditions = [];
  const values = [];

  if (status) {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }

  if (region) {
    values.push(region);
    conditions.push(`region = $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await db.query(
    `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT 100`,
    values
  );

  return {
    total: result.rows.length,
    items: result.rows,
  };
};