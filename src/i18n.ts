import en from './content/en';
import ar from './content/ar';

export type Copy = typeof en;
export const lang: 'en' | 'ar' = document.documentElement.lang === 'ar' ? 'ar' : 'en';
export const copy: Copy = lang === 'ar' ? ar : en;
export const isRTL = copy.dir === 'rtl';

function get(path: string): unknown {
  return path.split('.').reduce<any>((o, k) => (o == null ? o : o[k]), copy);
}

/** Wraps each line in a clip mask so it can slide up inside its own line. */
export function lineMarkup(lines: string[]) {
  return lines.map((l) => `<span class="ln"><span class="ln__in">${l}</span></span>`).join('');
}

export function applyCopy() {
  document.title = copy.meta.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', copy.meta.description);
  document.querySelectorAll<HTMLElement>('[data-t]').forEach((el) => {
    const v = get(el.dataset.t!);
    if (typeof v === 'string') el.textContent = v;
  });
  document.querySelectorAll<HTMLElement>('[data-t-aria]').forEach((el) => {
    const v = get(el.dataset.tAria!);
    if (typeof v === 'string') el.setAttribute('aria-label', v);
  });
  document.querySelectorAll<HTMLElement>('[data-lines]').forEach((el) => {
    const v = get(el.dataset.lines!);
    if (Array.isArray(v)) el.innerHTML = lineMarkup(v as string[]);
  });
  document.querySelectorAll<HTMLElement>('[data-lang-toggle]').forEach((b) =>
    b.addEventListener('click', () => {
      const next = lang === 'ar' ? 'en' : 'ar';
      try { localStorage.setItem('azal-lang', next); sessionStorage.setItem('azal-seen', '1'); } catch {}
      const u = new URL(location.href);
      u.searchParams.set('lang', next);
      // keep the reader where they were
      sessionStorage.setItem('azal-y', String(window.scrollY));
      location.href = u.toString();
    }),
  );
}
