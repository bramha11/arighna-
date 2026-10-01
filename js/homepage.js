document.addEventListener("DOMContentLoaded", () => {
  // Ensure Hero Video Autoplay
  const video = document.getElementById("heroVideo");
  if (video) {
    video.muted = true;
    video.play().catch((error) => console.warn("Autoplay prevented:", error));
  }

  // ==========================================
  // HERO LOAD ENTRANCE ANIMATION
  // ==========================================
  const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });

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

  // ==========================================
  // HERO BUTTON TEXT ROLLOVER HOVER ANIMATIONS
  // ==========================================
  const setupTextRollover = (btnId) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;

    const btnTexts = btn.querySelectorAll(".btn-text");
    if (!btnTexts.length) return;

    const btnTL = gsap.timeline({ 
      paused: true, 
      defaults: { duration: 0.35, ease: "power2.inOut" } 
    });

    btnTL.to(btnTexts, { yPercent: -100 });

    btn.addEventListener("mouseenter", () => btnTL.play());
    btn.addEventListener("mouseleave", () => btnTL.reverse());
  };

  // Initialize rollover animations for Hero CTA buttons
  setupTextRollover("heroTalkBtn");
  setupTextRollover("heroWorkBtn");


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
});