// The petal. One travelling petal owns its own transform (this loop only), plus a few sparse
// atmospheric petals in the hero sky at different depths, like the doves in the reference.
import { env } from './env';
import { isRTL } from './i18n';
import type { ScrollTrigger } from 'gsap/ScrollTrigger';

const COLS = 8, ROWS = 6, FRAMES = COLS * ROWS;
const framePos = (i: number) => {
  const f = ((Math.floor(i) % FRAMES) + FRAMES) % FRAMES;
  return `${((f % COLS) / (COLS - 1)) * 100}% ${(Math.floor(f / COLS) / (ROWS - 1)) * 100}%`;
};

// path of the travelling petal through the sky section: progress -> [x vw, y vh, scale]
const PATH: [number, number, number, number][] = [
  [0.0, 71, 33, 1.0],
  [0.12, 66, 40, 1.0],
  [0.3, 60, 50, 1.05],
  [0.45, 55, 45, 1.1],
  [0.6, 47, 53, 1.28],
  [0.75, 39, 64, 1.16],
  [0.9, 31, 80, 1.05],
  [1.0, 27, 97, 1.0],
];
const PATH_PORTRAIT: [number, number, number, number][] = [
  [0.0, 74, 60, 0.8],
  [0.12, 68, 64, 0.82],
  [0.3, 62, 58, 0.9],
  [0.45, 56, 50, 0.95],
  [0.6, 44, 46, 1.1],
  [0.75, 34, 58, 1.0],
  [0.9, 24, 72, 0.95],
  [1.0, 18, 96, 0.9],
];

function sample(path: typeof PATH, p: number) {
  if (p <= path[0][0]) return path[0].slice(1) as [number, number, number];
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    if (p <= b[0]) {
      let t = (p - a[0]) / (b[0] - a[0]);
      t = t * t * (3 - 2 * t);
      return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t] as [number, number, number];
    }
  }
  return path[path.length - 1].slice(1) as [number, number, number];
}

type Drifter = { el: HTMLElement; x: number; y: number; vx: number; vy: number; s: number; f: number; fs: number; ph: number; blur: number };

export function initPetals(getSkyTrigger: () => ScrollTrigger | null) {
  const hero = document.querySelector<HTMLElement>('[data-petal]')!;
  if (env.reduced) { hero.remove(); return { show() {} }; }

  // sparse atmosphere: back layer small and soft, front layer larger
  const drifters: Drifter[] = [];
  const conf = env.portrait()
    ? [['back', 26, 0.8], ['back', 20, 1.2], ['front', 46, 0]]
    : [['back', 28, 0.8], ['back', 22, 1.2], ['back', 34, 0.5], ['front', 52, 0], ['front', 44, 0.3]];
  conf.forEach(([layer, size, blur], i) => {
    const host = document.querySelector<HTMLElement>(`[data-petals="${layer}"]`)!;
    const el = document.createElement('div');
    el.className = 'petal-sprite';
    el.style.width = el.style.height = `${size}px`;
    if (blur) el.style.filter = `blur(${blur}px)`;
    el.style.opacity = layer === 'back' ? '0.8' : '0.95';
    host.appendChild(el);
    drifters.push({
      el, x: Math.random() * innerWidth, y: innerHeight * (0.12 + Math.random() * 0.5),
      vx: -(8 + Math.random() * 10) * (layer === 'front' ? 1.6 : 1) * (isRTL ? -1 : 1),
      vy: 4 + Math.random() * 6, s: size as number, f: Math.random() * FRAMES, fs: 5 + Math.random() * 5,
      ph: Math.random() * 10, blur: blur as number,
    });
    void i;
  });

  let visible = false;
  let t0 = performance.now(), last = t0, fr = 0;
  const loop = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const tr = getSkyTrigger();
    const p = tr ? tr.progress : 0;
    const time = (now - t0) / 1000;

    // travelling petal
    const path = env.portrait() ? PATH_PORTRAIT : PATH;
    let [x, y, s] = sample(path, p);
    if (isRTL) x = 100 - x;
    x += Math.sin(time * 0.6) * 1.1; y += Math.sin(time * 0.9 + 1) * 1.2;
    const vel = tr ? Math.abs(tr.getVelocity()) : 0;
    fr += dt * (7 + Math.min(vel / 90, 20));
    const size = hero.offsetWidth;
    hero.style.transform = `translate3d(${(x / 100) * innerWidth - size / 2}px, ${(y / 100) * innerHeight - size / 2}px, 0) scale(${s})`;
    hero.style.backgroundPosition = framePos(fr);
    hero.style.opacity = visible ? String(p >= 0.999 ? 0 : 1) : '0';

    // atmosphere (only while it can be seen)
    if (p < 0.35) {
      for (const d of drifters) {
        d.x += (d.vx + Math.sin(time * 0.5 + d.ph) * 6) * dt;
        d.y += (d.vy + Math.cos(time * 0.7 + d.ph) * 5) * dt;
        d.f += d.fs * dt;
        if (d.x < -80) d.x = innerWidth + 60; if (d.x > innerWidth + 80) d.x = -60;
        if (d.y > innerHeight * 0.8) d.y = innerHeight * 0.08;
        d.el.style.transform = `translate3d(${d.x}px, ${d.y}px, 0)`;
        d.el.style.backgroundPosition = framePos(d.f);
      }
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return { show() { visible = true; hero.style.transition = 'opacity 1.2s ease'; } };
}
