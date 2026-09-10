/* ==========================================================================
   350 ml tumbler — page behaviour. Vanilla JS, no build step.

     01 helpers                04 scroll: camera + exploded view
     02 theme (light/dark)     05 count-up figures
     03 the 3D stages          06 buy button

   Motion policy: two orchestrated moments and nothing else. The hero model
   settles into its stage on load, and the anatomy stage plays the exploded
   view once as it comes into view. No scroll fade-ups, and both moments are
   skipped for prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- 01 helpers ------------------------------------------------ */

  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const mv     = $('#mv');
  const mvDemo = $('#mv2');

  /* Camera views. The model is Y-up, in metres, origin at the underside of
     the base pad (see assets/model/validation.json). */
  const VIEW = {
    hero:    { orbit: '-28deg 78deg 0.70m', target: '0m 0.105m 0m', fov: '27deg' },
    detail:  { orbit: '18deg 58deg 0.50m',  target: '0m 0.107m 0m', fov: '26deg' },
    explode: { orbit: '18deg 64deg 0.58m',  target: '0m 0.150m 0m', fov: '28deg' }
  };

  const setView = (viewer, v) => {
    if (!viewer) return;
    viewer.cameraOrbit  = v.orbit;
    viewer.cameraTarget = v.target;
    viewer.fieldOfView  = v.fov;
  };

  /* ---------- 02 theme -------------------------------------------------- */

  /* The document may carry no data-theme at all, which means "follow the
     system" — the toggle reads the resolved mode, then pins the opposite. */
  const root = document.documentElement;
  const toggle = $('#theme-toggle');

  const resolvedTheme = () => {
    if (root.dataset.theme === 'dark' || root.dataset.theme === 'light') return root.dataset.theme;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const syncToggleLabel = () => {
    if (!toggle) return;
    const next = resolvedTheme() === 'dark' ? 'light' : 'dark';
    toggle.setAttribute('aria-label', 'Switch to ' + next + ' mode');
  };

  if (toggle) {
    syncToggleLabel();
    toggle.addEventListener('click', () => {
      const next = resolvedTheme() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (err) { /* private mode */ }
      syncToggleLabel();
    });
    // Follow the system while the reader has not pinned a mode.
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncToggleLabel);
  }

  /* ---------- 03 the 3D stages ------------------------------------------ */

  /* Two viewers share one GLB (the browser caches the fetch): the hero one
     carries the composition, the anatomy one is what the controls drive.
     Lighting is identical in both modes and both stages — a colder
     environment in dark mode would shift the matte finish's hue between
     them. */
  const wireStage = (viewer, opts) => {
    if (!viewer) return () => {};
    const stage = viewer.closest('.stage');
    let resume = null;

    const pauseSpin = () => {
      viewer.removeAttribute('auto-rotate');
      clearTimeout(resume);
      if (!opts.spins || reduceMotion) return;
      // Hand control back only once the reader has stopped for a moment.
      resume = setTimeout(() => viewer.setAttribute('auto-rotate', ''), 3200);
    };

    viewer.addEventListener('load', () => {
      // The orchestrated moment: settle in, then start turning.
      if (stage) stage.classList.add('is-settled');
      if (opts.spins && !reduceMotion) {
        viewer.setAttribute('rotation-per-second', '45deg');   // 8s per turn
        setTimeout(() => viewer.setAttribute('auto-rotate', ''), 520);
      }
      try {
        const names = viewer.availableAnimations || [];
        if (names.length) { viewer.animationName = names[0]; viewer.pause(); }
        // No clip in the GLB means no exploded view to offer.
        if (!names.length && opts.controls) opts.controls.forEach((el) => { if (el) el.hidden = true; });
      } catch (err) { /* the exploded view is a nice-to-have, never fatal */ }
    });

    viewer.addEventListener('camera-change', (e) => {
      if (e.detail && e.detail.source === 'user-interaction') pauseSpin();
    });

    viewer.addEventListener('error', () => {
      const caption = $('#stage-caption');
      if (caption) caption.textContent = 'The 3D model could not be loaded. Check assets/model/tumbler.glb.';
      if (stage) stage.classList.add('is-settled');
    });

    return pauseSpin;
  };

  const explodeBtn = $('#btn-explode');
  const resetBtn   = $('#btn-reset');

  const pauseHero = wireStage(mv, { spins: true });
  wireStage(mvDemo, { spins: false, controls: [explodeBtn, resetBtn] });

  /* ---------- 03b hotspots -> callout ----------------------------------- */

  const panel    = $('#hotspot-panel');
  const hotspots = $$('.hotspot');
  const partRows = $$('#parts .parts__row');
  const PART_ROW = { lid: 'Lid', body: 'Body', base: 'Base pad' };

  const showHotspot = (btn) => {
    const slot = btn.getAttribute('slot') || '';
    // Both viewers carry the same three markers, so highlight them in step.
    hotspots.forEach((h) => h.classList.toggle('is-active', h.getAttribute('slot') === slot));

    if (panel) {
      panel.innerHTML = '<p class="label"></p><h3></h3><p class="note"></p>';
      $('.label', panel).textContent = btn.dataset.part || 'Detail';
      $('h3', panel).textContent     = btn.dataset.label || '';
      $('.note', panel).textContent  = btn.dataset.note || '';
    }

    const key = slot.replace('hotspot-', '');
    partRows.forEach((row) => {
      const dt = $('dt', row);
      row.classList.toggle('is-active', !!dt && dt.textContent.trim() === PART_ROW[key]);
    });
  };

  hotspots.forEach((btn) => {
    btn.addEventListener('click', () => {
      showHotspot(btn);
      if (mv && btn.closest('model-viewer') === mv) pauseHero();
    });
  });

  /* ---------- 04 scroll: camera + exploded view ------------------------- */

  /* The clip explodes at its midpoint and reassembles by its end, so the wide
     framing is only right while it runs. Ease back to the detail view once the
     parts are home again, or the stage is left holding a distant shot. */
  let explodeTimer = null;

  const playExplode = () => {
    if (!mvDemo || !mvDemo.availableAnimations || !mvDemo.availableAnimations.length) return false;
    setView(mvDemo, VIEW.explode);
    mvDemo.currentTime = 0;
    mvDemo.play({ repetitions: 1 });
    if (explodeBtn) explodeBtn.textContent = 'Play it again';

    const secs = isFinite(mvDemo.duration) && mvDemo.duration > 0 ? mvDemo.duration : 2;
    clearTimeout(explodeTimer);
    explodeTimer = setTimeout(() => setView(mvDemo, VIEW.detail), secs * 1000 + 300);
    return true;
  };

  /* Entering the anatomy section is the page's second orchestrated moment:
     the stage settles into its detail framing, the parts come apart once, and
     the hero stills so two models are never turning at the same time.
     Scrolling back restores the hero, so it is never left mid-close-up. */
  /* Observe the STAGE, not the whole section. On a phone the section stacks
     text above the stage, so 35% of the section can be in view while the
     stage is still below the fold — the clip would play unseen. */
  const anatomyStage = $('#stage-demo');
  if (anatomyStage && 'IntersectionObserver' in window) {
    let inView = false;
    let playedOnce = false;

    new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting === inView) return;
        inView = entry.isIntersecting;

        if (inView) {
          setView(mvDemo, VIEW.detail);
          if (mv) mv.removeAttribute('auto-rotate');
          if (!playedOnce && !reduceMotion) {
            playedOnce = true;
            setTimeout(playExplode, 620);
          }
        } else {
          setView(mv, VIEW.hero);
          if (mv && !reduceMotion) mv.setAttribute('auto-rotate', '');
        }
      });
    }, { threshold: 0.35 }).observe(anatomyStage);
  }

  if (explodeBtn) explodeBtn.addEventListener('click', playExplode);

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      clearTimeout(explodeTimer);
      try { if (mvDemo) { mvDemo.pause(); mvDemo.currentTime = 0; } } catch (err) {}
      setView(mvDemo, VIEW.detail);
      hotspots.forEach((h) => h.classList.remove('is-active'));
      partRows.forEach((row) => row.classList.remove('is-active'));
      if (panel) panel.innerHTML = '<p class="callout__hint">Tap a marker on the model to read about that part.</p>';
      if (explodeBtn) explodeBtn.textContent = 'Play exploded view';
    });
  }

  /* ---------- 05 count-up figures --------------------------------------- */

  const fmt = (n, decimals) =>
    decimals ? n.toFixed(decimals) : Math.round(n).toLocaleString('en-US');

  const countUp = (el) => {
    const target   = parseFloat(el.dataset.countup);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    if (!isFinite(target)) return;
    if (reduceMotion) { el.textContent = fmt(target, decimals); return; }

    const dur = 1100;
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * eased, decimals);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /* Scroll-position based rather than IntersectionObserver: a figure the page
     jumped past (anchor link, restored scroll) must still end up counted. */
  const watchers = [];
  let pending = false;

  const sweep = () => {
    pending = false;
    for (let i = watchers.length - 1; i >= 0; i--) {
      const w = watchers[i];
      if (w.el.getBoundingClientRect().top < innerHeight - 40) {
        watchers.splice(i, 1);
        w.fn(w.el);
      }
    }
  };
  const queueSweep = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(sweep);
  };

  addEventListener('scroll', queueSweep, { passive: true });
  addEventListener('resize', queueSweep);

  $$('[data-countup]').forEach((el) => watchers.push({ el: el, fn: countUp }));
  sweep();

  /* ---------- 06 buy button --------------------------------------------- */

  /* No cart, no checkout: this is a showcase page with one small purchase
     affordance in the header. Clicking it can only confirm interest. */
  let toastTimer = null;
  const toastEl = $('#toast');
  const toast = (msg) => {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.hidden = false;
    requestAnimationFrame(() => toastEl.classList.add('is-visible'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('is-visible');
      setTimeout(() => { toastEl.hidden = true; }, 260);
    }, 2600);
  };

  const buyBtn = $('#btn-buy');
  if (buyBtn) {
    buyBtn.addEventListener('click', () => toast('Thanks for your interest — £30. Checkout isn\'t wired up on this page yet.'));
  }
})();
