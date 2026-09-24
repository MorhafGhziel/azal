// /fragrance/[slug] — split screen: sticky bottle, scrolling details.
import { gsap } from 'gsap';
import { copy } from '../i18n';
import { env } from '../env';
import { bySlug, FRAGRANCES, PRODUCTS, fromPrice } from '../data/products';
import { addToBag } from '../ui/bag';
import { money, numName, t, esc, bottleImg, $, $$ } from '../util';

export default function product(el: HTMLElement, { slug }: Record<string, string>) {
  const p = bySlug(slug);
  const c = copy.product;
  if (!p) {
    el.innerHTML = `<div class="page page--center"><h1 class="page__title" tabindex="-1">${c.notFound}</h1><a class="link" href="/shop">${c.back}</a></div>`;
    return;
  }
  let size = p.sizes[0];
  let qty = 1;
  const others = [...FRAGRANCES, ...PRODUCTS.filter((x) => x.num === null)].filter((x) => x.id !== p.id).slice(0, 3);
  document.title = `${numName(p)} — ${copy.meta.title}`;

  el.innerHTML = `
    <article class="pdp" style="--bg:${p.color.bg};--deep:${p.color.deep}">
      <div class="pdp__visual" data-view>
        <div class="pdp__float" data-float>
          <div class="pdp__bottle" data-bottle-size>
            ${bottleImg(p, 'front', 'pdp__img', `${numName(p)}, ${c.edp}`)}
            <span class="pdp__sweep" aria-hidden="true" style="--mask:url('${p.images.front}')"></span>
          </div>
        </div>
      </div>
      <div class="pdp__info">
        <p class="eyebrow">${c.edp}</p>
        <h1 class="pdp__name" tabindex="-1"><span class="ln"><span class="ln__in">${esc(t(p.name))}</span></span></h1>
        <p class="pdp__meta">${p.num !== null ? `${copy.lang === 'ar' ? 'رقم' : 'No.'} ${p.num} — ` : ''}${t(p.character)}</p>
        <p class="pdp__price" data-price aria-live="polite">${money(size.price)}</p>

        ${p.sizes.length > 1 ? `<fieldset class="sizes"><legend class="field__label">${c.size}</legend>
          ${p.sizes.map((s, i) => `<label class="sizes__pill"><input type="radio" name="size" value="${s.id}" ${i === 0 ? 'checked' : ''} /><span>${t(s.label)}</span></label>`).join('')}
        </fieldset>` : `<p class="pdp__single">${t(size.label)}</p>`}

        <div class="pdp__buy">
          <div class="qty" role="group" aria-label="${c.quantity}">
            <button type="button" data-d="-1" aria-label="${c.decrease}" disabled>−</button>
            <span data-qty aria-live="polite">1</span>
            <button type="button" data-d="1" aria-label="${c.increase}">+</button>
          </div>
          <button class="btn btn--solid btn--full" type="button" data-buy-main>${c.add}</button>
        </div>

        <p class="pdp__desc">${t(p.description)}</p>

        <h2 class="eyebrow pdp__h">${c.notes}</h2>
        <ol class="pdp__notes">
          ${(['top', 'heart', 'base'] as const).map((k, i) => `<li><span class="notes__n">0${i + 1}</span><span class="notes__name">${c[k]}</span><span>${t(p.notes[k])}</span></li>`).join('')}
        </ol>

        <div class="acc">
          ${[[c.story, t(p.story)], [c.wear, t(p.wear)], [c.delivery, c.deliveryText]].map(([h, b], i) => `
            <div class="acc__item">
              <h3><button type="button" class="acc__btn" aria-expanded="false" aria-controls="acc-${i}" id="acc-b-${i}">${h}<span aria-hidden="true">+</span></button></h3>
              <div class="acc__panel" id="acc-${i}" role="region" aria-labelledby="acc-b-${i}" hidden><p>${b}</p></div>
            </div>`).join('')}
        </div>
      </div>
    </article>

    <section class="also" aria-labelledby="also-h">
      <h2 class="eyebrow" id="also-h">${c.also}</h2>
      <ul class="also__row">
        ${others.map((o) => `<li style="--bg:${o.color.bg}"><a href="/fragrance/${o.slug}" data-view>
          <span class="also__img">${bottleImg(o, 'front', '', '')}</span>
          <span class="also__name">${esc(numName(o))}</span><span class="also__price">${copy.shop.from} ${money(fromPrice(o))}</span></a></li>`).join('')}
      </ul>
    </section>

    <div class="buybar" data-buybar aria-hidden="true">
      <span><strong>${esc(t(p.name))}</strong> · <span data-bar-size>${t(size.label)}</span> · <span data-bar-price>${money(size.price)}</span></span>
      <button class="btn btn--solid btn--sm" type="button" data-buy-bar tabindex="-1">${c.add}</button>
    </div>`;

  const bottleBox = $('[data-bottle-size]', el);
  const update = () => {
    const price = money(size.price * qty);
    $('[data-price]', el).textContent = price;
    $('[data-bar-price]', el).textContent = price;
    $('[data-bar-size]', el).textContent = t(size.label);
    $('[data-qty]', el).textContent = String(qty);
    $<HTMLButtonElement>('[data-d="-1"]', el).disabled = qty <= 1;
    $<HTMLButtonElement>('[data-d="1"]', el).disabled = qty >= 10;
  };
  $$<HTMLInputElement>('input[name="size"]', el).forEach((r) => r.addEventListener('change', () => {
    size = p.sizes.find((s) => s.id === r.value)!;
    const big = size !== p.sizes[0];
    gsap.to(bottleBox, { scale: big ? 1 : 0.94, duration: env.reduced ? 0 : 0.8, ease: 'expo.out' });
    update();
  }));
  if (p.sizes.length > 1) gsap.set(bottleBox, { scale: 0.94 });
  $$('[data-d]', el).forEach((b) => b.addEventListener('click', () => { qty = Math.max(1, Math.min(10, qty + Number(b.dataset.d))); update(); }));
  const buy = (b: HTMLButtonElement) => addToBag(p.id, size.id, qty, b);
  const main = $<HTMLButtonElement>('[data-buy-main]', el);
  main.addEventListener('click', () => buy(main));
  const barBtn = $<HTMLButtonElement>('[data-buy-bar]', el);
  barBtn.addEventListener('click', () => buy(barBtn));

  $$<HTMLButtonElement>('.acc__btn', el).forEach((b) => b.addEventListener('click', () => {
    const open = b.getAttribute('aria-expanded') !== 'true';
    b.setAttribute('aria-expanded', String(open));
    const panel = document.getElementById(b.getAttribute('aria-controls')!)!;
    panel.hidden = !open;
    if (open && !env.reduced) gsap.from(panel, { height: 0, opacity: 0, duration: 0.5, ease: 'power3.out', clearProps: 'all' });
  }));

  // sticky bar on phones once the main button is out of view
  const bar = $('[data-buybar]', el);
  const io = new IntersectionObserver(([e]) => {
    const on = !e.isIntersecting && e.boundingClientRect.top < 0;
    bar.classList.toggle('is-on', on);
    bar.setAttribute('aria-hidden', String(!on));
    barBtn.tabIndex = on ? 0 : -1;
  });
  io.observe(main);

  const kills: (() => void)[] = [() => io.disconnect()];
  if (!env.reduced) {
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.from($('.pdp__img', el), { scale: 1.1, opacity: 0, duration: 1.4 }, 0);
    tl.from($$('.ln__in', el), { yPercent: 160, duration: 1.1 }, 0.1);
    tl.from($$('.pdp__info > *:not(h1)', el), { opacity: 0, y: 14, duration: 0.9, stagger: 0.04 }, 0.2);
    tl.fromTo($('.pdp__sweep', el), { backgroundPosition: '100% 0' }, { backgroundPosition: '0% 0', duration: 1.8, ease: 'power2.inOut' }, 0.6);
    // slow float + a few degrees of tilt with the pointer
    const float = gsap.to('[data-float]', { y: -12, duration: 3.2, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    const img = $('.pdp__img', el);
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
      gsap.to(img, { rotationY: nx * 8, rotationX: -ny * 4, duration: 1.2, ease: 'power3.out' });
    };
    addEventListener('pointermove', onMove);
    kills.push(() => { tl.kill(); float.kill(); removeEventListener('pointermove', onMove); });
  }
  return () => kills.forEach((k) => k());
}
