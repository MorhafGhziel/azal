// Small shared helpers: DOM, money, product text.
import { lang } from './i18n';
import type { L10n, Product } from './data/products';

export const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T;
export const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll(s)) as T[];

/** One number style everywhere: Western digits with separators. EN "SAR 1,040", AR "1,040 ر.س". */
export function money(n: number) {
  const v = Math.round(n).toLocaleString('en-US');
  return lang === 'ar' ? `${v} ر.س` : `SAR ${v}`;
}

export const t = (x: L10n) => x[lang];

/** "No. 1 — Rose & Oud" / "رقم 1 — ورد وعود" */
export function numName(p: Product) {
  if (p.num === null) return t(p.name);
  return `${lang === 'ar' ? 'رقم' : 'No.'} ${p.num} — ${t(p.name)}`;
}

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Bottle <img>. Thumbs may not be rendered yet, so they fall back to the front still. */
export function bottleImg(p: Product, kind: 'front' | 'thumb' = 'front', cls = '', alt = '') {
  const src = kind === 'thumb' ? p.images.thumb : p.images.front;
  return `<img class="${cls}" src="${src}" alt="${esc(alt)}" decoding="async" loading="lazy" onerror="this.onerror=null;this.src='${p.images.front}'" />`;
}
