// /shop — editorial grid of the six products, one text filter row.
import { gsap } from 'gsap';
import { copy } from '../i18n';
import { env } from '../env';
import { PRODUCTS, fromPrice, type Family } from '../data/products';
import { money, numName, t, esc, bottleImg, $, $$ } from '../util';

export default function shop(el: HTMLElement) {
  const s = copy.shop;
  const fams: (Family | 'all')[] = ['all', 'floral', 'woody', 'amber', 'musk'];
  el.innerHTML = `
    <div class="page shop">
      <header class="page__head">
        <p class="eyebrow">${copy.collection.label}</p>
        <h1 class="page__title" tabindex="-1"><span class="ln"><span class="ln__in">${s.title}</span></span></h1>
        <p class="page__lead">${s.lead}</p>
      </header>
      <div class="filters" role="group" aria-label="${s.filters.all}">
        ${fams.map((f) => `<button type="button" class="filters__b" data-f="${f}" aria-pressed="${f === 'all'}">${s.filters[f]}</button>`).join('')}
      </div>
      <ul class="grid">
        ${PRODUCTS.map((p, i) => `<li class="card ${i === 0 ? 'card--wide' : ''} ${p.id === 'set' ? 'card--set' : ''}" data-fams="${p.families.join(' ')}" style="--bg:${p.color.bg}">
          <a class="card__img" href="/fragrance/${p.slug}" data-view aria-label="${esc(numName(p))}">
            ${bottleImg(p, 'front', '', '')}<span class="card__sweep" aria-hidden="true"></span>
          </a>
          <div class="card__info">
            <h2 class="card__name"><a href="/fragrance/${p.slug}">${esc(numName(p))}</a></h2>
            <p class="card__char">${t(p.character)}</p>
            <p class="card__price">${s.from} ${money(fromPrice(p))}</p>
            <button class="card__add link" type="button" data-add="${p.id}" data-size="${p.sizes[0].id}" aria-label="${s.add.replace('+ ', '')} — ${esc(numName(p))}">${s.add}</button>
          </div>
        </li>`).join('')}
      </ul>
      <p class="shop__empty" data-empty hidden>${s.empty}</p>
      <section class="shop__delivery" id="delivery" aria-labelledby="dl-h">
        <h2 class="eyebrow" id="dl-h">${copy.product.delivery}</h2>
        <p>${copy.product.deliveryText}</p>
      </section>
    </div>`;

  const cards = $$('.card', el);
  $$('[data-f]', el).forEach((b) => b.addEventListener('click', () => {
    const f = b.dataset.f!;
    $$('[data-f]', el).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    let shown = 0;
    cards.forEach((c) => {
      const on = f === 'all' || c.dataset.fams!.split(' ').includes(f);
      c.hidden = !on;
      if (on) shown++;
    });
    $('[data-empty]', el).hidden = shown > 0;
    if (!env.reduced) gsap.fromTo(cards.filter((c) => !c.hidden), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.05, ease: 'power3.out' });
  }));

  if (location.hash === '#delivery') requestAnimationFrame(() => document.getElementById('delivery')?.scrollIntoView());
  if (env.reduced) return;
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.from($$('.ln__in', el), { yPercent: 160, duration: 1.1 }, 0.1);
  tl.from($$('.card__img img', el), { scale: 1.12, duration: 1.6, stagger: 0.06, ease: 'power3.out' }, 0.1);
  tl.from(cards, { opacity: 0, y: 24, duration: 1, stagger: 0.06 }, 0.1);
  return () => tl.kill();
}
