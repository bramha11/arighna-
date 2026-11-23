// Admin API (everything except /login requires the admin to be logged in).
const express = require("express");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const pool = require("../db");
const { config } = require("../config");
const { imageUpload } = require("../uploads");
const { slugify, cleanBlogHtml, cleanJobHtml, isEmail, str } = require("../util");

const router = express.Router();
router.use(express.json({ limit: "2mb" }));

// ---------- auth ----------
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
  message: { error: "Too many login attempts. Please wait 15 minutes and try again." } });

router.post("/login", loginLimit, async (req, res, next) => {
  try {
    const email = str(req.body && req.body.email, 190).toLowerCase();
    const password = String((req.body && req.body.password) || "");
    const [[admin]] = await pool.query("SELECT * FROM admins WHERE email = ?", [email]);
    const ok = admin && await bcrypt.compare(password, admin.password_hash);
    if (!ok) return res.status(401).json({ error: "Incorrect email or password." });
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.adminId = admin.id;
      req.session.adminEmail = admin.email;
      pool.query("UPDATE admins SET last_login_at = NOW() WHERE id = ?", [admin.id]).catch(() => {});
      res.json({ ok: true, email: admin.email });
    });
  } catch (e) { next(e); }
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => { res.clearCookie("ap_admin"); res.json({ ok: true }); });
});

// everything below needs a logged-in admin
router.use((req, res, next) => {
  if (req.session && req.session.adminId) return next();
  res.status(401).json({ error: "Please log in." });
});

router.get("/me", (req, res) => res.json({ email: req.session.adminEmail }));

router.get("/dashboard", async (req, res, next) => {
  try {
    const one = async (sql) => (await pool.query(sql))[0][0].n;
    res.json({
      products: await one("SELECT COUNT(*) AS n FROM products"),
      categories: await one("SELECT COUNT(*) AS n FROM categories"),
      blogsPublished: await one("SELECT COUNT(*) AS n FROM blogs WHERE status = 'published'"),
      blogsDraft: await one("SELECT COUNT(*) AS n FROM blogs WHERE status = 'draft'"),
      jobsOpen: await one("SELECT COUNT(*) AS n FROM jobs WHERE is_open = 1"),
      applicationsNew: await one("SELECT COUNT(*) AS n FROM applications WHERE status = 'new'"),
      applications: await one("SELECT COUNT(*) AS n FROM applications"),
      messagesNew: await one("SELECT COUNT(*) AS n FROM contact_messages WHERE status = 'new'"),
      messages: await one("SELECT COUNT(*) AS n FROM contact_messages"),
    });
  } catch (e) { next(e); }
});

