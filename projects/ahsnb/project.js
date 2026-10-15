// The two published sections stay readable without this navigation enhancement.
(() => {
  const project = document.querySelector('.ahsnb-project');
  const index = project?.querySelector('.ahsnb-index');
  if (!index) return;
  const sections = [...project.querySelectorAll('[data-ahsnb-section]')];
  const links = [...index.querySelectorAll('a[href^="#"]')];
  const header = document.querySelector('[data-header]');
  const compact = matchMedia('(max-width: 1100px)');
  let frame = 0;

  function update() {
    frame = 0;
    const navHeight = compact.matches ? index.offsetHeight : 0;
    project.style.setProperty('--ahsnb-index-height', `${navHeight}px`);
    const readingLine = header.offsetHeight + navHeight + 32;
    let current = null;
    sections.forEach(section => {
      if (section.getBoundingClientRect().top <= readingLine) current = section.id;
    });
    links.forEach(link => {
      if (link.hash === `#${current}`) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('load', schedule, { once: true });
  compact.addEventListener('change', schedule);
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(schedule);
    observer.observe(header);
    observer.observe(index);
  }
  document.fonts?.ready.then(schedule);
  update();
})();
