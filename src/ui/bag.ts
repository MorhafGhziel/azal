// The bag: nav count, side drawer, "added" toast. All numbers come from store/cart.
import { gsap } from 'gsap';
import { copy } from '../i18n';
import { env } from '../env';
import { lenis } from '../smooth';
import * as cart from '../store/cart';
import { byId } from '../data/products';
import { $, $$, money, numName, t, esc, bottleImg } from '../util';

const c = copy.cart;
let drawer: HTMLElement, panel: HTMLElement, list: HTMLElement, foot: HTMLElement, toastEl: HTMLElement;
let lastFocus: HTMLElement | null = null;
let toastTimer = 0;

export function initBag() {
  document.body.insertAdjacentHTML('beforeend', `
    <div class="drawer" data-drawer hidden>
      <div class="drawer__dim" data-close></div>
      <aside class="drawer__panel" role="dialog" aria-modal="true" aria-labelledby="bag-title" tabindex="-1">
        <header class="drawer__head">
          <h2 class="drawer__title" id="bag-title"></h2>
          <button class="drawer__x" type="button" data-close aria-label="${c.close}"><span aria-hidden="true">✕</span></button>
        </header>
        <div class="drawer__body" data-lenis-prevent><ul class="bag-lines" data-lines></ul></div>
        <footer class="drawer__foot" data-foot></footer>
      </aside>
    </div>
    <div class="toast" data-toast role="status" aria-live="polite"></div>`);
  drawer = $('[data-drawer]');
  panel = $('.drawer__panel', drawer);
  list = $('[data-lines]', drawer);
  foot = $('[data-foot]', drawer);
  toastEl = $('[data-toast]');

  drawer.addEventListener('click', (e) => {
    const el = e.target as HTMLElement;
    if (el.closest('[data-close]')) return close();
    const q = el.closest<HTMLElement>('[data-q]');
    if (q) {
      const { id, size, d } = q.dataset;
      const line = cart.getCart().lines.find((l) => l.id === id && l.size === size);
      if (line) cart.setQty(id!, size!, line.qty + Number(d));
      return;
    }
    const rm = el.closest<HTMLElement>('[data-rm]');
    if (rm) { cart.remove(rm.dataset.id!, rm.dataset.size!); panel.focus(); return; }
    if (el.closest('a[href]')) close(false);
  });
  drawer.addEventListener('change', (e) => {
    const el = e.target as HTMLInputElement;
    if (el.name === 'gift') cart.setGift(el.checked);
  });
  drawer.addEventListener('input', (e) => {
    const el = e.target as HTMLTextAreaElement;
    if (el.name === 'giftMsg') cart.setGift(true, el.value);
  });
  drawer.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if (e.key === 'Tab') trap(e);
  });
  $$('[data-bag]').forEach((b) => b.addEventListener('click', () => open()));

  let prev = cart.count();
  cart.subscribe((state) => {
    const n = cart.count(state);
    $$('[data-bag-count]').forEach((el) => tick(el, n, n > prev));
    $$('[data-bag]').forEach((b) => b.setAttribute('aria-label', `${copy.nav.bag} (${n})`));
    prev = n;
    renderDrawer(state);
  });
}

/** The count swaps inside a small mask: old number slides out, new one slides in. */
function tick(el: HTMLElement, n: number, up: boolean) {
  const cur = el.lastElementChild?.textContent ?? '';
  if (cur === String(n)) return;
  const inn = document.createElement('span');
  inn.textContent = String(n);
  if (env.reduced || cur === '') { el.replaceChildren(inn); return; }
  const out = el.lastElementChild as HTMLElement;
  out.classList.add('tick-out');
  el.append(inn);
  gsap.to(out, { yPercent: up ? -100 : 100, duration: 0.45, ease: 'power3.inOut', onComplete: () => out.remove() });
  gsap.from(inn, { yPercent: up ? 100 : -100, duration: 0.45, ease: 'power3.inOut' });
}