// ---------- categories ----------
router.get("/categories", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, COUNT(p.id) AS products FROM categories c LEFT JOIN products p ON p.category_id = c.id
        GROUP BY c.id ORDER BY c.sort_order, c.id`);
    res.json(rows);
  } catch (e) { next(e); }
});
router.post("/categories", async (req, res, next) => {
  try {
    const name = str(req.body.name, 160), division = req.body.division === "general" ? "general" : "cns";
    if (!name) return res.status(400).json({ error: "Category name is required." });
    const [[{ m }]] = await pool.query("SELECT COALESCE(MAX(sort_order), -1) AS m FROM categories");
    const [r] = await pool.query("INSERT INTO categories (name, division, sort_order) VALUES (?, ?, ?)", [name, division, m + 1]);
    res.status(201).json({ id: r.insertId });
  } catch (e) { if (e.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "That category already exists." }); next(e); }
});
router.put("/categories/:id", async (req, res, next) => {
  try {
    const name = str(req.body.name, 160), division = req.body.division === "general" ? "general" : "cns";
    if (!name) return res.status(400).json({ error: "Category name is required." });
    await pool.query("UPDATE categories SET name = ?, division = ? WHERE id = ?", [name, division, req.params.id]);
    res.json({ ok: true });
  } catch (e) { if (e.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "That category already exists." }); next(e); }
});
router.delete("/categories/:id", async (req, res, next) => {
  try {
    const [[{ n }]] = await pool.query("SELECT COUNT(*) AS n FROM products WHERE category_id = ?", [req.params.id]);
    if (n > 0) return res.status(400).json({ error: `This category still has ${n} product(s). Move or delete them first.` });
    await pool.query("DELETE FROM categories WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------- products ----------
function productRow(b) {
  return { brand: str(b.brand, 160), active: str(b.active, 500), pack: str(b.pack, 60),
    category_id: Number(b.category_id) || 0, is_active: b.is_active === false || b.is_active === 0 || b.is_active === "0" ? 0 : 1 };
}
router.get("/products", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, c.name AS category FROM products p JOIN categories c ON c.id = p.category_id ORDER BY p.sort_order, p.id`);
    res.json(rows);
  } catch (e) { next(e); }
});
router.post("/products", async (req, res, next) => {
  try {
    const row = productRow(req.body);
    if (!row.brand || !row.active || !row.category_id) return res.status(400).json({ error: "Brand, active ingredient and category are required." });
    const [[{ m }]] = await pool.query("SELECT COALESCE(MAX(sort_order), -1) AS m FROM products");
    const [r] = await pool.query("INSERT INTO products SET ?", [{ ...row, sort_order: m + 1 }]);
    res.status(201).json({ id: r.insertId });
  } catch (e) { if (e.code === "ER_NO_REFERENCED_ROW_2") return res.status(400).json({ error: "Please choose a valid category." }); next(e); }
});
router.put("/products/:id", async (req, res, next) => {
  try {
    const row = productRow(req.body);
    if (!row.brand || !row.active || !row.category_id) return res.status(400).json({ error: "Brand, active ingredient and category are required." });
    await pool.query("UPDATE products SET ? WHERE id = ?", [row, req.params.id]);
    res.json({ ok: true });
  } catch (e) { if (e.code === "ER_NO_REFERENCED_ROW_2") return res.status(400).json({ error: "Please choose a valid category." }); next(e); }
});
router.delete("/products/:id", async (req, res, next) => {
  try { await pool.query("DELETE FROM products WHERE id = ?", [req.params.id]); res.json({ ok: true }); } catch (e) { next(e); }
});

// CSV export / import  (columns: brand, active, category, pack)
const csvCell = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
router.get("/products/export.csv", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT p.brand, p.active, c.name AS category, p.pack FROM products p JOIN categories c ON c.id = p.category_id ORDER BY p.sort_order, p.id");
    const csv = "﻿" + [["brand", "active", "category", "pack"].map(csvCell).join(",")]
      .concat(rows.map((r) => [r.brand, r.active, r.category, r.pack].map(csvCell).join(","))).join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="arighna-products.csv"');
    res.send(csv);
  } catch (e) { next(e); }
});
function parseCSV(text) {
  const rows = []; let row = [], cell = "", q = false;
  text = String(text).replace(/^﻿/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}
router.post("/products/import", async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const rows = parseCSV(req.body.csv || "");
    if (rows.length < 2) return res.status(400).json({ error: "The file has no product rows." });
    const head = rows[0].map((h) => h.trim().toLowerCase());
    const col = (n) => head.indexOf(n);
    if (col("brand") < 0 || col("active") < 0 || col("category") < 0) return res.status(400).json({ error: 'The first row must have the columns: brand, active, category, pack' });
    const replace = req.body.mode === "replace";
    await conn.beginTransaction();
    if (replace) await conn.query("DELETE FROM products");
    const [cats] = await conn.query("SELECT id, name FROM categories");
    const catIds = new Map(cats.map((c) => [c.name.toLowerCase(), c.id]));
    let [[{ m }]] = await conn.query("SELECT COALESCE(MAX(sort_order), -1) AS m FROM products");
    let added = 0, newCats = 0;
    for (const r of rows.slice(1)) {
      const brand = str(r[col("brand")], 160), active = str(r[col("active")], 500), catName = str(r[col("category")], 160);
      const pack = col("pack") >= 0 ? str(r[col("pack")], 60) : "";
      if (!brand || !active || !catName) continue;
      let cid = catIds.get(catName.toLowerCase());
      if (!cid) {
        const [c] = await conn.query("INSERT INTO categories (name, division, sort_order) VALUES (?, 'cns', ?)", [catName, catIds.size]);
        cid = c.insertId; catIds.set(catName.toLowerCase(), cid); newCats++;
      }
      await conn.query("INSERT INTO products (brand, active, category_id, pack, sort_order) VALUES (?, ?, ?, ?, ?)", [brand, active, cid, pack, ++m]);
      added++;
    }
    await conn.commit();
    res.json({ ok: true, added, newCategories: newCats, replaced: replace });
  } catch (e) { await conn.rollback().catch(() => {}); next(e); }
  finally { conn.release(); }
});

