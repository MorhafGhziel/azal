"""Package renders into public/assets (webp + png) and build contact sheets.
usage: uv run --python 3.12 --with pillow python pack.py [fronts|turn|petal|stills|all]"""
import os, sys, glob, shutil
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
PUB = os.path.normpath(os.path.join(HERE, '..', 'public', 'assets'))
what = sys.argv[1] if len(sys.argv) > 1 else 'all'


def webp(im, path):
    im.save(path, 'WEBP', lossless=False, quality=90, method=6, exact=True)


if what in ('fronts', 'all'):
    d = os.path.join(PUB, 'bottle'); os.makedirs(d, exist_ok=True)
    for p in sorted(glob.glob(os.path.join(OUT, 'bottle', 'no*_front.png'))):
        n = os.path.basename(p)[:-4]
        shutil.copy(p, os.path.join(d, n + '.png'))
        webp(Image.open(p).convert('RGBA'), os.path.join(d, n + '.webp'))
        print('front', n)

if what in ('turn',):
    d = os.path.join(PUB, 'bottle', 'no1_turn'); os.makedirs(d, exist_ok=True)
    for p in sorted(glob.glob(os.path.join(OUT, 'bottle', 'no1_turn', '*.png'))):
        n = os.path.basename(p)[:-4]
        webp(Image.open(p).convert('RGBA'), os.path.join(d, n + '.webp'))
    print('turn', len(os.listdir(d)))

if what in ('petal', 'all'):
    d = os.path.join(PUB, 'petal'); os.makedirs(d, exist_ok=True)
    fr = sorted(glob.glob(os.path.join(OUT, 'petal', 'loop', '*.png')))
    assert len(fr) == 48, len(fr)
    sheet = Image.new('RGBA', (384 * 8, 384 * 6), (0, 0, 0, 0))
    for i, p in enumerate(fr):
        sheet.paste(Image.open(p).convert('RGBA'), ((i % 8) * 384, (i // 8) * 384))
    sheet.save(os.path.join(d, 'petal_sheet.png'), optimize=True)
    webp(sheet, os.path.join(d, 'petal_sheet.webp'))
    print('petal sheet', sheet.size)

if what in ('stills', 'all'):
    d = os.path.join(PUB, 'petal'); os.makedirs(d, exist_ok=True)
    for n in ('petal_a', 'petal_b', 'petal_c'):
        p = os.path.join(OUT, 'petal', n + '.png')
        if os.path.exists(p):
            webp(Image.open(p).convert('RGBA'), os.path.join(d, n + '.webp'))
            print('still', n)

if what in ('turns', 'all'):
    for v in ('no1', 'no2', 'no3', 'no4', 'no5'):
        src = os.path.join(OUT, 'bottle', f'{v}_turn')
        if not os.path.isdir(src):
            continue
        d = os.path.join(PUB, 'bottle', f'{v}_turn'); os.makedirs(d, exist_ok=True)
        for p in sorted(glob.glob(os.path.join(src, '*.png'))):
            webp(Image.open(p).convert('RGBA'), os.path.join(d, os.path.basename(p)[:-4] + '.webp'))
        print('turn', v, len(os.listdir(d)))


def thumb(src, dst, h=480, pad=0.06):
    im = Image.open(src).convert('RGBA')
    a = im.getchannel('A').point(lambda x: 255 if x > 8 else 0)
    x0, y0, x1, y1 = a.getbbox()
    p = int(pad * max(x1 - x0, y1 - y0))
    im = im.crop((max(x0 - p, 0), max(y0 - p, 0), min(x1 + p, im.width), min(y1 + p, im.height)))
    im = im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
    webp(im, dst)
    print('thumb', os.path.basename(dst), im.size)


if what in ('thumbs', 'all'):
    for v in ('no1', 'no2', 'no3', 'no4', 'no5'):
        p = os.path.join(OUT, 'bottle', f'{v}_front.png')
        if os.path.exists(p):
            thumb(p, os.path.join(PUB, 'bottle', f'{v}_thumb.webp'))

if what in ('set', 'all'):
    p = os.path.join(OUT, 'bottle', 'set_front.png')
    if os.path.exists(p):
        shutil.copy(p, os.path.join(PUB, 'bottle', 'set_front.png'))
        webp(Image.open(p).convert('RGBA'), os.path.join(PUB, 'bottle', 'set_front.webp'))
        thumb(p, os.path.join(PUB, 'bottle', 'set_thumb.webp'))
