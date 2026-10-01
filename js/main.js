// Register GSAP Plugins
gsap.registerPlugin(ScrollTrigger);

document.addEventListener("DOMContentLoaded", () => {
  // Initialize Lucide Icons
  if (window.lucide) {
    lucide.createIcons();
  }

  // ==========================================
  // NAVBAR BUTTON ROLLOVER ANIMATION
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

  // Initialize rollover animations for Navbar buttons
  setupTextRollover("navLoginBtn");
  setupTextRollover("navContactBtn");

  // ==========================================
  // NAVBAR SCROLL COLOR & PADDING TRANSITION
  // ==========================================
  const navbar = document.querySelector(".navbar");
  const navLinks = document.querySelectorAll(".nav-element:not(button)");
  const navButtons = document.querySelectorAll("header .nav-btn");

  ScrollTrigger.create({
    trigger: "body",
    start: "top -10px",
    onEnter: () => {
      // Solid White background & compact padding
      gsap.to(navbar, {
        backgroundColor: "#FFFFFF",
        paddingTop: "1.1rem",
        paddingBottom: "1.1rem",
        boxShadow: "0 10px 30px rgba(0, 42, 92, 0.08)",
        duration: 0.45,
        ease: "power2.out"
      });

      // Nav Links text turns dark brand navy (#002A5C)
      gsap.to(navLinks, {
        color: "#002A5C",
        duration: 0.35,
        ease: "power2.out"
      });

      // Header Buttons turn Teal (#0493BB) with White text
      gsap.to(navButtons, {
        backgroundColor: "#0493BB",
        color: "#FFFFFF",
        duration: 0.35,
        ease: "power2.out"
      });
    },
    onLeaveBack: () => {
      // Revert to Transparent header with top spacing
      gsap.to(navbar, {
        backgroundColor: "transparent",
        paddingTop: "3rem",
        paddingBottom: "2rem",
        boxShadow: "0 0 0 0 rgba(0, 0, 0, 0)",
        duration: 0.45,
        ease: "power2.out"
      });

      // Nav Links text reverts to white
      gsap.to(navLinks, {
        color: "#FFFFFF",
        duration: 0.35,
        ease: "power2.out"
      });

      // Header Buttons revert to white background with dark text
      gsap.to(navButtons, {
        backgroundColor: "#FFFFFF",
        color: "#002A5C",
        duration: 0.35,
        ease: "power2.out"
      });
    }
  });
});