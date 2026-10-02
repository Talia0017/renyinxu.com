// Add a class so CSS can progressively enhance the no-JavaScript layout.
document.documentElement.classList.add("js");

const header = document.querySelector("[data-header]");
const menuButton = document.querySelector(".menu-toggle");
const mobileMenu = document.querySelector(".mobile-menu");
const mobileLinks = [...mobileMenu.querySelectorAll("a")];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// ---------- Mobile navigation ----------
function setMenuOpen(isOpen, returnFocus = false) {
  menuButton.setAttribute("aria-expanded", String(isOpen));
  mobileMenu.classList.toggle("is-open", isOpen);
  header.classList.toggle("is-open", isOpen);
  document.body.classList.toggle("menu-open", isOpen);

  if (isOpen) {
    window.setTimeout(() => mobileLinks[0].focus(), 250);
  } else if (returnFocus) {
    menuButton.focus();
  }
}

menuButton.addEventListener("click", () => {
  setMenuOpen(menuButton.getAttribute("aria-expanded") !== "true");
});

mobileMenu.addEventListener("click", (event) => {
  if (event.target.closest("a")) setMenuOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
    setMenuOpen(false, true);
  }

  // Keep keyboard focus inside the open mobile menu.
  if (event.key === "Tab" && menuButton.getAttribute("aria-expanded") === "true") {
    const firstLink = mobileLinks[0];
    const lastLink = mobileLinks[mobileLinks.length - 1];
    if (event.shiftKey && document.activeElement === firstLink) {
      event.preventDefault();
      lastLink.focus();
    } else if (!event.shiftKey && document.activeElement === lastLink) {
      event.preventDefault();
      firstLink.focus();
    }
  }
});

window.matchMedia("(min-width: 901px)").addEventListener("change", (event) => {
  if (event.matches) setMenuOpen(false);
});

// ---------- Sticky header and active navigation ----------
function updateHeader() {
  header.classList.toggle("is-scrolled", window.scrollY > 16);
}
updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

const trackedSections = ["home", "projects", "contact"]
  .map((id) => document.getElementById(id))
  .filter(Boolean);

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    document.querySelectorAll("[data-section-link]").forEach((link) => {
      const isCurrent = link.dataset.sectionLink === entry.target.id;
      if (isCurrent) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  });
}, { rootMargin: "-35% 0px -55% 0px", threshold: 0 });

trackedSections.forEach((section) => sectionObserver.observe(section));

// ---------- Rotating role title ----------
const roles = [
  "an interaction designer",
  "a strategic UX thinker",
  "a front-end coder",
  "a visual storyteller"
];
const roleText = document.querySelector("#rotating-role");
let roleIndex = 0;

window.setInterval(() => {
  if (reducedMotion.matches || document.hidden) return;
  roleText.classList.add("is-changing");

  window.setTimeout(() => {
    roleIndex = (roleIndex + 1) % roles.length;
    roleText.textContent = roles[roleIndex];
    roleText.classList.remove("is-changing");
    roleText.classList.add("is-entering");
    requestAnimationFrame(() => requestAnimationFrame(() => roleText.classList.remove("is-entering")));
  }, 240);
}, 3400);

// ---------- Reveal selected elements when they enter the viewport ----------
const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("is-visible");
    observer.unobserve(entry.target);
  });
}, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

// ---------- Pinned horizontal story and subtle image movement ----------
const story = document.querySelector(".story");
const storyStage = document.querySelector(".story-stage");
const projectMedia = [...document.querySelectorAll(".project-media img")];
let ticking = false;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function updateScrollMotion() {
  const desktop = window.matchMedia("(min-width: 901px)").matches;

  if (desktop && !reducedMotion.matches) {
    const rect = story.getBoundingClientRect();
    const travel = story.offsetHeight - storyStage.offsetHeight;
    const progress = travel > 0 ? clamp(-rect.top / travel, 0, 1) : 0;
    story.style.setProperty("--story-x", `${(-50 * progress).toFixed(3)}%`);
    story.style.setProperty("--story-fill", `${(100 * progress).toFixed(2)}%`);
  } else {
    story.style.removeProperty("--story-x");
    story.style.removeProperty("--story-fill");
  }

  if (!reducedMotion.matches && window.innerWidth > 600) {
    projectMedia.forEach((image) => {
      const media = image.parentElement;
      const rect = media.getBoundingClientRect();
      const viewportProgress = clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height), 0, 1);
      image.style.setProperty("--media-y", `${(viewportProgress * 40 - 40).toFixed(2)}px`);
    });
  }

  ticking = false;
}

function requestScrollMotion() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(updateScrollMotion);
}

updateScrollMotion();
window.addEventListener("scroll", requestScrollMotion, { passive: true });
window.addEventListener("resize", requestScrollMotion);

// Keep the copyright year current.
document.querySelector("#current-year").textContent = new Date().getFullYear();
