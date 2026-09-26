/* AZAL — the home film: 01 sky + 02 descent (bottle turn, mist, manifesto), petals,
   03 origins, 04 notes, 05 collection slider, 06 finale, nav ink over light sections.
   Ported from src/sky.ts, bottle.ts, petals.ts, story.ts. Every section runs inside a gsap.context
   so the theme editor can reload it on its own. */
(function () {
  'use strict';
  var A = window.AZAL, gsap = window.gsap, ST = window.ScrollTrigger;
  if (!A || !gsap || !ST) return;
  var $ = A.$, $$ = A.$$, env = A.env, cfg = A.cfg;
  var MARK = { heroOut: 0.06, mistIn: 0.27, mistFull: 0.37, reveal: 0.52, settle: 0.66, words: 0.7, end: 1 };
  var skyTrigger = null;

  /* ---------- bottle turn sequence drawn into a canvas ---------- */
  function BottleSequence(canvas, urls) {
    this.canvas = canvas; this.urls = urls; this.frames = new Array(urls.length); this.ctx = canvas.getContext('2d'); this.last = -1;
  }
  // The settled frame loads first; the other frames wait until the page has finished loading and the
  // browser is idle, so they never compete with the hero images for bandwidth (Lighthouse LCP).
  BottleSequence.prototype.load = function () {
    var self = this, mid = Math.floor(this.urls.length / 2);
    var one = function (i) {
      return new Promise(function (res) {
        var im = new Image(); im.decoding = 'async';
        im.onload = function () { self.frames[i] = im; if (self.last < 0 || Math.abs(i - self.last) < 1) self.draw(self.last < 0 ? mid : self.last, true); res(); };
        im.onerror = res; im.src = self.urls[i];
      });
    };
    var rest = this.urls.map(function (_, i) { return i; }).filter(function (i) { return i !== mid; })
      .sort(function (a, b) { return Math.abs(a - mid) - Math.abs(b - mid); });
    var later = new Promise(function (res) {
      var go = function () { (window.requestIdleCallback || setTimeout)(res, 300); };
      if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true });
    });
    return one(mid).then(function () { return later; }).then(function () { return Promise.all(rest.map(one)); });
  };
  BottleSequence.prototype.draw = function (f, force) {
    var n = this.urls.length, i = Math.max(0, Math.min(n - 1, Math.round(f)));
    if (i === this.last && !force) return;
    var im = this.frames[i];
    for (var k = 1; !im && k < n; k++) im = this.frames[i - k] || this.frames[i + k] || null;
    if (!im) return;
    this.last = i;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(im, 0, 0, this.canvas.width, this.canvas.height);
  };

  /* ---------- 01 + 02 sky ---------- */
  function initSky(sky) {
    var layer = function (n) { return $('[data-layer="' + n + '"]', sky); };
    var heroBits = $$('[data-hero-copy] > .eyebrow, .hero-copy__word, .hero-copy__tag, .hero-copy__cta', sky);
    var lines = $$('[data-manifesto] .ln__in', sky);
    var label = $('[data-manifesto] .manifesto__label', sky);
    var bottle = $('[data-bottle]', sky);
    var canvas = $('[data-bottle-seq]', sky);
    var sweep = $('[data-sweep]', sky);
    var mists = $$('.mist__card', sky);
    var seq = null;
    if (canvas) { try { seq = new BottleSequence(canvas, JSON.parse(canvas.dataset.frames)); } catch (e) {} }
    var mid = seq ? Math.floor(seq.urls.length / 2) : 0;

    gsap.set(bottle, { xPercent: -50, yPercent: env.portrait() ? -64 : -56 });

    if (env.reduced) {
      sky.classList.add('is-still');
      if (seq) seq.load().then(function () { seq.draw(mid); });
      return;
    }

    var tl = gsap.timeline({ defaults: { ease: 'none' }, paused: true });
    tl.to(heroBits, { yPercent: -60, opacity: 0, ease: 'power2.in', stagger: 0.008, duration: MARK.heroOut }, 0.004);
    tl.to($('[data-scroll-cue]', sky), { opacity: 0, duration: 0.04 }, 0);

    if (layer('sky')) tl.to(layer('sky'), { yPercent: -14, duration: 0.5 }, 0);
    if (layer('far')) tl.to(layer('far'), { yPercent: -34, duration: 0.5 }, 0);
    tl.to($('[data-petals="back"]', sky), { yPercent: -40, opacity: 0, duration: 0.3 }, 0);
    if (layer('mid')) tl.to(layer('mid'), { yPercent: -78, scale: 1.12, duration: 0.5, transformOrigin: '50% 100%' }, 0);
    tl.to($('[data-ground]', sky), { yPercent: -92, duration: 0.5, ease: 'power1.inOut' }, 0.02);
    if (layer('front')) {
      tl.to(layer('front'), { yPercent: -150, scale: 2.2, duration: 0.36, ease: 'power1.in', transformOrigin: '50% 100%' }, 0.02);
      tl.to(layer('front'), { opacity: 0, duration: 0.06 }, 0.32);
    }
    tl.to($('[data-petals="front"]', sky), { yPercent: -80, opacity: 0, duration: 0.28 }, 0.02);
    tl.fromTo($('[data-dusken]', sky), { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power1.in' }, 0.16);

    if (mists.length === 2) {
      var a = mists[0], b = mists[1];
      tl.fromTo(a, { opacity: 0, xPercent: -18, yPercent: 30, scale: 1.25 }, { opacity: 1, xPercent: 6, yPercent: 0, scale: 1, duration: MARK.mistFull - MARK.mistIn, ease: 'power1.out' }, MARK.mistIn);
      tl.fromTo(b, { opacity: 0, xPercent: 18, yPercent: 36, scale: 1.3 }, { opacity: 1, xPercent: -6, yPercent: 0, scale: 1, duration: MARK.mistFull - MARK.mistIn, ease: 'power1.out' }, MARK.mistIn + 0.02);
      tl.to(a, { xPercent: -78, yPercent: -12, scale: 1.55, opacity: 0, duration: MARK.reveal - MARK.mistFull + 0.04, ease: 'power2.in' }, MARK.mistFull + 0.02);
      tl.to(b, { xPercent: 78, yPercent: -16, scale: 1.6, opacity: 0, duration: MARK.reveal - MARK.mistFull + 0.04, ease: 'power2.in' }, MARK.mistFull + 0.03);
    }

    tl.fromTo(bottle, { y: function () { return innerHeight * 0.75; }, scale: 0.9, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: MARK.settle - 0.3, ease: 'power2.out' }, 0.3);
    var turn = { f: 0 };
    if (seq) tl.to(turn, { f: mid, duration: MARK.words + 0.12 - 0.4, ease: 'power1.inOut', onUpdate: function () { seq.draw(turn.f); } }, 0.4);
    if (sweep) tl.fromTo(sweep, { backgroundPosition: '100% 0' }, { backgroundPosition: '0% 0', duration: 0.2, ease: 'power1.inOut' }, MARK.settle - 0.04);

    if (label) tl.fromTo(label, { opacity: 0 }, { opacity: 0.6, duration: 0.05 }, MARK.words - 0.02);
    gsap.set(lines, { yPercent: 160 });
    tl.to(lines, { yPercent: 0, duration: 0.09, stagger: 0.05, ease: 'power3.out' }, MARK.words);
    tl.to(bottle, { opacity: 0, scale: 0.94, y: function () { return -innerHeight * 0.04; }, duration: 0.07, ease: 'power2.in' }, 0.93);
    tl.to(lines, { yPercent: -160, duration: 0.05, stagger: 0.01, ease: 'power2.in' }, 0.93);
    if (label) tl.to(label, { opacity: 0, duration: 0.04 }, 0.93);

    skyTrigger = ST.create({ trigger: sky, start: 'top top', end: 'bottom bottom', scrub: env.portrait() ? 0.6 : 0.9, animation: tl, invalidateOnRefresh: true });
    if (seq) seq.load().then(function () { seq.draw(turn.f); });

    var begin = $('[data-begin]', sky);
    if (begin) begin.addEventListener('click', function (e) {
      e.preventDefault();
      var top = sky.getBoundingClientRect().top + window.scrollY;
      A.scrollToY(top + (sky.offsetHeight - innerHeight) * (MARK.words + 0.2), 4.2);
    });

    // intro: sky settles, lines rise inside their masks
    document.addEventListener('azal:ready', function () {
      var t = gsap.timeline({ defaults: { ease: 'expo.out' } });
      t.from($$('.layer picture', sky), { scale: 1.08, duration: 2.4, stagger: 0.06, ease: 'power3.out' }, 0);
      t.from($$('.hero-copy .ln__in', sky), { yPercent: 160, duration: 1.3, stagger: 0.11 }, 0.15);
      t.from($$('.hero-copy__cta', sky), { opacity: 0, duration: 1.0, ease: 'power2.out' }, 0.7);
      t.from('.nav__pill', { opacity: 0, y: -10, duration: 1.0, ease: 'power2.out' }, 0.5);
      t.from($$('.corner > *', sky), { opacity: 0, duration: 1.0 }, 0.9);
      t.call(function () { if (petals) petals.show(); }, [], 0.4);
    }, { once: true });

    // tiny viewpoint shift with the pointer, desktop only
    if (env.finePointer) {
      var ins = $$('[data-layer]', sky).map(function (l) { return { el: $('.layer__in', l), d: Number(l.dataset.depth) || 6 }; });
      var tx = 0, ty = 0, x = 0, y = 0, raf = 0, active = true;
      var onMove = function (e) { tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5; if (!raf && active) raf = requestAnimationFrame(loop); };
      addEventListener('pointermove', onMove, { passive: true });
      ST.create({ trigger: sky, start: 'top top', end: 'bottom top', onToggle: function (s) { active = s.isActive; } });
      var loop = function () {
        x += (tx - x) * 0.06; y += (ty - y) * 0.06;
        ins.forEach(function (o) { o.el.style.transform = 'translate3d(' + (-x * o.d).toFixed(2) + 'px,' + (-y * o.d * 0.6).toFixed(2) + 'px,0)'; });
        raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.0005 && active ? requestAnimationFrame(loop) : 0;
      };
      return function () { removeEventListener('pointermove', onMove); };
    }
  }

  /* ---------- petals: one travelling petal + a few drifting at depth in the hero sky ---------- */
  var petals = null;
  function initPetals() {
    var hero = $('[data-petal]');
    if (!hero || env.reduced || !$('[data-sky]')) { if (hero) hero.remove(); return null; }
    var COLS = 8, ROWS = 6, FRAMES = COLS * ROWS;
    var framePos = function (i) { var f = ((Math.floor(i) % FRAMES) + FRAMES) % FRAMES; return ((f % COLS) / (COLS - 1)) * 100 + '% ' + (Math.floor(f / COLS) / (ROWS - 1)) * 100 + '%'; };
    var PATH = [[0, 71, 33, 1], [0.12, 66, 40, 1], [0.3, 60, 50, 1.05], [0.45, 55, 45, 1.1], [0.6, 47, 53, 1.28], [0.75, 39, 64, 1.16], [0.9, 31, 80, 1.05], [1, 27, 97, 1]];
    var PATH_P = [[0, 74, 60, 0.8], [0.12, 68, 64, 0.82], [0.3, 62, 58, 0.9], [0.45, 56, 50, 0.95], [0.6, 44, 46, 1.1], [0.75, 34, 58, 1], [0.9, 24, 72, 0.95], [1, 18, 96, 0.9]];
    var sample = function (path, p) {
      if (p <= path[0][0]) return path[0].slice(1);
      for (var i = 0; i < path.length - 1; i++) {
        var a = path[i], b = path[i + 1];
        if (p <= b[0]) { var t = (p - a[0]) / (b[0] - a[0]); t = t * t * (3 - 2 * t); return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t]; }
      }
      return path[path.length - 1].slice(1);
    };
    var drifters = [];
    var conf = env.portrait() ? [['back', 26, 0.8], ['back', 20, 1.2], ['front', 46, 0]] : [['back', 28, 0.8], ['back', 22, 1.2], ['back', 34, 0.5], ['front', 52, 0], ['front', 44, 0.3]];
    conf.forEach(function (c) {
      var host = $('[data-petals="' + c[0] + '"]');
      if (!host) return;
      var el = document.createElement('div');
      el.className = 'petal-sprite';
      el.style.width = el.style.height = c[1] + 'px';
      if (c[2]) el.style.filter = 'blur(' + c[2] + 'px)';
      el.style.opacity = c[0] === 'back' ? '0.8' : '0.95';
      host.appendChild(el);
      drifters.push({ el: el, x: Math.random() * innerWidth, y: innerHeight * (0.12 + Math.random() * 0.5),
        vx: -(8 + Math.random() * 10) * (c[0] === 'front' ? 1.6 : 1) * (env.rtl ? -1 : 1), vy: 4 + Math.random() * 6,
        f: Math.random() * FRAMES, fs: 5 + Math.random() * 5, ph: Math.random() * 10 });
    });
    var visible = false, t0 = performance.now(), last = t0, fr = 0;
    function loop(now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      var p = skyTrigger ? skyTrigger.progress : 0, time = (now - t0) / 1000;
      var s = sample(env.portrait() ? PATH_P : PATH, p), x = s[0], y = s[1];
      if (env.rtl) x = 100 - x;
      x += Math.sin(time * 0.6) * 1.1; y += Math.sin(time * 0.9 + 1) * 1.2;
      var vel = skyTrigger ? Math.abs(skyTrigger.getVelocity()) : 0;
      fr += dt * (7 + Math.min(vel / 90, 20));
      var size = hero.offsetWidth;
      hero.style.transform = 'translate3d(' + ((x / 100) * innerWidth - size / 2) + 'px,' + ((y / 100) * innerHeight - size / 2) + 'px,0) scale(' + s[2] + ')';
      hero.style.backgroundPosition = framePos(fr);
      hero.style.opacity = visible && window.scrollY < ($('[data-sky]').offsetHeight || 1e9) ? String(p >= 0.999 ? 0 : 1) : '0';
      if (p < 0.35) drifters.forEach(function (d) {
        d.x += (d.vx + Math.sin(time * 0.5 + d.ph) * 6) * dt; d.y += (d.vy + Math.cos(time * 0.7 + d.ph) * 5) * dt; d.f += d.fs * dt;
        if (d.x < -80) d.x = innerWidth + 60; if (d.x > innerWidth + 80) d.x = -60;
        if (d.y > innerHeight * 0.8) d.y = innerHeight * 0.08;
        d.el.style.transform = 'translate3d(' + d.x + 'px,' + d.y + 'px,0)';
        d.el.style.backgroundPosition = framePos(d.f);
      });
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
    return { show: function () { visible = true; hero.style.transition = 'opacity 1.2s ease'; } };
  }

  /* ---------- 03 origins ---------- */
  function initOrigins(root) {
    var imgs = $$('[data-ch-img]', root), chs = $$('[data-ch]', root), dots = $$('[data-ch-dot]', root);
    if (!imgs.length) return;
    if (dots[0]) dots[0].classList.add('is-on');
    if (env.reduced) return;
    var tl = gsap.timeline({ defaults: { ease: 'none' } });
    gsap.set(chs.slice(1).reduce(function (a, c) { return a.concat($$('.ln__in', c)); }, []), { yPercent: 185 });
    gsap.set(chs.slice(1), { autoAlpha: 0 });
    gsap.set(imgs.slice(1), { clipPath: 'inset(100% 0 0 0)' });
    imgs.forEach(function (im, i) {
      var at = i;
      if (i > 0) {
        tl.to(im, { clipPath: 'inset(0% 0 0 0)', duration: 0.6, ease: 'power2.inOut' }, at - 0.3);
        tl.fromTo($('picture', im), { scale: 1.18 }, { scale: 1, duration: 1.1, ease: 'power1.out' }, at - 0.3);
        tl.to($('picture', imgs[i - 1]), { yPercent: -8, duration: 0.6, ease: 'power2.inOut' }, at - 0.3);
        tl.fromTo($$('.ln__in', chs[i - 1]), { yPercent: 0 }, { yPercent: -185, duration: 0.18, stagger: 0.02, ease: 'power2.in', immediateRender: false }, at - 0.34);
        tl.set(chs[i], { autoAlpha: 1 }, at - 0.34);
        tl.set(chs[i - 1], { autoAlpha: 0 }, at - 0.15);
        tl.fromTo($$('.ln__in', chs[i]), { yPercent: 185 }, { yPercent: 0, duration: 0.28, stagger: 0.04, ease: 'power3.out', immediateRender: false }, at - 0.14);
        (function (k) {
          tl.call(function () { dots.forEach(function (d, j) { d.classList.toggle('is-on', j === k); }); }, [], at - 0.1);
          tl.call(function () { dots.forEach(function (d, j) { d.classList.toggle('is-on', j === k - 1); }); }, [], at - 0.11);
        })(i);
      } else tl.fromTo($('picture', im), { scale: 1.12 }, { scale: 1, duration: 0.7 }, 0);
    });
    tl.to({}, { duration: 0.4 }, imgs.length - 1);
    ST.create({ trigger: root, start: 'top top', end: 'bottom bottom', scrub: 0.8, animation: tl });
  }

  /* ---------- 04 notes ---------- */
  function initNotes(root) {
    var layers = $$('[data-layer-i]', root), tint = $('[data-notes-tint]', root), halo = $('[data-halo]', root);
    var tints = (root.dataset.tints || '#e9cfc3,#b9636a,#3a1418').split(',');
    if (env.reduced) { gsap.set(layers, { opacity: 1 }); return; }
    var tl = gsap.timeline({ defaults: { ease: 'none' } });
    gsap.set(layers, { opacity: 0.18 });
    gsap.set($('[data-buy]', root), { opacity: 0, y: 12 });
    tl.fromTo($('.notes__stack', root), { y: 40, scale: 0.94 }, { y: 0, scale: 1, duration: 0.6, ease: 'power2.out' }, 0);
    var st = $$('[data-st]', root), groups = $$('[data-ing]', root);
    gsap.set(st.slice(1), { opacity: 0 });
    st.forEach(function (b, i) {
      var at = 0.2 + i;
      if (i) { tl.to(b, { opacity: 1, duration: 0.5, ease: 'power1.inOut' }, at); tl.to(st[i - 1], { opacity: 0, duration: 0.5, ease: 'power1.inOut' }, at + 0.1); }
      if (!groups[i]) return;
      $$('.ing', groups[i]).forEach(function (im, k) {
        var dd = Number(im.dataset.depth);
        tl.fromTo(im, { opacity: 0, y: function () { return innerHeight * (0.12 + dd * 0.1); }, rotation: k % 2 ? -8 : 8 }, { opacity: 1, y: 0, rotation: 0, duration: 0.7, ease: 'power2.out' }, at + k * 0.04);
        tl.to(im, { y: function () { return -innerHeight * dd * 0.035; }, duration: 0.5, ease: 'none' }, at + 0.7);
        if (i < 2) tl.to(im, { opacity: 0, y: function () { return -innerHeight * (0.1 + dd * 0.12); }, duration: 0.45, ease: 'power2.in' }, at + 1.05 + k * 0.03);
      });
    });
    $$('.notes__petal', root).forEach(function (p, k) {
      tl.fromTo(p, { y: function () { return -innerHeight * (0.25 + k * 0.08); }, rotation: -40 + k * 30, opacity: 1 }, { y: function () { return innerHeight * 1.15; }, rotation: 200 - k * 50, duration: 1.1, ease: 'none' }, 1.05 + k * 0.08);
    });
    layers.forEach(function (l, i) {
      tl.to(l, { opacity: 1, duration: 0.3 }, 0.4 + i);
      if (i) tl.to(layers[i - 1], { opacity: 0.45, duration: 0.3 }, 0.4 + i);
      tl.to(tint, { backgroundColor: tints[i] || tints[tints.length - 1], duration: 0.6 }, 0.2 + i);
      tl.to(halo, { scale: 1 + i * 0.35, opacity: 0.55 + i * 0.12, duration: 0.6 }, 0.2 + i);
    });
    tl.to(layers, { opacity: 1, duration: 0.3 }, 3.2);
    tl.to($('[data-buy]', root), { opacity: 1, y: 0, duration: 0.3 }, 3.3);
    tl.to({}, { duration: 0.5 }, 3.6);
    ST.create({ trigger: root, start: 'top top', end: 'bottom bottom', scrub: 0.8, animation: tl, onUpdate: function (s) { root.classList.toggle('is-dark', s.progress > 0.42); } });
    gsap.from($$('.notes__head .ln__in', root), { yPercent: 160, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: root, start: 'top 60%' } });

    if (env.finePointer) {
      var tx = 0, ty = 0, x = 0, y = 0, raf = 0;
      root.addEventListener('pointermove', function (e) { tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5; if (!raf) raf = requestAnimationFrame(loop); });
      var loop = function () {
        x += (tx - x) * 0.06; y += (ty - y) * 0.06;
        $$('.ing', root).forEach(function (im) { var dd = Number(im.dataset.depth) * 9; im.style.translate = (-x * dd).toFixed(2) + 'px ' + (-y * dd * 0.6).toFixed(2) + 'px'; });
        raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.0005 ? requestAnimationFrame(loop) : 0;
      };
    }
  }

  /* ---------- 05 collection: the active bottle big in the centre; drag, arrows, keys ---------- */
  function initSlider(section) {
    var root = $('[data-slider]', section);
    if (!root) return;
    var items = $$('[data-slide]', root), imgs = items.map(function (it) { return $('img, svg', it); });
    var bg = $('[data-coll-bg]', section), glow = $('[data-glow]', root), posEl = $('[data-pos]', section);
    var infos = $$('[data-info]', section);
    var dir = env.rtl ? -1 : 1, n = items.length, st = { pos: 0 }, active = -1, tween = null;
    var dragging = false, startX = 0, startPos = 0, lastX = 0, vel = 0, moved = 0;
    var pad = function (i) { return (i < 10 ? '0' : '') + i; };
    var S1 = function () { return Math.min(innerWidth * 0.26, 420) * (env.portrait() ? 1.25 : 1); };
    var S2 = function () { return S1() * 0.62; };
    function layout() {
      items.forEach(function (it, i) {
        var dd = i - st.pos, ad = Math.abs(dd), near = Math.min(ad, 1);
        var x = Math.sign(dd) * (near * S1() + Math.max(ad - 1, 0) * S2()) * dir;
        gsap.set(it, { x: x, xPercent: -50, scale: 1 - near * 0.48 - Math.max(ad - 1, 0) * 0.06,
          opacity: (1 - near * 0.2 - Math.max(ad - 1, 0) * 0.12) * Math.min(1, Math.max(0, (2.9 - ad) / 1.1)), zIndex: 10 - Math.round(ad) });
      });
      imgs.forEach(function (im, i) {
        if (!im) return;
        var ad = Math.abs(i - st.pos);
        im.style.filter = ad < 0.02 ? '' : 'blur(' + (Math.min(ad, 1) * 1.3 + Math.max(ad - 1, 0) * 0.9).toFixed(2) + 'px)';
      });
      setActive(Math.round(Math.max(0, Math.min(n - 1, st.pos))));
    }
    function setActive(i) {
      if (i === active) return;
      var first = active < 0;
      active = i;
      items.forEach(function (it, k) { it.classList.toggle('is-active', k === i); });
      if (posEl) posEl.textContent = pad(i + 1) + ' / ' + pad(n);
      gsap.to(bg, { backgroundColor: items[i].dataset.bg, duration: env.reduced ? 0 : 0.9, ease: 'power2.out' });
      glow.style.setProperty('--glow', items[i].dataset.glowColor);
      infos.forEach(function (el, k) { el.hidden = k !== i; });
      if (!first && !env.reduced && infos[i]) gsap.from($$('.ln__in', infos[i]), { yPercent: 160, duration: 0.7, stagger: 0.05, ease: 'expo.out' });
    }
    function go(i, dur) {
      i = Math.max(0, Math.min(n - 1, i));
      if (tween) tween.kill();
      tween = gsap.to(st, { pos: i, duration: env.reduced ? 0 : dur || 0.9, ease: 'expo.out', onUpdate: layout });
    }
    root.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || e.target.closest('.cf__arrow')) return;
      dragging = true; moved = 0; startX = lastX = e.clientX; startPos = st.pos; vel = 0; if (tween) tween.kill();
      root.classList.add('is-dragging');
    });
    var onMove = function (e) {
      if (!dragging) return;
      moved = Math.max(moved, Math.abs(e.clientX - startX));
      vel = e.clientX - lastX; lastX = e.clientX;
      var p = startPos - ((e.clientX - startX) / S1()) * dir;
      if (p < 0) p *= 0.3;
      if (p > n - 1) p = n - 1 + (p - (n - 1)) * 0.3;
      st.pos = p; layout();
    };
    var end = function () { if (!dragging) return; dragging = false; root.classList.remove('is-dragging'); go(Math.round(st.pos - (vel / S1()) * 6 * dir)); };
    addEventListener('pointermove', onMove);
    addEventListener('pointerup', end);
    addEventListener('pointercancel', end);
    root.addEventListener('click', function (e) {
      if (moved > 6) { e.preventDefault(); e.stopPropagation(); return; }
      var it = e.target.closest('[data-slide]');
      if (it && !it.classList.contains('is-active')) { e.preventDefault(); e.stopPropagation(); go(Number(it.dataset.slide)); }
    }, true);
    root.addEventListener('dragstart', function (e) { e.preventDefault(); });
    $('[data-prev]', root).addEventListener('click', function () { go(active - 1); });
    $('[data-next]', root).addEventListener('click', function () { go(active + 1); });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(active + dir); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(active - dir); }
    });
    addEventListener('resize', layout);
    layout();
    if (!env.reduced) $$('.collection__head .ln__in', section).forEach(function (el) {
      gsap.from(el, { yPercent: 160, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
    });
    return function () {
      removeEventListener('pointermove', onMove); removeEventListener('pointerup', end); removeEventListener('pointercancel', end); removeEventListener('resize', layout);
    };
  }

  /* ---------- 06 finale ---------- */
  function initFinale(root) {
    if (env.reduced) return;
    var tl = gsap.timeline({ defaults: { ease: 'none' } });
    var depth = { sky: 6, far: 14, mid: 24, near: 36 };
    $$('[data-fl]', root).forEach(function (l) { tl.fromTo(l, { yPercent: depth[l.dataset.fl] || 6 }, { yPercent: 0, duration: 1 }, 0); });
    tl.from($$('.finale__title .ln__in', root), { yPercent: 160, duration: 0.3, stagger: 0.08, ease: 'power3.out' }, 0.45);
    tl.from($$('.finale__copy .pill', root), { opacity: 0, duration: 0.2 }, 0.7);
    tl.fromTo($('[data-land]', root), { x: function () { return innerWidth * -0.18; }, y: function () { return -innerHeight * 0.7; }, rotation: -140, rotationX: 50 },
      { x: 0, y: 0, rotation: 8, rotationX: 0, duration: 0.9, ease: 'sine.out' }, 0.1);
    ST.create({ trigger: root, start: 'top bottom', end: 'bottom bottom', scrub: 0.9, animation: tl });
  }

  /* ---------- nav turns ink over light sections ---------- */
  function initNavTheme() {
    var nav = $('[data-nav]');
    if (!nav) return;
    $$('[data-origins], [data-collection], .main .color-scheme-1, .main .color-scheme-3').forEach(function (el) {
      ST.create({ trigger: el, start: 'top 60px', end: 'bottom 60px', onToggle: function (s) { nav.classList.toggle('nav--ink', s.isActive); } });
    });
    $$('[data-notes]').forEach(function (el) {
      ST.create({ trigger: el, start: 'top 60px', end: 'bottom 60px',
        onUpdate: function (s) { nav.classList.toggle('nav--ink', s.isActive && s.progress < 0.42); },
        onToggle: function (s) { if (!s.isActive) nav.classList.remove('nav--ink'); } });
    });
  }

  /* ---------- wiring: one gsap.context per section so the editor can reload it ---------- */
  var INIT = { sky: initSky, origins: initOrigins, notes: initNotes, collection: initSlider, finale: initFinale };
  var live = new Map();
  function mount(el) {
    var fn = INIT[el.dataset.section];
    if (!fn) return;
    var cleanup;
    var ctx = gsap.context(function () { cleanup = fn(el); }, el);
    live.set(el, function () { if (typeof cleanup === 'function') cleanup(); ctx.revert(); });
  }
  function unmountWithin(container) {
    live.forEach(function (kill, el) { if (container.contains(el)) { kill(); live.delete(el); } });
  }

  $$('[data-section]').forEach(mount);
  petals = cfg.settings.petals ? initPetals() : null;
  if (!petals) { var hp = $('[data-petal]'); if (hp) hp.remove(); }
  initNavTheme();
  if (env.reduced || env.design) document.addEventListener('azal:ready', function () { if (petals) petals.show(); }, { once: true });
  addEventListener('load', function () { ST.refresh(); });

  document.addEventListener('shopify:section:load', function (e) {
    $$('[data-section]', e.target).forEach(mount);
    ST.refresh();
  });
  document.addEventListener('shopify:section:unload', function (e) { unmountWithin(e.target); ST.refresh(); });
  document.addEventListener('shopify:section:select', function (e) {
    var el = e.target.querySelector('[data-section]');
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY);
  });
})();
