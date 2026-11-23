// Arighna Pharma server: website + public API + admin panel.
//   npm start   ->  http://localhost:3000   (admin at http://localhost:3000/arighna-pharma)
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const session = require("express-session");
const MySQLSessionStore = require("./session-store");
const { config, requireSettings } = require("./config");

requireSettings();
const pool = require("./db");
const app = express();
app.disable("x-powered-by");
if (config.isProd) app.set("trust proxy", 1); // behind the host's HTTPS proxy

// Security headers. The site loads Tailwind / GSAP / fonts / Spline from CDNs and uses
// inline scripts, so a strict Content-Security-Policy is left off for now.
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// Never serve the server's own files (code, .env, uploads of resumes) or hidden files.
app.use((req, res, next) => {
  const p = decodeURIComponent(req.path).toLowerCase();
  if (p.startsWith("/server") || p.startsWith("/node_modules") || p.split("/").some((s) => s.startsWith("."))) {
    return res.status(404).end();
  }
  next();
});

// Admin login sessions (stored in MySQL so they survive restarts)
app.use(session({
  name: "ap_admin",
  secret: config.sessionSecret,
  store: new MySQLSessionStore(pool),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { httpOnly: true, sameSite: "strict", secure: config.isProd, maxAge: 8 * 60 * 60 * 1000 },
}));

// Admin changes must come from this site (blocks cross-site form tricks)
app.use("/api/admin", (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  if (origin && new URL(origin).host !== req.get("host")) return res.status(403).json({ error: "Forbidden" });
  next();
});

app.use("/api/admin", require("./routes/admin"));
app.use("/api", require("./routes/public"));
app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));

// Uploaded blog images
app.use("/uploads/public", express.static(config.publicUploads, { maxAge: "7d", index: false }));

// Admin panel (not linked from the website). "/arighna-pharma" -> "/arighna-pharma/"
app.get(config.adminPath, (req, res, next) => {
  if (!req.originalUrl.split("?")[0].endsWith("/")) return res.redirect(301, config.adminPath + "/");
  next();
});
// Admin panel files
app.use(config.adminPath, express.static(config.adminRoot, { index: "index.html", dotfiles: "deny" }));

// The website itself
app.use(express.static(config.siteRoot, { extensions: ["html"], dotfiles: "deny", index: "index.html" }));
app.use((req, res) => res.status(404).sendFile(path.join(config.siteRoot, "index.html")));

// Errors: log details, show a short message
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : "Something went wrong. Please try again." });
});

app.listen(config.port, () => {
  console.log(`Arighna Pharma running at http://localhost:${config.port}`);
  console.log(`Admin panel:             http://localhost:${config.port}${config.adminPath}`);
});
