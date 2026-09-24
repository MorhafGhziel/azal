// /checkout — demo. One calm page, numbered steps, inline validation. Nothing is sent anywhere.
import { gsap } from 'gsap';
import { copy } from '../i18n';
import { env } from '../env';
import { DELIVERY } from '../data/products';
import * as cart from '../store/cart';
import { navigate } from '../router';
import { money, numName, t, esc, bottleImg, $, $$ } from '../util';

const digits = (s: string) => s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
const phoneOk = (v: string) => /^(?:\+?966|0)?5\d{8}$/.test(digits(v).replace(/[\s\-()]/g, ''));

export default function checkout(el: HTMLElement) {
  const k = copy.checkout;
  if (!cart.getCart().lines.length) {
    el.innerHTML = `<div class="page page--center"><h1 class="page__title" tabindex="-1">${k.title}</h1><p>${k.emptyBag}</p><a class="link" href="/shop">${copy.cart.discover}</a></div>`;
    return;
  }
  const field = (id: string, label: string, attrs: string, hint = '') => `
    <div class="field" data-field="${id}">
      <label class="field__label" for="f-${id}">${label}</label>
      <input id="f-${id}" name="${id}" ${attrs} aria-describedby="${hint ? `h-${id} ` : ''}e-${id}" />
      ${hint ? `<p class="field__hint" id="h-${id}">${hint}</p>` : ''}
      <p class="field__err" id="e-${id}" aria-live="polite"></p>
    </div>`;

  el.innerHTML = `
    <div class="co">
      <p class="co__demo" role="note">${k.demo}</p>
      <div class="co__grid">
        <form class="co__form" novalidate>
          <h1 class="page__title co__title" tabindex="-1">${k.title}</h1>
          <p class="co__alert" data-alert role="alert" hidden>${k.errors.summary}</p>

          <fieldset class="co__step"><legend><span>1</span>${k.contact}</legend>
            ${field('email', k.email, 'type="email" autocomplete="email" inputmode="email" required spellcheck="false" dir="ltr"')}
            ${field('phone', k.phone, 'type="tel" autocomplete="tel" inputmode="tel" required placeholder="+966 5X XXX XXXX" dir="ltr"', k.phoneHint)}
          </fieldset>

          <fieldset class="co__step"><legend><span>2</span>${k.deliveryH}</legend>
            ${field('name', k.name, 'type="text" autocomplete="name" required')}
            <div class="field" data-field="city">
              <label class="field__label" for="f-city">${k.city}</label>
              <select id="f-city" name="city" autocomplete="address-level2" required aria-describedby="e-city">
                <option value="">${k.cityPh}</option>
                ${copy.cities.map((c, i) => `<option value="${i}">${c}</option>`).join('')}
              </select>
              <p class="field__err" id="e-city" aria-live="polite"></p>
            </div>
            <div class="field-row">
              ${field('district', k.district, 'type="text" autocomplete="address-level3" required')}
              ${field('building', k.building, 'type="text" inputmode="numeric" autocomplete="off" maxlength="4" required dir="ltr"', k.buildingHint)}
            </div>
            ${field('street', k.street, 'type="text" autocomplete="address-line1" required')}
            <div class="field"><label class="field__label" for="f-notes">${k.notes}</label><textarea id="f-notes" name="notes" rows="2" maxlength="200"></textarea></div>

            <div class="choice" role="radiogroup" aria-labelledby="m-h">
              <p class="field__label" id="m-h">${k.method}</p>
              <label class="choice__row"><input type="radio" name="method" value="standard" checked />
                <span class="choice__main"><strong>${k.standard}</strong><span class="muted">${k.standardEta}</span></span><span class="choice__price" data-std></span></label>
              <label class="choice__row"><input type="radio" name="method" value="express" />
                <span class="choice__main"><strong>${k.express}</strong><span class="muted">${k.expressEta}</span></span><span class="choice__price">${money(DELIVERY.express)}</span></label>
              <p class="field__hint" data-express-no hidden>${k.expressNo}</p>
              <p class="field__hint">${k.freeOver} ${money(DELIVERY.freeStandardOver)}.</p>
            </div>
          </fieldset>

          <fieldset class="co__step"><legend><span>3</span>${k.payment}</legend>
            <p class="co__notice">${k.demo}</p>
            <div class="choice" role="radiogroup" aria-label="${k.payment}">
              ${[['card', k.card], ['mada', k.mada], ['apple', k.apple], ['tabby', k.tabby]].map(([v, l], i) =>
                `<label class="choice__row"><input type="radio" name="pay" value="${v}" ${i === 0 ? 'checked' : ''} /><span class="choice__main"><strong>${l}</strong></span></label>`).join('')}
              <p class="field__hint">${k.payNote}</p>
            </div>
          </fieldset>

          <button class="btn btn--solid btn--full btn--lg" type="submit" data-place></button>
        </form>

        <aside class="co__sum" aria-labelledby="sum-h">
          <button class="co__toggle" type="button" aria-expanded="false" aria-controls="sum-body" data-sum-toggle><span data-sum-label>${k.show}</span><span data-sum-total></span></button>
          <div class="co__sumbody" id="sum-body" data-sum-body>
            <div class="co__sumhead"><h2 class="eyebrow" id="sum-h">${k.summary}</h2><button class="link link--quiet" type="button" data-edit>${k.edit}</button></div>
            <ul class="co__lines" data-lines></ul>
            <dl class="sums" data-sums></dl>
          </div>
        </aside>
      </div>
    </div>`;

  const form = $<HTMLFormElement>('form', el);
  const method = () => (form.elements.namedItem('method') as RadioNodeList).value as cart.Method;
  const cityIdx = () => (form.elements.namedItem('city') as HTMLSelectElement).value;
  let placing = false;

  function renderSummary() {
    const c = cart.getCart();
    if (!c.lines.length && !placing) { navigate('/shop', true); return; }
    const tot = cart.totals(method(), c);
    $('[data-lines]', el).innerHTML = c.lines.map((l) => {
      const r = cart.resolve(l)!;
      return `<li><span class="co__thumb" style="--bg:${r.product.color.bg}">${bottleImg(r.product, 'thumb', '', '')}<span class="co__q">${l.qty}</span></span>
        <span class="co__ln"><strong>${esc(numName(r.product))}</strong><span class="muted">${t(r.size.label)}</span></span><span>${money(r.size.price * l.qty)}</span></li>`;
    }).join('') + (c.gift ? `<li class="co__gift"><span>${k.giftLine}${c.giftMsg ? ` — “${esc(c.giftMsg)}”` : ''}</span><span>${k.free}</span></li>` : '');
    $('[data-sums]', el).innerHTML = `
      <div><dt>${copy.cart.subtotal}</dt><dd>${money(tot.subtotal)}</dd></div>
      <div><dt>${copy.cart.delivery}</dt><dd>${tot.delivery === 0 ? k.free : money(tot.delivery || 0)}</dd></div>
      <div class="sums__total"><dt>${copy.cart.total}</dt><dd>${money(tot.total)}</dd></div>
      <p class="muted sums__vat">${k.vat}</p>`;
    $('[data-std]', el).textContent = tot.subtotal >= DELIVERY.freeStandardOver ? k.free : money(DELIVERY.standard);
    $('[data-sum-total]', el).textContent = money(tot.total);
    const place = $<HTMLButtonElement>('[data-place]', el);
    if (!placing) place.textContent = `${k.place} — ${money(tot.total)}`;
  }

  // express only where it exists
  function syncExpress() {
    const v = cityIdx();
    const ok = v === '' || DELIVERY.expressCities.includes(Number(v));
    const ex = form.querySelector<HTMLInputElement>('input[value="express"]')!;
    ex.disabled = !ok;
    if (!ok && ex.checked) form.querySelector<HTMLInputElement>('input[value="standard"]')!.checked = true;
    $('[data-express-no]', el).hidden = ok;
    renderSummary();
  }

  const rules: Record<string, (v: string) => boolean> = {
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
    phone: phoneOk,
    name: (v) => v.trim().split(/\s+/).filter(Boolean).length >= 2,
    city: (v) => v !== '',
    district: (v) => v.trim().length >= 2,
    street: (v) => v.trim().length >= 2,
    building: (v) => /^\d{4}$/.test(digits(v.trim())),
  };
  const check = (name: string, show = true) => {
    const inp = form.elements.namedItem(name) as HTMLInputElement;
    const ok = rules[name](inp.value);
    if (show) {
      inp.setAttribute('aria-invalid', String(!ok));
      $(`#e-${name}`, el).textContent = ok ? '' : (k.errors as Record<string, string>)[name];
    }
    return ok;
  };
  Object.keys(rules).forEach((n) => {
    const inp = form.elements.namedItem(n) as HTMLInputElement;
    inp.addEventListener('blur', () => { if (inp.value) check(n); });
    inp.addEventListener('input', () => { if (inp.getAttribute('aria-invalid') === 'true') check(n); });
  });
  form.addEventListener('change', (e) => {
    const n = (e.target as HTMLInputElement).name;
    if (n === 'city') { check('city'); syncExpress(); }
    if (n === 'method') renderSummary();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (placing) return;
    const bad = Object.keys(rules).filter((n) => !check(n));
    const alert = $('[data-alert]', el);
    alert.hidden = !bad.length;
    if (bad.length) { (form.elements.namedItem(bad[0]) as HTMLElement).focus(); return; }
    placing = true;
    const btn = $<HTMLButtonElement>('[data-place]', el);
    btn.disabled = true; btn.classList.add('is-loading'); btn.textContent = k.placing;
    const v = (n: string) => (form.elements.namedItem(n) as HTMLInputElement).value.trim();
    setTimeout(() => {
      const order = cart.placeOrder({
        firstName: v('name').split(/\s+/)[0], email: v('email'), phone: v('phone'),
        address: { name: v('name'), city: Number(v('city')), district: v('district'), street: v('street'), building: digits(v('building')), notes: v('notes') },
        method: method(), payment: (form.elements.namedItem('pay') as RadioNodeList).value,
      });
      navigate(`/order/${order.id}`, true);
    }, 700); // a short, honest pause: nothing is sent anywhere
  });

  const toggle = $('[data-sum-toggle]', el);
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    el.querySelector('.co__sum')!.classList.toggle('is-open', open);
    $('[data-sum-label]', el).textContent = open ? k.hide : k.show;
  });
  $('[data-edit]', el).addEventListener('click', () => import('../ui/bag').then((m) => m.open()));

  const unsub = cart.subscribe(renderSummary);
  if (!env.reduced) gsap.from($$('.co__step, .co__sum', el), { opacity: 0, y: 18, duration: 0.9, stagger: 0.06, ease: 'expo.out' });
  return () => { unsub(); };
}
