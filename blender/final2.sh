B="/c/Program Files/Blender Foundation/Blender 5.2/blender.exe"
"$B" -b --factory-startup -P clouds2.py -- dawn "D:/coding/azal/blender/out/d" 2560 1440 96 all 3 2 2>&1 | grep -E "RENDERED|Traceback"
"$B" -b --factory-startup -P clouds2.py -- dawn "D:/coding/azal/blender/out/m" 1080 1920 96 all 3 2 2>&1 | grep -E "RENDERED|Traceback"
"$B" -b --factory-startup -P clouds2.py -- wine "D:/coding/azal/blender/out/d" 2560 1440 96 wine_back 3 2 2>&1 | grep -E "RENDERED|Traceback"
"$B" -b --factory-startup -P clouds2.py -- wine "D:/coding/azal/blender/out/m" 1080 1920 96 wine_back 3 2 2>&1 | grep -E "RENDERED|Traceback"
bash pipe.sh dawn 2560 1440 16 out/d
bash pipe.sh dawn 1080 1920 12 out/m
