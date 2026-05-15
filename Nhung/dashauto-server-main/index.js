const app = require("./src/app");
const config = require("./src/config");
const db = require("./src/db");

async function start() {
  try {
    const result = await db.query("SELECT NOW()");
    console.log(`DB connected at ${result.rows[0].now}`);
  } catch (err) {
    console.error("DB connection failed:", err.message);
    process.exit(1);
  }

  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port} [${config.nodeEnv}]`);
  });
}

start();
