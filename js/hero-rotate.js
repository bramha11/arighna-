/* =====================================================================
   ARIGHNA PHARMA — HERO IMAGE ROTATION + HERO COUNTERS
   ---------------------------------------------------------------------
   1. Rotation: a hero grid marked  data-hero-rotate  with four children
      marked  data-hero-slot="1..4"  moves its images one position along
      every few seconds, in a loop:
            1 → 2 → 3 → 4 → 1      (1 top-left, 2 top-right,
                                     3 bottom-right, 4 bottom-left)
      The slot boxes keep the layout (they have different heights); their
      content is lifted into absolutely positioned "tiles" that glide and
      resize between the slots, so each image takes the shape of the slot
      it lands in.
   2. Counters: any element with  data-count-to="500"  counts up from 0
      when the page loads (optional data-count-suffix="+" / "%").
   Load with `defer` after GSAP.
   ===================================================================== */
(function () {
  "use strict";
  if (!window.gsap) return;
  var gsap = window.gsap;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var STEP = 3.2;      // seconds each arrangement is held
  var MOVE = 1.1;      // seconds a move takes
  var START = 2.6;     // first move: after the page-load intro has finished

  /* ---------- 1. Hero image rotation ---------- */
  function setupRotation(grid) {
    var slots = [1, 2, 3, 4].map(function (n) { return grid.querySelector('[data-hero-slot="' + n + '"]'); });
    if (slots.some(function (s) { return !s; })) return;

    var tiles = null;      // created on the first move
    var pos = [0, 1, 2, 3]; // pos[i] = slot index tile i currently occupies
    var timer = null, inView = true;

    function rectOf(slot) {
      var g = grid.getBoundingClientRect(), r = slot.getBoundingClientRect();
      return { x: r.left - g.left, y: r.top - g.top, width: r.width, height: r.height };
    }

    function buildTiles() {
      if (getComputedStyle(grid).position === "static") grid.style.position = "relative";
      tiles = slots.map(function (slot) {
        var tile = document.createElement("div");
        tile.className = slot.className;                  // same look (radius, bg, border, overflow)
        tile.setAttribute("aria-hidden", slot.getAttribute("aria-hidden") || "false");
        while (slot.firstChild) tile.appendChild(slot.firstChild);
        tile.style.position = "absolute";
        tile.style.left = "0";
        tile.style.top = "0";
        tile.style.margin = "0";
        tile.style.willChange = "transform, width, height";
        grid.appendChild(tile);
        slot.style.visibility = "hidden";                 // keeps the layout, tile shows instead
        return tile;
      });
      place(false);
    }

    function place(animate) {
      tiles.forEach(function (tile, i) {
        var r = rectOf(slots[pos[i]]);
        var props = { x: r.x, y: r.y, width: r.width, height: r.height };
        if (animate) gsap.to(tile, Object.assign({ duration: MOVE, ease: "power3.inOut", overwrite: true }, props));
        else gsap.set(tile, props);
      });
    }

    function step() {
      if (!inView || document.hidden) return;
      if (!tiles) buildTiles();
      pos = pos.map(function (p) { return (p + 1) % 4; });
      place(true);
    }

    function start() {
      if (timer) return;
      timer = setInterval(step, STEP * 1000);
    }

    // keep tiles glued to their slots when the layout changes
    var onResize = function () { if (tiles) { tiles.forEach(function (t) { gsap.killTweensOf(t); }); place(false); } };
    if (window.ResizeObserver) new ResizeObserver(onResize).observe(grid);
    else window.addEventListener("resize", onResize);

    // only move while the hero is on screen
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) { inView = entries[0].isIntersecting; }).observe(grid);
    }

    setTimeout(function () { step(); start(); }, START * 1000);
  }

  /* ---------- 2. Hero counters ---------- */
  function setupCounter(el) {
    var to = parseFloat(el.getAttribute("data-count-to"));
    if (isNaN(to)) return;
    var suffix = el.getAttribute("data-count-suffix") || "";
    var dec = (String(to).split(".")[1] || "").length;
    var fmt = function (v) { return v.toFixed(dec) + suffix; };
    if (reduce) { el.textContent = fmt(to); return; }
    var o = { v: 0 };
    el.textContent = fmt(0);
    gsap.to(o, {
      v: to, duration: 2, delay: 0.6, ease: "power3.out",
      onUpdate: function () { el.textContent = fmt(o.v); }
    });
  }

  // counters start right away (the DOM is parsed when a deferred script runs);
  // the rotation waits for images to load so slot sizes are final
  document.querySelectorAll("[data-count-to]").forEach(setupCounter);
  function initRotation() {
    if (!reduce) document.querySelectorAll("[data-hero-rotate]").forEach(setupRotation);
  }
  if (document.readyState === "complete") initRotation();
  else window.addEventListener("load", initRotation);
})();
