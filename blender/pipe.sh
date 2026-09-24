#!/bin/bash
# pipe.sh <preset> <w> <h> <kuwahara size>
P=$1; W=$2; H=$3; K=$4; O=${5:-out}
B="/c/Program Files/Blender Foundation/Blender 5.2/blender.exe"
uv run --python 3.12 --with pillow --with numpy --with scipy python grade.py $P $W $H $O || exit 1
for L in sky far mid near front; do
  [ -f $O/${P}_${L}_graded.png ] || continue
  S=$K; [ $L = sky ] && S=$((K*2)); [ $L = far ] && S=$((K*2/3)); [ $L = front ] && S=$((K*3/2))
  "$B" -b --factory-startup -P paint.py -- "D:/coding/azal/blender/$O/${P}_${L}_graded.png" "D:/coding/azal/blender/$O/${P}_${L}_paint.png" $S 2>&1 | grep -iE "error|Traceback"
done
uv run --python 3.12 --with pillow python comp.py $P paint sky,far,mid,near,front $O
