const q = new URLSearchParams(location.search);

export const env = {
  capture: q.get('capture') === '1',
  captureSpeed: Number(q.get('speed')) || 520, // px per second for the recorded scroll
  reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
  finePointer: matchMedia('(hover: hover) and (pointer: fine)').matches,
  portrait: () => matchMedia('(max-aspect-ratio: 1/1)').matches,
  lowPower: ((navigator as any).deviceMemory && (navigator as any).deviceMemory <= 4) || (navigator.hardwareConcurrency || 8) <= 4,
};
