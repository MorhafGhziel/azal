#!/bin/bash
# Notes ingredients: render cut-outs, paint them, export to the site.
cd /d/coding/azal/blender
"/c/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b --factory-startup -P ingredients.py -- "D:/coding/azal/blender/out/ing" 192 1024 2>&1 | grep -E "WROTE|Traceback"
mkdir -p ../public/assets/notes
for n in slice fruit saffron pepper rose jasmine oud amber; do
  uv run --python 3.12 --with numpy --with opencv-python --with pillow python strokes.py out/ing/$n.png out/ing/${n}_p.png ing 3
  uv run --python 3.12 --with pillow python -c "
from PIL import Image
im=Image.open('out/ing/${n}_p.png').convert('RGBA'); im=im.crop(im.getbbox()); im.thumbnail((640,640),Image.LANCZOS)
im.save('../public/assets/notes/${n}.webp',quality=86,method=6)"
done
echo ING_DONE
