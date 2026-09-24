# AZAL render notes

Everything renders headless with Blender 5.2 + Cycles on the GPU (OptiX), view transform **Standard** (AgX bleaches warm colours).
`BL="/c/Program Files/Blender Foundation/Blender 5.2/blender.exe"` in Git Bash. Run the commands from `D:\coding\azal\blender\`.

## 1. Bottle: `bottle.py`

Everything with the printed logo, in priority order (no1 turn, fronts + thumbs, no2–no5 short turns, discovery set):
```
bash run_logo.sh          # ~1.5 h on the RTX 5060 Ti when the GPU is shared
```
Single jobs:
```
"$BL" -b --factory-startup -P bottle.py -- --mode fronts --samples 768 --out "D:/coding/azal/blender/out/bottle"
"$BL" -b --factory-startup -P bottle.py -- --mode turn --variant no1 --yawmax 12 --nframes 25 --samples 512 --out "D:/coding/azal/blender/out/bottle"
"$BL" -b --factory-startup -P bottle.py -- --mode turn --variant no3 --yawmax 6 --nframes 9 --samples 384 --out "D:/coding/azal/blender/out/bottle"
"$BL" -b --factory-startup -P bottle.py -- --mode set --samples 768 --out "D:/coding/azal/blender/out/bottle"
uv run --python 3.12 --with pillow python pack.py fronts|turns|thumbs|set
```
Options: `--variants no1,no3` (fronts only), `--pct 40` (quick low-res test), `--frames 0,12,24` (some turn frames), `--nologo` (hide the print).

**Design:** a thick glass slab shaped like a round-arch window, w:h = 1:1.35, depth 0.45 w, bevelled edges.
- The base is 18% of the height; the side and top walls are 0.135 w; the front and back walls are 0.08 w.
- The liquid is an inner arch; its top is flat in the middle and climbs the glass slightly at the walls (curved meniscus). The absorption is ~1.3x denser at the bottom than at the top.
- **Printed logo:** a thin plane 0.0008 in front of the flat front face, square 0.54 w, emblem top just under where the inner arch starts curving. Artwork = `decal/front_noN.png` (alpha = print mask, cubic sampling), minis use `decal/front_set.png`. Warm foil: Principled metallic 0.85, roughness 0.3, colour per colourway in `PRINT`. A soft light (`FoilKey`, near the camera axis) is light-linked to the print only, so the foil catches a highlight that moves on the turn without brightening the glass. The foil is opaque, so the difference matte gives it alpha 1. Back print (أزل) and cap deboss were optional and are not done.
- A short glass neck carries a squat cap: diameter 0.38 w, height 0.22 h, rounded top edge.
- Colourways live in `VARIANTS` in the script. Each one sets the liquid colour, the absorption density, the backlight glow and the cap material.

**How the transparency works.** `film_transparent_glass` turned the glass into a grey slab and the liquid into mud, so the script does not use it. It difference-mattes instead:
- Rays that have passed through the glass (or camera rays) see a "page" colour **K**. When they are bent far sideways they see black flags instead, which keeps the thick edges dark and readable.
- Every image is rendered twice, with K = 0 and K = 1, and alpha = 1 − (img(K=1) − img(K=0)). The page you put the PNG on then shows through the glass the way it would through real glass.
- The liquid is lit by a hidden warm "glow card" behind the bottle. Only rays that crossed the liquid can see it (transmission depth > 5.5). The card is part emission, part see-through.
- Limit: a single alpha can't carry a colour tint. The liquid's colour therefore comes from its own glow, and through the liquid the page shows only as neutral see-through.

Outputs (`D:\coding\azal\public\assets\bottle\`):
| file | what |
|---|---|
| `noN_front.png` / `.webp` | 1400×1800 RGBA front still, yaw 0°, identical framing for N = 1..5 |
| `no1_turn/0000.webp … 0024.webp` | 1000×1286 RGBA, yaw −12° → +12° in 1° steps (bottle turns, camera fixed; same framing as the fronts) |
| `no2_turn … no5_turn/0000–0008.webp` | 1000×1286 RGBA, 9 frames, yaw −6° → +6° in 1.5° steps (pointer tilt on the product page) |
| `noN_thumb.webp` | 480 px tall, trimmed to the bottle + 6% padding (cart / checkout) |
| `set_front.png` / `.webp` | 1800×1400 RGBA discovery set: five minis at 42% scale in a shallow arc, no1 → no5 left to right, print = front_set.png |
| `set_thumb.webp` | 480 px tall, trimmed set |

The colourways are: no1 Rose & Oud (ivory alabaster cap), no2 Amber Night (dark oud-wood cap), no3 White Musk (white alabaster cap), no4 Saffron Veil (brushed brass cap), no5 Desert Iris (warm grey travertine cap).

## 2. Petal: `petal.py`

```
"$BL" -b --factory-startup -P petal.py -- --mode loop   --samples 192 --out "D:/coding/azal/blender/out/petal"
"$BL" -b --factory-startup -P petal.py -- --mode stills --samples 384 --out "D:/coding/azal/blender/out/petal"
uv run --python 3.12 --with pillow python pack.py petal
uv run --python 3.12 --with pillow python pack.py stills
```
**The petal:** a procedural grid mesh with a rose-petal outline (broad round top, narrow claw base).
- Shape: cupped, the top rim rolls back, a wavy edge, one soft diagonal fold, a slight twist, 0.007 thick (solidify).
- Material: Principled with subsurface, sheen, faint radial veins, a cell micro-bump and 16% translucent BSDF. The colour runs from a warm claw to #EED3C8-ish blush ivory.
- Light: a warm soft key from the left, a back light for translucency and a faint cool fill.
- The loop turns X one full flip and Z one full spin (opposite direction), with a gentle 2× rock on Y, so it is seamless over 48 frames.

Outputs (`D:\coding\azal\public\assets\petal\`):
| file | what |
|---|---|
| `petal_sheet.webp` / `.png` | 3072×2304 RGBA sprite sheet, 8 columns × 6 rows of 384 px cells, frame i at column i%8, row i//8 |
| `petal_a.webp` | 768², three-quarter, cup visible |
| `petal_b.webp` | 768², tilted on edge, shows curl and rolled rim |
| `petal_c.webp` | 768², lying flat, seen from above (the "landed" pose) |

## 3. Helpers
- `pack.py`: copies/encodes the renders into `public/assets` (webp quality 90, method 6, alpha kept).
- `sheet.py OUT.jpg a.png b.png … [--h 420]`: composites each RGBA image over ivory #F4EFE7, oxblood #4A1419 and smoke #2A1D17.
- Logo contact sheet: `out/logo_sheet.jpg`.
- Contact sheets: `out/bottle_sheet.jpg` (5 fronts x 3 backgrounds), `out/petal_sheet_check.jpg` (sprite sheet on oxblood), `out/petal_stills_sheet.jpg`.
- Scratch/test renders live in `out/btest`, `out/ptest` (safe to delete).