// ---------- blogs ----------
async function uniqueSlug(table, base, id) {
  let slug = slugify(base), n = 1;
  for (;;) {
    const [[hit]] = await pool.query(`SELECT id FROM ${table} WHERE slug = ? AND id <> ?`, [slug, id || 0]);
    if (!hit) return slug;
    slug = slugify(base) + "-" + (++n);
  }
}
function blogRow(b) {
  const status = b.status === "published" ? "published" : "draft";
  return {
    title: str(b.title, 255), category: str(b.category, 100) || "Research", excerpt: str(b.excerpt, 600),
    content_html: cleanBlogHtml(b.content_html), cover_image: str(b.cover_image, 500), read_time: str(b.read_time, 40),
    status, published_at: /^\d{4}-\d{2}-\d{2}$/.test(b.published_at || "") ? b.published_at : (status === "published" ? new Date().toISOString().slice(0, 10) : null),
  };
}
router.get("/blogs", async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT id, title, slug, category, status, published_at, read_time, cover_image, updated_at FROM blogs ORDER BY COALESCE(published_at, DATE(created_at)) DESC, id DESC");
    res.json(rows);
  } catch (e) { next(e); }
});
router.get("/blogs/:id", async (req, res, next) => {
  try {
    const [[b]] = await pool.query("SELECT * FROM blogs WHERE id = ?", [req.params.id]);
    if (!b) return res.status(404).json({ error: "Not found" });
    res.json(b);
  } catch (e) { next(e); }
});
router.post("/blogs", async (req, res, next) => {
  try {
    const row = blogRow(req.body);
    if (!row.title) return res.status(400).json({ error: "Title is required." });
    row.slug = await uniqueSlug("blogs", req.body.slug || row.title);
    const [r] = await pool.query("INSERT INTO blogs SET ?", [row]);
    res.status(201).json({ id: r.insertId, slug: row.slug });
  } catch (e) { next(e); }
});
router.put("/blogs/:id", async (req, res, next) => {
  try {
    const row = blogRow(req.body);
    if (!row.title) return res.status(400).json({ error: "Title is required." });
    row.slug = await uniqueSlug("blogs", req.body.slug || row.title, Number(req.params.id));
    await pool.query("UPDATE blogs SET ? WHERE id = ?", [row, req.params.id]);
    res.json({ ok: true, slug: row.slug });
  } catch (e) { next(e); }
});
router.delete("/blogs/:id", async (req, res, next) => {
  try { await pool.query("DELETE FROM blogs WHERE id = ?", [req.params.id]); res.json({ ok: true }); } catch (e) { next(e); }
});
router.post("/uploads/image", (req, res) => {
  imageUpload.single("image")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.code === "LIMIT_FILE_SIZE" ? "Image must be 5 MB or smaller." : err.message });
    if (!req.file) return res.status(400).json({ error: "No image received." });
    res.status(201).json({ url: "/uploads/public/blog/" + req.file.filename });
  });
});

