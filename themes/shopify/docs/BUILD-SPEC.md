# AZAL for the Shopify Theme Store — build spec (shared by all workstreams)

Theme root: `D:/coding/azal/themes/shopify` (built on Shopify's Skeleton theme — keep Skeleton's structure:
`blocks/` theme blocks, `snippets/css-variables.liquid`, `assets/critical.css`, section groups).
Previous AZAL implementation for reference (read, port, improve — do not copy blindly):
`C:/Users/pc/AppData/Local/Temp/claude/D--coding-azal/be591149-d053-459d-ae6e-19aef4791b2a/scratchpad/shopify-v1/`
(sections/, snippets/, assets/azal*.js, assets/azal*.css, locales/).

Official requirements: https://shopify.dev/docs/storefronts/themes/store/requirements — every feature listed
there for your area is mandatory. Validate with: `shopify theme check --path .` (fix offenses in YOUR files only).

## Design language (keep it — this is the product)
Perfume house. Ivory ground `var(--ivory)`, ink text `var(--ink)`, deep wine `var(--wine-deep)` with cream
`var(--cream)`, product images on `var(--card-bg)`. Headings `var(--serif)` (Cormorant, light), body `var(--sans)`.
Eyebrows: 11px, 500, letter-spacing .2–.32em uppercase (Arabic: letter-spacing 0, 13px).
Pills/buttons: `.btn .btn--solid`, `.btn--line`, `.pill`, `.link` (already in assets/azal.css). Line-mask reveals
`.ln > .ln__in`. Generous whitespace, hairline borders `color-mix(in srgb, currentColor 15%, transparent)`.
RTL must work (`html[dir=rtl]`, use logical properties: margin-inline, inset-inline, text-align: start).
Every section that has a background must offer `"type": "color_scheme"` (default `scheme-1`) and add the class
`color-{{ section.settings.color_scheme }}` on its root.

## Hard rules (Theme Store)
- JSON templates only (except layout/theme.liquid, templates/gift_card.liquid). No Sass. No minified own code.
- No custom fonts, no external CDNs, no app-dependent features, no fake urgency/timers.
- Every `<img>` has alt; use `image_url` + `image_tag` with `widths` + `sizes`; lazy-load below the fold.
  Support image focal points: `image_tag` renders them automatically when you pass the image object
  (`{{ image | image_url: width: 1600 | image_tag: ... }}`) — keep `object-fit: cover` crops on image elements.
- Form inputs: unique `id` + `<label for>`. Keyboard accessible, visible focus, 24×24px min touch targets,
  contrast 4.5:1. Headings visually distinct. Valid HTML.
- Links to Shopify domains get `rel="nofollow"`. No designer credits / developer links in the storefront.
- Settings labels: plain English strings in schema (American spelling, sentence case, no "&", no questions,
  no Lorem ipsum, default text that suggests usage). Resource settings must not default to demo resources.
- Storefront text via translation keys `{{ 'namespace.key' | t }}`. Do NOT edit locales/*.json directly —
  write your keys to `docs/locale-fragments/<workstream>.en.json` and `<workstream>.ar.json` (nested JSON,
  Arabic translated properly). They are merged at the end.
- Add `{% render 'image' %}` style reuse where sensible; small SVG icons inline in a snippet.
- Performance: Lighthouse ≥ 60 mobile on home/product/collection. No render-blocking JS (all `defer`).

## Shared globals (already exist)
- `window.azal` (routes incl. `predictiveSearch`, settings, strings) and `window.AZAL` from assets/azal.js
  (`AZAL.env`, `AZAL.scrollToY`, `AZAL.cart.add(items, btn, title)`, `AZAL.cart.open()`, `AZAL.tick`).
- Cart drawer section id `cart-drawer`; cart re-rendering via Section Rendering API (see v1 azal-cart.js).
- CSS files already linked in layout: azal.css, azal-shop.css (base), azal-header.css, azal-product.css,
  azal-store.css. JS already linked (defer): azal.js, azal-cart.js, azal-home.js (home), azal-product.js,
  azal-store.js, azal-search.js. Put your CSS/JS in the files you own.

## Ownership (touch only your files; create new files freely with your prefix)
1. HEADER/SEARCH — sections/header.liquid, sections/header-group.json, sections/announcement-bar.liquid,
   sections/footer.liquid, sections/footer-group.json, sections/predictive-search.liquid, sections/search.liquid
   (+ templates/search.json), snippets/header-*.liquid, snippets/social-icons.liquid, snippets/localization-*.liquid,
   snippets/facets.liquid (shared with collection — you own it), assets/azal-header.css, assets/azal-search.js.
2. PRODUCT — sections/product.liquid (main product), sections/featured-product.liquid,
   sections/product-recommendations.liquid, templates/product.json, snippets/product-*.liquid,
   snippets/price.liquid, snippets/card-product.liquid, snippets/swatch*.liquid, blocks/custom-liquid.liquid,
   assets/azal-product.css, assets/azal-product.js.
3. STORE — sections/collection.liquid (+ templates/collection.json), sections/collections.liquid
   (+ list-collections.json), sections/cart.liquid (+ cart.json), sections/cart-drawer.liquid, snippets/cart-*.liquid,
   templates/gift_card.liquid, sections/main-customers-*.liquid + templates/customers/*.json, sections/404.liquid,
   sections/page.liquid, sections/contact-form.liquid (+ page.contact.json), sections/blog.liquid,
   sections/article.liquid, sections/password.liquid (+ password.json), assets/azal-store.css,
   assets/azal-store.js, assets/azal-cart.js.
4. HOME (lead) — home film sections, rich text, image with text, newsletter section, custom-section,
   custom-liquid section, templates/index.json, layout, config, locales merge.
