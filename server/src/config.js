// Loads settings from server/.env and checks the important ones are present.
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const env = process.env;
const config = {
  port: Number(env.PORT || 3000),
  isProd: env.NODE_ENV === "production",
  db: {
    host: env.DB_HOST || "localhost",
    port: Number(env.DB_PORT || 3306),
    database: env.DB_NAME || "arighna_pharma",
    user: env.DB_USER || "arighna_app",
    password: env.DB_PASSWORD || "",
  },
  adminPath: "/" + String(env.ADMIN_PATH || "/arighna-pharma").replace(/^\/+|\/+$/g, ""),
  sessionSecret: env.SESSION_SECRET || "",
  // folders
  siteRoot: path.join(__dirname, "..", ".."),                 // the website (index.html etc.)
  adminRoot: path.join(__dirname, "..", "admin"),             // admin panel files
  uploadRoot: path.join(__dirname, "..", env.UPLOAD_DIR || "uploads"),
};
config.publicUploads = path.join(config.uploadRoot, "public");   // blog images (served to visitors)
config.privateUploads = path.join(config.uploadRoot, "private"); // resumes (admin only)

function requireSettings() {
  const missing = [];
  if (!config.db.password) missing.push("DB_PASSWORD");
  if (!config.sessionSecret || config.sessionSecret.length < 32) missing.push("SESSION_SECRET (at least 32 characters)");
  if (missing.length) {
    console.error("\n  Missing settings in server/.env: " + missing.join(", "));
    console.error("  Copy server/.env.example to server/.env and fill them in.\n");
    process.exit(1);
  }
}

module.exports = { config, requireSettings };
