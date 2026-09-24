// 03 Origins · 04 Notes · 05 Collection (shop entry) · 06 Finale, plus the footer.
// Markup is built from the content + product files so EN/AR stay in one place.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { copy, lineMarkup } from './i18n';
import { env } from './env';
import { BRAND } from './config';
import { PRODUCTS, fromPrice, bySlug } from './data/products';
import { addToBag } from './ui/bag';
import { scrollToY } from './smooth';
import { $, $$, money, numName, t, esc, bottleImg } from './util';

const pic = (base: string, alt = '') =>
  `<picture><source media="(max-aspect-ratio: 1/1)" srcset="${base.replace('_d.', '_m.')}" /><img src="${base}" alt="${esc(alt)}" decoding="async" loading="lazy" /></picture>`;

// Notes ingredients, painted cut-outs like the hero clouds. [name, x%, y%, width vw, depth 1 far..3 near, mobile x%, y%, width vw]
type Ing = [string, number, number, number, number, number, number, number];
const ING: Ing[][] = [
  [['fruit', 57, 13, 8, 1, 70, 20, 22], ['saffron', 33, 30, 10, 2, 8, 30, 26], ['pepper', 57, 64, 7, 2, 72, 58, 18], ['slice', 14, 56, 18, 3, -6, 60, 42]],
  [['jasmine', 57, 12, 11, 1, 66, 22, 28], ['rose', 40, 7, 7, 1, 10, 26, 18], ['rose', 15, 52, 18, 3, -8, 58, 44]],
  [['amber', 34, 18, 6, 1, 12, 26, 16], ['oud', 58, 16, 9, 1, 68, 22, 24], ['amber', 57, 62, 9, 2, 72, 58, 22], ['oud', 12, 60, 21, 3, -6, 60, 46]],
];

