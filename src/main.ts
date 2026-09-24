import './styles.css';
import './shop.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { applyCopy } from './i18n';
import { env } from './env';
import { initSmooth, lenis, scrollToY } from './smooth';
import { initSky, skyTrigger } from './sky';
import { initPetals } from './petals';
import { initCursor } from './cursor';
import { runLoader } from './loader';
import { buildStory, initStory } from './story';
import { initBag } from './ui/bag';
import { initRouter, isHome, setHome, onRoute } from './router';
import { $, $$ } from './util';

buildStory();
applyCopy();
history.scrollRestoration = 'manual';
initBag();
initMenu();

const startHome = isHome();
const main = $('main');
const heroImages = startHome
  ? Array.from(document.querySelectorAll<HTMLImageElement>('.layer img')).map((im) =>
      im.complete ? Promise.resolve() : new Promise<void>((r) => { im.onload = im.onerror = () => r(); }))
  : [];

initSmooth();
lenis?.stop();
initCursor();
const petals = initPetals(() => skyTrigger);

// the hero's own entrance: sky settles, lines rise inside their masks
function intro() {
  if (env.reduced) return;
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.from('.layer picture', { scale: 1.08, duration: 2.4, stagger: 0.06, ease: 'power3.out' }, 0);
  tl.from('.hero-copy .ln__in', { yPercent: 160, duration: 1.3, stagger: 0.11 }, 0.15);
  tl.from('.hero-copy__cta', { opacity: 0, duration: 1.0, ease: 'power2.out' }, 0.7);
  tl.from('.nav__pill', { opacity: 0, y: -10, duration: 1.0, ease: 'power2.out' }, 0.5);
  tl.from('.corner > *', { opacity: 0, duration: 1.0 }, 0.9);
  tl.call(() => petals.show(), [], 0.4);
}

// The film is built once, the first time the home route is shown. Leaving it only hides it.
let homeBuilt = false;
setHome({
  show() {
    main.hidden = false;
    $('.petal').hidden = false;
    if (!homeBuilt) {
      homeBuilt = true;
      initSky();
      initStory();
      if (!startHome) petals.show();
    } else ScrollTrigger.getAll().forEach((st) => st.enable(false));
  },
  hide() {
    ScrollTrigger.getAll().forEach((st) => st.disable(false));
    main.hidden = true;
    $('.petal').hidden = true;
    $('[data-nav]').classList.remove('nav--ink');
  },
});

document.fonts.ready.then(async () => {
  await initRouter();
  // after a language switch, land back where the reader was
  const y = Number(sessionStorage.getItem('azal-y') || 0);
  sessionStorage.removeItem('azal-y');
  ScrollTrigger.refresh();
  if (y) { window.scrollTo(0, y); lenis?.scrollTo(y, { immediate: true }); }
  await runLoader(Promise.all(heroImages));
  lenis?.start();
  if (startHome) {
    intro();
    if (env.capture && new URLSearchParams(location.search).get('auto') !== '0') startCapture();
  }
});

onRoute(() => closeMenu());

// on-page anchors: glide, never jump
document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]:not([data-begin]):not([data-to-top])').forEach((a) =>
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href')!.slice(1);
    const target = id === 'top' ? document.body : document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    scrollToY(id === 'top' ? 0 : target.getBoundingClientRect().top + window.scrollY, 2.2);
  }),
);

/** Phones: full-screen menu. */
function initMenu() {
  const menu = $('[data-menu]');
  const btn = $('[data-menu-open]');
  btn.addEventListener('click', () => {
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    lenis?.stop();
    if (!env.reduced) {
      gsap.fromTo(menu, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.6, ease: 'expo.out' });
      gsap.from($$('.menu__list > *', menu), { yPercent: 60, opacity: 0, duration: 0.8, stagger: 0.05, ease: 'expo.out', delay: 0.1 });
    }
    $('[data-menu-close]', menu).focus();
  });
  $('[data-menu-close]', menu).addEventListener('click', () => closeMenu(true));
  menu.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(true); });
}
function closeMenu(focus = false) {
  const menu = $('[data-menu]');
  if (menu.hidden) return;
  menu.hidden = true;
  $('[data-menu-open]').setAttribute('aria-expanded', 'false');
  lenis?.start();
  if (focus) $('[data-menu-open]').focus();
}

/** ?capture=1 — no loader, no cursor ring, no scroll cue; one steady scroll of the whole journey. R restarts. */
function startCapture() {
  const run = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    lenis?.scrollTo(0, { immediate: true });
    setTimeout(() => scrollToY(max, (max - window.scrollY) / env.captureSpeed, true), 1500);
  };
  run();
  addEventListener('keydown', (e) => { if (e.key === 'r' || e.key === 'R') run(); });
}
