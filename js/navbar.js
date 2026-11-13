/* =====================================================================
   ARIGHNA PHARMA — SHARED NAVBAR BEHAVIOUR (every page)
   ---------------------------------------------------------------------
   • Load:   logo, links and buttons drop in softly.
   • Buttons: styled by css/buttons.css (.btn-roll) like all site buttons.
   • Scroll: bar compacts and gains a shadow.
       home  (data-nav="home")  → transparent over the hero card, turns
                                  white with navy links + teal buttons
       light (data-nav="light") → already white; becomes solid white
   Load with `defer` AFTER js/responsive.js (which adds the mobile toggle).
   ===================================================================== */
(function () {
  "use strict";

  var header = document.querySelector("header.navbar");
  if (!header || !window.gsap) return;
  var gsap = window.gsap;
  var ST = window.ScrollTrigger;
  if (ST) gsap.registerPlugin(ST);

  var isHome = header.getAttribute("data-nav") === "home";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var bar = header.firstElementChild;
  var navLinks = header.querySelectorAll(".nav-element:not(button)");
  var navButtons = header.querySelectorAll(".nav-btn");

  /* ---------- 1. Buttons ----------
     Colours + rolling-text hover come from css/buttons.css (.btn-roll),
     the same as every other button on the site. On the homepage the bar
     starts over the dark hero card, so the buttons get .on-dark there. */
  function setOnDark(on) {
    Array.prototype.forEach.call(navButtons, function (b) { b.classList.toggle("on-dark", on); });
  }
  if (isHome) setOnDark(true);

  /* ---------- 2. Load intro ---------- */
  if (!reduce) {
    var items = [];
    Array.prototype.forEach.call(bar.children, function (el) {
      if (el.tagName === "NAV") items.push.apply(items, el.children);
      else if (el.querySelector(".nav-btn, .mnav-toggle-wrap")) items.push.apply(items, el.children);
      else items.push(el);
    });
    items = items.filter(function (el) { return getComputedStyle(el).display !== "none"; });
    var navIntro = gsap.from(items, {
      y: -14, opacity: 0, duration: 0.7, stagger: 0.06, ease: "power3.out", delay: 0.1,
      clearProps: "transform,opacity"
    });
    // homepage intro loader: play the navbar intro once the loader lifts
    if (document.documentElement.classList.contains("is-loading") && !window.__arighnaLoaded) {
      navIntro.pause(0);
      window.addEventListener("arighna:loaded", function () { navIntro.play(); }, { once: true });
    }
  }

  /* ---------- 3. Scroll state ---------- */
  var D = reduce ? 0 : 0.45;
  var TOP = { paddingTop: "3rem", paddingBottom: "2rem", boxShadow: "0 0 0 0 rgba(0, 42, 92, 0)" };
  var SCROLLED = { paddingTop: "1.1rem", paddingBottom: "1.1rem", boxShadow: "0 10px 30px rgba(0, 42, 92, 0.08)" };

  function scrolled() {
    header.classList.add("nav-solid");   // homepage: swaps the white logo for the colour one
    gsap.to(header, Object.assign({ backgroundColor: "#FFFFFF", duration: D, ease: "power2.out" }, SCROLLED));
    if (isHome) {
      gsap.to(navLinks, { color: "#002A5C", duration: D * 0.8, ease: "power2.out" });
      setOnDark(false);
    }
  }
  function atTop() {
    header.classList.remove("nav-solid");
    gsap.to(header, Object.assign({ backgroundColor: isHome ? "rgba(255, 255, 255, 0)" : "rgba(255, 255, 255, 0.8)", duration: D, ease: "power2.out" }, TOP));
    if (isHome) {
      gsap.to(navLinks, { color: "#FFFFFF", duration: D * 0.8, ease: "power2.out" });
      setOnDark(true);
    }
  }

  // Homepage with the expanding hero: js/homepage.js tells us when the hero
  // card has finished expanding, so the colour change happens on the 2nd scroll.
  var heroDriven = isHome && document.getElementById("hero-pin") && ST && !reduce;

  if (heroDriven) {
    window.addEventListener("arighna:hero", function (e) {
      if (e.detail && e.detail.expanded) scrolled(); else atTop();
    });
  } else if (ST) {
    ST.create({ start: 10, end: "max", onEnter: scrolled, onLeaveBack: atTop });
    if (window.scrollY > 10) scrolled(); // page opened mid-scroll (reload / anchor link)
  } else {
    var on = false;
    window.addEventListener("scroll", function () {
      var s = window.scrollY > 10;
      if (s !== on) { on = s; if (s) scrolled(); else atTop(); }
    }, { passive: true });
  }
})();