export function buildStory() {
  const o = copy.origins;
  $('[data-origins]').innerHTML = `
    <div class="origins__stage" data-light>
      <div class="origins__media">
        ${o.chapters.map((ch, i) => `<figure class="origins__img" data-ch-img="${i}">${pic(`/assets/origins/${ch.key}_d.webp`, ch.alt)}</figure>`).join('')}
      </div>
      <div class="origins__copy">
        <p class="eyebrow" id="origins-label">03 — ${o.label}</p>
        <div class="origins__texts">
          ${o.chapters.map((ch, i) => `<article class="origins__ch" data-ch="${i}">
            <p class="origins__num"><span class="ln"><span class="ln__in">0${i + 1} / 04 · ${ch.name}</span></span></p>
            <h2 class="origins__title">${lineMarkup([ch.title])}</h2>
            <p class="origins__line">${lineMarkup([ch.line])}</p>
          </article>`).join('')}
        </div>
        <ol class="origins__index" aria-hidden="true">${o.chapters.map((ch, i) => `<li data-ch-dot="${i}"><span>0${i + 1}</span>${ch.name}</li>`).join('')}</ol>
      </div>
    </div>`;

  const n = copy.notes;
  const no1 = bySlug('rose-oud')!;
  $('[data-notes]').innerHTML = `
    <div class="notes__stage">
      <div class="notes__tint" data-notes-tint></div>
      <div class="notes__ing" aria-hidden="true">
        ${ING.map((g, i) => `<div class="ing-group" data-ing="${i}">${g.map(([n, x, y, w, d, xm, ym, wm]) =>
          `<img class="ing ing--d${d}" src="/assets/notes/${n}.webp" alt="" decoding="async" loading="lazy" data-depth="${d}"
            style="--x:${x}%;--y:${y}%;--w:${w}vw;--xm:${xm}%;--ym:${ym}%;--wm:${wm}vw" />`).join('')}</div>`).join('')}
        <div class="notes__petals" data-ing-petals>${['a', 'b', 'c', 'a', 'b'].map((k, i) => `<img class="notes__petal notes__petal--${i}" src="/assets/petal/petal_${k}.webp" alt="" loading="lazy" />`).join('')}</div>
      </div>
      <header class="notes__head">
        <p class="eyebrow">04 — ${n.label}</p>
        <h2 class="notes__title" id="notes-title">${lineMarkup([n.title])}</h2>
      </header>
      <a class="notes__bottle" href="/fragrance/${no1.slug}" data-view aria-label="${esc(numName(no1))}">
        <div class="notes__halo" data-halo></div>
        <span class="notes__stack">${['no1_top', 'no1_heart', 'no1'].map((k, i) => `<img class="notes__st" data-st="${i}" src="/assets/bottle/${k}_front.webp" alt="${i === 2 ? esc(copy.bottleAlt) : ''}" decoding="async" loading="lazy" />`).join('')}</span>
      </a>
      <ol class="notes__list">
        ${n.layers.map((l, i) => `<li class="notes__layer" data-layer-i="${i}">
          <span class="notes__n">${l.n}</span><span class="notes__name">${l.name}</span><span class="notes__notes">${l.notes}</span>
        </li>`).join('')}
      </ol>
      <p class="notes__buy" data-buy>
        <span>${n.buyLine} · ${money(no1.sizes[0].price)}</span>
        <button class="btn btn--line btn--sm" type="button" data-add="${no1.id}" data-size="${no1.sizes[0].id}">${copy.product.add}</button>
      </p>
    </div>`;

  const c = copy.collection;
  $('[data-collection]').innerHTML = `
    <div class="collection__bg" data-coll-bg></div>
    <header class="collection__head">
      <p class="eyebrow">05 — ${c.label}</p>
      <h2 class="collection__title" id="collection-title">${lineMarkup([c.title])}</h2>
    </header>
    <div class="cf" data-slider data-drag>
      <div class="cf__glow" data-glow aria-hidden="true"></div>
      <ul class="cf__track">
        ${PRODUCTS.map((p, i) => `<li class="cf__item" data-slide="${i}">
          <a href="/fragrance/${p.slug}" tabindex="-1" aria-hidden="true" draggable="false">${bottleImg(p, 'front', '', '')}</a>
        </li>`).join('')}
      </ul>
      <button class="cf__arrow cf__arrow--prev" type="button" data-prev aria-label="${c.prev}"><span aria-hidden="true">←</span></button>
      <button class="cf__arrow cf__arrow--next" type="button" data-next aria-label="${c.next}"><span aria-hidden="true">→</span></button>
    </div>
    <div class="cf__info" data-cf-info aria-live="polite"></div>
    <div class="collection__foot">
      <span class="slider__pos" data-pos>01 / 0${PRODUCTS.length}</span>
      <a class="link" href="/shop">${c.viewAll}</a>
    </div>`;

  const f = copy.finale;
  $('[data-finale]').innerHTML = `
    <div class="finale__stage">
      ${['sky', 'far', 'mid', 'near'].map((l) => `<div class="finale__layer finale__layer--${l}" data-fl="${l}"><picture><source media="(max-aspect-ratio: 1/1)" srcset="/assets/sky/m/dusk_${l}.webp" /><img src="/assets/sky/d/dusk_${l}.webp" alt="" decoding="async" loading="lazy" /></picture></div>`).join('')}
      <div class="finale__copy">
        <h2 class="finale__title" id="finale-title"><span class="ln"><span class="ln__in">${f.top}</span></span><span class="ln"><span class="ln__in"><em>${f.bottom}</em></span></span></h2>
        <a class="pill" href="#top" data-to-top>${f.cta}</a>
      </div>
      <div class="finale__ground"></div>
      <img class="finale__petal" data-land src="/assets/petal/petal_c.webp" alt="" decoding="async" loading="lazy" />
    </div>`;
  const ft = copy.footer;
  $('[data-footer]').innerHTML = `
    <svg class="footer__mark" viewBox="0 0 40 56" aria-hidden="true"><use href="#emblem" /></svg>
    <nav class="footer__links" aria-label="Footer">
      <a href="/shop">${ft.shop}</a>
      <a href="/shop#delivery">${ft.delivery}</a>
      <a href="${BRAND.studioUrl}" target="_blank" rel="noopener">${ft.contact}</a>
    </nav>
    <p class="footer__note"><a href="${BRAND.studioUrl}" target="_blank" rel="noopener">${ft.note}</a></p>`;

  document.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('[data-add]');
    if (b) addToBag(b.dataset.add!, b.dataset.size!, 1, b);
    if ((e.target as Element).closest('[data-to-top]')) { e.preventDefault(); scrollToY(0, 3.2); }
  });
}

export function initStory() {
  initSlider();
  initNavTheme();
  if (env.reduced) return;
  initOrigins();
  initNotes();
  initFinale();
  // plain reveals for headings outside the pinned stages
  $$('.collection__head .ln__in').forEach((el) =>
    gsap.from(el, { yPercent: 160, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } }));
}

