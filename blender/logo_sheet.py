"""Builds out/logo_sheet.jpg: no1 print crop, 5 fronts, set, 3 no1_turn frames (all over oxblood)."""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
B = os.path.join(HERE, 'out', 'bottle')
BG = (0x4A, 0x14, 0x19)


def over(p, bg=BG):
    im = Image.open(p).convert('RGBA')
    b = Image.new('RGBA', im.size, bg + (255,))
    return Image.alpha_composite(b, im).convert('RGB')


W = 2100
rows = []
# row 1: full-res crop of the no1 print + the set
crop = over(os.path.join(B, 'no1_front.png')).crop((380, 560, 1020, 1300))           # 640x740 at 1:1
st = over(os.path.join(B, 'set_front.png'), (0xF4, 0xEF, 0xE7))
st = st.resize((round(st.width * 740 / st.height), 740))
r1 = Image.new('RGB', (W, 740), (20, 20, 20)); r1.paste(crop, (0, 0)); r1.paste(st, (660, 0)); rows.append(r1)
# row 2: five fronts
r2 = Image.new('RGB', (W, 540), (20, 20, 20))
for k in range(5):
    im = over(os.path.join(B, f'no{k + 1}_front.png')).resize((420, 540))
    r2.paste(im, (k * 420, 0))
rows.append(r2)
# row 3: turn frames 0, 12, 24
r3 = Image.new('RGB', (W, 540), (20, 20, 20))
for k, i in enumerate((0, 12, 24)):
    im = over(os.path.join(B, 'no1_turn', f'{i:04d}.png')).resize((420, 540))
    r3.paste(im, (k * 420, 0))
rows.append(r3)
sheet = Image.new('RGB', (W, sum(r.height for r in rows)))
y = 0
for r in rows:
    sheet.paste(r, (0, y)); y += r.height
sheet.save(os.path.join(HERE, 'out', 'logo_sheet.jpg'), quality=88)
print('logo_sheet', sheet.size)
