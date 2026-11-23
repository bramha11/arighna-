/* =====================================================================
   ARIGHNA PHARMA — BLOG ARTICLES (single source of truth)
   ---------------------------------------------------------------------
   Used by blogs.html (filterable grid) and index.html (blog carousel),
   so both always show the same articles with the same card design.
   To add / edit an article, change it here only.
   `image` is optional: paste an image link to replace the grey placeholder.
   `url` is the page "Read Article" opens.
   ===================================================================== */
window.ARIGHNA_BLOGS = [
  {
    title: "Advancing Orodispersible Formulations for Acute Care",
    category: "Research",
    date: "Nov 02, 2026",
    readTime: "4 min read",
    excerpt: "Exploring the pharmacokinetic advantages of rapid-release oral disintegrating tablets in modern neuropsychiatric treatment protocols.",
    image: "assets/images/blogs/orodispersible.jpg",
    url: "bloginside.html"
  },
  {
    title: "Sustainable Manufacturing Practices in High-Purity APIs",
    category: "Sustainability",
    date: "Oct 28, 2026",
    readTime: "5 min read",
    excerpt: "How green chemistry and reduced carbon footprint initiatives are transforming global pharmaceutical active ingredient supply chains.",
    image: "assets/images/blogs/sustainable-manufacturing.jpg",
    url: "bloginside.html"
  },
  {
    title: "The Role of Combination Therapies in Cognitive Health",
    category: "Neuroscience",
    date: "Oct 15, 2026",
    readTime: "7 min read",
    excerpt: "Analyzing dual-action formulation synergies such as Donepezil and Memantine in slowing neurodegenerative decline.",
    image: "assets/images/blogs/cognitive-health.jpg",
    url: "bloginside.html"
  },
  {
    title: "Empowering Rural Healthcare Infrastructure Across Regions",
    category: "Sustainability",
    date: "Sep 30, 2026",
    readTime: "5 min read",
    excerpt: "Building lasting partnerships with community health clinics to ensure uninterrupted access to essential maintenance medications.",
    image: "assets/images/blogs/rural-healthcare.jpg",
    url: "bloginside.html"
  },
  {
    title: "Extended-Release Technologies in Bipolar Disorder Management",
    category: "Neuroscience",
    date: "Sep 18, 2026",
    readTime: "6 min read",
    excerpt: "How prolonged-release profile optimization minimizes daily dosage fluctuations and improves patient treatment compliance.",
    image: "assets/images/blogs/extended-release.jpg",
    url: "bloginside.html"
  },
  {
    title: "Global Quality Compliance & Regulatory Alignment",
    category: "Research",
    date: "Aug 24, 2026",
    readTime: "8 min read",
    excerpt: "Maintaining stringent international purity benchmarks across manufacturing facilities to support expansion into new territories.",
    image: "assets/images/blogs/quality-compliance.jpg",
    url: "bloginside.html"
  }
];

/* Card markup shared by both pages. `tag` = "div" (blogs grid) or "article"
   (home carousel); `extraClass` adds layout classes such as flex-shrink-0. */
window.renderBlogCard = function (a, tag, extraClass) {
  var esc = function (v) {
    return String(v == null ? "" : v).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  };
  tag = tag || "div";
  return "<" + tag + ' class="bg-white rounded-[24px] overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group ' + (extraClass || "") + '">' +
    "<div>" +
      '<div class="overflow-hidden w-full h-[220px] bg-slate-200/80 border-b border-slate-200/60"><img src="' + esc(a.image) + '" alt="' + (a.image ? esc(a.title) : "") + '" class="w-full h-full object-cover" /></div>' +
      '<div class="p-6">' +
        '<div class="flex justify-between items-center mb-3">' +
          '<span class="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-[12px] bg-[#0493BB]/10 text-[#0493BB]">' + esc(a.category) + "</span>" +
          '<span class="text-xs font-medium text-slate-400">' + esc(a.date) + "</span>" +
        "</div>" +
        '<h3 class="t-card text-[#002A5C] mb-2 group-hover:text-[#0493BB] transition-colors">' + esc(a.title) + "</h3>" +
        '<p class="text-slate-600 text-sm leading-relaxed mb-4">' + esc(a.excerpt) + "</p>" +
      "</div>" +
    "</div>" +
    '<div class="px-6 pb-6 flex items-center justify-between border-t border-slate-100 pt-4">' +
      '<span class="text-xs text-slate-400 font-medium">' + esc(a.readTime) + "</span>" +
      '<a href="' + esc(a.url || "#") + '" class="text-sm font-semibold text-[#0493BB] hover:underline flex items-center gap-1">' +
        'Read Article <i data-lucide="arrow-right" class="w-4 h-4"></i>' +
      "</a>" +
    "</div>" +
  "</" + tag + ">";
};

/* Live posts from the admin panel (server: GET /api/blogs). The list above is the
   fallback. When the live list arrives, ARIGHNA_BLOGS is updated in place and an
   "arighna:blogs" event tells the page to redraw its cards. */
(function () {
  if (!/^https?:$/.test(location.protocol) || !window.fetch) return;
  fetch("/api/blogs").then(function (r) { return r.ok ? r.json() : null; }).then(function (live) {
    if (!Array.isArray(live)) return;
    var list = window.ARIGHNA_BLOGS;
    list.length = 0;
    live.forEach(function (b) { list.push(b); });
    window.dispatchEvent(new Event("arighna:blogs"));
  }).catch(function () { /* keep the built-in posts */ });
})();
