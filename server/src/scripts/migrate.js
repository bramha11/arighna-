// Creates all tables (safe to run again).   npm run db:setup
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const { config, requireSettings } = require("../config");

(async () => {
  requireSettings();
  const conn = await mysql.createConnection({ ...config.db, multipleStatements: true });
  const sql = fs.readFileSync(path.join(__dirname, "..", "schema.sql"), "utf8");
  await conn.query(sql);
  const [tables] = await conn.query("SHOW TABLES");
  console.log("Database ready. Tables:", tables.map((t) => Object.values(t)[0]).join(", "));
  await conn.end();
})().catch((e) => { console.error("Setup failed:", e.message); process.exit(1); });
