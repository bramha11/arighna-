/* =====================================================================
   ARIGHNA PHARMA — HOMEPAGE INTRO LOADER (old logo → new logo)
   ---------------------------------------------------------------------
   Markup: #site-loader at the top of <body> in index.html (styles are
   inline next to it). Shown once per browser session; add ?intro to the
   URL to see it again. Fires "arighna:loaded" on window when the page is
   revealed, so the hero / navbar intros start after it.
     1. old logo eases in out of a soft blur, progress line starts
     2. old logo turns away edge-on, new logo turns in (card flip) with a
        soft teal ring pulsing out at the swap
     3. new logo holds, line completes
     4. the white screen lifts away like a curtain
   ===================================================================== */
(function () {
  "use strict";
  var root = document.documentElement;
  var loader = document.getElementById("site-loader");

  function finish() {
    root.classList.remove("is-loading");
    root.classList.add("loader-done");
    if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
    try { sessionStorage.setItem("arighnaIntroSeen", "1"); } catch (e) {}
    window.__arighnaLoaded = true;
    window.dispatchEvent(new Event("arighna:loaded"));
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }

  if (!loader || !root.classList.contains("is-loading")) { window.__arighnaLoaded = true; return; }
  if (!window.gsap) { finish(); return; }

  var gsap = window.gsap;
  var oldLogo = loader.querySelector(".sl-old");
  var newLogo = loader.querySelector(".sl-new");
  var ring = loader.querySelector(".sl-ring");
  var bar = loader.querySelector(".sl-bar span");
  var stage = loader.querySelector(".sl-stage");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // wait until both logos are ready (never longer than 2.5s)
  function ready(img) {
    return new Promise(function (res) {
      if (img.complete && img.naturalWidth) return res();
      img.addEventListener("load", res, { once: true });
      img.addEventListener("error", res, { once: true });
    });
  }
  // Start only once the page is parsed and actually painting: before that the
  // browser is busy building the page and the animation would play unseen.
  var domReady = new Promise(function (res) {
    if (document.readyState !== "loading") res();
    else document.addEventListener("DOMContentLoaded", res, { once: true });
  });
  domReady.then(function () {
    var timeout = new Promise(function (res) { setTimeout(res, 2500); });
    return Promise.race([Promise.all([ready(oldLogo), ready(newLogo)]), timeout]);
  }).then(function () {
    // two frames: make sure the first frame of the loader has been painted
    requestAnimationFrame(function () { requestAnimationFrame(play); });
  });

  function play() {
    if (reduce) {
      // simple cross-fade for visitors who prefer reduced motion
      gsap.timeline({ onComplete: finish })
        .to(oldLogo, { opacity: 1, duration: 0.3 })
        .to(oldLogo, { opacity: 0, duration: 0.3 }, "+=0.4")
        .to(newLogo, { opacity: 1, duration: 0.3 }, "<")
        .to(loader, { opacity: 0, duration: 0.4 }, "+=0.5");
      return;
    }

    gsap.set(newLogo, { rotationY: -90, opacity: 1, scale: 0.96 });
    gsap.set(oldLogo, { opacity: 0, scale: 0.86, filter: "blur(10px)" });

    var tl = gsap.timeline({ onComplete: finish });

    // 1. old logo in + progress line runs across the whole intro
    tl.to(oldLogo, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.9, ease: "power3.out" }, 0)
      .to(bar, { scaleX: 1, duration: 2.9, ease: "power1.inOut" }, 0.1)

    // 2. transformation: old turns away, new turns in
      .to(oldLogo, { rotationY: 90, scale: 0.92, duration: 0.45, ease: "power2.in" }, 1.5)
      .set(oldLogo, { opacity: 0 }, 1.95)
      .fromTo(ring, { scale: 0.4, opacity: 0.55 }, { scale: 2.6, opacity: 0, duration: 1.1, ease: "power2.out", immediateRender: false }, 1.9)
      .to(newLogo, { rotationY: 0, scale: 1, duration: 0.7, ease: "back.out(1.4)" }, 1.95)

    // 3. hold, then 4. curtain lifts to reveal the homepage
      .to(stage, { y: -24, opacity: 0, duration: 0.5, ease: "power2.in" }, 3.25)
      .to(bar.parentNode, { opacity: 0, duration: 0.3 }, 3.25)
      .to(loader, { clipPath: "inset(0% 0% 100% 0%)", duration: 0.9, ease: "power4.inOut" }, 3.45);
  }
})();
