// 01 hero sky + 02 descent through the clouds to the bottle.
// Ownership: GSAP owns .layer / .ground / .bottle / .mist transforms; the pointer loop owns .layer__in only.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { env } from './env';
import { scrollToY } from './smooth';
import { BottleSequence } from './bottle';

export let skyTrigger: ScrollTrigger | null = null;

const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T;
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll(s)) as T[];

// the whole pinned journey is one timeline of length 1
export const MARK = { heroOut: 0.06, mistIn: 0.27, mistFull: 0.37, reveal: 0.52, settle: 0.66, words: 0.7, end: 1 };

export function initSky() {
  const sky = $('[data-sky]');
  const layer = (n: string) => $(`[data-layer="${n}"]`);
  const heroBits = $$('[data-hero-copy] > .eyebrow, .hero-copy__word, .hero-copy__tag, .hero-copy__cta');
  const lines = $$('[data-manifesto] .ln__in');
  const label = $('[data-manifesto] .manifesto__label');
  const bottle = $('[data-bottle]');
  const seqCanvas = $<HTMLCanvasElement>('[data-bottle-seq]');
  const sweep = $('[data-sweep]');
  const [mistA, mistB] = $$('.mist__card');

  const seq = new BottleSequence(seqCanvas, '/assets/bottle/no1_turn/', 25);
  sweep.style.setProperty('--bottle-mask', `url('/assets/bottle/no1_turn/0012.webp')`);

  gsap.set(bottle, { xPercent: -50, yPercent: env.portrait() ? -64 : -56 });

  if (env.reduced) {
    // composed still: the bottle and manifesto get their own wine scene under the hero
    const still = document.createElement('section');
    still.className = 'still-scene';
    still.append(bottle, $('[data-manifesto]'));
    sky.after(still);
    seq.load().then(() => seq.draw(12));
    return;
  }

  const portrait = env.portrait();
  const tl = gsap.timeline({ defaults: { ease: 'none' }, paused: true });

  // hero copy leaves first, lines rising out of view — no fade-only
  tl.to(heroBits, { yPercent: -60, opacity: 0, ease: 'power2.in', stagger: 0.008, duration: MARK.heroOut }, 0.004);
  tl.to('[data-scroll-cue]', { opacity: 0, duration: 0.04 }, 0);

  // camera descends: each depth moves at its own speed
  tl.to(layer('sky'), { yPercent: -14, duration: 0.5 }, 0);
  tl.to(layer('far'), { yPercent: -34, duration: 0.5 }, 0);
  tl.to('[data-petals="back"]', { yPercent: -40, opacity: 0, duration: 0.3 }, 0);
  tl.to(layer('mid'), { yPercent: -78, scale: 1.12, duration: 0.5, transformOrigin: '50% 100%' }, 0);
  tl.to('[data-ground]', { yPercent: -92, duration: 0.5, ease: 'power1.inOut' }, 0.02);
  tl.to(layer('front'), { yPercent: -150, scale: 2.2, duration: 0.36, ease: 'power1.in', transformOrigin: '50% 100%' }, 0.02);
  tl.to(layer('front'), { opacity: 0, duration: 0.06 }, 0.32);
  tl.to('[data-petals="front"]', { yPercent: -80, opacity: 0, duration: 0.28 }, 0.02);
  tl.fromTo('[data-dusken]', { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power1.in' }, 0.16);

  // through the mist: it closes over everything, then parts around the bottle
  tl.fromTo(mistA, { opacity: 0, xPercent: -18, yPercent: 30, scale: 1.25 }, { opacity: 1, xPercent: 6, yPercent: 0, scale: 1, duration: MARK.mistFull - MARK.mistIn, ease: 'power1.out' }, MARK.mistIn);
  tl.fromTo(mistB, { opacity: 0, xPercent: 18, yPercent: 36, scale: 1.3 }, { opacity: 1, xPercent: -6, yPercent: 0, scale: 1, duration: MARK.mistFull - MARK.mistIn, ease: 'power1.out' }, MARK.mistIn + 0.02);
  tl.to(mistA, { xPercent: -78, yPercent: -12, scale: 1.55, opacity: 0, duration: MARK.reveal - MARK.mistFull + 0.04, ease: 'power2.in' }, MARK.mistFull + 0.02);
  tl.to(mistB, { xPercent: 78, yPercent: -16, scale: 1.6, opacity: 0, duration: MARK.reveal - MARK.mistFull + 0.04, ease: 'power2.in' }, MARK.mistFull + 0.03);

  // the bottle rises with the ground, then settles and turns a few degrees
  tl.fromTo(bottle, { y: () => innerHeight * 0.75, scale: 0.9, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: MARK.settle - 0.3, ease: 'power2.out' }, 0.3);
  const turn = { f: 0 };
  tl.to(turn, { f: 12, duration: MARK.words + 0.12 - 0.4, ease: 'power1.inOut', onUpdate: () => seq.draw(turn.f) }, 0.4);
  tl.fromTo(sweep, { backgroundPosition: '100% 0' }, { backgroundPosition: '0% 0', duration: 0.2, ease: 'power1.inOut' }, MARK.settle - 0.04);

  // manifesto: one line after another, inside their masks
  tl.fromTo(label, { opacity: 0 }, { opacity: 0.6, duration: 0.05 }, MARK.words - 0.02);
  gsap.set(lines, { yPercent: 160 });
  tl.to(lines, { yPercent: 0, duration: 0.09, stagger: 0.05, ease: 'power3.out' }, MARK.words);
  // exit before the stage scrolls away: the product never slides up under the nav
  tl.to(bottle, { opacity: 0, scale: 0.94, y: () => -innerHeight * 0.04, duration: 0.07, ease: 'power2.in' }, 0.93);
  tl.to(lines, { yPercent: -160, duration: 0.05, stagger: 0.01, ease: 'power2.in' }, 0.93);
  tl.to(label, { opacity: 0, duration: 0.04 }, 0.93);

  skyTrigger = ScrollTrigger.create({
    trigger: sky,
    start: 'top top',
    end: 'bottom bottom',
    scrub: portrait ? 0.6 : 0.9,
    animation: tl,
    invalidateOnRefresh: true,
  });

  seq.load().then(() => seq.draw(turn.f));

  // "Begin the journey": glide to the settled bottle so the descent plays on the way
  $('[data-begin]').addEventListener('click', (e) => {
    e.preventDefault();
    const top = sky.offsetTop;
    const dist = sky.offsetHeight - innerHeight;
    scrollToY(top + dist * (MARK.words + 0.2), env.capture ? 7 : 4.2, env.capture);
  });

  initPointerDepth();
}

/** Tiny viewpoint shift with the pointer, desktop only. Foreground moves most. */
function initPointerDepth() {
  if (!env.finePointer || env.reduced) return;
  const ins = $$('[data-layer]').map((l) => ({ el: l.querySelector('.layer__in') as HTMLElement, d: Number(l.dataset.depth) || 6 }));
  let tx = 0, ty = 0, x = 0, y = 0, raf = 0, active = true;
  addEventListener('pointermove', (e) => {
    tx = e.clientX / innerWidth - 0.5;
    ty = e.clientY / innerHeight - 0.5;
    if (!raf && active) raf = requestAnimationFrame(loop);
  }, { passive: true });
  ScrollTrigger.create({ trigger: '[data-sky]', start: 'top top', end: 'bottom top', onToggle: (s) => (active = s.isActive) });
  function loop() {
    x += (tx - x) * 0.06; y += (ty - y) * 0.06;
    for (const { el, d } of ins) el.style.transform = `translate3d(${(-x * d).toFixed(2)}px, ${(-y * d * 0.6).toFixed(2)}px, 0)`;
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.0005 && active ? requestAnimationFrame(loop) : 0;
  }
}
