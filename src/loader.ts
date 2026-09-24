// 00 — ivory veil, the emblem draws itself, a count to 100, then the veil parts on the sky.
import { gsap } from 'gsap';
import { env } from './env';

export function runLoader(ready: Promise<unknown>): Promise<void> {
  const root = document.getElementById('loader')!;
  const d = document.documentElement;
  if (env.capture || env.reduced) { root.remove(); return Promise.resolve(); }

  const seen = d.classList.contains('seen');
  const total = seen ? 0.7 : 1.6; // never longer than ~1.8s including the exit
  const count = root.querySelector<HTMLElement>('[data-count]')!;
  const paths = root.querySelectorAll<SVGGeometryElement>('.loader__emblem use');
  const svg = root.querySelector<SVGSVGElement>('.loader__emblem')!;
  // <use> can't be dash-animated, so inline a copy of the symbol's shapes
  const sym = document.getElementById('emblem')!;
  svg.innerHTML = sym.innerHTML;
  paths.forEach((p) => p.remove());
  const shapes = Array.from(svg.querySelectorAll<SVGGeometryElement>('path, circle'));
  shapes.forEach((s) => {
    const len = s.getTotalLength();
    s.style.strokeDasharray = `${len}`;
    s.style.strokeDashoffset = `${len}`;
  });

  return new Promise((resolve) => {
    const n = { v: 0 };
    const tl = gsap.timeline();
    tl.to(shapes, { strokeDashoffset: 0, duration: total * 0.85, ease: 'power2.inOut', stagger: total * 0.08 }, 0);
    tl.to(n, { v: 100, duration: total, ease: 'power1.inOut', onUpdate: () => (count.textContent = String(Math.round(n.v))) }, 0);
    // wait for the hero images too, but never hold the curtain more than +0.6s for them
    const cap = new Promise((r) => setTimeout(r, (total + 0.6) * 1000));
    Promise.all([new Promise((r) => tl.eventCallback('onComplete', r as any)), Promise.race([ready, cap])]).then(() => {
      try { sessionStorage.setItem('azal-seen', '1'); } catch {}
      const out = gsap.timeline({ onComplete: () => { root.remove(); } });
      out.to('.loader__center', { opacity: 0, y: -8, duration: 0.3, ease: 'power2.in' }, 0);
      out.to('.loader__veil--top', { yPercent: -100, duration: 0.95, ease: 'expo.inOut' }, 0.12);
      out.to('.loader__veil--bottom', { yPercent: 100, duration: 0.95, ease: 'expo.inOut' }, 0.12);
      out.call(resolve, [], 0.45); // the hero starts while the veil is still parting
    });
  });
}
