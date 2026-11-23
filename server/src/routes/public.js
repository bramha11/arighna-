// Public API used by the website pages.
const express = require("express");
const fs = require("fs");
const rateLimit = require("express-rate-limit");
const pool = require("../db");
const { resumeUpload } = require("../uploads");
const { isEmail, str } = require("../util");

const router = express.Router();
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const prettyDate = (d) => { if (!d) return ""; const [y, m, day] = String(d).slice(0, 10).split("-"); return `${MONTHS[+m - 1]} ${day}, ${y}`; };

// form submissions: limit per visitor to stop spam floods
const formLimit = rateLimit({ windowMs: 10 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false,
  message: { error: "Too many submissions. Please try again in a few minutes." } });

// ---------- products ----------
router.get("/products", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.brand, p.active, p.pack, c.name AS category, c.division
         FROM products p JOIN categories c ON c.id = p.category_id
        WHERE p.is_active = 1
        ORDER BY p.sort_order, p.id`);
    res.json(rows);
  } catch (e) { next(e); }
});

router.get("/categories", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.name, c.division, COUNT(p.id) AS products
         FROM categories c LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
        GROUP BY c.id ORDER BY c.sort_order, c.id`);
    res.json(rows);
  } catch (e) { next(e); }
});

// ---------- blogs ----------
function blogCard(b) {
  return { id: b.id, title: b.title, slug: b.slug, category: b.category, date: prettyDate(b.published_at),
    readTime: b.read_time, excerpt: b.excerpt, image: b.cover_image, url: "bloginside.html?slug=" + encodeURIComponent(b.slug) };
}
router.get("/blogs", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM blogs WHERE status = 'published' ORDER BY published_at DESC, id DESC");
    res.json(rows.map(blogCard));
  } catch (e) { next(e); }
});
router.get("/blogs/:slug", async (req, res, next) => {
  try {
    const [[b]] = await pool.query("SELECT * FROM blogs WHERE slug = ? AND status = 'published'", [req.params.slug]);
    if (!b) return res.status(404).json({ error: "Article not found" });
    const [related] = await pool.query(
      "SELECT * FROM blogs WHERE status = 'published' AND id <> ? ORDER BY published_at DESC, id DESC LIMIT 3", [b.id]);
    res.json({ ...blogCard(b), content_html: b.content_html || "", related: related.map(blogCard) });
  } catch (e) { next(e); }
});

// ---------- careers ----------
router.get("/jobs", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, title, slug, meta, description_html FROM jobs WHERE is_open = 1 ORDER BY sort_order, id");
    res.json(rows);
  } catch (e) { next(e); }
});

router.post("/applications", formLimit, (req, res, next) => {
  resumeUpload.single("resume_file")(req, res, async (err) => {
    const removeFile = () => { if (req.file) fs.unlink(req.file.path, () => {}); };
    try {
      if (err) { removeFile(); return res.status(400).json({ error: err.code === "LIMIT_FILE_SIZE" ? "Resume must be 5 MB or smaller." : err.message }); }
      const name = str(req.body.applicant_name, 160), email = str(req.body.applicant_email, 190);
      const position = str(req.body.position_applied, 200), letter = str(req.body.covering_letter, 5000);
      if (!name || !isEmail(email) || !position || !req.file) {
        removeFile();
        return res.status(400).json({ error: "Please fill in your name, a valid email, the position and attach your resume." });
      }
      let jobId = null, positionLabel = position;
      const [[job]] = await pool.query("SELECT id, title FROM jobs WHERE slug = ? OR id = ?", [position, Number(position) || 0]);
      if (job) { jobId = job.id; positionLabel = job.title; } else if (position === "other") positionLabel = "Other Openings";
      await pool.query(
        "INSERT INTO applications (job_id, position, name, email, cover_letter, resume_file, resume_name) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [jobId, positionLabel, name, email, letter, req.file.filename, str(req.file.originalname, 255)]);
      res.status(201).json({ ok: true, message: "Thank you! Your application has been received." });
    } catch (e) { removeFile(); next(e); }
  });
});

// ---------- contact ----------
router.post("/contact", formLimit, express.json({ limit: "20kb" }), async (req, res, next) => {
  try {
    const b = req.body || {};
    const row = {
      full_name: str(b.full_name, 160), mobile: str(b.mobile, 40), email: str(b.email, 190),
      city_state: str(b.city_state, 160), subject: str(b.subject, 255), message: str(b.message, 5000),
    };
    if (b.website) return res.status(201).json({ ok: true }); // hidden honeypot field filled = bot
    if (!row.full_name || !row.mobile || !isEmail(row.email) || !row.subject || !row.message) {
      return res.status(400).json({ error: "Please fill in all required fields with a valid email." });
    }
    await pool.query("INSERT INTO contact_messages SET ?", [row]);
    res.status(201).json({ ok: true, message: "Thank you! Your message has been sent. We will get back to you soon." });
  } catch (e) { next(e); }
});

module.exports = router;
