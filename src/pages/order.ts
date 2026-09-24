// /order/[id] — thank-you under the dusk sky, the petal lands.
import { gsap } from 'gsap';
import { copy } from '../i18n';
import { env } from '../env';
import { getOrder, resolve } from '../store/cart';
import { money, numName, t, esc } from '../util';

export default function order(el: HTMLElement, { id }: Record<string, string>) {
  const o = getOrder(id);
  const k = copy.order;
  const sky = ['sky', 'far', 'mid', 'near'].map((l) => `<picture class="thanks__layer"><source media="(max-aspect-ratio: 1/1)" srcset="/assets/sky/m/dusk_${l}.webp" /><img src="/assets/sky/d/dusk_${l}.webp" alt="" /></picture>`).join('');
  if (!o) {
    el.innerHTML = `<div class="thanks">${sky}<div class="thanks__card"><h1 class="thanks__title" tabindex="-1">${k.missing}</h1><a class="pill" href="/">${k.back}</a></div></div>`;
    return;
  }
  const co = copy.checkout;
  const a = o.address;
  el.innerHTML = `
    <div class="thanks">
      ${sky}
      <img class="thanks__petal" src="/assets/petal/petal_c.webp" alt="" />
      <div class="thanks__card">
        <h1 class="thanks__title" tabindex="-1"><span class="ln"><span class="ln__in">${k.thanks}${copy.lang === "ar" ? "،" : ","} ${esc(o.firstName)}.</span></span></h1>
        <p class="thanks__lead">${k.prepared(o.id)}</p>
        <div class="thanks__sum">
          <div><h2 class="eyebrow">${k.items}</h2>
            <ul>${o.lines.map((l) => { const r = resolve(l); return r ? `<li><span>${l.qty} × ${esc(numName(r.product))}, ${t(r.size.label)}</span><span>${money(l.price * l.qty)}</span></li>` : ''; }).join('')}
              ${o.gift ? `<li><span>${co.giftLine}</span><span>${co.free}</span></li>` : ''}
              <li><span>${copy.cart.delivery} · ${o.method === 'express' ? co.express : co.standard}</span><span>${o.totals.delivery === 0 ? co.free : money(o.totals.delivery || 0)}</span></li>
              <li class="thanks__total"><span>${copy.cart.total}</span><span>${money(o.totals.total)}</span></li></ul></div>
          <div><h2 class="eyebrow">${k.deliverTo}</h2>
            <p>${esc(a.name)}<br />${esc(a.street)}, ${esc(a.building)}<br />${esc(a.district)}, ${copy.cities[a.city]}</p></div>
        </div>
        <a class="pill" href="/">${k.back}</a>
        <p class="thanks__demo">${k.demo}</p>
      </div>
    </div>`;
  if (env.reduced) return;
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.from(el.querySelectorAll('.thanks__layer'), { yPercent: (i) => 4 + i * 5, duration: 2.4, ease: 'power3.out' }, 0);
  tl.from(el.querySelectorAll('.ln__in'), { yPercent: 160, duration: 1.3 }, 0.3);
  tl.from(el.querySelectorAll('.thanks__lead, .thanks__sum, .thanks__card .pill, .thanks__demo'), { opacity: 0, y: 14, duration: 1, stagger: 0.08 }, 0.5);
  tl.fromTo('.thanks__petal', { x: () => -innerWidth * 0.2, y: () => -innerHeight * 0.8, rotation: -160, opacity: 0 },
    { x: 0, y: 0, rotation: 10, opacity: 1, duration: 4.2, ease: 'sine.out' }, 0.2);
  return () => tl.kill();
}
