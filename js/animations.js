/* =====================================================================
   ARIGHNA PHARMA — SITE-WIDE GSAP ANIMATIONS
   ---------------------------------------------------------------------
   • Hero section  → plays once on page load (no scroll trigger).
   • Every other section + footer → elements reveal as they scroll into
     view and softly fade out as they leave (both directions).

   Elements are picked up automatically, by type:
     heading  (h1/h2)          blur + rise
     text     (p, h3, lists…)  rise
     pop      (pills, buttons) small rise + scale
     card     (bg + border + rounded + padding boxes)   rise, staggered
     media    (images / image boxes / svg maps)         rise + zoom settle
     block    (things with their own 3D transforms)     rise only

   Opt-outs (already animated elsewhere, or saved for special interactions):
   anything matching SKIP below, or any element with  data-anim="none".
   Force a type on an element with  data-anim="heading|text|pop|card|media|block".

   Load in <head> with `defer`, after GSAP + ScrollTrigger.
   ===================================================================== */
(function () {
  "use strict";

  if (!window.gsap || !window.ScrollTrigger) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  /* ------------------------------------------------------------------
     CONFIG
     ------------------------------------------------------------------ */

  // Never animated by this file
  var SKIP = [
    "header.navbar", ".mnav-panel",
    "#hero", "#about",                       // home: hero + stats block have their own GSAP (js/homepage.js)
    ".carousel-item",                        // beyond-business: 3D slider cards (own engine)
    ".ms-row", "#river-svg", ".vision-bottom", // beyond-business: vision timeline (own engine)
    "#cursor-left", "#cursor-right",         // home: custom cursors
    "script", "style", "template", "br",
    "[data-anim='none']"
  ].join(",");

  // Elements recognised by selector before the generic rules
  var FORCED = [
    [".faq-item", "card"],
    [".cube-perspective", "media"],
    [".approach-card", "media"],
    ["#carousel-stage", "block"],
    ["[id^='cta-float-']", "pop"],
    ["[id^='blog-'][id$='-btn']", "pop"]
  ];

  // Hidden ("from") state for each type
  var FROM = {
    heading: { opacity: 0, y: 44, filter: "blur(8px)" },
    text:    { opacity: 0, y: 26 },
    pop:     { opacity: 0, y: 18, scale: 0.94 },
    card:    { opacity: 0, y: 54 },
    media:   { opacity: 0, y: 60, scale: 0.96 },
    block:   { opacity: 0, y: 48 }
  };
  // Visible state (shared)
  var SHOWN = { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" };
  // State when an element scrolls out of the TOP of the screen
  var GONE_UP = {
    heading: { opacity: 0, y: -30, filter: "blur(6px)" },
    text:    { opacity: 0, y: -20 },
    pop:     { opacity: 0, y: -14, scale: 0.97 },
    card:    { opacity: 0, y: -36 },
    media:   { opacity: 0, y: -40, scale: 0.98 },
    block:   { opacity: 0, y: -36 }
  };

  var INLINE_TAGS = /^(SPAN|STRONG|EM|B|I|SMALL|BR|SUP|SUB|MARK|ABBR|CODE|TIME)$/;

  /* ------------------------------------------------------------------
     HELPERS
     ------------------------------------------------------------------ */
  function cls(el) {
    return typeof el.className === "string" ? el.className : (el.getAttribute("class") || "");
  }
  function isHidden(el) {
    var cs = getComputedStyle(el);
    return cs.display === "none" || cs.visibility === "hidden";
  }
  function isDecorative(el) {
    var c = cls(el);
    return /(^|\s)absolute(\s|$)/.test(c) && /pointer-events-none/.test(c) && !el.textContent.trim();
  }
  function hasOnlyInlineChildren(el) {
    for (var i = 0; i < el.children.length; i++) {
      if (!INLINE_TAGS.test(el.children[i].tagName)) return false;
    }
    return true;
  }
  function isCard(el) {
    var c = cls(el);
    return /rounded/.test(c) &&
      /(^|\s)(bg-(?!transparent)\S+|border(\s|$)|border-\S+)/.test(c) &&
      (/(^|\s)(p|px|py)-(\d|\[)/.test(c) || /overflow-hidden/.test(c)) &&
      el.children.length > 0;
  }
  function isMediaBox(el) {
    var c = cls(el);
    if (!/rounded/.test(c)) return false;
    if (/overflow-hidden/.test(c) && el.querySelector("img") && el.children.length <= 3) return true;
    if (/bg-slate-(100|200)/.test(c) && !el.textContent.trim()) return true; // image placeholders
    return false;
  }

  function classify(el) {
    var forced = el.getAttribute("data-anim");
    if (forced && FROM[forced]) return forced;
    for (var i = 0; i < FORCED.length; i++) {
      if (el.matches(FORCED[i][0])) return FORCED[i][1];
    }
    var tag = el.tagName;
    if (tag === "H1" || tag === "H2") return "heading";
    if (/^(H[3-6]|P|UL|OL|BLOCKQUOTE|TABLE|LABEL|INPUT|TEXTAREA|SELECT)$/.test(tag)) return "text";
    if (/^(IMG|SVG|svg|VIDEO|SPLINE-VIEWER|CANVAS|IFRAME)$/.test(tag)) return "media";
    if (tag === "A" || tag === "BUTTON") return "pop";

    var c = cls(el);
    // Form field group: one label + one control
    if (el.querySelector("label") && el.querySelectorAll("input,textarea,select").length === 1) return "text";
    // Pill tags
    if (/inline-flex/.test(c) && /rounded-full/.test(c)) return "pop";
    if (isMediaBox(el)) return "media";
    if (isCard(el)) return "card";
    // Plain text containers (e.g. stat numbers, logo text)
    if (el.textContent.trim() && (el.children.length === 0 || hasOnlyInlineChildren(el))) return "text";
    return null;
  }

  function collect(root, out) {
    Array.prototype.forEach.call(root.children, function (el) {
      if (el.matches(SKIP) || isDecorative(el) || isHidden(el)) return;
      var kind = classify(el);
      if (kind) {
        out.push({ el: el, kind: kind });
      } else {
        collect(el, out);
      }
    });
  }

  // Tailwind `transition-all` on an element would fight GSAP's tween;
  // switch transitions off while GSAP animates, then restore them.
  function pauseCss(els) { els.forEach(function (el) { el.style.transition = "none"; }); }
  function resumeCss(els) { els.forEach(function (el) { el.style.transition = ""; }); }

  function kindOf(el) { return el._animKind; }
  // Per-element values for opacity / y / scale. `filter` (blur) is handled
  // separately and only on headings so Tailwind drop-shadow filters survive.
  function vals(map, extra) {
    var o = {};
    ["opacity", "y", "scale"].forEach(function (p) {
      o[p] = function (i, el) {
        var v = map[kindOf(el)] && map[kindOf(el)][p];
        return v === undefined ? SHOWN[p] : v;
      };
    });
    for (var k in extra) o[k] = extra[k];
    return o;
  }

  /* ------------------------------------------------------------------
     1. HERO — page-load animation only
     ------------------------------------------------------------------ */
  function leaves(list) {
    // keep only the innermost matches
    return list.filter(function (el) {
      return !list.some(function (o) { return o !== el && el.contains(o); });
    });
  }

  function heroIntro() {
    if (document.getElementById("hero")) return; // home hero animated by js/homepage.js

    var sections = document.querySelectorAll("body section");
    var hero = sections[0];
    if (!hero) return;
    var h1 = hero.querySelector("h1");
    if (!h1) return;

    var col = h1.parentElement;
    var textEls = Array.prototype.filter.call(col.children, function (el) {
      return !isHidden(el) && !isDecorative(el);
    });

    // Floating avatars (About hero) use a CSS float keyframe on `transform`,
    // so they are scaled through the separate CSS `scale` property instead.
    var avatars = Array.prototype.filter.call(hero.querySelectorAll("[class*='animate-float']"), function (el) {
      return !isHidden(el);
    });

    // Image / placeholder boxes in the hero's media column
    var media = leaves(Array.prototype.filter.call(hero.querySelectorAll(".grid > div > div"), function (el) {
      return !col.contains(el) && !isHidden(el);
    }));

    // Blog article: the big featured image directly below the header is part of the first screen
    var extra = [];
    if (sections[1] && !sections[1].querySelector("h2") && sections[1].getBoundingClientRect().top < window.innerHeight) {
      extra = Array.prototype.slice.call(sections[1].querySelectorAll("[class*='rounded-[']"), 0, 1);
    }

    var tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.15 });

    textEls.forEach(function (el, i) {
      var isH = el === h1;
      tl.from(el, {
        opacity: 0,
        y: isH ? 48 : 26,
        filter: isH ? "blur(10px)" : "blur(0px)",
        duration: isH ? 1.1 : 0.85,
        clearProps: "filter,transform,opacity"
      }, i === 0 ? 0 : "-=0.7");
    });

    if (media.length || extra.length) {
      var m = media.concat(extra);
      pauseCss(m);
      tl.from(m, {
        opacity: 0,
        y: 60,
        scale: 0.95,
        duration: 1.1,
        stagger: 0.12,
        clearProps: "transform,opacity",
        onComplete: function () { resumeCss(m); }
      }, 0.25);
    }

    if (avatars.length) {
      avatars.forEach(function (el, i) {
        var proxy = { s: 0.4, o: 0 };
        el.style.opacity = "0";
        el.style.scale = "0.4";
        tl.to(proxy, {
          s: 1, o: 1,
          duration: 0.9,
          ease: "back.out(1.6)",
          onUpdate: function () { el.style.scale = proxy.s; el.style.opacity = proxy.o; },
          onComplete: function () { el.style.scale = ""; el.style.opacity = ""; }
        }, 0.35 + i * 0.07);
      });
    }
  }

  /* ------------------------------------------------------------------
     2. SCROLL REVEALS — every non-hero section + footer
     ------------------------------------------------------------------ */
  function scrollReveals() {
    var roots = Array.prototype.slice.call(document.querySelectorAll("body section, .footer-wrapper"));
    var firstSection = document.querySelector("body section");

    var units = [];
    roots.forEach(function (root) {
      if (root.matches(SKIP)) return;
      if (!document.getElementById("hero") && root === firstSection) return; // hero = load-only
      if (root.closest(".hero-wrapper")) return;
      collect(root, units);
    });

    // Blog article featured image already played in the hero intro
    var s2 = document.querySelectorAll("body section")[1];
    if (s2 && !document.getElementById("hero") && !s2.querySelector("h2") && s2.getBoundingClientRect().top < window.innerHeight) {
      units = units.filter(function (u) { return !s2.contains(u.el); });
    }

    if (!units.length) return;

    var els = units.map(function (u) {
      u.el._animKind = u.kind;
      return u.el;
    });

    // Hidden start state
    units.forEach(function (u) { gsap.set(u.el, FROM[u.kind]); });

    // Inner image "zoom settle" for image boxes
    function innerImgs(batch) {
      var imgs = [];
      batch.forEach(function (el) {
        if (el._animKind === "media" && el.tagName !== "IMG") {
          var img = el.querySelector("img");
          if (img && /overflow-hidden/.test(cls(el)) && !el.matches(".cube-perspective")) imgs.push(img);
        }
      });
      return imgs;
    }

    function headings(batch) {
      return batch.filter(function (el) { return el._animKind === "heading"; });
    }

    function show(batch) {
      pauseCss(batch);
      gsap.to(batch, {
        opacity: 1, y: 0, scale: 1,
        duration: 1,
        ease: "power3.out",
        stagger: 0.09,
        overwrite: "auto",
        onComplete: function () { resumeCss(batch); }
      });
      var hs = headings(batch);
      if (hs.length) {
        gsap.to(hs, {
          filter: "blur(0px)", duration: 1, ease: "power3.out", stagger: 0.09, overwrite: "auto",
          onComplete: function () { gsap.set(hs, { clearProps: "filter" }); }
        });
      }
      var imgs = innerImgs(batch);
      if (imgs.length) {
        pauseCss(imgs);
        gsap.fromTo(imgs, { scale: 1.14 }, {
          scale: 1, duration: 1.4, ease: "power3.out", stagger: 0.09, overwrite: "auto",
          onComplete: function () { resumeCss(imgs); gsap.set(imgs, { clearProps: "transform" }); }
        });
      }
    }

    function hide(batch, map) {
      pauseCss(batch);
      gsap.to(batch, vals(map, {
        duration: 0.6,
        ease: "power2.inOut",
        stagger: 0.04,
        overwrite: "auto"
      }));
      var hs = headings(batch);
      if (hs.length) {
        gsap.to(hs, { filter: map.heading.filter, duration: 0.6, ease: "power2.inOut", overwrite: "auto" });
      }
    }

    ScrollTrigger.batch(els, {
      // clamp() on START keeps the reveal point inside the scrollable range, so
      // things at the very bottom of the page (footer bar) still reveal once you
      // reach the end. END is left unclamped: clamping it would make everything
      // near the bottom count as "scrolled past" and fade out.
      start: "clamp(top 90%)",
      end: "bottom 8%",
      interval: 0.12,
      batchMax: 8,
      onEnter: show,
      onEnterBack: show,
      onLeave: function (b) { hide(b, GONE_UP); },
      onLeaveBack: function (b) { hide(b, FROM); }
    });

    // Anything already on screen at load (e.g. the page was reloaded mid-scroll)
    ScrollTrigger.refresh();
  }

  /* ------------------------------------------------------------------
     3. KEEP TRIGGER POSITIONS ACCURATE
     Accordions, product filters and view switches change page height.
     ------------------------------------------------------------------ */
  var refreshTimer;
  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function () { ScrollTrigger.refresh(); }, 450);
  }

  /* ------------------------------------------------------------------
     4. FILTERED / RE-RENDERED GRIDS (Products, Blogs)
     When search or category filters rebuild a grid, the new cards get a
     quick staggered entrance instead of just popping in.
     ------------------------------------------------------------------ */
  var DYNAMIC = "#productGrid, #productCompact, #productGrouped, #blogGrid";
  function watchDynamicGrids() {
    var grids = document.querySelectorAll(DYNAMIC);
    if (!grids.length || !window.MutationObserver) return;
    var pending = [], timer;
    function flush() {
      var items = pending.filter(function (el) { return el.isConnected && !isHidden(el); });
      pending = [];
      if (!items.length) return;
      // only animate cards that are on screen right now; the rest appear normally
      var vh = window.innerHeight;
      items = items.filter(function (el) {
        var r = el.getBoundingClientRect();
        return r.top < vh && r.bottom > 0;
      });
      if (!items.length) return;
      pauseCss(items);
      gsap.fromTo(items, { opacity: 0, y: 24 }, {
        opacity: 1, y: 0, duration: 0.55, ease: "power3.out", stagger: 0.04, overwrite: "auto",
        onComplete: function () { resumeCss(items); gsap.set(items, { clearProps: "transform,opacity" }); }
      });
    }
    var mo = new MutationObserver(function (records) {
      records.forEach(function (r) {
        Array.prototype.forEach.call(r.addedNodes, function (n) {
          if (n.nodeType === 1) pending.push(n);
        });
      });
      clearTimeout(timer);
      timer = setTimeout(flush, 0);
    });
    Array.prototype.forEach.call(grids, function (g) { mo.observe(g, { childList: true }); });
  }

  /* ------------------------------------------------------------------
     BOOT
     ------------------------------------------------------------------ */
  // Hero runs right away so it starts with the first paint
  heroIntro();

  // Scroll reveals wait for DOMContentLoaded so content injected by the
  // pages' own scripts (product / blog grids) is included.
  // (A deferred script runs while readyState is already "interactive" but
  //  BEFORE DOMContentLoaded fires, so we listen for the event itself.)
  var booted = false;
  function boot() {
    if (booted) return;
    booted = true;
    scrollReveals();
    watchDynamicGrids();
    // Only clicks that can change page height (accordions, filters, view
    // toggles, mobile menu sub-lists) need trigger positions recalculated.
    document.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest("button")) scheduleRefresh();
    });
    document.addEventListener("input", scheduleRefresh);
    window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  }
  if (document.readyState === "complete") {
    boot();
  } else {
    document.addEventListener("DOMContentLoaded", boot);
    window.addEventListener("load", boot);
  }
})();
