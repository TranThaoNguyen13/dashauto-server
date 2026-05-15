const fs = require("fs");
const path = require("path");
const db = require("./index");

async function migrate() {
  const dir = path.join(__dirname, "migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    console.log(`Running ${file}...`);
    await db.query(sql);
  }

  console.log("Migrations done");
  await db.pool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
