/* Tim-only motion. Native page scrolling and visible content are the baseline. */
(() => {
  const study = document.querySelector('.tim-study');
  if (!study) return;
  study.timMotionCleanup?.();

  const controller = new AbortController();
  const observers = [];
  const animations = new Set();
  const index = study.querySelector('.tim-index');
  const sections = [...study.querySelectorAll('[data-tim-stage]')];
  const links = [...index.querySelectorAll('a')];
  const header = document.querySelector('[data-header]');
  const compact = matchMedia('(max-width: 1100px)');
  const stacked = matchMedia('(max-width: 760px)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const journey = study.querySelector('[data-tim-journey]');
  const journeyLine = journey?.querySelector('.tim-journey__line');
  const journeyFill = journeyLine?.querySelector('span');
  const motion = getComputedStyle(study);
  const duration = parseFloat(motion.getPropertyValue('--tim-motion-duration')) || 520;
  const stagger = parseFloat(motion.getPropertyValue('--tim-motion-stagger')) || 65;
  const easing = motion.getPropertyValue('--tim-motion-ease').trim() || 'ease-out';
  const on = (target, type, handler, options = {}) => target?.addEventListener(type, handler, { ...options, signal: controller.signal });
  const clamp = value => Math.max(0, Math.min(1, value));
  let disposed = false;
  let frame = 0;
  let needsMeasure = true;
  let geometry;
  let carousel;
  let activeStage = index.querySelector('[aria-current]')?.hash.slice(1) || null;
  let lastProgress = '';

  function schedule() {
    if (!disposed && !frame) frame = requestAnimationFrame(update);
  }
  function measureSoon() {
    needsMeasure = true;
    schedule();
  }
  function measure() {
    const y = scrollY;
    const viewport = innerHeight;
    const headerHeight = header.offsetHeight;
    const obstruction = headerHeight + (compact.matches ? index.offsetHeight : 0);
    const stages = sections.map(section => {
      const rect = section.getBoundingClientRect();
      return { id: section.id, top: rect.top + y, bottom: rect.bottom + y };
    });
    let sequence = null;
    if (journey && !stacked.matches && !reduce.matches) {
      const rect = journey.getBoundingClientRect();
      const markers = [...journey.querySelectorAll('.tim-journey__step span')];
      const first = markers[0].getBoundingClientRect();
      const last = markers.at(-1).getBoundingClientRect();
      const left = first.left + first.width / 2 - rect.left;
      const distance = last.left + last.width / 2 - rect.left - left;
      const available = Math.max(1, viewport - obstruction);
      // Progress spans the real visible journey, without pinning or extra space.
      const start = y + rect.top - obstruction - available * .85;
      const end = y + rect.bottom - obstruction - available * .6;
      sequence = { left, distance, start, travel: Math.max(1, end - start) };
    }
    const galleryMeasurement = carousel?.measure();
    return { viewport, obstruction, headerHeight, stages, sequence, galleryMeasurement };
  }
  function update() {
    frame = 0;
    if (disposed) return;
    const measured = needsMeasure;
    if (measured) {
      needsMeasure = false;
      geometry = measure();
    }
    // Only scroll offsets are read during scrolling; layout bounds are cached.
    const y = scrollY;
    const galleryScroll = carousel?.readScroll();
    const readingLine = y + geometry.obstruction + 32;
    let next = geometry.stages.find(stage => stage.top <= readingLine && stage.bottom > readingLine)?.id || null;
    const first = geometry.stages[0];
    if (!next && first.top - y < geometry.viewport * .45 && first.bottom > readingLine) next = first.id;
    if (next !== activeStage) {
      activeStage = next;
      for (const link of links) {
        if (link.hash === '#' + next) link.setAttribute('aria-current', 'step');
        else if (link.hasAttribute('aria-current')) link.removeAttribute('aria-current');
      }
    }
    let repositioned = false;
    if (measured) {
      study.style.setProperty('--tim-anchor-offset', `${geometry.obstruction - geometry.headerHeight + 4}px`);
      if (geometry.sequence) {
        journeyLine.style.left = `${geometry.sequence.left}px`;
        journeyLine.style.width = `${geometry.sequence.distance}px`;
        journeyLine.style.right = 'auto';
      } else if (journeyLine) {
        journeyLine.removeAttribute('style');
        journeyFill.style.removeProperty('transform');
        lastProgress = '';
      }
      repositioned = carousel?.applyMeasurement(geometry.galleryMeasurement);
    }
    if (geometry.sequence) {
      const progress = clamp((y - geometry.sequence.start) / geometry.sequence.travel).toFixed(4);
      if (progress !== lastProgress) {
        journeyFill.style.transform = `scaleX(${progress})`;
        lastProgress = progress;
      }
    }
    if (!repositioned) carousel?.updateScroll(galleryScroll);
  }

  function finishAnimations() {
    for (const animation of animations) animation.cancel();
    animations.clear();
  }
  function destroy() {
    disposed = true;
    controller.abort();
    cancelAnimationFrame(frame);
    observers.forEach(observer => observer.disconnect());
    carousel?.destroy();
    finishAnimations();
    study.style.removeProperty('--tim-anchor-offset');
    journeyLine?.removeAttribute('style');
    journeyFill?.style.removeProperty('transform');
    if (study.timMotionCleanup === destroy) delete study.timMotionCleanup;
  }
  study.timMotionCleanup = destroy;

  function initCarousel() {
    const gallery = study.querySelector('.tim-persona-carousel');
    const track = gallery?.querySelector('.tim-personas');
    if (!track) return;
    const slides = [...track.querySelectorAll('.tim-persona')];
    const controls = gallery.querySelector('.tim-persona-controls');
    const toggle = gallery.querySelector('[data-persona-toggle]');
    const count = gallery.querySelector('[data-persona-current]');
    const position = gallery.querySelector('.tim-persona-position');
    const dots = [...gallery.querySelectorAll('[data-persona-go]')];
    let current = Math.max(0, Number(count.textContent) - 1);
    let requested = null;
    let offsets = [];
    let timer;
    let settleTimer;
    let visible = false;
    let hovered = gallery.matches(':hover');
    let paused = reduce.matches || toggle.textContent === 'Play autoplay';
    let direction = 1;
    let rendered = '';
    let scrollDirty = true;
    let ready = false;
    const names = ['Alex Matin', 'Jordan Handerson', 'Maya Thomas'];
    track.classList.add('is-carousel');
    track.tabIndex = 0;
    track.setAttribute('aria-label', 'Inclusive personas. Use left and right arrow keys to browse.');
    gallery.setAttribute('aria-roledescription', 'carousel');
    slides.forEach((slide, i) => {
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', 'slide');
      slide.setAttribute('aria-label', `${names[i]}, ${i + 1} of ${slides.length}`);
    });
    controls.hidden = false;

    function render() {
      const key = `${current}/${paused}/${reduce.matches}`;
      if (key === rendered) return;
      rendered = key;
      count.textContent = String(current + 1).padStart(2, '0');
      toggle.hidden = reduce.matches;
      toggle.textContent = paused ? 'Play autoplay' : 'Pause autoplay';
      dots.forEach((dot, i) => {
        if (i === current && !dot.hasAttribute('aria-current')) dot.setAttribute('aria-current', 'true');
        else if (i !== current && dot.hasAttribute('aria-current')) dot.removeAttribute('aria-current');
      });
      position.setAttribute('aria-live', paused ? 'polite' : 'off');
    }
    function queueRotation() {
      clearTimeout(timer);
      if (!ready || paused || hovered || !visible || requested !== null || document.hidden || reduce.matches) return;
      timer = setTimeout(() => {
        // Reverse at the ends instead of sweeping abruptly across two slides.
        if (current === slides.length - 1) direction = -1;
        else if (current === 0) direction = 1;
        goTo(current + direction);
      }, 2500);
    }
    function nearest(left) {
      return offsets.reduce((best, offset, i) => Math.abs(offset - left) < Math.abs(offsets[best] - left) ? i : best, 0);
    }
    function settle() {
      clearTimeout(settleTimer);
      requested = null;
      current = nearest(track.scrollLeft);
      render();
      queueRotation();
    }
    function stopTravel() {
      if (requested !== null) track.scrollTo({ left: track.scrollLeft, behavior: 'instant' });
      requested = null;
      clearTimeout(settleTimer);
    }
    function pause() {
      paused = true;
      clearTimeout(timer);
      stopTravel();
      current = nearest(track.scrollLeft);
      render();
    }
    function goTo(next, manual = false) {
      if (!ready) return;
      if (manual) paused = true;
      clearTimeout(timer);
      clearTimeout(settleTimer);
      current = (next + slides.length) % slides.length;
      requested = current;
      render();
      track.scrollTo({ left: offsets[current], behavior: reduce.matches ? 'instant' : 'smooth' });
      // Fallback for browsers without scrollend, including a no-distance move.
      settleTimer = setTimeout(settle, 180);
    }
    on(gallery.querySelector('[data-persona-prev]'), 'click', () => goTo(current - 1, true));
    on(gallery.querySelector('[data-persona-next]'), 'click', () => goTo(current + 1, true));
    dots.forEach((dot, i) => on(dot, 'click', () => goTo(i, true)));
    on(toggle, 'click', () => { paused = !paused; render(); queueRotation(); });
    on(gallery, 'pointerenter', event => {
      if (event.pointerType === 'mouse') { hovered = true; clearTimeout(timer); }
    });
    on(gallery, 'pointerleave', () => { hovered = false; queueRotation(); });
    on(track, 'pointerdown', pause);
    on(track, 'wheel', pause, { passive: true });
    on(gallery, 'focusin', event => { if (event.target !== toggle) pause(); });
    on(track, 'keydown', event => {
      if (event.target !== track || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      goTo(event.key === 'Home' ? 0 : event.key === 'End' ? slides.length - 1 : current + (event.key === 'ArrowRight' ? 1 : -1), true);
    });
    on(track, 'scroll', () => {
      scrollDirty = true;
      schedule();
      clearTimeout(settleTimer);
      settleTimer = setTimeout(settle, 140);
    }, { passive: true });
    on(track, 'scrollend', settle);
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .35;
        queueRotation();
      }, { threshold: [0, .35] });
      observer.observe(track);
      observers.push(observer);
    }
    render();
    return {
      track,
      measure() {
        const origin = slides[0].offsetLeft;
        const travel = Math.max(0, track.scrollWidth - track.clientWidth);
        return slides.map(slide => Math.min(travel, slide.offsetLeft - origin));
      },
      applyMeasurement(next) {
        const changed = !ready || next.some((offset, i) => Math.abs(offset - offsets[i]) > .5);
        offsets = next;
        ready = true;
        if (changed) {
          clearTimeout(settleTimer);
          requested = null;
          track.scrollTo({ left: offsets[current], behavior: 'instant' });
          scrollDirty = false;
          queueRotation();
        }
        return changed;
      },
      readScroll() { return scrollDirty ? track.scrollLeft : null; },
      updateScroll(left) {
        if (left === null || !ready) return;
        scrollDirty = false;
        // Do not replace a requested destination with intermediate slide numbers.
        if (requested === null) { current = nearest(left); render(); }
      },
      refresh() { if (reduce.matches) pause(); render(); queueRotation(); },
      suspend() { clearTimeout(timer); clearTimeout(settleTimer); stopTravel(); },
      destroy() { clearTimeout(timer); clearTimeout(settleTimer); stopTravel(); }
    };
  }

  function initReveals() {
    if (!('IntersectionObserver' in window) || !Element.prototype.animate) return;
    function play(element, keyframes, timing, startTime) {
      const animation = element.animate(keyframes, { easing, fill: 'backwards', ...timing });
      if (startTime != null) animation.startTime = startTime;
      animations.add(animation);
      animation.onfinish = animation.oncancel = () => animations.delete(animation);
    }
    function revealQuote(figure) {
      const words = [...figure.querySelectorAll('.tim-quote-word')];
      const missing = figure.querySelector('.tim-quote-missing');
      const dark = getComputedStyle(figure.querySelector('.tim-quote-hidden')).color;
      const light = getComputedStyle(missing).color;
      const start = document.timeline.currentTime;
      const textFinished = duration + (words.length - 1) * stagger;
      words.forEach((word, i) => play(word, [
        { opacity: .25, transform: 'translateY(14px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration, delay: i * stagger }, start));
      // Hold the word dark throughout every word's entrance. Only then fade it
      // into the light-gray resting color; cancellation also restores that color.
      play(missing, [{ color: dark }, { color: light }], {
        duration: 900, delay: textFinished + 120, easing: 'ease-in-out'
      }, start);
      [figure.querySelector('.tim-label'), figure.querySelector('figcaption')].forEach((element, i) => play(element, [
        { opacity: .5, transform: 'translateY(8px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration, delay: i * stagger }, start));
    }
    const targets = new Map();
    const add = (selector, children = false) => study.querySelectorAll(selector).forEach(element => {
      const items = children ? [...element.children] : [element];
      targets.set(element, items);
    });
    add('.tim-hero__heading, .tim-overview, [data-tim-reveal], .tim-block__intro, .tim-insight', true);
    add('.tim-origin, .tim-test-intro, .tim-annotated, .tim-evidence, .tim-iteration, .tim-prototype__figure, .tim-comparison');
    study.querySelectorAll('.tim-prototype > .tim-label, .tim-prototype > h3, .tim-prototype > p:not(.tim-label)').forEach(element => targets.set(element, [element]));
    study.querySelectorAll('.tim-journey__steps > li').forEach(element => {
      targets.set(element, [...element.children].filter(child => !child.classList.contains('tim-journey__step')));
    });
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        // A background tab must not consume an animation before the reader sees it.
        if (!entry.isIntersecting || document.hidden) continue;
        observer.unobserve(entry.target);
        const items = targets.get(entry.target);
        targets.delete(entry.target);
        if (entry.target.hasAttribute('data-tim-revealed') || !items) continue;
        entry.target.setAttribute('data-tim-revealed', '');
        // Fast scrolls and anchors still reveal the destination. Skip only content
        // that is entirely behind the header, without ever hiding the baseline.
        if (reduce.matches || entry.boundingClientRect.bottom <= geometry.obstruction) continue;
        if (entry.target.classList.contains('tim-insight')) {
          revealQuote(entry.target);
          continue;
        }
        items.forEach((element, i) => {
          play(element, [
            { opacity: .5, transform: 'translateY(16px)' },
            { opacity: 1, transform: 'translateY(0)' }
          ], { duration, delay: Math.min(i, 2) * stagger, easing, fill: 'backwards' });
        });
      }
    }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });
    for (const element of targets.keys()) observer.observe(element);
    on(document, 'visibilitychange', () => {
      if (document.hidden) return;
      for (const element of targets.keys()) {
        observer.unobserve(element);
        observer.observe(element);
      }
    });
    observers.push(observer);
  }

  try {
    carousel = initCarousel();
    on(window, 'scroll', schedule, { passive: true });
    on(window, 'resize', measureSoon);
    on(window.visualViewport, 'resize', measureSoon);
    on(window, 'hashchange', schedule);
    on(window, 'load', measureSoon, { once: true });
    on(study, 'load', measureSoon, { capture: true });
    on(study, 'loadedmetadata', measureSoon, { capture: true });
    on(compact, 'change', measureSoon);
    on(stacked, 'change', measureSoon);
    on(reduce, 'change', () => { finishAnimations(); carousel?.refresh(); measureSoon(); });
    on(document, 'visibilitychange', () => {
      if (document.hidden) { finishAnimations(); carousel?.suspend(); }
      else { carousel?.refresh(); measureSoon(); }
    });
    on(window, 'pagehide', event => {
      if (!event.persisted) destroy();
      else { cancelAnimationFrame(frame); frame = 0; finishAnimations(); carousel?.suspend(); }
    });
    on(window, 'pageshow', () => { carousel?.refresh(); measureSoon(); });
    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(measureSoon);
      [study, header, index, ...sections, journey, carousel?.track].filter(Boolean).forEach(element => observer.observe(element));
      observers.push(observer);
    }
    document.fonts?.ready.then(() => { if (!disposed) measureSoon(); });
    on(document.fonts, 'loadingdone', measureSoon);
    update();
    initReveals();

    const video = study.querySelector('#prototype-video');
    const play = study.querySelector('.tim-video-play');
    const status = study.querySelector('.tim-video-status');
    if (video && play) {
      play.hidden = !video.paused;
      on(play, 'click', async () => {
        try { await video.play(); status.textContent = ''; video.focus({ preventScroll: true }); }
        catch { if (!disposed) status.textContent = 'Use the video controls, or open the recording with the link below.'; }
      });
      on(video, 'play', () => { play.hidden = true; });
      on(video, 'pause', () => { play.hidden = false; });
      on(video, 'ended', () => { play.hidden = false; });
      on(video, 'error', () => { play.hidden = true; status.textContent = 'The video could not load. Try opening the recording with the link below.'; });
    }
  } catch (error) {
    destroy();
    study.querySelector('.tim-personas')?.classList.remove('is-carousel');
    const controls = study.querySelector('.tim-persona-controls');
    if (controls) controls.hidden = true;
    console.warn('Tim motion could not initialize; the full page remains readable.', error);
  }
})();
