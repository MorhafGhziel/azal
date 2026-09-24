#!/bin/bash
# Notes section: No. 1 at three fill levels (top ⅓ gold, heart ⅔ rose, base full = the real No. 1)
cd /d/coding/azal/blender
BL="/c/Program Files/Blender Foundation/Blender 5.2/blender.exe"
O="D:/coding/azal/blender/out/bottle"
"$BL" -b --factory-startup -P bottle.py -- --mode fronts --variants no1 --samples 512 --fill 0.36 --liq 0.97,0.74,0.40,6 --tag _top --out "$O" > out/stage_top.log 2>&1
"$BL" -b --factory-startup -P bottle.py -- --mode fronts --variants no1 --samples 512 --fill 0.68 --liq 0.93,0.50,0.40,9 --tag _heart --out "$O" > out/stage_heart.log 2>&1
echo STAGES_DONE
