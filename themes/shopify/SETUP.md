# AZAL — Shopify theme setup

A perfume-house theme: a scroll film on the home page (sky → clouds → the bottle turning → origins → notes →
collection → dusk), an editorial shop, a split-screen product page, a bag drawer, English and Arabic (RTL).

## 1. Install the theme
**Online Store → Themes → Add theme → Upload zip file** → choose `azal-shopify.zip` → **Customize**.

## 2. Add the products (5 minutes)
1. **Settings → Custom data → Products → Add definition**, namespace and key exactly as below:

   | Name | Namespace and key | Type |
   |---|---|---|
   | Character | `custom.character` | Single line text |
   | Top notes | `custom.notes_top` | Single line text |
   | Heart notes | `custom.notes_heart` | Single line text |
   | Base notes | `custom.notes_base` | Single line text |
   | Story | `custom.story` | Multi-line text |
   | How to wear | `custom.how_to_wear` | Multi-line text |
   | Background colour | `custom.background_color` | Color |
   | Liquid colour | `custom.liquid_color` | Color |

2. **Products → Import** → `demo/products.csv`. The six fragrances arrive with sizes, prices, notes, colours and bottles.
3. **Products → Collections → Create collection** named "Fragrances" (automated: tag is `azal`).

Everything works without the metafields too: the theme simply hides what is missing and uses the card colour
from **Theme settings → Colours**.

## 3. Point the home page at your products
**Customize → Home page**
- **Sky & bottle** — brand name, tagline, manifesto. "Bottle links to product" → No. 1. Optional: your own bottle PNG.
- **Fragrance notes** — Fragrance → No. 1 (notes come from its metafields).
- **Collection slider** — Collection → Fragrances.

## 4. Menus
**Online Store → Navigation**
- `Main menu`: Story (`/#story`), Notes (`/#notes`), Shop (`/collections/fragrances`), Journal … — half the links sit on each side of the emblem.
- `Footer menu`: Shop, Delivery & returns, Contact, Privacy policy, Refund policy.

## 5. Arabic
1. **Settings → Languages → Add language → Arabic → Publish**. The theme turns right-to-left, switches to Amiri
   and IBM Plex Sans Arabic, and shows an "ع / EN" switch in the header. All theme text is already translated.
2. Product text: install **Translate & Adapt** (free, by Shopify) and paste from `demo/products-arabic.csv`.
3. Section text (hero, origins…): Translate & Adapt → Online Store → Theme.

## 6. Pages
- Contact: create a page, template `page.contact`.
- About / Story: create a page, template `page.story` (image with text, rich text, email signup).

## Theme settings worth knowing
- **Motion** — loader, smooth scroll, veil between pages, cursor, petals, grain. Visitors with *reduced motion*
  always get calm still scenes.
- **Cart** — drawer or page; complimentary gift wrapping (saved on the order as `Gift wrapping: Yes`) and a gift message.
- **Typography** — house fonts (bundled) or any font from the Shopify library.

## Credits and licences
Fonts: Cormorant, Hanken Grotesk, Amiri, IBM Plex Sans Arabic — SIL Open Font License.
Libraries: GSAP + ScrollTrigger (GreenSock standard licence, free including commercial use), Lenis (MIT).
Artwork (sky, bottles, notes, petals) is part of the theme and may be used in stores running AZAL.
Origins photography consists of licensed stand-ins — replace it with your own (see ASSET-SOURCES.md in the site repo).
