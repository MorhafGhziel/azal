# AZAL: what a real launch would still need

## Assets
- **Origins photos** of the brand's own fields, pickers and distillery (the current four are licensed stand-ins). 2560×1440 + 1080×1920 crops.
- **Real bottle photography or the final CAD** to replace the Blender bottle, if the real bottle differs.
- Back print «أزل» and the debossed cap emblem (optional, not rendered).
- Packaging and the discovery-set box.
- A sound bed (none is used).

## Content
- Real product names, notes, prices, stock, and legal texts (delivery, returns, privacy, VAT number, CR number).

## Commerce: how to connect a real backend
- **Products:** `src/data/products.ts` is the only product source. Replace its export with a fetch (Salla, Shopify Storefront API, a CMS) that returns the same `Product` shape. No UI file reads product data from anywhere else.
- **Cart and totals:** `src/store/cart.ts` holds every calculation (subtotal, delivery, free-delivery threshold, gift wrap, order). Swap `localStorage` for the platform's cart API here.
- **Delivery rules:** `DELIVERY` in `src/data/products.ts`.
- **Checkout:** `src/pages/checkout.ts`. Today `placeOrder()` saves the order on this device only. For real payments, send the customer to the platform's hosted checkout (Salla / Shopify / Moyasar / Tap / Tabby) from the submit handler. Never collect card data on this page.
- **Copy:** `src/content/en.ts` and `src/content/ar.ts`.
- **Hosting:** routes are client-side. `vercel.json` rewrites every path to `index.html`; other hosts need the same SPA fallback.
