#!/bin/bash
# Re-renders everything with the printed logo, in priority order.
cd /d/coding/azal/blender
BL="/c/Program Files/Blender Foundation/Blender 5.2/blender.exe"
O="D:/coding/azal/blender/out/bottle"
PY="uv run --python 3.12 --with pillow python pack.py"
"$BL" -b --factory-startup -P bottle.py -- --mode turn --variant no1 --yawmax 12 --nframes 25 --samples 512 --out "$O" > out/logo_turn1.log 2>&1; $PY turns
"$BL" -b --factory-startup -P bottle.py -- --mode fronts --samples 768 --out "$O" > out/logo_fronts.log 2>&1; $PY fronts; $PY thumbs
for v in no2 no3 no4 no5; do
  "$BL" -b --factory-startup -P bottle.py -- --mode turn --variant $v --yawmax 6 --nframes 9 --samples 384 --out "$O" > out/logo_turn_$v.log 2>&1
done
$PY turns
"$BL" -b --factory-startup -P bottle.py -- --mode set --samples 768 --out "$O" > out/logo_set.log 2>&1; $PY set
echo ALLDONE
