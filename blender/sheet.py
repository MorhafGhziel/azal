"""Contact sheet: each RGBA image composited over ivory / oxblood / smoke.
usage: python sheet.py OUT.jpg img1.png img2.png ... [--h 420]"""
import sys
from PIL import Image

args = sys.argv[1:]
h = 420
if '--h' in args:
    i = args.index('--h'); h = int(args[i + 1]); del args[i:i + 2]
out, imgs = args[0], args[1:]
BGS = [(0xF4, 0xEF, 0xE7), (0x4A, 0x14, 0x19), (0x2A, 0x1D, 0x17)]
tiles = []
for p in imgs:
    im = Image.open(p).convert('RGBA')
    w = round(im.width * h / im.height)
    im = im.resize((w, h), Image.LANCZOS)
    row = Image.new('RGB', (w * 3, h))
    for k, c in enumerate(BGS):
        b = Image.new('RGBA', (w, h), c + (255,))
        row.paste(Image.alpha_composite(b, im).convert('RGB'), (k * w, 0))
    tiles.append(row)
W = max(t.width for t in tiles)
sheet = Image.new('RGB', (W, h * len(tiles)), (20, 20, 20))
for i, t in enumerate(tiles):
    sheet.paste(t, (0, i * h))
sheet.save(out, quality=88)
print('sheet', out, sheet.size)
