import sys
from PIL import Image
D=sys.argv[4] if len(sys.argv)>4 else 'out'
pre=sys.argv[1]; suf=sys.argv[2] if len(sys.argv)>2 else 'raw'
names=sys.argv[3].split(',') if len(sys.argv)>3 else ['sky','far','mid','near','front']
base=None
for n in names:
    im=Image.open(f'{D}/{pre}_{n}_{suf}.png').convert('RGBA')
    base = im if base is None else Image.alpha_composite(base, im)
base.convert('RGB').save(f'out/{pre}_{suf}_comp.jpg',quality=88)
