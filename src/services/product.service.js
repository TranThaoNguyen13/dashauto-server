const db = require("../db");

exports.list = async (query) => {
  const { category, status } = query;

  const conditions = [];
  const values = [];

  if (category) {
    values.push(category);
    conditions.push(`category = $${values.length}`);
  }

  if (status) {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await db.query(
    `SELECT * FROM products ${where} ORDER BY id DESC LIMIT 100`,
    values
  );

  return {
    total: result.rows.length,
    items: result.rows,
  };
};