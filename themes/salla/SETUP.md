# أزل · AZAL — Salla theme

Built on Salla's official Raed theme (Twilight), so every store function stays: cart, checkout, accounts,
filters, reviews, wishlist, loyalty, branches. AZAL adds the house look and five home components.

## Publish it (Salla Partners)
Salla reads a theme from a GitHub repository whose **root** holds `twilight.json`.
1. Create a repository (for example `azal-salla`) and push the contents of this folder to it
   (`node_modules/` is ignored; `public/` is the built theme and must be committed).
2. portal.salla.partners → Themes → Create theme → **Import theme** → choose that repository.
3. Preview on your demo store, then submit for review.

## Develop
```bash
pnpm install
node scripts/sync-from-shopify.mjs   # pull the shared AZAL styles, scripts and artwork from ../shopify
node scripts/azal-manifest.mjs       # write AZAL settings + components into twilight.json
pnpm run production                  # build public/
salla theme preview                  # live preview on your demo store (needs `salla login`)
```
The design is kept once, in `themes/shopify/assets` (azal.css, azal-shop.css, azal.js, azal-home.js).
The sync scopes every AZAL style to `.az`, so it never collides with Raed's Tailwind classes.

## Build the home page (Salla store → Theme → Customise → Home)
Add, in this order:
1. **AZAL — Sky & bottle** (choose the product the bottle opens)
2. **AZAL — Origins** (four chapters are pre-filled)
3. **AZAL — Fragrance notes** (choose the fragrance, write its notes)
4. **AZAL — Collection slider** (choose up to 12 products; one background colour per line)
5. **AZAL — Finale**

Empty image fields use the theme's own painted sky, bottles and photography.

## Theme settings → AZAL
Colours (hex), store logo or the AZAL emblem, and motion switches: opening loader, smooth scroll,
page veil, cursor, petals, film grain. Visitors who ask for reduced motion get still scenes.

## Recommended store settings
- Store colour: `#1a1614` (ink) — Salla uses it for its own buttons and badges.
- Languages: Arabic and English. All AZAL text is in both (`src/locales/*.json` → `azal`).
