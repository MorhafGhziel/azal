# AZAL: where every asset comes from

All products, prices, orders and the brand itself are fictional (a SIMA concept).

## Made for this project (no licence issues)
| Asset | How it was made | Files |
|---|---|---|
| Bottle, 5 colourways + discovery set, with the printed AZAL mark | Blender 5.2 Cycles, `blender/bottle.py` (logo decal `blender/decal/`) | `public/assets/bottle/` |
| Rose petal (sprite sheet + 3 stills) | Blender, `blender/petal.py` | `public/assets/petal/` |
| Dawn + dusk painted sky layers, mist, wine clouds | Blender clouds + grading + stroke painting, `blender/clouds2.py`, `grade.py`, `strokes.py`, `export.py` | `public/assets/sky/` |
| Emblem, wordmark | SVG in `index.html` (`#emblem`) | — |
| Grain | generated | `public/assets/grain.png` |

Render steps: `blender/RENDER-NOTES.md`.

## Third-party photos (Origins chapters), graded in `blender/chapters.py`
| Chapter | Photo | Author | Licence | Source |
|---|---|---|---|---|
| The Land | Rose fields in Kelaa Mgouna | مصطفى ملو | CC BY-SA 4.0 | https://commons.wikimedia.org/w/index.php?curid=161980807 |
| The Hand | Jurlique Rose Harvest | Lukedm95 | CC BY-SA 4.0 | https://commons.wikimedia.org/w/index.php?curid=122352797 |
| The Craft | Copper still | Craig Hatfield | CC BY 2.0 | https://commons.wikimedia.org/w/index.php?curid=112930979 |
| The Time | Free smoke image | — | CC0 | https://www.rawpixel.com/image/5917611/free-smoke-image-public-domain-cc0-photo |

**CC BY / BY-SA need a visible credit** wherever the site is published (a credits line in the footer is enough). The graded versions of the two BY-SA photos are also BY-SA.

## Fonts (OFL, self-hosted through @fontsource)
Cormorant, Hanken Grotesk, Markazi Text, Readex Pro.

## Libraries
GSAP (+ ScrollTrigger), Lenis. No analytics, no trackers, no external requests.

## Notes section ingredients
Painted cut-outs, made for this project: Blender models (`blender/ingredients.py`) painted with the hero's stroke painter (`strokes.py ing`), run with `blender/ing.sh` → `public/assets/notes/`.
Top: bergamot slice, whole bergamot, saffron, pink pepper · Heart: Taif rose, jasmine (+ the rendered petals) · Base: oud chips, amber resin.
Stage bottles `no1_top_front` / `no1_heart_front`: `blender/stages.sh` (bottle.py `--fill` / `--liq`).