function initOrigins() {
  const root = $('[data-origins]');
  const imgs = $$('[data-ch-img]', root);
  const chs = $$('[data-ch]', root);
  const dots = $$('[data-ch-dot]', root);
  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  gsap.set(chs.slice(1).flatMap((c) => $$('.ln__in', c)), { yPercent: 185 });
  gsap.set(chs.slice(1), { autoAlpha: 0 }); // hidden chapters are invisible, not just moved out of their masks
  gsap.set(imgs.slice(1), { clipPath: 'inset(100% 0 0 0)' });
  imgs.forEach((im, i) => {
    const at = i;
    if (i > 0) {
      tl.to(im, { clipPath: 'inset(0% 0 0 0)', duration: 0.6, ease: 'power2.inOut' }, at - 0.3);
      tl.fromTo($('picture', im), { scale: 1.18 }, { scale: 1, duration: 1.1, ease: 'power1.out' }, at - 0.3);
      tl.to(imgs[i - 1].querySelector('picture'), { yPercent: -8, duration: 0.6, ease: 'power2.inOut' }, at - 0.3);
      // explicit from/to so scrubbing up and down always lands on the right chapter
      tl.fromTo($$('.ln__in', chs[i - 1]), { yPercent: 0 }, { yPercent: -185, duration: 0.18, stagger: 0.02, ease: 'power2.in', immediateRender: false }, at - 0.34);
      tl.set(chs[i], { autoAlpha: 1 }, at - 0.34);
      tl.set(chs[i - 1], { autoAlpha: 0 }, at - 0.15);
      tl.fromTo($$('.ln__in', chs[i]), { yPercent: 185 }, { yPercent: 0, duration: 0.28, stagger: 0.04, ease: 'power3.out', immediateRender: false }, at - 0.14);
      tl.call(() => dots.forEach((d, k) => d.classList.toggle('is-on', k === i)), [], at - 0.1);
      tl.call(() => dots.forEach((d, k) => d.classList.toggle('is-on', k === i - 1)), [], at - 0.11);
    } else {
      tl.fromTo($('picture', im), { scale: 1.12 }, { scale: 1, duration: 0.7 }, 0);
    }
  });
  tl.to({}, { duration: 0.4 }, imgs.length - 1); // hold on the last chapter
  dots[0].classList.add('is-on');
  ScrollTrigger.create({ trigger: root, start: 'top top', end: 'bottom bottom', scrub: 0.8, animation: tl });
}

function initNotes() {
  const root = $('[data-notes]');
  const layers = $$('[data-layer-i]', root);
  const tint = $('[data-notes-tint]', root);
  const halo = $('[data-halo]', root);
  const tints = ['#e9cfc3', '#b9636a', '#3a1418'];
  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  gsap.set(layers, { opacity: 0.18 });
  gsap.set('[data-buy]', { opacity: 0, y: 12 });
  tl.fromTo($('.notes__stack', root), { y: 40, scale: 0.94 }, { y: 0, scale: 1, duration: 0.6, ease: 'power2.out' }, 0);
  // each layer: the bottle fills a little more and its ingredient rises behind it
  const st = $$('[data-st]', root), groups = $$('[data-ing]', root);
  gsap.set(st.slice(1), { opacity: 0 });
  st.forEach((b, i) => {
    const at = 0.2 + i;
    if (i) tl.to(b, { opacity: 1, duration: 0.5, ease: 'power1.inOut' }, at);
    if (i) tl.to(st[i - 1], { opacity: 0, duration: 0.5, ease: 'power1.inOut' }, at + 0.1);
    // ingredients rise in, near ones travel further (parallax), then drift up and away for the next note
    $$('.ing', groups[i]).forEach((im, k) => {
      const d = Number(im.dataset.depth);
      tl.fromTo(im, { opacity: 0, y: () => innerHeight * (0.12 + d * 0.1), rotation: k % 2 ? -8 : 8 },
        { opacity: 1, y: 0, rotation: 0, duration: 0.7, ease: 'power2.out' }, at + k * 0.04);
      tl.to(im, { y: () => -innerHeight * d * 0.035, duration: 0.5, ease: 'none' }, at + 0.7);
      if (i < 2) tl.to(im, { opacity: 0, y: () => -innerHeight * (0.1 + d * 0.12), duration: 0.45, ease: 'power2.in' }, at + 1.05 + k * 0.03);
    });
  });
  initIngPointer(root);
  // heart: petals fall past the bottle
  $$('.notes__petal', root).forEach((p, k) => tl.fromTo(p, { y: () => -innerHeight * (0.25 + k * 0.08), rotation: -40 + k * 30, opacity: 1 },
    { y: () => innerHeight * 1.15, rotation: 200 - k * 50, duration: 1.1, ease: 'none' }, 1.05 + k * 0.08));
  layers.forEach((l, i) => {
    tl.to(l, { opacity: 1, duration: 0.3 }, 0.4 + i);
    if (i) tl.to(layers[i - 1], { opacity: 0.45, duration: 0.3 }, 0.4 + i);
    tl.to(tint, { backgroundColor: tints[i], duration: 0.6 }, 0.2 + i);
    tl.to(halo, { scale: 1 + i * 0.35, opacity: 0.55 + i * 0.12, duration: 0.6 }, 0.2 + i);
  });
  tl.to(layers, { opacity: 1, duration: 0.3 }, 3.2);
  tl.to('[data-buy]', { opacity: 1, y: 0, duration: 0.3 }, 3.3);
  tl.to({}, { duration: 0.5 }, 3.6);
  ScrollTrigger.create({
    trigger: root, start: 'top top', end: 'bottom bottom', scrub: 0.8, animation: tl,
    onUpdate: (s) => root.classList.toggle('is-dark', s.progress > 0.42),
  });
  gsap.from($$('.notes__head .ln__in', root), { yPercent: 160, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: root, start: 'top 60%' } });
}

