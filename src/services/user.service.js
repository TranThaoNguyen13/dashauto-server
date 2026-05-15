const bcrypt = require("bcryptjs");
const db = require("../db");

const VALID_ROLES = ["admin", "manager", "viewer"];

function assertRole(role) {
  if (!VALID_ROLES.includes(role)) {
    const err = new Error("Role khong hop le (admin, manager, viewer)");
    err.status = 400;
    throw err;
  }
}

exports.list = async ({ role, search, limit = 50, offset = 0 } = {}) => {
  const lim = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
  const off = Math.max(parseInt(offset) || 0, 0);
  const params = [];
  const where = [];

  if (role) {
    params.push(role);
    where.push(`role = $${params.length}`);
  }
  if (search) {
    params.push(`%${String(search).trim()}%`);
    where.push(`username ILIKE $${params.length}`);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countResult = await db.query(
    `SELECT COUNT(*) AS total FROM users ${whereClause}`,
    params
  );

  params.push(lim, off);
  const listResult = await db.query(
    `SELECT id, username, role, is_active, created_at
     FROM users
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    total: Number(countResult.rows[0].total),
    items: listResult.rows.map((row) => ({
      ...row,
      is_active: row.is_active !== false,
    })),
  };
};

exports.getSummary = async () => {
  const result = await db.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE role = 'admin')::int AS admins,
       COUNT(*) FILTER (WHERE role = 'manager')::int AS managers,
       COUNT(*) FILTER (WHERE role = 'viewer')::int AS viewers,
       COUNT(*) FILTER (WHERE is_active = true)::int AS active
     FROM users`
  );
  return result.rows[0];
};

exports.create = async ({ username, password, role }) => {
  const normalizedUsername = String(username || "").trim();
  if (!normalizedUsername || !password) {
    const err = new Error("Username va password la bat buoc");
    err.status = 400;
    throw err;
  }

  assertRole(role || "viewer");

  const existed = await db.query("SELECT id FROM users WHERE username = $1", [
    normalizedUsername,
  ]);
  if (existed.rowCount > 0) {
    const err = new Error("Username da ton tai");
    err.status = 400;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await db.query(
    `INSERT INTO users (username, password, role, is_active)
     VALUES ($1, $2, $3, true)
     RETURNING id, username, role, is_active, created_at`,
    [normalizedUsername, hashedPassword, role || "viewer"]
  );

  return result.rows[0];
};

exports.update = async (id, { role, is_active }, actorId) => {
  const userId = Number(id);
  if (!userId) {
    const err = new Error("ID khong hop le");
    err.status = 400;
    throw err;
  }

  const current = await db.query(
    "SELECT id, username, role, is_active FROM users WHERE id = $1",
    [userId]
  );
  if (current.rowCount === 0) {
    const err = new Error("Khong tim thay user");
    err.status = 404;
    throw err;
  }

  const user = current.rows[0];
  const nextRole = role !== undefined ? role : user.role;
  const nextActive = is_active !== undefined ? Boolean(is_active) : user.is_active;

  if (role !== undefined) assertRole(nextRole);

  if (user.role === "admin" && nextRole !== "admin") {
    const adminCount = await db.query(
      "SELECT COUNT(*)::int AS total FROM users WHERE role = 'admin' AND is_active = true"
    );
    if (Number(adminCount.rows[0].total) <= 1) {
      const err = new Error("Khong the doi role admin cuoi cung");
      err.status = 400;
      throw err;
    }
  }

  if (userId === actorId && nextActive === false) {
    const err = new Error("Khong the vo hieu hoa tai khoan cua chinh ban");
    err.status = 400;
    throw err;
  }

  if (user.role === "admin" && nextActive === false) {
    const adminCount = await db.query(
      "SELECT COUNT(*)::int AS total FROM users WHERE role = 'admin' AND is_active = true"
    );
    if (Number(adminCount.rows[0].total) <= 1) {
      const err = new Error("Khong the vo hieu hoa admin cuoi cung");
      err.status = 400;
      throw err;
    }
  }

  const result = await db.query(
    `UPDATE users
     SET role = $2, is_active = $3
     WHERE id = $1
     RETURNING id, username, role, is_active, created_at`,
    [userId, nextRole, nextActive]
  );

  return result.rows[0];
};

exports.changePassword = async (userId, { currentPassword, newPassword }) => {
  if (!currentPassword || !newPassword) {
    const err = new Error("Can nhap mat khau cu va mat khau moi");
    err.status = 400;
    throw err;
  }

  const result = await db.query(
    "SELECT id, password FROM users WHERE id = $1 AND is_active = true",
    [userId]
  );
  if (result.rowCount === 0) {
    const err = new Error("Khong tim thay user");
    err.status = 404;
    throw err;
  }

  const user = result.rows[0];
  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    const err = new Error("Mat khau cu khong dung");
    err.status = 400;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await db.query("UPDATE users SET password = $1 WHERE id = $2", [
    hashedPassword,
    userId,
  ]);

  return { success: true };
};

exports.resetPassword = async (id, newPassword) => {
  if (!newPassword) {
    const err = new Error("Mat khau moi la bat buoc");
    err.status = 400;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const result = await db.query(
    "UPDATE users SET password = $1 WHERE id = $2 RETURNING id, username",
    [hashedPassword, id]
  );

  if (result.rowCount === 0) {
    const err = new Error("Khong tim thay user");
    err.status = 404;
    throw err;
  }

  return { success: true };
};
