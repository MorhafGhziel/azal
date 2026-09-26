/* AZAL — core: environment, smooth scroll, cursor, loader, menu, page veil, small page reveals.
   Ported from the AZAL site (src/smooth.ts, cursor.ts, loader.ts, main.ts, router.ts). No build step. */
(function () {
  'use strict';
  var d = document.documentElement;
  var cfg = window.azal || { settings: {}, strings: {} };
  var gsap = window.gsap;
  var ST = window.ScrollTrigger;
  if (gsap && ST) gsap.registerPlugin(ST);

  var design = !!(window.Shopify && window.Shopify.designMode);
  var env = {
    design: design,
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches || !gsap,
    finePointer: matchMedia('(hover: hover) and (pointer: fine)').matches,
    portrait: function () { return matchMedia('(max-aspect-ratio: 1/1)').matches; },
    rtl: d.dir === 'rtl',
  };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- smooth scroll (Lenis), off in the theme editor so section clicks stay exact ---------- */
  var lenis = null;
  if (cfg.settings.smooth && window.Lenis && !env.reduced && !design) {
    lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 1.15, touchMultiplier: 1.6, syncTouch: false });
    if (ST) lenis.on('scroll', ST.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  function scrollToY(y, duration, linear) {
    if (lenis) lenis.scrollTo(y, { duration: duration || 2.4, easing: linear ? function (t) { return t; } : function (t) { return 1 - Math.pow(1 - t, 3); }, lock: false });
    else window.scrollTo({ top: y, behavior: env.reduced ? 'auto' : 'smooth' });
  }

  window.AZAL = { env: env, lenis: lenis, scrollToY: scrollToY, $: $, $$: $$, cfg: cfg };

  /* ---------- cursor: dot + trailing ring; grows over links, DRAG over [data-drag], VIEW over [data-view] ---------- */
  function initCursor() {
    var el = $('[data-cursor]');
    if (!el || !env.finePointer || design) { if (el) el.remove(); return; }
    var dot = $('.cursor__dot', el), ring = $('.cursor__ring', el), label = $('.cursor__label', el);
    d.classList.add('has-cursor');
    el.classList.add('is-hidden');
    var x = -100, y = -100, rx = x, ry = y, raf = 0, seen = false;
    addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX; y = e.clientY;
      if (!seen) { seen = true; rx = x; ry = y; el.classList.remove('is-hidden'); }
      dot.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      var t = e.target;
      if (!t.closest) return;
      var drag = !!t.closest('[data-drag]') && !t.closest('button, .cf__info');
      el.classList.toggle('is-drag', drag);
      el.classList.toggle('is-link', !drag && !!t.closest('a, button, [role="button"], label, select'));
      el.classList.toggle('is-hidden', !!t.closest('input, textarea, select, iframe'));
      var light = (!!t.closest('.is-page main, .origins, .collection, .drawer__panel, .menu, .notes:not(.is-dark), .scheme-ivory, .scheme-blush') && !t.closest('.thanks'))
        || (!!t.closest('.footer') && d.classList.contains('is-page'));
      el.classList.toggle('is-ink', light);
      var view = !t.closest('[data-drag]') && !!t.closest('[data-view]');
      el.classList.toggle('is-view', view);
      label.textContent = view ? cfg.strings.view : cfg.strings.drag;
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
    addEventListener('pointerdown', function () { rx = x; ry = y; ring.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)'; }, { passive: true });
    document.addEventListener('pointerleave', function () { el.classList.add('is-hidden'); });
    document.addEventListener('pointerenter', function () { if (seen) el.classList.remove('is-hidden'); });
    function loop() {
      var k = el.classList.contains('is-drag') || el.classList.contains('is-view') || el.classList.contains('is-link') ? 0.65 : 0.35;
      rx += (x - rx) * k; ry += (y - ry) * k;
      ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
      raf = Math.abs(x - rx) + Math.abs(y - ry) > 0.1 ? requestAnimationFrame(loop) : 0;
    }
  }

  /* ---------- loader: ivory veil, the emblem draws itself, a count to 100, the veil parts ---------- */
  function runLoader(ready) {
    var root = document.getElementById('loader');
    if (!root) return Promise.resolve();
    if (env.reduced || design) { root.remove(); return Promise.resolve(); }
    var seen = d.classList.contains('seen');
    var total = seen ? 0.7 : 1.6;
    var count = $('[data-count]', root);
    var svg = $('.loader__emblem', root);
    var sym = document.getElementById('emblem');
    svg.innerHTML = sym.innerHTML;
    var shapes = $$('path, circle', svg);
    shapes.forEach(function (s) { var len = s.getTotalLength(); s.style.strokeDasharray = len; s.style.strokeDashoffset = len; });
    return new Promise(function (resolve) {
      var n = { v: 0 };
      var tl = gsap.timeline();
      tl.to(shapes, { strokeDashoffset: 0, duration: total * 0.85, ease: 'power2.inOut', stagger: total * 0.08 }, 0);
      tl.to(n, { v: 100, duration: total, ease: 'power1.inOut', onUpdate: function () { count.textContent = Math.round(n.v); } }, 0);
      var cap = new Promise(function (r) { setTimeout(r, (total + 0.6) * 1000); });
      Promise.all([new Promise(function (r) { tl.eventCallback('onComplete', r); }), Promise.race([ready, cap])]).then(function () {
        try { sessionStorage.setItem('azal-seen', '1'); } catch (e) {}
        var out = gsap.timeline({ onComplete: function () { root.remove(); } });
        out.to('.loader__center', { opacity: 0, y: -8, duration: 0.3, ease: 'power2.in' }, 0);
        out.to('.loader__veil--top', { yPercent: -100, duration: 0.95, ease: 'expo.inOut' }, 0.12);
        out.to('.loader__veil--bottom', { yPercent: 100, duration: 0.95, ease: 'expo.inOut' }, 0.12);
        out.call(resolve, [], 0.45);
      });
    });
  }

  /* ---------- phone menu ---------- */
  function initMenu() {
    var menu = $('[data-menu]'), btn = $('[data-menu-open]');
    if (!menu || !btn) return;
    var close = function (focus) {
      if (menu.hidden) return;
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      if (lenis) lenis.start();
      if (focus) btn.focus();
    };
    btn.addEventListener('click', function () {
      menu.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      if (lenis) lenis.stop();
      if (!env.reduced) {
        gsap.fromTo(menu, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.6, ease: 'expo.out' });
        gsap.from($$('.menu__list > *', menu), { yPercent: 60, opacity: 0, duration: 0.8, stagger: 0.05, ease: 'expo.out', delay: 0.1 });
      }
      $('[data-menu-close]', menu).focus();
    });
    $('[data-menu-close]', menu).addEventListener('click', function () { close(true); });
    menu.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(true); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { close(false); }); });
  }

  /* ---------- page veil: ivory wipe on the way out, parts on arrival (the site's route transition) ---------- */
  function initVeil() {
    var veil = $('[data-veil]');
    if (!veil) return;
    if (!cfg.settings.transitions || env.reduced || design) { veil.remove(); return; }
    var arrived = false;
    try { arrived = sessionStorage.getItem('azal-veil') === '1'; sessionStorage.removeItem('azal-veil'); } catch (e) {}
    if (arrived) {
      gsap.set(veil, { clipPath: 'inset(0% 0 0 0)' });
      gsap.to(veil, { clipPath: 'inset(0 0 100% 0)', duration: 0.5, ease: 'power3.out', delay: 0.05 });
    }
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || a.target || a.hasAttribute('download') || a.closest('[data-no-veil]')) return;
      var raw = a.getAttribute('href');
      if (!raw || raw.charAt(0) === '#' || /^(mailto|tel|javascript):/.test(raw)) return;
      var u = new URL(a.href, location.href);
      if (u.origin !== location.origin || /\/checkout|\/cart\/|\/account\/logout|\/admin/.test(u.pathname)) return;
      if (u.pathname === location.pathname && u.hash) return;
      e.preventDefault();
      try { sessionStorage.setItem('azal-veil', '1'); } catch (err) {}
      gsap.fromTo(veil, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 0.32, ease: 'power3.in', onComplete: function () { location.href = u.href; } });
    });
    // back/forward cache: never come back to a covered page
    addEventListener('pageshow', function (e) { if (e.persisted) gsap.set(veil, { clipPath: 'inset(100% 0 0 0)' }); });
  }

  /* ---------- on-page anchors glide ---------- */
  function initAnchors() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]:not([data-begin]):not([data-no-glide]):not(.mburger)');
      if (!a || a.closest('#mobile-menu, .mm-ocd, salla-modal')) return;
      var id = a.getAttribute('href').slice(1);
      if (a.hasAttribute('data-to-top') || id === 'top') { e.preventDefault(); scrollToY(0, 3.2); return; }
      var target = id && document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      scrollToY(target.getBoundingClientRect().top + window.scrollY, 2.2);
    });
  }

  /* ---------- announcement bar: one message at a time ---------- */
  function initAnnounce() {
    var track = $('[data-announce]');
    if (!track) return;
    var msgs = $$('.announce__msg', track);
    if (msgs.length < 2 || env.reduced) return;
    var i = 0;
    setInterval(function () {
      msgs[i].classList.remove('is-on');
      i = (i + 1) % msgs.length;
      msgs[i].classList.add('is-on');
    }, 5000);
  }

  /* ---------- collection filters: submit on change ---------- */
  function initFacets() {
    $$('[data-facets]').forEach(function (form) {
      form.addEventListener('change', function (e) {
        if (e.target.matches('[data-autosubmit]')) form.requestSubmit ? form.requestSubmit() : form.submit();
      });
      form.addEventListener('submit', function () {
        // drop empty fields so URLs stay clean
        $$('input, select', form).forEach(function (f) { if (!f.value) f.disabled = true; });
      });
    });
  }

  /* ---------- pages: headings rise in their masks, content settles ---------- */
  function pageIntro() {
    if (env.reduced || d.classList.contains('is-home')) return;
    var lines = $$('main .page__title .ln__in, main .pdp__name .ln__in');
    if (lines.length) gsap.from(lines, { yPercent: 160, duration: 1.1, ease: 'expo.out', delay: 0.15 });
    var cards = $$('main .grid > .card');
    if (cards.length) {
      gsap.from(cards.slice(0, 9), { opacity: 0, y: 24, duration: 1, stagger: 0.06, ease: 'expo.out', delay: 0.1 });
      gsap.from($$('.card__img img', cards[0].parentNode).slice(0, 9), { scale: 1.12, duration: 1.6, stagger: 0.06, ease: 'power3.out', delay: 0.1 });
    }
    // headings of content sections further down
    if (ST) $$('main .block-sec .ln__in').forEach(function (el) {
      gsap.from(el, { yPercent: 160, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
    });
  }

  /* ---------- nav count: the number swaps inside a small mask ---------- */
  function tick(el, n, up) {
    var cur = el.lastElementChild ? el.lastElementChild.textContent : '';
    if (cur === String(n)) return;
    var inn = document.createElement('span');
    inn.textContent = n;
    if (env.reduced || cur === '') { el.replaceChildren(inn); return; }
    var out = el.lastElementChild;
    el.append(inn);
    gsap.to(out, { yPercent: up ? -100 : 100, duration: 0.45, ease: 'power3.inOut', onComplete: function () { out.remove(); } });
    gsap.from(inn, { yPercent: up ? 100 : -100, duration: 0.45, ease: 'power3.inOut' });
  }
  window.AZAL.tick = tick;

  initCursor();
  initMenu();
  initVeil();
  initAnchors();
  initAnnounce();
  initFacets();

  // home: hold the film behind the loader until the hero images are in
  var heroImgs = $$('[data-sky] .layer img').map(function (im) {
    return im.complete ? Promise.resolve() : new Promise(function (r) { im.onload = im.onerror = r; });
  });
  if (lenis && $('#loader')) lenis.stop();
  window.AZAL.ready = (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () {
    return runLoader(Promise.all(heroImgs));
  }).then(function () {
    if (lenis) lenis.start();
    pageIntro();
    document.dispatchEvent(new CustomEvent('azal:ready'));
  });
})();
