# Export painted layers to the site as WebP.
# uv run --python 3.12 --with pillow python export.py
import os
from PIL import Image

PUB = r'D:\coding\azal\public\assets'
os.makedirs(f'{PUB}/sky/d', exist_ok=True); os.makedirs(f'{PUB}/sky/m', exist_ok=True)

def fade_bottom(im, start):
    # soft lower edge baked into alpha: fully opaque above `start` (0..1), clear at the bottom
    im = im.convert('RGBA'); w, h = im.size
    ramp = Image.linear_gradient('L').resize((1, h))  # 0 top -> 255 bottom
    s = int(h * start)
    lut = [255 if i < s else int(255 * (1 - ((i - s) / max(h - s, 1))) ** 1.6) for i in range(h)]
    col = Image.new('L', (1, h)); col.putdata(lut)
    a = Image.composite(im.getchannel('A'), Image.new('L', (w, h), 0), col.resize((w, h)))
    im.putalpha(a); return im

FADE = {'far': 0.8, 'mid': 0.8, 'near': 0.74, 'front': 0.62}

def save(src, dst, q=84, maxw=None, fade=None):
    if not os.path.exists(src):
        print('missing', src); return
    im = Image.open(src)
    if fade: im = fade_bottom(im, fade)
    if maxw and im.width > maxw:
        im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    if im.mode == 'RGBA' and im.getextrema()[3][0] == 255:
        im = im.convert('RGB')
    im.save(dst, 'WEBP', quality=q, method=6)
    print(dst, im.size, os.path.getsize(dst) // 1024, 'KB')

def best(v, name):
    s = f'out/{v}/{name}_stroke.png'
    return s if os.path.exists(s) else f'out/{v}/{name}_paint.png'

for v in ('d', 'm'):
    for n in ('sky', 'far', 'mid', 'near', 'front'):
        save(best(v, f'dawn_{n}'), f'{PUB}/sky/{v}/dawn_{n}.webp', q=80 if n == 'sky' else 84, fade=FADE.get(n))
    for n in ('sky', 'far', 'mid', 'near'):
        save(best(v, f'dusk_{n}'), f'{PUB}/sky/{v}/dusk_{n}.webp', q=80 if n == 'sky' else 84, fade=FADE.get(n))
    save(best(v, 'wine_wine_back'), f'{PUB}/sky/{v}/wine_back.webp')
for n in ('mist_a', 'mist_b'):
    save(f'out/mist/{n}_paint.png', f'{PUB}/sky/{n}.webp', q=78, maxw=1200)
Image.open('out/mist/grain.png').save(f'{PUB}/grain.png', optimize=True)
