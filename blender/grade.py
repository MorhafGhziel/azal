# Grade cloud layers into the AZAL palette and build the painted sky backdrop.
# uv run --python 3.12 --with pillow --with numpy python grade.py <preset> <w> <h> <outdir>
import sys, numpy as np
from PIL import Image, ImageFilter

PRE = sys.argv[1] if len(sys.argv) > 1 else 'dawn'
W = int(sys.argv[2]) if len(sys.argv) > 2 else 960
H = int(sys.argv[3]) if len(sys.argv) > 3 else 540
OUT = sys.argv[4] if len(sys.argv) > 4 else 'out'
import os
GAMMA = float(os.environ.get('GAMMA', '0.8'))

def hx(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255

# luminance -> colour ramps (shadow ... highlight)
RAMPS = {
    'dawn': [(0.00, '#8a6d78'), (0.18, '#b48d8c'), (0.36, '#dcab98'), (0.58, '#efbf9c'), (0.76, '#f9d8b4'), (1.00, '#fff5e4')],
    'dusk': [(0.00, '#35264a'), (0.30, '#6a4a6c'), (0.52, '#b27283'), (0.70, '#e0a08e'), (0.86, '#f5c9a0'), (1.00, '#fde8cf')],
    'wine': [(0.00, '#1c0709'), (0.35, '#3d1015'), (0.60, '#6e2a2c'), (0.80, '#a45a4c'), (1.00, '#d99a7c')],
}
SKY = {
    # (y from top 0..1, colour)
    'dawn': [(0.0, '#5f7596'), (0.30, '#9aa6b8'), (0.52, '#e3c3b4'), (0.68, '#f2c49a'), (0.80, '#f7d3a8'), (1.0, '#f0b98c')],
    'dusk': [(0.0, '#2c2440'), (0.30, '#5b4a6b'), (0.55, '#a9707c'), (0.72, '#e19a7c'), (0.86, '#f2bd8a'), (1.0, '#e8a57c')],
}

def ramp(t, stops):
    t = np.clip(t, 0, 1); out = np.zeros(t.shape + (3,), np.float32)
    for (p0, c0), (p1, c1) in zip(stops[:-1], stops[1:]):
        m = (t >= p0) & (t <= p1)
        f = ((t - p0) / max(p1 - p0, 1e-6))[m][:, None]
        f = f * f * (3 - 2 * f)
        out[m] = hx(c0) * (1 - f) + hx(c1) * f
    return out

def grade_layer(name):
    im = np.asarray(Image.open(f'{OUT}/{PRE}_{name}_raw.png').convert('RGBA')).astype(np.float32) / 255
    rgb, a = im[..., :3], im[..., 3:]
    un = np.where(a > 1e-3, rgb / np.maximum(a, 1e-3), 0)  # un-premultiply
    lum = (un * [0.3, 0.55, 0.15]).sum(-1)
    # edge-safe: thin low-alpha fringes take their tone from the solid cloud next to them (no halo)
    from scipy.ndimage import gaussian_filter
    num = gaussian_filter(lum * a[..., 0], 6)
    den = gaussian_filter(a[..., 0], 6) + 1e-4
    w_ = np.clip(a[..., 0] * 2.5, 0, 1)
    lum = lum * w_ + (num / den) * (1 - w_)
    lo, hi = np.percentile(lum[a[..., 0] > 0.5], [2, 99.5]) if (a > 0.5).any() else (0, 1)
    t = (lum - lo) / max(hi - lo, 1e-3)
    g = ramp(np.clip(t, 0, 1) ** GAMMA, RAMPS[PRE])
    out = g * 0.85 + np.clip(un, 0, 1) * 0.15 * w_[..., None] + g * 0.15 * (1 - w_[..., None])
    Image.fromarray((np.concatenate([np.clip(out, 0, 1), a], -1) * 255).astype(np.uint8), 'RGBA').save(f'{OUT}/{PRE}_{name}_graded.png')

def fbm(w, h, seed, octaves=6, base=3):
    rng = np.random.default_rng(seed); acc = np.zeros((h, w), np.float32); amp = 1; tot = 0
    for o in range(octaves):
        s = base * 2 ** o
        g = rng.random((int(h / w * s) + 2, s + 2)).astype(np.float32)
        acc += amp * np.asarray(Image.fromarray(g).resize((w, h), Image.BICUBIC)); tot += amp; amp *= 0.55
    return acc / tot

def sky():
    y = np.linspace(0, 1, H)[:, None] * np.ones((1, W))
    x = np.linspace(-1, 1, W)[None, :] * np.ones((H, 1))
    n = fbm(W, H, 7 if PRE == 'dawn' else 8)
    streak = fbm(W, H, 17, octaves=5, base=2)
    streak = np.asarray(Image.fromarray(streak).resize((W // 6, H), Image.BICUBIC).resize((W, H), Image.BICUBIC))
    t = y + (n - 0.5) * 0.10 + (streak - 0.5) * 0.06
    col = ramp(t, [(p, c) for p, c in SKY[PRE]])
    # warm glow behind the headline, slightly low of centre
    gx, gy = (0.0, 0.62)
    d = np.sqrt((x - gx) ** 2 * 0.55 + (y - gy) ** 2 * 2.2)
    glow = np.exp(-d ** 2 * 5.0)[..., None]
    col = col * (1 - glow * 0.45) + hx('#ffe2b0' if PRE == 'dawn' else '#ffc79a') * glow * 0.45
    # faint high cirrus: bright wisps where noise peaks, only in the upper-middle band
    cir = np.clip((fbm(W, H, 29, octaves=6, base=4) - 0.56) * 5, 0, 1) * np.clip(1 - np.abs(y - 0.32) * 3.2, 0, 1)
    cir = np.asarray(Image.fromarray(cir.astype(np.float32)).resize((W // 5, H // 2), Image.BICUBIC).resize((W, H), Image.BICUBIC))
    col = col * (1 - cir[..., None] * 0.35) + hx('#fbe6d2') * cir[..., None] * 0.35
    Image.fromarray((np.clip(col, 0, 1) * 255).astype(np.uint8)).save(f'{OUT}/{PRE}_sky_graded.png')

if __name__ == '__main__':
    if PRE in SKY: sky()
    for n in (sys.argv[5].split(',') if len(sys.argv) > 5 else ['far', 'mid', 'near', 'front']):
        grade_layer(n)
