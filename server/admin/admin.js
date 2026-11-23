/* Arighna Pharma admin panel (single page, no build step). */
(function () {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const view = $("#view");
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icons = () => window.lucide && lucide.createIcons();
  const fmtDate = (d) => d ? new Date(String(d).replace(" ", "T")).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const fmtDateTime = (d) => d ? new Date(String(d).replace(" ", "T")).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  // ---------- API ----------
  async function api(path, opts = {}) {
    const o = { credentials: "same-origin", headers: {}, ...opts };
    if (o.body && !(o.body instanceof FormData)) { o.headers["Content-Type"] = "application/json"; o.body = JSON.stringify(o.body); }
    const res = await fetch("/api/admin" + path, o);
    let data = {};
    try { data = await res.json(); } catch (e) { /* empty */ }
    if (res.status === 401 && path !== "/login") { showLogin(); throw new Error("Please log in again."); }
    if (!res.ok) throw new Error(data.error || "Request failed (" + res.status + ")");
    return data;
  }

  // ---------- toast / modal ----------
  let toastTimer;
  function toast(msg, isErr) {
    const t = $("#toast");
    t.textContent = msg; t.className = isErr ? "err" : "ok";
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add("hidden"), 3200);
  }
  function openModal(title, html, onReady) {
    $("#modalTitle").textContent = title;
    $("#modalBody").innerHTML = html;
    $("#modal").classList.remove("hidden");
    icons();
    if (onReady) onReady($("#modalBody"));
  }
  function closeModal() { $("#modal").classList.add("hidden"); $("#modalBody").innerHTML = ""; }
  $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal" || e.target.closest("[data-close]")) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
  const confirmDelete = (what) => confirm("Delete " + what + "? This cannot be undone.");

  function header(title, sub, actions = "") {
    return `<div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
      <div><h1 class="text-[28px] sm:text-[32px] font-semibold tracking-tight">${title}</h1>${sub ? `<p class="text-slate-500 mt-1">${sub}</p>` : ""}</div>
      <div class="flex flex-wrap gap-2">${actions}</div></div>`;
  }

  // ---------- auth ----------
  function showLogin() { $("#appView").classList.add("hidden"); $("#loginView").classList.remove("hidden"); }
  function showApp(email) {
    $("#loginView").classList.add("hidden"); $("#appView").classList.remove("hidden");
    $("#adminEmail").textContent = email;
    route();
  }
  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("#loginError"); err.classList.add("hidden");
    const btn = e.target.querySelector("button"); btn.disabled = true;
    try {
      const r = await api("/login", { method: "POST", body: { email: $("#loginEmail").value, password: $("#loginPassword").value } });
      $("#loginPassword").value = "";
      showApp(r.email);
    } catch (ex) { err.textContent = ex.message; err.classList.remove("hidden"); }
    finally { btn.disabled = false; }
  });
  $("#logoutBtn").addEventListener("click", async () => { await api("/logout", { method: "POST" }).catch(() => {}); showLogin(); });
  $("#menuToggle").addEventListener("click", () => $("#sideNav").classList.toggle("hidden"));

  // ---------- routing ----------
  const routes = { dashboard, products, categories, blogs, jobs, applications, messages };
  function route() {
    const [name, arg] = (location.hash.slice(1) || "dashboard").split("/");
    $$(".nav-item[href^='#']").forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + name));
    if (window.innerWidth < 1024) $("#sideNav").classList.add("hidden");
    view.innerHTML = `<p class="text-slate-400">Loading…</p>`;
    (routes[name] || dashboard)(arg).then(icons).catch((e) => { view.innerHTML = `<p class="text-red-600">${esc(e.message)}</p>`; });
    refreshBadges();
  }
  window.addEventListener("hashchange", () => { if (!$("#appView").classList.contains("hidden")) route(); });
  async function refreshBadges() {
    try {
      const d = await api("/dashboard");
      $("[data-badge='applications']").textContent = d.applicationsNew || "";
      $("[data-badge='messages']").textContent = d.messagesNew || "";
    } catch (e) { /* ignore */ }
  }

  // ---------- dashboard ----------
  async function dashboard() {
    const d = await api("/dashboard");
    const tile = (label, value, sub, href, icon) => `
      <a href="${href}" class="card p-6 flex flex-col gap-4 hover:shadow-lg transition-shadow">
        <span class="w-11 h-11 rounded-2xl bg-teal/10 text-teal flex items-center justify-center"><i data-lucide="${icon}" class="w-5 h-5"></i></span>
        <span><span class="block text-[34px] font-semibold leading-none">${value}</span><span class="block mt-2 text-sm font-semibold text-teal">${label}</span></span>
        <span class="text-sm text-slate-500">${sub}</span></a>`;
    view.innerHTML = header("Dashboard", "Everything on the website, in one place.") + `
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        ${tile("Products", d.products, d.categories + " categories", "#products", "pill")}
        ${tile("Published blogs", d.blogsPublished, d.blogsDraft + " draft(s)", "#blogs", "file-text")}
        ${tile("New applications", d.applicationsNew, d.applications + " total · " + d.jobsOpen + " open role(s)", "#applications", "user-check")}
        ${tile("New messages", d.messagesNew, d.messages + " total", "#messages", "mail")}
      </div>`;
  }

  // ---------- products ----------
  async function products() {
    const [rows, cats] = await Promise.all([api("/products"), api("/categories")]);
    view.innerHTML = header("Products", rows.length + " products in " + cats.length + " categories",
      `<button class="btn-ghost" id="importBtn"><i data-lucide="upload"></i>Import CSV</button>
       <a class="btn-ghost" href="/api/admin/products/export.csv"><i data-lucide="download"></i>Export CSV</a>
       <button class="btn-primary" id="addBtn"><i data-lucide="plus"></i>Add product</button>`) + `
      <div class="card">
        <div class="p-4 flex flex-col sm:flex-row gap-3 border-b border-slate-100">
          <input id="q" class="field sm:max-w-[320px]" placeholder="Search brand or ingredient…" />
          <select id="cat" class="field sm:max-w-[300px]"><option value="">All categories</option>${cats.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select>
          <span id="shown" class="sm:ml-auto self-center text-sm text-slate-500"></span>
        </div>
        <div class="table-wrap"><table class="data"><thead><tr><th>Brand</th><th>Active ingredient(s)</th><th>Category</th><th>Pack</th><th>Status</th><th></th></tr></thead><tbody id="rows"></tbody></table></div>
      </div>`;
    function draw() {
      const q = $("#q").value.trim().toLowerCase(), c = $("#cat").value;
      const list = rows.filter((p) => (!c || String(p.category_id) === c) && (!q || p.brand.toLowerCase().includes(q) || p.active.toLowerCase().includes(q)));
      $("#shown").textContent = list.length + " shown";
      $("#rows").innerHTML = list.map((p) => `<tr>
        <td class="font-semibold">${esc(p.brand)}</td><td class="text-slate-600">${esc(p.active)}</td>
        <td><span class="pill pill-teal">${esc(p.category)}</span></td><td>${esc(p.pack)}</td>
        <td>${p.is_active ? '<span class="pill pill-green">Visible</span>' : '<span class="pill pill-grey">Hidden</span>'}</td>
        <td class="whitespace-nowrap text-right"><button class="icon-btn" data-edit="${p.id}" title="Edit"><i data-lucide="pencil"></i></button><button class="icon-btn danger" data-del="${p.id}" title="Delete"><i data-lucide="trash-2"></i></button></td></tr>`).join("")
        || `<tr><td colspan="6" class="text-center text-slate-400 py-10">No products found.</td></tr>`;
      icons();
    }
    draw();
    $("#q").addEventListener("input", draw); $("#cat").addEventListener("change", draw);
    $("#addBtn").addEventListener("click", () => productForm(null, cats));
    $("#rows").addEventListener("click", async (e) => {
      const ed = e.target.closest("[data-edit]"), del = e.target.closest("[data-del]");
      if (ed) productForm(rows.find((p) => p.id == ed.dataset.edit), cats);
      if (del) {
        const p = rows.find((x) => x.id == del.dataset.del);
        if (!confirmDelete("“" + p.brand + "”")) return;
        try { await api("/products/" + p.id, { method: "DELETE" }); toast("Product deleted"); route(); } catch (ex) { toast(ex.message, true); }
      }
    });
    $("#importBtn").addEventListener("click", importForm);
  }
  function productForm(p, cats) {
    openModal(p ? "Edit product" : "Add product", `
      <form id="pf" class="grid gap-4">
        <div><label class="field-label">Brand name *</label><input name="brand" class="field" required value="${esc(p ? p.brand : "")}" /></div>
        <div><label class="field-label">Active ingredient(s) *</label><textarea name="active" class="field" required>${esc(p ? p.active : "")}</textarea></div>
        <div class="grid sm:grid-cols-2 gap-4">
          <div><label class="field-label">Therapeutic category *</label><select name="category_id" class="field" required>${cats.map((c) => `<option value="${c.id}" ${p && p.category_id === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div>
          <div><label class="field-label">Pack size</label><input name="pack" class="field" placeholder="e.g. 10'S" value="${esc(p ? p.pack : "")}" /></div>
        </div>
        <label class="flex items-center gap-3 text-sm"><input type="checkbox" name="is_active" class="w-4 h-4 accent-[#0493BB]" ${!p || p.is_active ? "checked" : ""}/> Show on the website</label>
        <div class="flex justify-end gap-2 pt-2"><button type="button" data-close class="btn-ghost">Cancel</button><button class="btn-primary">${p ? "Save changes" : "Add product"}</button></div>
      </form>`, (body) => {
      $("#pf", body).addEventListener("submit", async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        const data = { brand: f.get("brand"), active: f.get("active"), category_id: f.get("category_id"), pack: f.get("pack"), is_active: f.get("is_active") ? 1 : 0 };
        try { await api(p ? "/products/" + p.id : "/products", { method: p ? "PUT" : "POST", body: data }); closeModal(); toast(p ? "Product updated" : "Product added"); route(); }
        catch (ex) { toast(ex.message, true); }
      });
    });
  }
  function importForm() {
    openModal("Import products from CSV", `
      <form id="imf" class="grid gap-4">
        <p class="text-sm text-slate-600">Use a CSV file (Excel → <em>Save As → CSV</em>) with the columns <strong>brand, active, category, pack</strong> in the first row. Tip: export the current list first to get the right format.</p>
        <input type="file" name="file" accept=".csv,text/csv" required class="field" />
        <label class="flex items-start gap-3 text-sm"><input type="radio" name="mode" value="add" checked class="mt-1 accent-[#0493BB]" /> <span><strong>Add</strong> these products to the existing list</span></label>
        <label class="flex items-start gap-3 text-sm"><input type="radio" name="mode" value="replace" class="mt-1 accent-[#0493BB]" /> <span><strong>Replace</strong> all existing products with this file</span></label>
        <div class="flex justify-end gap-2 pt-2"><button type="button" data-close class="btn-ghost">Cancel</button><button class="btn-primary">Import</button></div>
      </form>`, (body) => {
      $("#imf", body).addEventListener("submit", async (e) => {
        e.preventDefault();
        const f = new FormData(e.target), file = f.get("file");
        if (f.get("mode") === "replace" && !confirm("Replace ALL existing products with this file?")) return;
        try {
          const r = await api("/products/import", { method: "POST", body: { csv: await file.text(), mode: f.get("mode") } });
          closeModal(); toast(r.added + " product(s) imported" + (r.newCategories ? ", " + r.newCategories + " new categor" + (r.newCategories > 1 ? "ies" : "y") : "")); route();
        } catch (ex) { toast(ex.message, true); }
      });
    });
  }

  // ---------- categories ----------
  async function categories() {
    const cats = await api("/categories");
    const div = (d) => d === "general" ? '<span class="pill pill-grey">General Medicine</span>' : '<span class="pill pill-teal">Neuro-Psychiatry</span>';
    view.innerHTML = header("Categories", "The therapeutic categories shown as filters on the Products page.", `<button class="btn-primary" id="addBtn"><i data-lucide="plus"></i>Add category</button>`) + `
      <div class="card table-wrap"><table class="data"><thead><tr><th>Name</th><th>Division</th><th>Products</th><th></th></tr></thead><tbody id="rows">
      ${cats.map((c) => `<tr><td class="font-semibold">${esc(c.name)}</td><td>${div(c.division)}</td><td>${c.products}</td>
        <td class="text-right whitespace-nowrap"><button class="icon-btn" data-edit="${c.id}"><i data-lucide="pencil"></i></button><button class="icon-btn danger" data-del="${c.id}"><i data-lucide="trash-2"></i></button></td></tr>`).join("")}
      </tbody></table></div>`;
    const form = (c) => openModal(c ? "Edit category" : "Add category", `
      <form id="cf" class="grid gap-4">
        <div><label class="field-label">Name *</label><input name="name" class="field" required value="${esc(c ? c.name : "")}" /></div>
        <div><label class="field-label">Division</label><select name="division" class="field"><option value="cns">Neuro-Psychiatry</option><option value="general" ${c && c.division === "general" ? "selected" : ""}>General Medicine</option></select></div>
        <div class="flex justify-end gap-2 pt-2"><button type="button" data-close class="btn-ghost">Cancel</button><button class="btn-primary">Save</button></div>
      </form>`, (body) => {
      $("#cf", body).addEventListener("submit", async (e) => {
        e.preventDefault(); const f = new FormData(e.target);
        try { await api(c ? "/categories/" + c.id : "/categories", { method: c ? "PUT" : "POST", body: { name: f.get("name"), division: f.get("division") } }); closeModal(); toast("Category saved"); route(); }
        catch (ex) { toast(ex.message, true); }
      });
    });
    $("#addBtn").addEventListener("click", () => form(null));
    $("#rows").addEventListener("click", async (e) => {
      const ed = e.target.closest("[data-edit]"), del = e.target.closest("[data-del]");
      if (ed) form(cats.find((c) => c.id == ed.dataset.edit));
      if (del) {
        const c = cats.find((x) => x.id == del.dataset.del);
        if (!confirmDelete("the category “" + c.name + "”")) return;
        try { await api("/categories/" + c.id, { method: "DELETE" }); toast("Category deleted"); route(); } catch (ex) { toast(ex.message, true); }
      }
    });
  }

  // ---------- blogs ----------
  async function blogs(id) {
    if (id) return blogEditor(id === "new" ? null : id);
    const rows = await api("/blogs");
    view.innerHTML = header("Blogs", "Articles shown on the Blogs page and the homepage.", `<a class="btn-primary" href="#blogs/new"><i data-lucide="plus"></i>Write a blog</a>`) + `
      <div class="card table-wrap"><table class="data"><thead><tr><th>Title</th><th>Category</th><th>Status</th><th>Date</th><th></th></tr></thead><tbody id="rows">
      ${rows.map((b) => `<tr><td class="font-semibold"><a href="#blogs/${b.id}" class="hover:text-teal">${esc(b.title)}</a></td><td><span class="pill pill-teal">${esc(b.category)}</span></td>
        <td>${b.status === "published" ? '<span class="pill pill-green">Published</span>' : '<span class="pill pill-amber">Draft</span>'}</td><td class="whitespace-nowrap">${fmtDate(b.published_at)}</td>
        <td class="text-right whitespace-nowrap">${b.status === "published" ? `<a class="icon-btn" href="/bloginside.html?slug=${encodeURIComponent(b.slug)}" target="_blank" title="View"><i data-lucide="external-link"></i></a>` : ""}
        <a class="icon-btn" href="#blogs/${b.id}" title="Edit"><i data-lucide="pencil"></i></a><button class="icon-btn danger" data-del="${b.id}" title="Delete"><i data-lucide="trash-2"></i></button></td></tr>`).join("")
        || `<tr><td colspan="5" class="text-center text-slate-400 py-10">No blogs yet.</td></tr>`}
      </tbody></table></div>`;
    $("#rows").addEventListener("click", async (e) => {
      const del = e.target.closest("[data-del]"); if (!del) return;
      const b = rows.find((x) => x.id == del.dataset.del);
      if (!confirmDelete("“" + b.title + "”")) return;
      try { await api("/blogs/" + b.id, { method: "DELETE" }); toast("Blog deleted"); route(); } catch (ex) { toast(ex.message, true); }
    });
  }
  async function uploadImage(file) {
    const fd = new FormData(); fd.append("image", file);
    return (await api("/uploads/image", { method: "POST", body: fd })).url;
  }
  async function blogEditor(id) {
    const b = id ? await api("/blogs/" + id) : { title: "", category: "Research", excerpt: "", content_html: "", cover_image: "", read_time: "", status: "draft", published_at: new Date().toISOString().slice(0, 10) };
    view.innerHTML = header(id ? "Edit blog" : "Write a blog", `<a href="#blogs" class="text-teal">← All blogs</a>`) + `
      <form id="bf" class="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div class="xl:col-span-8 card p-6 grid gap-5 content-start">
          <div><label class="field-label">Title *</label><input name="title" class="field text-lg" required value="${esc(b.title)}" /></div>
          <div><label class="field-label">Short summary (shown on the blog cards)</label><textarea name="excerpt" class="field" maxlength="600">${esc(b.excerpt)}</textarea></div>
          <div><label class="field-label">Article</label><div id="editor"></div></div>
        </div>
        <div class="xl:col-span-4 grid gap-5 content-start">
          <div class="card p-6 grid gap-4">
            <div><label class="field-label">Status</label><select name="status" class="field"><option value="draft">Draft (not on the website)</option><option value="published" ${b.status === "published" ? "selected" : ""}>Published</option></select></div>
            <div><label class="field-label">Publish date</label><input type="date" name="published_at" class="field" value="${esc(b.published_at || "")}" /></div>
            <div><label class="field-label">Category</label><input name="category" class="field" list="blogCats" value="${esc(b.category)}" />
              <datalist id="blogCats"><option>Research</option><option>Neuroscience</option><option>Sustainability</option></datalist></div>
            <div><label class="field-label">Reading time</label><input name="read_time" class="field" placeholder="e.g. 5 min read" value="${esc(b.read_time)}" /></div>
            <button class="btn-primary justify-center" id="saveBtn"><i data-lucide="save"></i>${id ? "Save changes" : "Save blog"}</button>
            ${id && b.status === "published" ? `<a class="btn-ghost justify-center" href="/bloginside.html?slug=${encodeURIComponent(b.slug)}" target="_blank"><i data-lucide="external-link"></i>View on website</a>` : ""}
          </div>
          <div class="card p-6 grid gap-3">
            <label class="field-label">Cover image</label>
            <div id="coverPreview" class="cover-preview" style="${b.cover_image ? `background-image:url('${esc(b.cover_image)}')` : ""}"></div>
            <input type="hidden" name="cover_image" value="${esc(b.cover_image)}" />
            <div class="flex gap-2"><label class="btn-ghost cursor-pointer"><i data-lucide="image-plus"></i>Upload<input type="file" accept="image/*" id="coverFile" class="hidden" /></label>
              <button type="button" class="btn-ghost" id="coverClear">Remove</button></div>
            <p class="text-xs text-slate-500">JPG, PNG or WEBP, up to 5 MB. Wide images (16:9) look best.</p>
          </div>
        </div>
      </form>`;
    const quill = new Quill("#editor", {
      theme: "snow",
      modules: { toolbar: { container: [[{ header: [2, 3, false] }], ["bold", "italic", "underline"], [{ list: "ordered" }, { list: "bullet" }], ["blockquote", "link", "image"], ["clean"]],
        handlers: { image: () => {
          const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*";
          inp.onchange = async () => {
            try { const url = await uploadImage(inp.files[0]); const r = quill.getSelection(true); quill.insertEmbed(r.index, "image", url); }
            catch (ex) { toast(ex.message, true); }
          };
          inp.click();
        } } } },
      placeholder: "Write the article here…",
    });
    quill.root.innerHTML = b.content_html || "";
    const form = $("#bf");
    $("#coverFile").addEventListener("change", async (e) => {
      try { const url = await uploadImage(e.target.files[0]); form.cover_image.value = url; $("#coverPreview").style.backgroundImage = `url('${url}')`; toast("Cover image uploaded"); }
      catch (ex) { toast(ex.message, true); }
    });
    $("#coverClear").addEventListener("click", () => { form.cover_image.value = ""; $("#coverPreview").style.backgroundImage = ""; });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = new FormData(form);
      const data = Object.fromEntries(f.entries());
      data.content_html = quill.root.innerHTML === "<p><br></p>" ? "" : quill.root.innerHTML;
      try {
        const r = await api(id ? "/blogs/" + id : "/blogs", { method: id ? "PUT" : "POST", body: data });
        toast(data.status === "published" ? "Blog saved and published" : "Blog saved as draft");
        if (!id) location.hash = "#blogs/" + r.id; else route();
      } catch (ex) { toast(ex.message, true); }
    });
  }

  // ---------- jobs ----------
  async function jobs() {
    const rows = await api("/jobs");
    view.innerHTML = header("Job openings", "Roles listed on the Careers page.", `<button class="btn-primary" id="addBtn"><i data-lucide="plus"></i>Add opening</button>`) + `
      <div class="grid gap-4" id="rows">
      ${rows.map((j) => `<div class="card p-6 flex flex-col md:flex-row gap-4 md:items-start">
        <div class="flex-1"><div class="flex flex-wrap items-center gap-3 mb-1"><h3 class="text-lg font-semibold">${esc(j.title)}</h3>${j.is_open ? '<span class="pill pill-green">Open</span>' : '<span class="pill pill-grey">Closed</span>'}</div>
          <p class="text-sm font-semibold text-teal mb-2">${esc(j.meta)}</p><p class="text-sm text-slate-600">${j.description_html || ""}</p>
          <p class="text-xs text-slate-400 mt-3">${j.applications} application(s)</p></div>
        <div class="flex gap-1 shrink-0"><button class="icon-btn" data-edit="${j.id}"><i data-lucide="pencil"></i></button><button class="icon-btn danger" data-del="${j.id}"><i data-lucide="trash-2"></i></button></div></div>`).join("")
        || `<p class="text-slate-400">No openings yet.</p>`}</div>`;
    const plain = (html) => { const d = document.createElement("div"); d.innerHTML = html || ""; d.querySelectorAll("strong,b").forEach((s) => s.replaceWith("**" + s.textContent + "**")); return d.textContent; };
    const toHtml = (text) => esc(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");
    const form = (j) => openModal(j ? "Edit opening" : "Add opening", `
      <form id="jf" class="grid gap-4">
        <div><label class="field-label">Job title *</label><input name="title" class="field" required value="${esc(j ? j.title : "")}" /></div>
        <div><label class="field-label">Department · location</label><input name="meta" class="field" placeholder="e.g. Field sales · Across India" value="${esc(j ? j.meta : "")}" /></div>
        <div><label class="field-label">Description</label><textarea name="description" class="field" rows="7">${esc(j ? plain(j.description_html) : "")}</textarea>
          <p class="text-xs text-slate-500 mt-1">Wrap words in **double asterisks** to make them bold.</p></div>
        <label class="flex items-center gap-3 text-sm"><input type="checkbox" name="is_open" class="w-4 h-4 accent-[#0493BB]" ${!j || j.is_open ? "checked" : ""}/> Open (shown on the Careers page)</label>
        <div class="flex justify-end gap-2 pt-2"><button type="button" data-close class="btn-ghost">Cancel</button><button class="btn-primary">Save</button></div>
      </form>`, (body) => {
      $("#jf", body).addEventListener("submit", async (e) => {
        e.preventDefault(); const f = new FormData(e.target);
        const data = { title: f.get("title"), meta: f.get("meta"), description_html: toHtml(f.get("description")), is_open: f.get("is_open") ? 1 : 0 };
        try { await api(j ? "/jobs/" + j.id : "/jobs", { method: j ? "PUT" : "POST", body: data }); closeModal(); toast("Opening saved"); route(); }
        catch (ex) { toast(ex.message, true); }
      });
    });
    $("#addBtn").addEventListener("click", () => form(null));
    $("#rows").addEventListener("click", async (e) => {
      const ed = e.target.closest("[data-edit]"), del = e.target.closest("[data-del]");
      if (ed) form(rows.find((j) => j.id == ed.dataset.edit));
      if (del) {
        const j = rows.find((x) => x.id == del.dataset.del);
        if (!confirmDelete("the opening “" + j.title + "”")) return;
        try { await api("/jobs/" + j.id, { method: "DELETE" }); toast("Opening deleted"); route(); } catch (ex) { toast(ex.message, true); }
      }
    });
  }

  // ---------- applications ----------
  const APP = { new: ["New", "pill-teal"], reviewed: ["Reviewed", "pill-grey"], shortlisted: ["Shortlisted", "pill-green"], rejected: ["Rejected", "pill-red"] };
  async function applications(status) {
    const rows = await api("/applications" + (status ? "?status=" + status : ""));
    const tabs = ["", "new", "reviewed", "shortlisted", "rejected"].map((s) => `<a href="#applications${s ? "/" + s : ""}" class="${(status || "") === s ? "btn-primary" : "btn-ghost"}">${s ? APP[s][0] : "All"}</a>`).join("");
    view.innerHTML = header("Applications", "Job applications sent from the Careers page.", tabs) + `
      <div class="grid gap-4" id="rows">
      ${rows.map((a) => `<div class="card p-6">
        <div class="flex flex-col md:flex-row md:items-start gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-3"><h3 class="text-lg font-semibold">${esc(a.name)}</h3><span class="pill ${APP[a.status][1]}">${APP[a.status][0]}</span></div>
            <p class="text-sm text-slate-600 mt-1"><a class="text-teal" href="mailto:${esc(a.email)}">${esc(a.email)}</a> · ${esc(a.position)} · ${fmtDateTime(a.created_at)}</p>
            ${a.cover_letter ? `<p class="text-sm text-slate-600 mt-3 whitespace-pre-line">${esc(a.cover_letter)}</p>` : ""}
          </div>
          <div class="flex items-center gap-2 shrink-0">
            ${a.resume_file ? `<a class="btn-ghost" href="/api/admin/applications/${a.id}/resume"><i data-lucide="download"></i>Resume</a>` : ""}
            <select class="status-select" data-status="${a.id}">${Object.keys(APP).map((s) => `<option value="${s}" ${a.status === s ? "selected" : ""}>${APP[s][0]}</option>`).join("")}</select>
            <button class="icon-btn danger" data-del="${a.id}"><i data-lucide="trash-2"></i></button>
          </div>
        </div></div>`).join("") || `<p class="text-slate-400">No applications here.</p>`}</div>`;
    $("#rows").addEventListener("change", async (e) => {
      const s = e.target.closest("[data-status]"); if (!s) return;
      try { await api("/applications/" + s.dataset.status, { method: "PUT", body: { status: s.value } }); toast("Status updated"); route(); } catch (ex) { toast(ex.message, true); }
    });
    $("#rows").addEventListener("click", async (e) => {
      const del = e.target.closest("[data-del]"); if (!del) return;
      if (!confirmDelete("this application and its resume")) return;
      try { await api("/applications/" + del.dataset.del, { method: "DELETE" }); toast("Application deleted"); route(); } catch (ex) { toast(ex.message, true); }
    });
  }

  // ---------- contact messages ----------
  const MSG = { new: ["New", "pill-teal"], read: ["Read", "pill-grey"], handled: ["Handled", "pill-green"] };
  async function messages(status) {
    const rows = await api("/messages" + (status ? "?status=" + status : ""));
    const tabs = ["", "new", "read", "handled"].map((s) => `<a href="#messages${s ? "/" + s : ""}" class="${(status || "") === s ? "btn-primary" : "btn-ghost"}">${s ? MSG[s][0] : "All"}</a>`).join("")
      + `<a class="btn-ghost" href="/api/admin/messages/export.csv"><i data-lucide="download"></i>Export CSV</a>`;
    view.innerHTML = header("Messages", "Sent from the Contact page form.", tabs) + `
      <div class="grid gap-4" id="rows">
      ${rows.map((m) => `<div class="card p-6">
        <div class="flex flex-col md:flex-row md:items-start gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-3"><h3 class="text-lg font-semibold">${esc(m.subject || "(no subject)")}</h3><span class="pill ${MSG[m.status][1]}">${MSG[m.status][0]}</span></div>
            <p class="text-sm text-slate-600 mt-1">${esc(m.full_name)} · <a class="text-teal" href="mailto:${esc(m.email)}">${esc(m.email)}</a> · <a class="text-teal" href="tel:${esc(m.mobile)}">${esc(m.mobile)}</a>${m.city_state ? " · " + esc(m.city_state) : ""} · ${fmtDateTime(m.created_at)}</p>
            <p class="text-sm text-slate-700 mt-3 whitespace-pre-line">${esc(m.message)}</p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <select class="status-select" data-status="${m.id}">${Object.keys(MSG).map((s) => `<option value="${s}" ${m.status === s ? "selected" : ""}>${MSG[s][0]}</option>`).join("")}</select>
            <button class="icon-btn danger" data-del="${m.id}"><i data-lucide="trash-2"></i></button>
          </div>
        </div></div>`).join("") || `<p class="text-slate-400">No messages here.</p>`}</div>`;
    $("#rows").addEventListener("change", async (e) => {
      const s = e.target.closest("[data-status]"); if (!s) return;
      try { await api("/messages/" + s.dataset.status, { method: "PUT", body: { status: s.value } }); toast("Status updated"); route(); } catch (ex) { toast(ex.message, true); }
    });
    $("#rows").addEventListener("click", async (e) => {
      const del = e.target.closest("[data-del]"); if (!del) return;
      if (!confirmDelete("this message")) return;
      try { await api("/messages/" + del.dataset.del, { method: "DELETE" }); toast("Message deleted"); route(); } catch (ex) { toast(ex.message, true); }
    });
  }

  // ---------- start ----------
  api("/me").then((r) => showApp(r.email)).catch(showLogin);
  icons();
})();
