// Dot + trailing ring. Grows over links, becomes a DRAG disc over [data-drag], hides over text fields.
import { env } from './env';
import { copy } from './i18n';

export function initCursor() {
  if (!env.finePointer) return;
  const el = document.querySelector<HTMLElement>('[data-cursor]')!;
  const dot = el.querySelector<HTMLElement>('.cursor__dot')!;
  const ring = el.querySelector<HTMLElement>('.cursor__ring')!;
  const label = el.querySelector<HTMLElement>('.cursor__label')!;
  document.documentElement.classList.add('has-cursor');
  el.classList.add('is-hidden'); // nothing on screen until the pointer has actually moved
  let x = -100, y = -100, rx = x, ry = y, raf = 0, seen = false;
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return; // touch and pen keep the system behaviour
    x = e.clientX; y = e.clientY;
    if (!seen) { seen = true; rx = x; ry = y; el.classList.remove('is-hidden'); }
    dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    const t = e.target as Element;
    const drag = !!t.closest('[data-drag]') && !t.closest('button, .cf__info');
    el.classList.toggle('is-drag', drag);
    el.classList.toggle('is-link', !drag && !!t.closest('a, button, [role="button"]'));
    el.classList.toggle('is-hidden', !!t.closest('input, textarea, select'));
    // ink on light grounds, cream on the dark ones
    const light = (!!t.closest('.view, .origins, .collection, .drawer__panel, .menu, .notes:not(.is-dark)') && !t.closest('.thanks'))
      || (!!t.closest('.footer') && document.documentElement.classList.contains('is-page'));
    el.classList.toggle('is-ink', light);
    const view = !t.closest('[data-drag]') && !!t.closest('[data-view]');
    el.classList.toggle('is-view', view);
    label.textContent = view ? copy.cursor.view : copy.cursor.drag;
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });
  document.addEventListener('pointerleave', () => el.classList.add('is-hidden'));
  document.addEventListener('pointerenter', () => { if (seen) el.classList.remove('is-hidden'); });
  function loop() {
    rx += (x - rx) * 0.2; ry += (y - ry) * 0.2;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    raf = Math.abs(x - rx) + Math.abs(y - ry) > 0.1 ? requestAnimationFrame(loop) : 0;
  }
}
