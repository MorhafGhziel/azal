# Painted mist cards for the descent + a grain tile.
# uv run --python 3.12 --with pillow --with numpy --with scipy python mist.py <outdir>
import sys, numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

OUT = sys.argv[1] if len(sys.argv) > 1 else 'out'

def fbm(w, h, seed, octaves=7, base=2.5, gain=0.55):
    rng = np.random.default_rng(seed); acc = np.zeros((h, w), np.float32); amp = 1; tot = 0
    for o in range(octaves):
        s = base * 2 ** o
        g = rng.random((int(np.ceil(h / w * s)) + 3, int(np.ceil(s)) + 3)).astype(np.float32)
        acc += amp * np.asarray(Image.fromarray(g).resize((w, h), Image.BICUBIC)); tot += amp; amp *= gain
    return acc / tot

def hx(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255

def card(name, seed, side, cols, W=1600, H=1800):
    n = fbm(W, H, seed)
    n2 = fbm(W, H, seed + 50, octaves=5, base=1.5)
    x = np.linspace(0, 1, W)[None, :]; y = np.linspace(0, 1, H)[:, None]
    # dense towards the outer side, billowing edge towards the centre of the screen
    edge = (1 - x) if side == 'left' else x
    body = np.clip((edge - 0.18 + (n - 0.5) * 0.9 + (n2 - 0.5) * 0.5) * 3.0, 0, 1)
    vert = np.clip(1 - np.abs(y - 0.5) * 1.1, 0, 1) ** 0.4
    # guaranteed soft borders on every side of the card (no straight cut can show)
    inner = np.clip(edge / 0.35, 0, 1) ** 1.5
    outer = np.clip((1 - edge) / 0.08, 0, 1)
    vfade = np.clip(np.minimum(y, 1 - y) / 0.12, 0, 1)
    a = gaussian_filter(body * vert * inner * outer * vfade, 3)
    a = a * a * (3 - 2 * a)
    # light from the upper left: shade by the noise gradient so the billows have form
    gy, gx = np.gradient(gaussian_filter(n, 10))
    shade = np.clip(0.55 + (-gx * 0.8 - gy * 1.0) * 60 + (n - 0.5) * 0.9, 0, 1)
    t = shade
    c = np.zeros((H, W, 3), np.float32)
    stops = cols
    for (p0, c0), (p1, c1) in zip(stops[:-1], stops[1:]):
        m = (t >= p0) & (t <= p1)
        f = ((t - p0) / (p1 - p0))[m][:, None]
        c[m] = hx(c0) * (1 - f) + hx(c1) * f
    rgba = np.concatenate([c, a[..., None]], -1)
    Image.fromarray((np.clip(rgba, 0, 1) * 255).astype(np.uint8), 'RGBA').save(f'{OUT}/{name}_graded.png')

card('mist_a', 3, 'left', [(0, '#8e4c50'), (0.35, '#c78078'), (0.65, '#e7b3a0'), (1.0, '#fbe2cf')])
card('mist_b', 9, 'right', [(0, '#7a3a42'), (0.35, '#b56b6a'), (0.65, '#dca090'), (1.0, '#f6d4c0')])

# grain tile: soft luminance noise, tileable by construction (random, wrapped blur)
rng = np.random.default_rng(5)
g = rng.normal(0.5, 0.18, (256, 256)).astype(np.float32)
g = gaussian_filter(g, 0.6, mode='wrap')
Image.fromarray((np.clip(g, 0, 1) * 255).astype(np.uint8), 'L').save(f'{OUT}/grain.png')
