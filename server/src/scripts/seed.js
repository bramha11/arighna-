// Copies the website's current content into the database (only into empty tables).
//   npm run db:seed
// Sources: the product list in products.html, js/blog-data.js and the roles in careers.html.
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { config, requireSettings } = require("../config");
const { slugify, cleanJobHtml } = require("../util");

const GENERAL = new Set(["NSAIDs", "Nutritional Supplements", "Antidiabetics (SGLT2 + DPP-4 Inhibitors)"]);
const site = (f) => fs.readFileSync(path.join(config.siteRoot, f), "utf8");

function readProducts() {
  const src = site("products.html");
  const start = src.indexOf("const products = [");
  const end = src.indexOf("];", start);
  if (start < 0 || end < 0) throw new Error("Product list not found in products.html");
  const list = vm.runInNewContext("(" + src.slice(start + "const products = ".length, end + 1) + ")");
  return list.map((p) => ({ brand: p.brand.trim(), active: String(p.active).replace(/\s*\n\s*/g, " ").trim(), category: p.category.trim(), pack: (p.pack || "").trim() }));
}

function readBlogs() {
  const ctx = { window: {}, location: { protocol: "file:" } }; // as if opened from a file: no live fetch
  vm.runInNewContext(site("js/blog-data.js"), ctx);
  return ctx.window.ARIGHNA_BLOGS || [];
}

function readJobs() {
  const src = site("careers.html");
  // only the static rows in the page markup (not the template inside the page's script)
  const markup = src.slice(0, src.indexOf("<script", src.indexOf('id="jobList"')));
  const rows = [...markup.matchAll(/<article class="job-row[\s\S]*?<\/article>/g)].map((m) => m[0]);
  return rows.map((row) => {
    const title = (row.match(/<h3[^>]*>([\s\S]*?)<\/h3>/) || [])[1] || "";
    const meta = (row.match(/<p class="mt-2[^"]*">([\s\S]*?)<\/p>/) || [])[1] || "";
    const desc = (row.match(/<p class="t-body[^"]*">([\s\S]*?)<\/p>/) || [])[1] || "";
    const clean = (s) => s.replace(/\s+/g, " ").replace(/&middot;/g, "·").trim();
    return { title: clean(title), meta: clean(meta), description_html: cleanJobHtml(clean(desc)) };
  });
}

function toDate(d) {
  const t = Date.parse(d);
  return isNaN(t) ? null : new Date(t).toISOString().slice(0, 10);
}

(async () => {
  requireSettings();
  const pool = require("../db");
  const count = async (table) => (await pool.query(`SELECT COUNT(*) AS n FROM ${table}`))[0][0].n;

  // products + categories
  if ((await count("products")) === 0) {
    const products = readProducts();
    const catIds = new Map();
    let order = 0;
    for (const p of products) {
      if (catIds.has(p.category)) continue;
      const [r] = await pool.query(
        "INSERT INTO categories (name, division, sort_order) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)",
        [p.category, GENERAL.has(p.category) ? "general" : "cns", order++]);
      catIds.set(p.category, r.insertId);
    }
    let i = 0;
    for (const p of products) {
      await pool.query("INSERT INTO products (brand, active, category_id, pack, sort_order) VALUES (?, ?, ?, ?, ?)",
        [p.brand, p.active, catIds.get(p.category), p.pack, i++]);
    }
    console.log(`Products: ${products.length} added in ${catIds.size} categories`);
  } else console.log("Products: table already has data, skipped");

  // blogs
  if ((await count("blogs")) === 0) {
    const blogs = readBlogs();
    for (const b of blogs) {
      await pool.query(
        "INSERT INTO blogs (title, slug, category, excerpt, content_html, cover_image, read_time, status, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'published', ?)",
        [b.title, slugify(b.title), b.category || "Research", b.excerpt || "", "<p>" + (b.excerpt || "") + "</p>", b.image || "", b.readTime || "", toDate(b.date)]);
    }
    console.log(`Blogs: ${blogs.length} added`);
  } else console.log("Blogs: table already has data, skipped");

  // jobs
  if ((await count("jobs")) === 0) {
    const jobs = readJobs();
    let i = 0;
    for (const j of jobs) {
      await pool.query("INSERT INTO jobs (title, slug, meta, description_html, sort_order) VALUES (?, ?, ?, ?, ?)",
        [j.title, slugify(j.title), j.meta, j.description_html, i++]);
    }
    console.log(`Job openings: ${jobs.length} added`);
  } else console.log("Job openings: table already has data, skipped");

  await pool.end();
})().catch((e) => { console.error("Seeding failed:", e.message); process.exit(1); });
