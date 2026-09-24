/** Draws a pre-rendered turn sequence into a canvas. Frames load lazily; missing frames fall back to the nearest loaded one. */
export class BottleSequence {
  private frames: (HTMLImageElement | null)[];
  private ctx: CanvasRenderingContext2D;
  private last = -1;
  private loading: Promise<void> | null = null;

  constructor(private canvas: HTMLCanvasElement, private base: string, private count: number) {
    this.frames = new Array(count).fill(null);
    this.ctx = canvas.getContext('2d')!;
  }

  private url(i: number) { return `${this.base}${String(i).padStart(4, '0')}.webp`; }

  load() {
    if (this.loading) return this.loading;
    // centre frame first so the settled bottle is never missing, then outwards
    const order = [...Array(this.count).keys()].sort((a, b) => Math.abs(a - 12) - Math.abs(b - 12));
    this.loading = Promise.all(order.map((i) => new Promise<void>((res) => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => { this.frames[i] = im; if (this.last < 0 || Math.abs(i - this.last) < 1) this.draw(this.last < 0 ? 12 : this.last, true); res(); };
      im.onerror = () => res();
      im.src = this.url(i);
    }))).then(() => {});
    return this.loading;
  }

  draw(f: number, force = false) {
    const i = Math.max(0, Math.min(this.count - 1, Math.round(f)));
    if (i === this.last && !force) return;
    let im = this.frames[i];
    for (let k = 1; !im && k < this.count; k++) im = this.frames[i - k] || this.frames[i + k] || null;
    if (!im) return;
    this.last = i;
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.drawImage(im, 0, 0, width, height);
  }
}