function renderDrawer(state: cart.Cart) {
  const tot = cart.totals(null, state);
  $('#bag-title').textContent = `${c.title} (${tot.count})`;
  if (!state.lines.length) {
    list.innerHTML = `<li class="bag-empty"><p>${c.empty}</p><a class="link" href="/shop">${c.discover}</a></li>`;
    foot.innerHTML = '';
    foot.hidden = true;
    return;
  }
  foot.hidden = false;
  list.innerHTML = state.lines.map((l) => {
    const r = cart.resolve(l)!;
    const p = r.product;
    return `<li class="bag-line">
      <a class="bag-line__img" href="/fragrance/${p.slug}" style="--bg:${p.color.bg}">${bottleImg(p, 'thumb', '', '')}</a>
      <div class="bag-line__info">
        <p class="bag-line__name"><a href="/fragrance/${p.slug}">${esc(numName(p))}</a></p>
        <p class="bag-line__meta">${t(r.size.label)}</p>
        <div class="qty qty--sm" role="group" aria-label="${copy.product.quantity}">
          <button type="button" data-q data-id="${l.id}" data-size="${l.size}" data-d="-1" aria-label="${copy.product.decrease}">−</button>
          <span aria-live="polite">${l.qty}</span>
          <button type="button" data-q data-id="${l.id}" data-size="${l.size}" data-d="1" aria-label="${copy.product.increase}" ${l.qty >= 10 ? 'disabled' : ''}>+</button>
        </div>
      </div>
      <div class="bag-line__end">
        <p class="bag-line__price">${money(r.size.price * l.qty)}</p>
        <button class="link link--quiet" type="button" data-rm data-id="${l.id}" data-size="${l.size}">${c.remove}</button>
      </div>
    </li>`;
  }).join('');
  // keep the gift field while typing: only rebuild the foot when it doesn't exist yet
  if (!foot.querySelector('[name="gift"]')) {
    foot.innerHTML = `
      <label class="check"><input type="checkbox" name="gift" /><span>${c.gift}</span></label>
      <div class="gift-msg" data-gift-msg><label class="field__label" for="gift-msg">${c.giftMsg}</label>
        <textarea id="gift-msg" name="giftMsg" rows="2" maxlength="160" placeholder="${c.giftPh}"></textarea></div>
      <dl class="sums" data-sums></dl>
      <a class="btn btn--solid btn--full" href="/checkout">${c.checkout}</a>
      <button class="link link--center" type="button" data-close>${c.continue}</button>`;
  }
  const g = foot.querySelector<HTMLInputElement>('[name="gift"]')!;
  g.checked = state.gift;
  const msg = foot.querySelector<HTMLTextAreaElement>('[name="giftMsg"]')!;
  if (document.activeElement !== msg) msg.value = state.giftMsg;
  foot.querySelector<HTMLElement>('[data-gift-msg]')!.hidden = !state.gift;
  foot.querySelector('[data-sums]')!.innerHTML = `
    <div><dt>${c.subtotal}</dt><dd>${money(tot.subtotal)}</dd></div>
    <div><dt>${c.delivery}</dt><dd class="muted">${c.deliveryLater}</dd></div>
    <div class="sums__total"><dt>${c.total}</dt><dd>${money(tot.total)}</dd></div>`;
}

export function open() {
  if (!drawer.hidden) return;
  lastFocus = document.activeElement as HTMLElement;
  drawer.hidden = false;
  document.documentElement.classList.add('drawer-open');
  lenis?.stop();
  const from = document.documentElement.dir === 'rtl' ? -100 : 100;
  if (env.reduced) gsap.fromTo(drawer, { opacity: 0 }, { opacity: 1, duration: 0.2 });
  else {
    gsap.fromTo('.drawer__dim', { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' });
    gsap.fromTo(panel, { xPercent: from }, { xPercent: 0, duration: 0.7, ease: 'expo.out' });
  }
  panel.focus();
}

export function close(restore = true) {
  if (drawer.hidden) return;
  const to = document.documentElement.dir === 'rtl' ? -100 : 100;
  const done = () => {
    drawer.hidden = true;
    gsap.set([panel, drawer, '.drawer__dim'], { clearProps: 'all' });
    document.documentElement.classList.remove('drawer-open');
    lenis?.start();
    if (restore) lastFocus?.focus();
  };
  if (env.reduced) gsap.to(drawer, { opacity: 0, duration: 0.15, onComplete: done });
  else {
    gsap.to('.drawer__dim', { opacity: 0, duration: 0.4 });
    gsap.to(panel, { xPercent: to, duration: 0.45, ease: 'power3.in', onComplete: done });
  }
}

function trap(e: KeyboardEvent) {
  const f = $$<HTMLElement>('a[href], button:not([disabled]), input, textarea, [tabindex]:not([tabindex="-1"])', panel).filter((x) => x.offsetParent !== null);
  if (!f.length) return;
  const a = f[0], z = f[f.length - 1];
  if (e.shiftKey && (document.activeElement === a || document.activeElement === panel)) { e.preventDefault(); z.focus(); }
  else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
}

function toast(id: string, size: string) {
  const p = byId(id)!;
  const s = p.sizes.find((x) => x.id === size)!;
  toastEl.innerHTML = `<span>${c.toast} — ${esc(t(p.name))}, ${t(s.label)}</span><button type="button" class="link" data-toast-view>${c.view}</button>`;
  toastEl.querySelector('[data-toast-view]')!.addEventListener('click', () => { hideToast(); open(); });
  toastEl.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(hideToast, 4200);
}
const hideToast = () => toastEl.classList.remove('is-on');

/** Add + feedback. The first add of a visit opens the bag; later ones only show the toast. */
export function addToBag(id: string, size: string, qty = 1, btn?: HTMLButtonElement) {
  if (btn) {
    if (btn.dataset.busy) return;
    btn.dataset.busy = '1';
    const label = btn.innerHTML;
    btn.classList.add('is-added');
    btn.innerHTML = `<span>${copy.product.added}</span>`;
    setTimeout(() => { btn.innerHTML = label; btn.classList.remove('is-added'); delete btn.dataset.busy; }, 1600);
  }
  cart.add(id, size, qty);
  let seen = false;
  try { seen = !!sessionStorage.getItem('azal-bag-shown'); sessionStorage.setItem('azal-bag-shown', '1'); } catch {}
  if (!seen) setTimeout(open, 250);
  else toast(id, size);
}
