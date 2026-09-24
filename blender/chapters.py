# Origins chapter visuals: crop + grade the licensed photos into the chapter moods.
# uv run --python 3.12 --with pillow --with numpy python chapters.py <srcdir>
import sys, os, numpy as np
from PIL import Image, ImageFilter

SRC = sys.argv[1]
PUB = r'D:\coding\azal\public\assets\origins'
os.makedirs(PUB, exist_ok=True)

def grade(im, lift, gain, gamma, sat, tint, vign=0.35):
    a = np.asarray(im).astype(np.float32) / 255
    lum = a @ np.array([0.3, 0.59, 0.11], np.float32)
    a = lum[..., None] + (a - lum[..., None]) * sat
    a = np.clip(a, 0, 1) ** gamma
    a = np.array(lift, np.float32) + a * (np.array(gain, np.float32) - np.array(lift, np.float32))
    a = a * (1 - tint[3]) + np.array(tint[:3], np.float32) * a * tint[3] * 1.6
    h, w = a.shape[:2]
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((x - w / 2) / (w / 2)) ** 2 + ((y - h / 2) / (h / 2)) ** 2)
    a *= (1 - vign * np.clip(d - 0.45, 0, 1) ** 1.4)[..., None]
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))

def crop(im, box, size):
    w, h = im.size
    c = im.crop((int(box[0] * w), int(box[1] * h), int(box[2] * w), int(box[3] * h)))
    tw, th = size
    r = max(tw / c.width, th / c.height)
    c = c.resize((max(tw, round(c.width * r)), max(th, round(c.height * r))), Image.LANCZOS)
    l, t = (c.width - tw) // 2, (c.height - th) // 2
    return c.crop((l, t, l + tw, t + th))

CH = {
    # name: (file, desktop box, mobile box, grade)
    'land':  ('a8c667d0.jpg', (0.0, 0.0, 1.0, 1.0), (0.05, 0.0, 0.62, 1.0),
              dict(lift=(0.10, 0.06, 0.07), gain=(1.0, 0.93, 0.90), gamma=1.05, sat=0.82, tint=(1.0, 0.82, 0.86, 0.18))),
    'hand':  ('390e38bc.jpg', (0.0, 0.0, 0.58, 0.62), (0.0, 0.0, 0.54, 1.0),
              dict(lift=(0.07, 0.06, 0.03), gain=(1.0, 0.95, 0.84), gamma=1.1, sat=0.86, tint=(0.95, 0.9, 0.6, 0.16))),
    'craft': ('a0a3358e.jpg', (0.66, 0.08, 1.0, 0.98), (0.58, 0.0, 1.0, 1.0),
              dict(lift=(0.03, 0.015, 0.01), gain=(1.0, 0.78, 0.55), gamma=1.35, sat=1.05, tint=(1.0, 0.65, 0.35, 0.25), vign=0.75)),
    'time':  ('18b47d71.jpg', (0.0, 0.05, 1.0, 0.85), (0.1, 0.0, 0.7, 1.0),
              dict(lift=(0.035, 0.022, 0.016), gain=(0.95, 0.72, 0.52), gamma=1.1, sat=0.4, tint=(1.0, 0.7, 0.45, 0.3), vign=0.5)),
}
for k, (f, bd, bm, g) in CH.items():
    im = Image.open(os.path.join(SRC, f)).convert('RGB')
    for v, box, size in (('d', bd, (2400, 1350)), ('m', bm, (1080, 1920))):
        out = grade(crop(im, box, size), **g)
        out.save(f'{PUB}/{k}_{v}.webp', 'WEBP', quality=82, method=6)
    print(k, 'ok')
