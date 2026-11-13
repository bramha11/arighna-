// Register GSAP Plugins
gsap.registerPlugin(ScrollTrigger);

document.addEventListener("DOMContentLoaded", () => {
  // Initialize Lucide Icons
  if (window.lucide) {
    lucide.createIcons();
  }

  // Navbar behaviour (button rollover, scroll colour/padding change) now lives
  // in js/navbar.js, which every page loads, so all navbars behave the same.
});
