#!/bin/bash
# Dusk render (finale), then grade + stroke-paint every sky layer, then export to the site.
B="/c/Program Files/Blender Foundation/Blender 5.2/blender.exe"
PY="uv run --python 3.12 --with numpy --with opencv-python --with pillow python"
GR="uv run --python 3.12 --with pillow --with numpy --with scipy python grade.py"
"$B" -b --factory-startup -P clouds2.py -- dusk "D:/coding/azal/blender/out/d" 2560 1440 96 sky,far,mid,near 3 2 2>&1 | grep -E "Traceback"
"$B" -b --factory-startup -P clouds2.py -- dusk "D:/coding/azal/blender/out/m" 1080 1920 96 sky,far,mid,near 3 2 2>&1 | grep -E "Traceback"
for v in d m; do
  W=2560; H=1440; [ $v = m ] && W=1080 && H=1920
  GAMMA=0.58 $GR dawn $W $H out/$v far,mid,near,front
  GAMMA=0.7 $GR dusk $W $H out/$v far,mid,near
  for P in dawn dusk; do
    $PY strokes.py out/$v/${P}_sky_graded.png out/$v/${P}_sky_stroke.png sky 1
    for L in far mid near front; do
      [ -f out/$v/${P}_${L}_graded.png ] || continue
      $PY strokes.py out/$v/${P}_${L}_graded.png out/$v/${P}_${L}_stroke.png $L 3
    done
  done
  $PY strokes.py out/$v/wine_wine_back_graded.png out/$v/wine_wine_back_stroke.png wine 5
done
uv run --python 3.12 --with pillow python export.py
echo ALLDONE
