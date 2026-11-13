/* =====================================================================
   ARIGHNA PHARMA — MOBILE / TABLET HELPERS
   ---------------------------------------------------------------------
   1. Mobile menu: builds a hamburger + dropdown panel from the page's
      existing desktop <nav>, so links stay in sync automatically.
   2. Home blog carousel arrows step through the cards (all screen sizes).
   3. Beyond Business world map opens centred on West Bengal on phones.
   Load with `defer` in <head>; styles live in css/responsive.css.
   Nothing here changes the desktop (>= 1024px) layout.
   ===================================================================== */
(function () {
  "use strict";

  var DESKTOP_MIN = 1024;

  var ICON_MENU =
    '<svg class="mnav-icon-open" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
    '<path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M4 12h16M4 17h16"/></svg>';
  var ICON_CLOSE =
    '<svg class="mnav-icon-close" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
    '<path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M18 6L6 18"/></svg>';
  var ICON_CHEVRON =
    '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
    '<path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg>';

  // The current page's desktop link is coloured with a plain `text-[#0493BB]`
  // (not just `hover:text-[#0493BB]`), so reuse that as the "active" marker.
  function isActive(el) {
    return /(^|\s)text-\[#0493BB\](\s|$)/.test(el.className);
  }

  function makeLink(src, extraClass) {
    var a = document.createElement("a");
    a.href = src.getAttribute("href");
    a.textContent = src.textContent.trim();
    a.className = "mnav-link" + (extraClass ? " " + extraClass : "");
    if (isActive(src)) a.className += " is-active";
    return a;
  }

  /* ------------------------------------------------------------------
     1. MOBILE MENU
     ------------------------------------------------------------------ */
  function buildMobileMenu() {
    var header = document.querySelector("header.navbar");
    if (!header || header.querySelector(".mnav-toggle")) return;

    var bar = header.firstElementChild;
    var logo = bar && bar.querySelector("a");
    var nav = bar && bar.querySelector("nav");
    var actions = nav && nav.nextElementSibling;
    if (!logo || !nav || !actions) return;

    // --- Panel ---
    var panel = document.createElement("div");
    panel.className = "mnav-panel";
    panel.id = "mobile-nav-panel";

    var subCount = 0;
    Array.prototype.forEach.call(nav.children, function (item) {
      if (item.tagName === "A") {
        panel.appendChild(makeLink(item));
        return;
      }

      var mainLink = item.querySelector(":scope > a");
      var dropdown = item.querySelector(":scope > div");
      if (!mainLink) return;

      var row = document.createElement("div");
      row.className = "mnav-row";
      row.appendChild(makeLink(mainLink));

      if (dropdown && dropdown.querySelector("a")) {
        subCount++;
        var subId = "mnav-sub-" + subCount;

        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "mnav-sub-toggle";
        btn.setAttribute("aria-expanded", "false");
        btn.setAttribute("aria-controls", subId);
        btn.setAttribute("aria-label", "Show " + mainLink.textContent.trim() + " links");
        btn.innerHTML = ICON_CHEVRON;
        row.appendChild(btn);

        var sub = document.createElement("div");
        sub.className = "mnav-sub";
        sub.id = subId;
        var inner = document.createElement("div");
        Array.prototype.forEach.call(dropdown.querySelectorAll("a"), function (a) {
          inner.appendChild(makeLink(a));
        });
        sub.appendChild(inner);

        btn.addEventListener("click", function () {
          var open = btn.getAttribute("aria-expanded") === "true";
          btn.setAttribute("aria-expanded", open ? "false" : "true");
          sub.classList.toggle("is-open", !open);
        });

        panel.appendChild(row);
        panel.appendChild(sub);
      } else {
        panel.appendChild(row);
      }
    });

    // Header pills (Log In / Contact) — shown inside the panel on phones
    var pills = actions.querySelectorAll("a");
    if (pills.length) {
      var actionRow = document.createElement("div");
      actionRow.className = "mnav-actions";
      Array.prototype.forEach.call(pills, function (p) {
        var label = p.querySelector(".btn-text");
        var a = document.createElement("a");
        a.href = p.getAttribute("href");
        a.className = "mnav-btn" + (p.getAttribute("aria-current") === "page" ? " is-active" : "");
        a.textContent = (label ? label.textContent : p.textContent).trim();
        actionRow.appendChild(a);
      });
      panel.appendChild(actionRow);
    }

    header.appendChild(panel);

    // --- Hamburger toggle ---
    // The wrapper carries `nav-element` + the logo's text colour so it follows
    // the same colour changes as the other navbar items (e.g. the homepage's
    // white-to-navy scroll animation in js/main.js).
    var colorMatch = logo.className.match(/(^|\s)(text-(?:white|\[#[0-9A-Fa-f]{3,8}\]))(?=\s|$)/);
    var wrap = document.createElement("div");
    wrap.className = "nav-element mnav-toggle-wrap" + (colorMatch ? " " + colorMatch[2] : "");

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "mnav-toggle";
    toggle.setAttribute("aria-label", "Open menu");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", panel.id);
    toggle.innerHTML = ICON_MENU + ICON_CLOSE;
    wrap.appendChild(toggle);
    actions.appendChild(wrap);

    function setOpen(open) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      panel.classList.toggle("is-open", open);
    }

    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      setOpen(!panel.classList.contains("is-open"));
    });

    // Close after choosing a link (also handles same-page #anchors)
    panel.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });

    document.addEventListener("click", function (e) {
      if (panel.classList.contains("is-open") && !header.contains(e.target)) setOpen(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && panel.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth >= DESKTOP_MIN && panel.classList.contains("is-open")) setOpen(false);
    });
  }

  /* ------------------------------------------------------------------
     2. HOME BLOG CAROUSEL ARROWS (all screen sizes)
     ------------------------------------------------------------------ */
  function setupBlogArrows() {
    var track = document.getElementById("blog-track");
    var prev = document.getElementById("blog-prev-btn");
    var next = document.getElementById("blog-next-btn");
    if (!track || !prev || !next) return;
    var mask = track.parentElement;

    // One card per click at every screen size. The mask is overflow:hidden on
    // desktop (swipeable on mobile), and programmatic scrolling works in both.
    function stepSize() {
      var card = track.querySelector("article");
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return card ? card.getBoundingClientRect().width + gap : mask.clientWidth;
    }
    function maxScroll() { return Math.max(0, mask.scrollWidth - mask.clientWidth); }
    function update() {
      prev.disabled = mask.scrollLeft <= 2;
      next.disabled = mask.scrollLeft >= maxScroll() - 2;
    }
    function step(dir) {
      var size = stepSize();
      var idx = Math.round(mask.scrollLeft / size) + dir;
      var target = Math.min(maxScroll(), Math.max(0, idx * size));
      mask.scrollTo({ left: target, behavior: "smooth" });
    }
    prev.addEventListener("click", function () { step(-1); });
    next.addEventListener("click", function () { step(1); });
    mask.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", function () {
      // keep cards aligned after the column count changes
      var size = stepSize();
      mask.scrollLeft = Math.min(maxScroll(), Math.round(mask.scrollLeft / size) * size);
      update();
    });
    update();
  }

  /* ------------------------------------------------------------------
     3. WORLD MAP — start centred on West Bengal on phones
     ------------------------------------------------------------------ */
  function centreWorldMap() {
    var svg = document.querySelector('#geographic-vision svg[viewBox="0 0 1200 600"]');
    if (!svg) return;
    var box = svg.parentElement;
    function centre() {
      if (box.scrollWidth <= box.clientWidth) return;
      var originX = (894.5 / 1200) * box.scrollWidth; // Kolkata beacon
      box.scrollLeft = Math.max(0, originX - box.clientWidth / 2);
    }
    centre();
    window.addEventListener("load", centre);
    // Re-centre whenever the map's box changes size (browser resize, device
    // rotation, DevTools device mode), not only on the first load.
    if (window.ResizeObserver) new ResizeObserver(centre).observe(box);
    else window.addEventListener("resize", centre);
  }

  function init() {
    buildMobileMenu();
    setupBlogArrows();
    centreWorldMap();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
