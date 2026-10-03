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

if (roleText) window.setInterval(() => {
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

  if (story && storyStage && desktop && !reducedMotion.matches) {
    const rect = story.getBoundingClientRect();
    const travel = story.offsetHeight - storyStage.offsetHeight;
    const progress = travel > 0 ? clamp(-rect.top / travel, 0, 1) : 0;
    story.style.setProperty("--story-x", `${(-50 * progress).toFixed(3)}%`);
    story.style.setProperty("--story-fill", `${(100 * progress).toFixed(2)}%`);
  } else if (story) {
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

// ---------- About page storytelling (progressively enhanced) ----------
(() => {
  const about = document.querySelector('.about-page');
  if (!about) return;

  const photos = [...about.querySelectorAll('[data-photo-speed]')];
  const approach = about.querySelector('.about-approach');
  const skills = [...about.querySelectorAll('.about-skill-group')];
  const skillLinks = [...about.querySelectorAll('.skill-index a')];
  const tools = about.querySelector('.about-tools-section');
  const stage = tools.querySelector('.tools-stage');
  const toolsWindow = tools.querySelector('.tools-window');
  const track = tools.querySelector('.about-tools');
  const desktopMotion = window.matchMedia('(min-width: 901px) and (prefers-reduced-motion: no-preference)');
  let frame = 0;
  let activeSkill = null;

  function updateAboutMotion() {
    frame = 0;
    const moving = desktopMotion.matches;
    const headerHeight = header.offsetHeight;
    const viewport = window.innerHeight;
    tools.classList.toggle('has-horizontal-tools', moving);

    photos.forEach((photo) => {
      const offset = moving ? clamp(-about.getBoundingClientRect().top * Number(photo.dataset.photoSpeed), -32, 32) : 0;
      photo.style.setProperty('--photo-y', `${offset.toFixed(1)}px`);
    });

    const approachRect = approach.getBoundingClientRect();
    const approachProgress = clamp((viewport - approachRect.top) / (viewport + approachRect.height), 0, 1);
    approach.style.setProperty('--approach-progress', moving ? approachProgress.toFixed(3) : '1');

    // Choose one category nearest the reading area; keep every category readable.
    const readingLine = headerHeight + viewport * 0.3;
    const active = skills.reduce((nearest, skill) => {
      const distance = Math.abs(skill.getBoundingClientRect().top - readingLine);
      return !nearest || distance < nearest.distance ? { skill, distance } : nearest;
    }, null).skill;
    if (active !== activeSkill) {
      activeSkill = active;
      skills.forEach((skill) => skill.classList.toggle('is-active', skill === active));
      skillLinks.forEach((link) => {
        const current = link.hash === `#${active.id}`;
        link.classList.toggle('is-active', current);
        if (current) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    }

    if (moving) {
      const rect = tools.getBoundingClientRect();
      const distance = Math.max(1, tools.offsetHeight - stage.offsetHeight);
      const progress = clamp((headerHeight - rect.top) / distance, 0, 1);
      const travel = Math.max(0, track.scrollWidth - toolsWindow.clientWidth);
      tools.style.setProperty('--tools-x', `${(-travel * progress).toFixed(1)}px`);
      tools.style.setProperty('--tools-progress', progress.toFixed(3));
    } else {
      tools.style.removeProperty('--tools-x');
      tools.style.removeProperty('--tools-progress');
    }
  }

  function scheduleAboutMotion() {
    if (!frame) frame = requestAnimationFrame(updateAboutMotion);
  }
  window.addEventListener('scroll', scheduleAboutMotion, { passive: true });
  window.addEventListener('resize', scheduleAboutMotion);
  desktopMotion.addEventListener('change', scheduleAboutMotion);
  window.addEventListener('load', scheduleAboutMotion, { once: true });
  if (document.fonts) document.fonts.ready.then(scheduleAboutMotion);
  updateAboutMotion();
})();

// ---------- Tim case study: stage navigation and three-step journey ----------
(() => {
  const study = document.querySelector('.case-study');
  const nav = study?.querySelector('.case-index');
  if (!study || !nav) return;

  const sections = [...study.querySelectorAll('[data-case-section]')];
  const links = [...nav.querySelectorAll('a[href^="#"]')];
  const journey = study.querySelector('[data-case-journey]');
  const journeyStage = journey?.querySelector('.case-journey__stage');
  const journeyTrack = journey?.querySelector('.case-journey__track');
  const horizontalMotion = window.matchMedia('(min-width: 761px) and (prefers-reduced-motion: no-preference)');
  let caseFrame = 0;

  function updateCaseStudy() {
    caseFrame = 0;
    const readingLine = document.querySelector('[data-header]').offsetHeight + Math.min(180, window.innerHeight * .28);
    let current = sections[0];
    sections.forEach(section => {
      if (section.getBoundingClientRect().top <= readingLine) current = section;
    });
    links.forEach(link => {
      const active = link.hash === `#${current.id}`;
      if (active) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });

    if (journey && journeyStage && journeyTrack && horizontalMotion.matches) {
      const rect = journey.getBoundingClientRect();
      const scrollDistance = Math.max(1, journey.offsetHeight - journeyStage.offsetHeight);
      const progress = clamp(-rect.top / scrollDistance, 0, 1);
      const travel = Math.max(0, journeyTrack.scrollWidth - journeyStage.clientWidth);
      journey.style.setProperty('--case-journey-x', `${(-travel * progress).toFixed(1)}px`);
    } else if (journey) {
      journey.style.removeProperty('--case-journey-x');
    }
  }

  function scheduleCaseStudy() {
    if (!caseFrame) caseFrame = requestAnimationFrame(updateCaseStudy);
  }
  window.addEventListener('scroll', scheduleCaseStudy, { passive: true });
  window.addEventListener('resize', scheduleCaseStudy);
  horizontalMotion.addEventListener('change', scheduleCaseStudy);
  window.addEventListener('load', scheduleCaseStudy, { once: true });
  updateCaseStudy();
})();

// ---------- Outside the Pixels: accessible interest tabs, no autoplay ----------
(() => {
  const section = document.querySelector('.outside-pixels');
  if (!section) return;
  const tabs = [...section.querySelectorAll('[role="tab"]')];
  const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
  const tablist = section.querySelector('[role="tablist"]');
  let active = 0;
  let version = 0;
  let exitAnimation;

  // Each interest keeps a deck of equally sized cards, with one accessible photo at a time.
  panels.forEach((panel) => {
    const gallery = panel.querySelector('.outside-collage');
    const cards = [...gallery.querySelectorAll('.outside-photo')];
    const count = panel.querySelector('.photo-deck-count');
    let current = 0;
    let pointer = null;
    let startX = 0;
    let startY = 0;
    let distance = 0;

    function renderDeck() {
      cards.forEach((card, index) => {
        const position = (index - current + cards.length) % cards.length;
        card.classList.toggle('is-front', position === 0);
        card.classList.toggle('is-next', position === 1);
        card.classList.toggle('is-after', position === 2);
        card.setAttribute('aria-hidden', String(position !== 0));
        card.setAttribute('role', 'group');
        card.setAttribute('aria-roledescription', 'slide');
        card.setAttribute('aria-label', `Photo ${index + 1} of ${cards.length}`);
      });
      count.textContent = `Photo ${current + 1} of ${cards.length}`;
    }
    function clearDrag() {
      pointer = null;
      distance = 0;
      gallery.classList.remove('is-dragging');
      gallery.style.removeProperty('--drag-x');
      gallery.style.removeProperty('--drag-angle');
    }
    function swap(direction) {
      clearDrag();
      panel.classList.remove('is-entering');
      current = (current + direction + cards.length) % cards.length;
      renderDeck();
    }
    panel.querySelector('.photo-deck-prev').addEventListener('click', () => swap(-1));
    panel.querySelector('.photo-deck-next').addEventListener('click', () => swap(1));
    panel.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      swap(event.key === 'ArrowRight' ? 1 : -1);
    });
    gallery.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
      pointer = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      distance = 0;
      gallery.setPointerCapture(pointer);
    });
    gallery.addEventListener('pointermove', event => {
      if (event.pointerId !== pointer) return;
      const horizontal = event.clientX - startX;
      const vertical = event.clientY - startY;
      if (Math.abs(horizontal) < 8 || Math.abs(horizontal) < Math.abs(vertical)) return;
      distance = horizontal;
      if (!reducedMotion.matches) {
        gallery.classList.add('is-dragging');
        gallery.style.setProperty('--drag-x', `${Math.max(-180, Math.min(180, distance))}px`);
        gallery.style.setProperty('--drag-angle', `${Math.max(-8, Math.min(8, distance / 24))}deg`);
      }
    });
    gallery.addEventListener('pointerup', event => {
      if (event.pointerId !== pointer) return;
      const threshold = Math.min(80, gallery.clientWidth * .18);
      if (Math.abs(distance) >= threshold) swap(distance < 0 ? 1 : -1);
      else clearDrag();
      if (gallery.hasPointerCapture(event.pointerId)) gallery.releasePointerCapture(event.pointerId);
    });
    gallery.addEventListener('pointercancel', clearDrag);
    gallery.addEventListener('lostpointercapture', clearDrag);
    reducedMotion.addEventListener('change', clearDrag);
    renderDeck();
  });

  async function selectInterest(index) {
    if (index === active) return;
    const request = ++version;
    if (exitAnimation) exitAnimation.cancel();
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
    });
    const previous = panels.find(panel => !panel.hidden);
    active = index;
    if (!reducedMotion.matches && previous && previous.animate) {
      exitAnimation = previous.animate([
        { opacity: 1, transform: 'translateX(0)' },
        { opacity: 0, transform: 'translateX(-10px)' }
      ], { duration: 150, easing: 'ease-out' });
      try { await exitAnimation.finished; } catch (_) { /* A newer selection interrupted this transition. */ }
      if (request !== version) return;
      exitAnimation.cancel();
      exitAnimation = null;
    }
    panels.forEach((panel, i) => {
      panel.hidden = i !== index;
      panel.classList.remove('is-entering');
    });
    const panel = panels[index];
    const gallery = panel.querySelector('.outside-collage');
    gallery.scrollLeft = 0;
    if (!reducedMotion.matches) panel.classList.add('is-entering');
  }

  tabs.forEach((tab, index) => tab.addEventListener('click', () => selectInterest(index)));
  tablist.addEventListener('keydown', event => {
    const current = tabs.indexOf(event.target);
    if (current < 0) return;
    let next;
    if (event.key === 'ArrowRight') next = (current + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    tabs[next].focus({ preventScroll: true });
    // Move only the controls' own scroll area; keep the page at its current position.
    if (tablist.scrollWidth > tablist.clientWidth) {
      const tab = tabs[next];
      tablist.scrollLeft = Math.max(0, tab.offsetLeft - tablist.offsetLeft - 12);
    }
    selectInterest(next);
  });
  reducedMotion.addEventListener('change', () => {
    if (!reducedMotion.matches) return;
    ++version;
    if (exitAnimation) exitAnimation.cancel();
    panels.forEach((panel, i) => { panel.hidden = i !== active; panel.classList.remove('is-entering'); });
  });
})();
