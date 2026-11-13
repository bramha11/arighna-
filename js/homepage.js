document.addEventListener("DOMContentLoaded", () => {
  // Ensure Hero Video Autoplay
  const video = document.getElementById("heroVideo");
  if (video) {
    video.muted = true;
    video.play().catch((error) => console.warn("Autoplay prevented:", error));
  }

  // ==========================================
  // HERO EXPAND ON SCROLL
  // 1st scroll: the hero is pinned while its rounded video card grows to the
  //             full screen (margins → 0, radius → 0, height → 100vh).
  // 2nd scroll: once fully expanded, the navbar turns white (js/navbar.js
  //             listens for the "arighna:hero" event fired here).
  // Created first so later ScrollTriggers account for the pin spacing.
  // ==========================================
  gsap.registerPlugin(ScrollTrigger);
  const heroPin = document.getElementById("hero-pin");
  const heroCard = document.querySelector(".hero-wrapper");
  const heroSection = document.getElementById("hero");
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const announceHero = (expanded) =>
    window.dispatchEvent(new CustomEvent("arighna:hero", { detail: { expanded } }));

  // The inset rounded card + expand-on-scroll is a desktop effect only; on
  // phones / tablets the hero is full-bleed (css/responsive.css) with no frame.
  // gsap.matchMedia builds it when the screen is desktop-sized and removes it
  // (frame, pin, inline styles) the moment the screen gets smaller, so it is
  // always right even when the window is resized or rotated without a reload.
  if (heroPin && heroCard && heroSection && !reduceMotion) {
    gsap.matchMedia().add("(min-width: 1024px)", () => {
      const INSET = 20;

      // The card is laid out full-screen once and never animated. The "inset
      // rounded card" look comes from a page-coloured FRAME laid over it: a
      // rounded box whose huge box-shadow paints the 20px margin. Expanding =
      // scaling that frame outward until its edges and corners leave the screen.
      // Only `transform` changes, so the GPU composites it with no repaint of
      // the playing video, which keeps it buttery smooth.
      gsap.set(heroCard, { width: "100%", marginTop: 0, borderRadius: 0, minHeight: "100vh" });
      gsap.set(heroSection, { minHeight: "100vh" });
      gsap.set(heroPin, { position: "relative" });

      const pageBg = getComputedStyle(document.body).backgroundColor || "#fff";
      const frameClip = document.createElement("div");   // keeps the shadow inside the hero
      frameClip.className = "hero-frame";
      frameClip.setAttribute("aria-hidden", "true");
      frameClip.style.cssText = "position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:40;";
      const frame = document.createElement("div");
      frame.style.cssText =
        `position:absolute;inset:${INSET}px;border-radius:40px;` +
        `box-shadow:0 0 0 ${INSET * 6}px ${pageBg};will-change:transform;`;
      frameClip.appendChild(frame);
      heroPin.appendChild(frameClip);

      // scale needed so the frame's inner edge (incl. its rounded corners) sits
      // fully outside the screen: overshoot ≥ r·(1 − 1/√2) ≈ 12px per side
      const OVER = 16;
      const fullScaleX = () => (heroPin.offsetWidth + OVER * 2) / (heroPin.offsetWidth - INSET * 2);
      const fullScaleY = () => (heroPin.offsetHeight + OVER * 2) / (heroPin.offsetHeight - INSET * 2);

      // Hold the hero in place briefly while it opens up.
      ScrollTrigger.create({
        trigger: heroPin,
        start: "top top",
        end: "+=30%",
        pin: true,
        pinSpacing: true, // <body> is display:flex, where ScrollTrigger would otherwise default this to false
                          // and the next section would slide up over the pinned hero
        invalidateOnRefresh: true
      });

      // The expansion is TIME-based (not scrubbed): the first bit of scrolling
      // plays one smooth, eased tween, so it never stutters with coarse
      // mouse-wheel steps or stops halfway.
      const expandTl = gsap.timeline({ paused: true, defaults: { duration: 1.1, ease: "expo.inOut" } });
      expandTl.fromTo(frame,
        { scaleX: 1, scaleY: 1 },
        { scaleX: fullScaleX, scaleY: fullScaleY, force3D: true, immediateRender: false }, 0);
      if (video) expandTl.fromTo(video, { scale: 1.06 }, { scale: 1, force3D: true }, 0); // gentle settle as it opens up
      // re-measure on resize (keeps current progress)
      const remeasure = () => { const pr = expandTl.progress(); expandTl.invalidate().progress(pr); };
      ScrollTrigger.addEventListener("refresh", remeasure);

      ScrollTrigger.create({
        start: 2,
        end: "max",
        onEnter: () => expandTl.timeScale(1).play(),
        onLeaveBack: () => expandTl.timeScale(1.4).reverse() // back at the very top → card shrinks back
      });
      if (window.scrollY > 2) expandTl.progress(1); // page opened mid-scroll (reload / anchor)

      // leaving desktop size: take the frame away (GSAP reverts the rest)
      return () => {
        ScrollTrigger.removeEventListener("refresh", remeasure);
        frameClip.remove();
        if (video) gsap.set(video, { clearProps: "transform" });
      };
    });
  }

  if (heroPin && heroCard && heroSection && !reduceMotion) {
    // Navbar: stays transparent through the first scroll (on desktop, the
    // expansion), and turns white on the next one.
    ScrollTrigger.create({
      start: 160,
      end: "max",
      onEnter: () => announceHero(true),
      onLeaveBack: () => announceHero(false)
    });
    if (window.scrollY > 160) announceHero(true);
  }

  // ==========================================
  // WHY CHOOSE US: 5 DICE
  // Each card becomes a real 6-sided cube (number / photo on alternating
  // faces). It tumbles like a die onto its number, rests, tumbles onto its
  // photo, rests… The dice are staggered and only roll while on screen.
  // ==========================================
  const diceSection = document.getElementById("cubes-section");
  const dice = gsap.utils.toArray("#cubes-section .cube-inner");

  if (diceSection && dice.length && !reduceMotion) {
    // face placement on the cube + the cube rotation that shows that face
    const FACES = [
      { face: "rotateY(0deg)",   rx: 0,   ry: 0,    kind: "stat"  }, // front
      { face: "rotateY(90deg)",  rx: 0,   ry: -90,  kind: "photo" }, // right
      { face: "rotateX(90deg)",  rx: -90, ry: 0,    kind: "stat"  }, // top
      { face: "rotateY(180deg)", rx: 0,   ry: -180, kind: "photo" }, // back
      { face: "rotateX(-90deg)", rx: 90,  ry: 0,    kind: "stat"  }, // bottom
      { face: "rotateY(-90deg)", rx: 0,   ry: 90,   kind: "photo" }  // left
    ];
    const ROLL = 1.15, HOLD = 2.2, STAGGER = 0.55;
    // nearest equivalent angle to `from` (so each roll is a single tumble, not a spin-around)
    const near = (from, base) => base + 360 * Math.round((from - base) / 360);

    const diceTls = [];

    dice.forEach((cube, i) => {
      const oldFaces = [...cube.querySelectorAll(":scope > .cube-face")];
      const statSrc = oldFaces.find((f) => !f.querySelector("img"));
      const photoSrc = oldFaces.find((f) => f.querySelector("img"));
      if (!statSrc || !photoSrc) return;
      const startIdx = oldFaces[0] === statSrc ? 0 : 1; // keep the card's current look at rest

      // build the 6 faces
      const faces = FACES.map((f) => {
        const el = (f.kind === "stat" ? statSrc : photoSrc).cloneNode(true);
        el.classList.remove("cube-face-front", "cube-face-back");
        el.setAttribute("aria-hidden", "true");
        return el;
      });
      oldFaces.forEach((f) => f.remove());
      faces.forEach((el) => cube.appendChild(el));
      faces[startIdx].removeAttribute("aria-hidden");

      // size-dependent depth (cube side = card width)
      const place = () => {
        const half = cube.offsetWidth / 2;
        faces.forEach((el, k) => { el.style.transform = `${FACES[k].face} translateZ(${half}px)`; });
        gsap.set(cube, { z: -half }); // pull back so the resting face sits flush with the grid
      };
      place();
      if (window.ResizeObserver) new ResizeObserver(place).observe(cube);

      gsap.set(cube, { rotationX: FACES[startIdx].rx, rotationY: FACES[startIdx].ry, transformOrigin: "50% 50%" });

      // one full cycle through all 6 faces; ends on an equivalent of the start
      // orientation, so repeat:-1 loops seamlessly
      const tl = gsap.timeline({ paused: true, repeat: -1, delay: i * STAGGER });
      let rx = FACES[startIdx].rx, ry = FACES[startIdx].ry;
      for (let s = 1; s <= FACES.length; s++) {
        const k = (startIdx + s) % FACES.length;
        rx = near(rx, FACES[k].rx);
        ry = near(ry, FACES[k].ry);
        const at = (s - 1) * (ROLL + HOLD) + HOLD;
        tl.to(cube, { rotationX: rx, rotationY: ry, duration: ROLL, ease: "power3.inOut" }, at)
          // die "lifts" off the table mid-roll, then lands with a small bounce
          .to(cube, { scale: 0.86, duration: ROLL * 0.45, ease: "power2.out" }, at)
          .to(cube, { scale: 1, duration: ROLL * 0.6, ease: "back.out(2.2)" }, at + ROLL * 0.45)
          .call(() => faces.forEach((el, n) => el.toggleAttribute("aria-hidden", n !== k)), null, at + ROLL);
      }
      diceTls.push(tl);
    });

    ScrollTrigger.create({
      trigger: diceSection,
      start: "top 85%",
      end: "bottom top",
      onToggle: (self) => diceTls.forEach((tl) => (self.isActive ? tl.play() : tl.pause()))
    });
  }

  // ==========================================
  // HERO LOAD ENTRANCE ANIMATION
  // ==========================================
  // waits for the intro loader (js/loader.js) to lift before playing
  const introPending = document.documentElement.classList.contains("is-loading") && !window.__arighnaLoaded;
  const heroTl = gsap.timeline({ defaults: { ease: "power3.out" }, paused: introPending });
  if (introPending) window.addEventListener("arighna:loaded", () => heroTl.play(), { once: true });

  heroTl
    .from(".hero-subheading", {
      y: 20,
      opacity: 0,
      duration: 0.6,
      delay: 0.2
    })
    .from(".hero-title", {
      y: 40,
      opacity: 0,
      duration: 0.9
    }, "-=0.3")
    .from(".hero-description", {
      y: 30,
      opacity: 0,
      duration: 0.7
    }, "-=0.5")
    .from(".hero-buttons", {
      y: 20,
      opacity: 0,
      duration: 0.6
    }, "-=0.4");

  // Hero CTA buttons: colours + rolling-text hover come from css/buttons.css
  // (.btn-roll), shared by every button on the site.


  // ==========================================
  // SECTION 3: ABOUT US (REVERTED TO UNPINNED AUTOMATIC ROLLOVER)
  // ==========================================
  gsap.registerPlugin(ScrollTrigger);

  const aboutSection = document.querySelector("#about");
  const leftCol = document.querySelector("#about-left-col");
  const textItems = gsap.utils.toArray("#about-right-col .about-text-item");
  const stackedCards = document.querySelectorAll(".about-card");
  const progressBar = document.getElementById("aboutProgressBar");

  if (aboutSection && stackedCards.length && progressBar) {
    let currentIndex = 0;
    const CARD_DURATION = 3.5;
    let isTransitioning = false;

    // Initial entrance states
    if (leftCol) gsap.set(leftCol, { opacity: 0, y: 40 });
    if (textItems.length) gsap.set(textItems, { opacity: 0, y: 40 });

    // Initial 3D positions for cards
    stackedCards.forEach((card, idx) => {
      if (idx === 0) {
        gsap.set(card, { opacity: 1, y: 0, rotationX: 0, filter: "blur(0px)", pointerEvents: "auto" });
      } else {
        gsap.set(card, { opacity: 0, y: 25, rotationX: -15, filter: "blur(8px)", pointerEvents: "none" });
      }
    });

    // 1. SCROLLTRIGGER ENTRANCE REVEAL
    const aboutEntranceTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: aboutSection,
        start: "top 75%",
        toggleActions: "play none none reverse",
        invalidateOnRefresh: true
      }
    });

    if (leftCol) {
      aboutEntranceTimeline.to(leftCol, {
        opacity: 1,
        y: 0,
        duration: 1.0,
        ease: "power3.out"
      }, 0);
    }

    if (textItems.length) {
      textItems.forEach((textItem, idx) => {
        aboutEntranceTimeline.to(
          textItem,
          {
            opacity: 1,
            y: 0,
            duration: 1.2,
            ease: "power3.out"
          },
          idx * 0.25
        );
      });
    }

    // 2. AUTOMATIC CARD SWAP TRANSITION
    function transitionToNextCard(nextIndex) {
      if (isTransitioning) return;
      isTransitioning = true;

      const currentCard = stackedCards[currentIndex];
      const nextCard = stackedCards[nextIndex];
      const nextCounterEl = nextCard.querySelector(".card-counter");
      const targetVal = parseInt(nextCard.getAttribute("data-target"), 10) || 0;

      const swapTl = gsap.timeline({
        onComplete: () => {
          currentIndex = nextIndex;
          isTransitioning = false;
        }
      });

      swapTl.to(currentCard, {
        opacity: 0,
        y: -30,
        rotationX: 20,
        filter: "blur(10px)",
        duration: 0.65,
        ease: "power3.inOut",
        onComplete: () => gsap.set(currentCard, { pointerEvents: "none" })
      });

      swapTl.fromTo(
        nextCard,
        {
          opacity: 0,
          y: 25,
          rotationX: -15,
          filter: "blur(8px)",
          pointerEvents: "auto"
        },
        {
          opacity: 1,
          y: 0,
          rotationX: 0,
          filter: "blur(0px)",
          duration: 0.75,
          ease: "power3.out"
        },
        "-=0.45"
      );

      if (nextCounterEl) {
        swapTl.fromTo(
          nextCounterEl,
          { innerText: 0 },
          {
            innerText: targetVal,
            duration: 1,
            ease: "power2.out",
            snap: { innerText: 1 }
          },
          "-=0.6"
        );
      }
    }

    // 3. CONTINUOUS PROGRESS TRAIN LOOP
    const masterSequence = gsap.timeline({ paused: true, repeat: -1 });

    stackedCards.forEach((_, idx) => {
      const nextIdx = (idx + 1) % stackedCards.length;

      masterSequence.to(progressBar, {
        width: `${((idx + 1) / stackedCards.length) * 100}%`,
        duration: CARD_DURATION,
        ease: "none",
        onComplete: () => {
          if (idx === stackedCards.length - 1) {
            gsap.set(progressBar, { width: "0%" });
          }
          transitionToNextCard(nextIdx);
        }
      });
    });

    ScrollTrigger.create({
      trigger: aboutSection,
      start: "top 75%",
      end: "bottom 20%",
      onEnter: () => masterSequence.play(),
      onLeave: () => masterSequence.pause(),
      onEnterBack: () => masterSequence.play(),
      onLeaveBack: () => masterSequence.pause()
    });
  }

  // ==========================================
  // APPROACH IMAGE TRACK: ENDLESS LOOP, STEERED BY THE CURSOR
  // The cards are duplicated once so the track can wrap around seamlessly.
  // Cursor in the left zone  → the track moves right
  // Cursor in the right zone → the track moves left
  // Cursor in the middle     → nothing moves, no arrow
  // The further into a side zone, the faster it moves. A teal arrow follows
  // the cursor while it is in a side zone. Touch screens keep native swipe.
  // ==========================================
  const trackWrap = document.getElementById("approach-cards-wrapper");
  const trackScroller = document.getElementById("approach-scroll-container");
  const trackGrid = document.getElementById("approach-cards-grid");
  const arrowLeft = document.getElementById("cursor-left");
  const arrowRight = document.getElementById("cursor-right");
  const finePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (trackWrap && trackScroller && trackGrid && arrowLeft && arrowRight) {
    // duplicate the set once → [set A][set B]; wrapping by one set width is invisible
    const originals = Array.from(trackGrid.children);
    originals.forEach((card) => card.setAttribute("data-anim", "none")); // replaces the generic fade-in reveal
    originals.forEach((card) => {
      const clone = card.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      clone.setAttribute("data-anim", "none");
      trackGrid.appendChild(clone);
    });
    const firstClone = trackGrid.children[originals.length];
    const setWidth = () => firstClone.offsetLeft - originals[0].offsetLeft;
    let offset = 0;
    const render = () => {
      const w = setWidth();
      if (!w) return;
      offset = ((offset % w) + w) % w; // wrap within one set → endless loop
      trackGrid.style.transform = "translate3d(" + (-offset) + "px,0,0)";
    };

    if (finePointer) {
      const SIDE = 0.35;     // each side zone = 35% of the width; middle 30% is still
      const MAX_SPEED = 14;  // px per frame at the very edge
      let target = 0, speed = 0, inside = false;

      const showArrow = (el, on) => { el.style.opacity = on ? "1" : "0"; };
      const moveArrows = (x, y) => {
        [arrowLeft, arrowRight].forEach((a) => { a.style.left = x + "px"; a.style.top = y + "px"; });
      };

      trackWrap.addEventListener("mousemove", (e) => {
        const r = trackWrap.getBoundingClientRect();
        const t = (e.clientX - r.left) / r.width; // 0 = left edge, 1 = right edge
        moveArrows(e.clientX, e.clientY);
        if (t < SIDE) {
          target = -MAX_SPEED * (1 - t / SIDE);            // track moves right
          showArrow(arrowLeft, true); showArrow(arrowRight, false);
        } else if (t > 1 - SIDE) {
          target = MAX_SPEED * ((t - (1 - SIDE)) / SIDE);  // track moves left
          showArrow(arrowRight, true); showArrow(arrowLeft, false);
        } else {
          target = 0;
          showArrow(arrowLeft, false); showArrow(arrowRight, false);
        }
        trackWrap.style.cursor = target === 0 ? "default" : "none";
      });
      trackWrap.addEventListener("mouseenter", () => { inside = true; });
      trackWrap.addEventListener("mouseleave", () => {
        inside = false; target = 0;
        showArrow(arrowLeft, false); showArrow(arrowRight, false);
        trackWrap.style.cursor = "default";
      });

      // smooth start / stop; offset wraps within one set width → endless loop
      gsap.ticker.add((time, delta) => {
        const k = Math.min(1, delta / 16.7);
        speed += ((inside ? target : 0) - speed) * 0.08 * k;
        if (Math.abs(speed) < 0.05) { speed = 0; return; }
        offset += speed * k;
        render();
      });
    }

    // Scroll-in: as the section comes into view the track glides a little to
    // the left, then eases to a stop. Replays each time you scroll down to it.
    if (!reduceMotion) {
      const GLIDE = 280; // px
      ScrollTrigger.create({
        trigger: trackWrap,
        start: "top 85%",
        onEnter: () => {
          if (finePointer) {
            const o = { v: offset };
            gsap.to(o, { v: offset + GLIDE, duration: 2.2, ease: "power2.out", overwrite: true,
              onUpdate: () => { offset = o.v; render(); } });
          } else {
            // touch: native swipe track, so nudge its scroll position instead
            gsap.to(trackScroller, { scrollLeft: trackScroller.scrollLeft + GLIDE * 0.5, duration: 2, ease: "power2.out", overwrite: true });
          }
        }
      });
    }
  }
});
