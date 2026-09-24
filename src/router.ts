// Real routes with history. The home film lives in <main>; every other page renders into #view.
// Between pages an ivory veil wipes over and away (≈ 0.5 s in total).
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { env } from './env';
import { lenis, scrollToY } from './smooth';
import { $ } from './util';

export type Cleanup = void | (() => void);
type Page = (el: HTMLElement, params: Record<string, string>) => Cleanup;
type Route = { re: RegExp; keys: string[]; load: () => Promise<Page> };

const routes: Route[] = [
  { re: /^\/shop\/?$/, keys: [], load: () => import('./pages/shop').then((m) => m.default) },
  { re: /^\/fragrance\/([\w-]+)\/?$/, keys: ['slug'], load: () => import('./pages/product').then((m) => m.default) },
  { re: /^\/checkout\/?$/, keys: [], load: () => import('./pages/checkout').then((m) => m.default) },
  { re: /^\/order\/([\w-]+)\/?$/, keys: ['id'], load: () => import('./pages/order').then((m) => m.default) },
];

let home: { show: () => void; hide: () => void } = { show() {}, hide() {} };
let cleanup: Cleanup;
let first = true;
let busy = false;
const listeners = new Set<(path: string) => void>();

export const isHome = (p = location.pathname) => p === '/' || p === '/index.html';
export function onRoute(f: (path: string) => void) { listeners.add(f); }
export function setHome(h: typeof home) { home = h; }

export function navigate(url: string, replace = false) {
  const u = new URL(url, location.href);
  if (u.pathname === location.pathname && !u.hash) { scrollToY(0, 1.2); return; }
  if (replace) history.replaceState(null, '', u.pathname + u.search + u.hash);
  else history.pushState(null, '', u.pathname + u.search + u.hash);
  return render();
}

async function render() {
  if (busy) return;
  busy = true;
  const path = location.pathname;
  const hash = location.hash.slice(1);
  const veil = $('[data-veil]');
  const animate = !first && !env.reduced;
  const fade = !first && env.reduced;

  if (animate) await gsap.fromTo(veil, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 0.26, ease: 'power3.in' });
  else if (fade) await gsap.fromTo(veil, { opacity: 0, clipPath: 'inset(0 0 0 0)' }, { opacity: 1, duration: 0.15 });

  if (typeof cleanup === 'function') cleanup();
  cleanup = undefined;
  const view = $('[data-pageview]');
  view.innerHTML = '';
  document.documentElement.classList.toggle('is-home', isHome(path));
  document.documentElement.classList.toggle('is-page', !isHome(path));

  if (isHome(path)) {
    view.hidden = true;
    home.show();
  } else {
    home.hide();
    view.hidden = false;
    const r = routes.find((x) => x.re.test(path));
    const m = r ? path.match(r.re)! : null;
    const params: Record<string, string> = {};
    r?.keys.forEach((k, i) => (params[k] = decodeURIComponent(m![i + 1])));
    const page = r ? await r.load() : (await import('./pages/notfound')).default;
    cleanup = page(view, params);
  }

  lenis?.scrollTo(0, { immediate: true, force: true });
  window.scrollTo(0, 0);
  ScrollTrigger.refresh();
  if (hash && isHome(path)) {
    const target = document.getElementById(hash);
    if (target) {
      const y = target.getBoundingClientRect().top + window.scrollY;
      lenis?.scrollTo(y, { immediate: true, force: true });
      window.scrollTo(0, y);
    }
  }
  listeners.forEach((f) => f(path));
  if (!first) (document.querySelector<HTMLElement>('[data-pageview]:not([hidden]) h1') || document.querySelector<HTMLElement>('main h1'))?.focus({ preventScroll: true });

  if (animate) gsap.to(veil, { clipPath: 'inset(0 0 100% 0)', duration: 0.32, ease: 'power3.out', delay: 0.02 });
  else if (fade) gsap.to(veil, { opacity: 0, duration: 0.2 });
  first = false;
  busy = false;
}

export function initRouter() {
  addEventListener('popstate', () => render());
  // any same-origin link to a path is a route change; "#x" links stay with the home page
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[href]');
    if (!a || a.target || a.hasAttribute('download')) return;
    const raw = a.getAttribute('href')!;
    if (raw.startsWith('#') || /^(mailto|tel|https?):/.test(raw)) return;
    const u = new URL(raw, location.href);
    if (u.origin !== location.origin) return;
    e.preventDefault();
    // "/#notes" from the home page: glide instead of reloading the film
    if (isHome(u.pathname) && isHome() && u.hash) {
      const target = document.getElementById(u.hash.slice(1));
      if (target) scrollToY(target.getBoundingClientRect().top + window.scrollY, 2.2);
      return;
    }
    navigate(u.pathname + u.search + u.hash);
  });
  return render();
}
