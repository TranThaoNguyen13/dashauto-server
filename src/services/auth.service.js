const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../config");
const db = require("../db");

exports.register = async ({ username, password }) => {
  const existed = await db.query("SELECT id FROM users WHERE username = $1", [username]);
  if (existed.rowCount > 0) {
    throw { status: 400, message: "Username da ton tai" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await db.query(
    `INSERT INTO users (username, password, role, is_active)
     VALUES ($1, $2, 'viewer', true)
     RETURNING id`,
    [username, hashedPassword]
  );

  return { userId: result.rows[0].id };
};

exports.login = async ({ username, password }) => {
  const result = await db.query(
    "SELECT id, username, password, role, is_active FROM users WHERE username = $1",
    [username]
  );

  if (result.rowCount === 0) {
    throw { status: 401, message: "Sai username hoac password" };
  }

  const user = result.rows[0];

  if (user.is_active === false) {
    throw { status: 403, message: "Tai khoan da bi vo hieu hoa" };
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw { status: 401, message: "Sai username hoac password" };
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    config.jwtSecret,
    { expiresIn: "24h" }
  );

  return { token, user: { id: user.id, username: user.username, role: user.role } };
};
