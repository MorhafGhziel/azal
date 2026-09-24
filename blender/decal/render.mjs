import { chromium } from 'file:///D:/coding/starbucks-2026/node_modules/playwright/index.mjs';
const names = { no1: 'No. 1 — ROSE &amp; OUD', no2: 'No. 2 — AMBER NIGHT', no3: 'No. 3 — WHITE MUSK', no4: 'No. 4 — SAFFRON VEIL', no5: 'No. 5 — DESERT IRIS', set: 'DISCOVERY SET' };
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 2048, height: 2048 } });
await p.goto('file:///D:/coding/azal/blender/decal/decal.html');
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(400);
for (const [k, n] of Object.entries(names)) {
  await p.evaluate((n) => { document.getElementById('name').innerHTML = n; }, n);
  await p.locator('#front').screenshot({ path: `front_${k}.png`, omitBackground: true });
}
for (const id of ['back', 'cap']) {
  await p.evaluate((id) => { document.querySelectorAll('.sheet').forEach(s => s.style.display = s.id === id ? 'flex' : 'none'); }, id);
  await p.locator('#' + id).screenshot({ path: `${id}.png`, omitBackground: true });
}
await b.close();
