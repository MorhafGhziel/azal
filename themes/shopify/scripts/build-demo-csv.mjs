// Builds demo/products.csv (Shopify product import) from the AZAL site's product file, so the store
// starts with the same six fragrances, prices, notes and colours as the site.
// Run: node scripts/build-demo-csv.mjs [image base URL]
// Images: by default they point at this repo on GitHub (raw files in themes/shopify/assets). Pass another
// base URL if you host them elsewhere; Shopify downloads each image once during the import.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const site = join(root, '..', '..');
const { PRODUCTS } = await import(pathToFileURL(join(site, 'src', 'data', 'products.ts')).href);
const imgBase = process.argv[2] || 'https://raw.githubusercontent.com/MorhafGhziel/azal/main/themes/shopify/assets/';

const cols = [
  'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Type', 'Tags', 'Published',
  'Option1 Name', 'Option1 Value', 'Variant SKU', 'Variant Grams', 'Variant Inventory Tracker', 'Variant Inventory Qty',
  'Variant Inventory Policy', 'Variant Fulfillment Service', 'Variant Price', 'Variant Requires Shipping', 'Variant Taxable',
  'Image Src', 'Image Position', 'Image Alt Text', 'Gift Card', 'SEO Title', 'SEO Description', 'Status',
  'Character (product.metafields.custom.character)',
  'Top notes (product.metafields.custom.notes_top)',
  'Heart notes (product.metafields.custom.notes_heart)',
  'Base notes (product.metafields.custom.notes_base)',
  'Story (product.metafields.custom.story)',
  'How to wear (product.metafields.custom.how_to_wear)',
  'Background colour (product.metafields.custom.background_color)',
  'Liquid colour (product.metafields.custom.liquid_color)',
];
const esc = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const rows = [cols.join(',')];

for (const p of PRODUCTS) {
  const title = p.num === null ? p.name.en : `No. ${p.num} — ${p.name.en}`;
  const tags = ['azal', ...p.families, p.num === null ? 'set' : 'eau-de-parfum'].join(', ');
  const img = `${imgBase}bottle-${p.id}_front.webp`;
  p.sizes.forEach((s, i) => {
    const first = i === 0;
    const r = {
      Handle: p.slug,
      Title: first ? title : '',
      'Body (HTML)': first ? `<p>${p.description.en}</p>` : '',
      Vendor: first ? 'AZAL' : '',
      Type: first ? (p.num === null ? 'Discovery set' : 'Eau de Parfum') : '',
      Tags: first ? tags : '',
      Published: first ? 'TRUE' : '',
      'Option1 Name': first ? 'Size' : '',
      'Option1 Value': s.label.en,
      'Variant SKU': `AZ-${p.id.toUpperCase()}-${s.id}`,
      'Variant Grams': p.num === null ? 250 : s.id === '100' ? 520 : 380,
      'Variant Inventory Tracker': 'shopify',
      'Variant Inventory Qty': 50,
      'Variant Inventory Policy': 'deny',
      'Variant Fulfillment Service': 'manual',
      'Variant Price': s.price.toFixed(2),
      'Variant Requires Shipping': 'TRUE',
      'Variant Taxable': 'TRUE',
      'Image Src': first ? img : '',
      'Image Position': first ? 1 : '',
      'Image Alt Text': first ? `${title}, ${p.character.en.toLowerCase()} eau de parfum` : '',
      'Gift Card': first ? 'FALSE' : '',
      'SEO Title': first ? `${title} — AZAL` : '',
      'SEO Description': first ? p.description.en : '',
      Status: first ? 'active' : '',
      'Character (product.metafields.custom.character)': first ? p.character.en : '',
      'Top notes (product.metafields.custom.notes_top)': first ? p.notes.top.en : '',
      'Heart notes (product.metafields.custom.notes_heart)': first ? p.notes.heart.en : '',
      'Base notes (product.metafields.custom.notes_base)': first ? p.notes.base.en : '',
      'Story (product.metafields.custom.story)': first ? p.story.en : '',
      'How to wear (product.metafields.custom.how_to_wear)': first ? p.wear.en : '',
      'Background colour (product.metafields.custom.background_color)': first ? p.color.bg : '',
      'Liquid colour (product.metafields.custom.liquid_color)': first ? p.color.liquid : '',
    };
    rows.push(cols.map((c) => esc(r[c])).join(','));
  });
}

// Arabic copy for Translate & Adapt (Settings → Languages → Arabic), one line per product
const ar = [['Handle', 'Title (ar)', 'Description (ar)', 'Character (ar)', 'Top (ar)', 'Heart (ar)', 'Base (ar)', 'Story (ar)', 'How to wear (ar)'].join(',')];
for (const p of PRODUCTS) {
  const title = p.num === null ? p.name.ar : `رقم ${p.num} — ${p.name.ar}`;
  ar.push([p.slug, title, p.description.ar, p.character.ar, p.notes.top.ar, p.notes.heart.ar, p.notes.base.ar, p.story.ar, p.wear.ar].map(esc).join(','));
}

mkdirSync(join(root, 'demo'), { recursive: true });
writeFileSync(join(root, 'demo', 'products.csv'), '﻿' + rows.join('\n') + '\n');
writeFileSync(join(root, 'demo', 'products-arabic.csv'), '﻿' + ar.join('\n') + '\n');
console.log(`demo/products.csv: ${PRODUCTS.length} products, ${rows.length - 1} variants`);