/** Tiny pointer parallax on the ingredient layers, like the hero clouds. */
function initIngPointer(root: HTMLElement) {
  if (!env.finePointer) return;
  const groups = $$('[data-ing]', root);
  let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
  root.addEventListener('pointermove', (e) => {
    tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5;
    if (!raf) raf = requestAnimationFrame(loop);
  });
  function loop() {
    x += (tx - x) * 0.06; y += (ty - y) * 0.06;
    groups.forEach((g) => $$<HTMLElement>('.ing', g).forEach((im) => {
      const d = Number(im.dataset.depth) * 9;
      im.style.translate = `${(-x * d).toFixed(2)}px ${(-y * d * 0.6).toFixed(2)}px`;
    }));
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.0005 ? requestAnimationFrame(loop) : 0;
  }
}

function initFinale() {
  const root = $('[data-finale]');
  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  const depth: Record<string, number> = { sky: 6, far: 14, mid: 24, near: 36 };
  $$('[data-fl]', root).forEach((l) => tl.fromTo(l, { yPercent: depth[l.dataset.fl!] }, { yPercent: 0, duration: 1 }, 0));
  tl.from($$('.finale__title .ln__in', root), { yPercent: 160, duration: 0.3, stagger: 0.08, ease: 'power3.out' }, 0.45);
  tl.from('.finale__copy .pill', { opacity: 0, duration: 0.2 }, 0.7);
  // the petal drifts down and lands on the horizon line
  tl.fromTo('[data-land]', { x: () => innerWidth * -0.18, y: () => -innerHeight * 0.7, rotation: -140, rotationX: 50 },
    { x: 0, y: 0, rotation: 8, rotationX: 0, duration: 0.9, ease: 'sine.out' }, 0.1);
  ScrollTrigger.create({ trigger: root, start: 'top bottom', end: 'bottom bottom', scrub: 0.9, animation: tl });
}