// ---------- jobs ----------
function jobRow(b) {
  return { title: str(b.title, 200), meta: str(b.meta, 200), description_html: cleanJobHtml(b.description_html),
    is_open: b.is_open === false || b.is_open === 0 || b.is_open === "0" ? 0 : 1 };
}
router.get("/jobs", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT j.*, (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applications FROM jobs j ORDER BY j.sort_order, j.id`);
    res.json(rows);
  } catch (e) { next(e); }
});
router.post("/jobs", async (req, res, next) => {
  try {
    const row = jobRow(req.body);
    if (!row.title) return res.status(400).json({ error: "Job title is required." });
    row.slug = await uniqueSlug("jobs", row.title);
    const [[{ m }]] = await pool.query("SELECT COALESCE(MAX(sort_order), -1) AS m FROM jobs");
    const [r] = await pool.query("INSERT INTO jobs SET ?", [{ ...row, sort_order: m + 1 }]);
    res.status(201).json({ id: r.insertId });
  } catch (e) { next(e); }
});
router.put("/jobs/:id", async (req, res, next) => {
  try {
    const row = jobRow(req.body);
    if (!row.title) return res.status(400).json({ error: "Job title is required." });
    row.slug = await uniqueSlug("jobs", row.title, Number(req.params.id));
    await pool.query("UPDATE jobs SET ? WHERE id = ?", [row, req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
router.delete("/jobs/:id", async (req, res, next) => {
  try { await pool.query("DELETE FROM jobs WHERE id = ?", [req.params.id]); res.json({ ok: true }); } catch (e) { next(e); }
});

// ---------- applications ----------
const APP_STATUS = ["new", "reviewed", "shortlisted", "rejected"];
router.get("/applications", async (req, res, next) => {
  try {
    const where = APP_STATUS.includes(req.query.status) ? "WHERE status = ?" : "";
    const [rows] = await pool.query(`SELECT * FROM applications ${where} ORDER BY created_at DESC, id DESC`, where ? [req.query.status] : []);
    res.json(rows);
  } catch (e) { next(e); }
});
router.put("/applications/:id", async (req, res, next) => {
  try {
    if (!APP_STATUS.includes(req.body.status)) return res.status(400).json({ error: "Unknown status." });
    await pool.query("UPDATE applications SET status = ? WHERE id = ?", [req.body.status, req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
router.get("/applications/:id/resume", async (req, res, next) => {
  try {
    const [[a]] = await pool.query("SELECT resume_file, resume_name FROM applications WHERE id = ?", [req.params.id]);
    if (!a || !a.resume_file) return res.status(404).json({ error: "No resume." });
    const file = path.join(config.privateUploads, "resumes", path.basename(a.resume_file));
    if (!fs.existsSync(file)) return res.status(404).json({ error: "Resume file is missing." });
    res.download(file, a.resume_name || a.resume_file);
  } catch (e) { next(e); }
});
router.delete("/applications/:id", async (req, res, next) => {
  try {
    const [[a]] = await pool.query("SELECT resume_file FROM applications WHERE id = ?", [req.params.id]);
    await pool.query("DELETE FROM applications WHERE id = ?", [req.params.id]);
    if (a && a.resume_file) fs.unlink(path.join(config.privateUploads, "resumes", path.basename(a.resume_file)), () => {});
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------- contact messages ----------
const MSG_STATUS = ["new", "read", "handled"];
router.get("/messages", async (req, res, next) => {
  try {
    const where = MSG_STATUS.includes(req.query.status) ? "WHERE status = ?" : "";
    const [rows] = await pool.query(`SELECT * FROM contact_messages ${where} ORDER BY created_at DESC, id DESC`, where ? [req.query.status] : []);
    res.json(rows);
  } catch (e) { next(e); }
});
router.put("/messages/:id", async (req, res, next) => {
  try {
    if (!MSG_STATUS.includes(req.body.status)) return res.status(400).json({ error: "Unknown status." });
    await pool.query("UPDATE contact_messages SET status = ? WHERE id = ?", [req.body.status, req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
router.delete("/messages/:id", async (req, res, next) => {
  try { await pool.query("DELETE FROM contact_messages WHERE id = ?", [req.params.id]); res.json({ ok: true }); } catch (e) { next(e); }
});
router.get("/messages/export.csv", async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT created_at, full_name, mobile, email, city_state, subject, message, status FROM contact_messages ORDER BY created_at DESC");
    const cols = ["created_at", "full_name", "mobile", "email", "city_state", "subject", "message", "status"];
    const csv = "﻿" + [cols.map(csvCell).join(",")].concat(rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))).join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="arighna-contact-messages.csv"');
    res.send(csv);
  } catch (e) { next(e); }
});

module.exports = router;
