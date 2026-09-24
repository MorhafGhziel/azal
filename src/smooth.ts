import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { env } from './env';

gsap.registerPlugin(ScrollTrigger);

export let lenis: Lenis | null = null;

export function initSmooth() {
  if (env.reduced) return null;
  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1.15, touchMultiplier: 1.6, syncTouch: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis!.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

export function scrollToY(y: number, duration = 2.4, linear = false) {
  if (lenis) lenis.scrollTo(y, { duration, easing: linear ? (t) => t : (t) => 1 - Math.pow(1 - t, 3), lock: false });
  else window.scrollTo({ top: y, behavior: env.reduced ? 'auto' : 'smooth' });
}