/** Jazean-style switch: the active bottle big in the centre, the others small, dim and soft on the sides. Drag, arrows, keys. */
function initSlider() {
  const root = $('[data-slider]');
  const items = $$('[data-slide]', root);
  const imgs = items.map((it) => $('img', it));
  const bg = $('[data-coll-bg]');
  const glow = $('[data-glow]', root);
  const info = $('[data-cf-info]');
  const posEl = $('[data-pos]');
  const c = copy.collection;
  const dir = document.documentElement.dir === 'rtl' ? -1 : 1;
  const n = items.length;
  const st = { pos: 0 };
  let active = -1, tween: gsap.core.Tween | undefined;
  let dragging = false, startX = 0, startPos = 0, lastX = 0, vel = 0, moved = 0;

  const S1 = () => Math.min(innerWidth * 0.26, 420) * (env.portrait() ? 1.25 : 1); // centre → neighbour
  const S2 = () => S1() * 0.62;                                                        // further out
  function layout() {
    items.forEach((it, i) => {
      const d = i - st.pos, ad = Math.abs(d), near = Math.min(ad, 1);
      const x = Math.sign(d) * (near * S1() + Math.max(ad - 1, 0) * S2()) * dir;
      gsap.set(it, {
        x, scale: 1 - near * 0.48 - Math.max(ad - 1, 0) * 0.06,
        xPercent: -50,
        // far ones fade out gradually towards the edge instead of popping
        opacity: (1 - near * 0.2 - Math.max(ad - 1, 0) * 0.12) * Math.min(1, Math.max(0, (2.9 - ad) / 1.1)),
        zIndex: 10 - Math.round(ad),
      });
    });
    // soft focus on the image itself (sharp raster first, then a light blur)
    imgs.forEach((im, i) => {
      const ad = Math.abs(i - st.pos);
      im.style.filter = ad < 0.02 ? '' : `blur(${(Math.min(ad, 1) * 1.3 + Math.max(ad - 1, 0) * 0.9).toFixed(2)}px)`;
    });
    setActive(Math.round(Math.max(0, Math.min(n - 1, st.pos))));
  }
  function setActive(i: number) {
    if (i === active) return;
    const first = active < 0;
    active = i;
    const p = PRODUCTS[i];
    items.forEach((it, k) => it.classList.toggle('is-active', k === i));
    posEl.textContent = `0${i + 1} / 0${n}`;
    gsap.to(bg, { backgroundColor: p.color.bg, duration: env.reduced ? 0 : 0.9, ease: 'power2.out' });
    glow.style.setProperty('--glow', p.color.liquid);
    info.innerHTML = `
      <h3 class="cf__name"><span class="ln"><span class="ln__in"><a href="/fragrance/${p.slug}">${esc(numName(p))}</a></span></span></h3>
      <p class="cf__char"><span class="ln"><span class="ln__in">${t(p.character)} · ${c.from} ${money(fromPrice(p))}</span></span></p>
      <p class="cf__actions"><a class="link" href="/fragrance/${p.slug}">${c.discover}</a>
        <button class="link link--quiet" type="button" data-add="${p.id}" data-size="${p.sizes[0].id}">${c.add}</button></p>`;
    if (!first && !env.reduced) gsap.from($$('.ln__in', info), { yPercent: 160, duration: 0.7, stagger: 0.05, ease: 'expo.out' });
  }
  function go(i: number, dur = 0.9) {
    i = Math.max(0, Math.min(n - 1, i));
    tween?.kill();
    tween = gsap.to(st, { pos: i, duration: env.reduced ? 0 : dur, ease: 'expo.out', onUpdate: layout });
  }

  root.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || (e.target as Element).closest('.cf__arrow')) return;
    dragging = true; moved = 0; startX = lastX = e.clientX; startPos = st.pos; vel = 0; tween?.kill();
    root.classList.add('is-dragging');
  });
  addEventListener('pointermove', (e) => {
    if (!dragging) return;
    moved = Math.max(moved, Math.abs(e.clientX - startX));
    vel = e.clientX - lastX; lastX = e.clientX;
    let p = startPos - ((e.clientX - startX) / S1()) * dir;
    if (p < 0) p *= 0.3;
    if (p > n - 1) p = n - 1 + (p - (n - 1)) * 0.3; // soft ends
    st.pos = p; layout();
  });
  const end = () => {
    if (!dragging) return;
    dragging = false; root.classList.remove('is-dragging');
    go(Math.round(st.pos - (vel / S1()) * 6 * dir));
  };
  addEventListener('pointerup', end);
  addEventListener('pointercancel', end);
  root.addEventListener('click', (e) => {
    if (moved > 6) { e.preventDefault(); e.stopPropagation(); return; }
    // a click on a side bottle brings it to the centre
    const it = (e.target as Element).closest<HTMLElement>('[data-slide]');
    if (it && !it.classList.contains('is-active')) { e.preventDefault(); e.stopPropagation(); go(Number(it.dataset.slide)); }
  }, true);
  root.addEventListener('dragstart', (e) => e.preventDefault());
  $('[data-prev]', root).addEventListener('click', () => go(active - 1));
  $('[data-next]', root).addEventListener('click', () => go(active + 1));
  root.tabIndex = 0;
  root.setAttribute('aria-label', c.label);
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(active + dir); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(active - dir); }
  });
  addEventListener('resize', layout);
  layout();
}

/** Nav turns ink over light sections. */
function initNavTheme() {
  const nav = $('[data-nav]');
  const light = ['[data-origins]', '[data-collection]'];
  light.forEach((sel) => ScrollTrigger.create({
    trigger: sel, start: 'top 60px', end: 'bottom 60px',
    onToggle: (s) => nav.classList.toggle('nav--ink', s.isActive),
  }));
  ScrollTrigger.create({
    trigger: '[data-notes]', start: 'top 60px', end: 'bottom 60px',
    onUpdate: (s) => nav.classList.toggle('nav--ink', s.isActive && s.progress < 0.42),
    onToggle: (s) => { if (!s.isActive) nav.classList.remove('nav--ink'); },
  });
}

