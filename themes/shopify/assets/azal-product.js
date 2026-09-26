/* AZAL — product page: options → variant, price, quantity, gallery, add to bag, accordions,
   phone buy bar, the bottle's slow float and pointer tilt, recommendations. Ported from src/pages/product.ts. */
(function () {
  'use strict';
  var A = window.AZAL, gsap = window.gsap;
  if (!A) return;
  var $ = A.$, $$ = A.$$, env = A.env, S = A.cfg.strings;

  function init(root) {
    var section = root.closest('.shopify-section') || document;
    var form = $('[data-product-form]', root) || $('form[action*="/cart/add"]', root);
    var variantsEl = $('[data-variants]', section);
    var variants = [];
    try { variants = JSON.parse(variantsEl.textContent); } catch (e) {}
    var idInput = form && $('[data-variant-id]', form);
    var mainBtn = $('[data-buy-main]', root);
    var qtyInput = $('[data-qty]', root);
    var priceEl = $('[data-price]', root);
    var bar = $('[data-buybar]', section), barBtn = bar && $('[data-buy-bar]', bar), barPrice = bar && $('[data-bar-price]', bar);
    var errEl = $('[data-form-error]', root);
    var current = variants.filter(function (v) { return idInput && String(v.id) === idInput.value; })[0] || variants[0];

    /* ---- options ---- */
    function selected() { return $$('[data-options] fieldset', root).map(function (fs) { var c = $('input:checked', fs); return c ? c.value : null; }); }
    function onOptions() {
      var sel = selected();
      var v = variants.filter(function (x) { return x.options.every(function (o, i) { return sel[i] == null || o === sel[i]; }); })[0];
      current = v || null;
      render();
      if (v) {
        var u = new URL(location.href);
        u.searchParams.set('variant', v.id);
        history.replaceState(null, '', u.toString());
        if (v.media) showMedia(String(v.media));
      }
    }
    $$('[data-options] input', root).forEach(function (r) { r.addEventListener('change', onOptions); });

    function render() {
      var ok = current && current.available;
      if (idInput && current) idInput.value = current.id;
      var label = !current ? S.unavailable : ok ? S.addToCart : S.soldOut;
      if (mainBtn) { mainBtn.disabled = !ok; mainBtn.textContent = label; }
      if (barBtn) { barBtn.disabled = !ok; barBtn.textContent = label; }
      if (current && priceEl) {
        priceEl.innerHTML = '<span class="price' + (current.compare ? ' price--sale' : '') + '"><span class="price__now"></span>' + (current.compare ? ' <s class="price__was"></s>' : '') + '</span>';
        $('.price__now', priceEl).textContent = current.price;
        if (current.compare) $('.price__was', priceEl).textContent = current.compare;
      }
      if (current && barPrice) barPrice.textContent = current.price;
      // mark impossible combinations
      var sel = selected();
      $$('[data-options] fieldset', root).forEach(function (fs, oi) {
        $$('input', fs).forEach(function (inp) {
          var exists = variants.some(function (x) { return x.available && x.options[oi] === inp.value && x.options.every(function (o, j) { return j === oi || sel[j] == null || o === sel[j]; }); });
          inp.parentNode.classList.toggle('is-unavailable', !exists);
        });
      });
    }

    /* ---- quantity ---- */
    function setQty(n) {
      if (!qtyInput) return;
      n = Math.max(1, Math.min(99, n || 1));
      qtyInput.value = n;
      var dec = $('[data-d="-1"]', root);
      if (dec) dec.disabled = n <= 1;
    }
    $$('[data-d]', root).forEach(function (b) { b.addEventListener('click', function () { setQty(Number(qtyInput.value) + Number(b.dataset.d)); }); });
    if (qtyInput) qtyInput.addEventListener('change', function () { setQty(Number(qtyInput.value)); });

    /* ---- add ---- */
    function buy(btn) {
      if (!current || !current.available || !A.cart) return;
      if (errEl) errEl.textContent = '';
      var title = ($('.pdp__name', root) || {}).textContent || '';
      var props = {};
      if (form) new FormData(form).forEach(function (v, k) { var m = k.match(/^properties\[(.+)\]$/); if (m && v) props[m[1]] = v; });
      var item = { id: current.id, quantity: qtyInput ? Number(qtyInput.value) : 1 };
      if (Object.keys(props).length) item.properties = props;
      var sp = form && form.querySelector('[name="selling_plan"]');
      if (sp && sp.value) item.selling_plan = sp.value;
      A.cart.add([item], btn, title.trim()).catch(function (err) { if (errEl) errEl.textContent = err.message; });
    }
    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); buy(mainBtn); });
    if (barBtn) barBtn.addEventListener('click', function () { buy(barBtn); });

    /* ---- gallery ---- */
    var mainImg = $('.pdp__img', root), sweep = $('.pdp__sweep', root);
    function showMedia(id) {
      var th = $('[data-media-id="' + id + '"]', root);
      if (!th || !mainImg || mainImg.tagName !== 'IMG') return;
      $$('.pdp__thumb', root).forEach(function (t) { t.classList.toggle('is-on', t === th); });
      var swap = function () { mainImg.srcset = th.dataset.srcset; mainImg.src = th.dataset.src; if (sweep) sweep.style.setProperty('--mask', "url('" + th.dataset.src + "')"); };
      if (env.reduced || !gsap) return swap();
      gsap.to(mainImg, { opacity: 0, duration: 0.2, onComplete: function () { swap(); gsap.to(mainImg, { opacity: 1, duration: 0.5 }); } });
    }
    $$('.pdp__thumb', root).forEach(function (t) { t.addEventListener('click', function () { showMedia(t.dataset.mediaId); }); });

    /* ---- accordions ---- */
    $$('.acc__btn', root).forEach(function (b) {
      b.addEventListener('click', function () {
        var open = b.getAttribute('aria-expanded') !== 'true';
        b.setAttribute('aria-expanded', String(open));
        var panel = document.getElementById(b.getAttribute('aria-controls'));
        panel.hidden = !open;
        if (open && !env.reduced && gsap) gsap.from(panel, { height: 0, opacity: 0, duration: 0.5, ease: 'power3.out', clearProps: 'all' });
      });
    });

    /* ---- phone buy bar once the main button has scrolled away ---- */
    if (bar && mainBtn && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        var on = !en[0].isIntersecting && en[0].boundingClientRect.top < 0;
        bar.classList.toggle('is-on', on);
        bar.setAttribute('aria-hidden', String(!on));
        barBtn.tabIndex = on ? 0 : -1;
      }).observe(mainBtn);
    }

    /* ---- entrance, float, tilt ---- */
    if (!env.reduced && gsap && mainImg) {
      var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      tl.from(mainImg, { scale: 1.1, opacity: 0, duration: 1.4 }, 0);
      tl.from($$('.pdp__info > *:not(h1)', root), { opacity: 0, y: 14, duration: 0.9, stagger: 0.04 }, 0.2);
      if (sweep) tl.fromTo(sweep, { backgroundPosition: '100% 0' }, { backgroundPosition: '0% 0', duration: 1.8, ease: 'power2.inOut' }, 0.6);
      gsap.to($('[data-float]', root), { y: -12, duration: 3.2, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      if (env.finePointer) addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        var nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
        gsap.to(mainImg, { rotationY: nx * 8, rotationX: -ny * 4, duration: 1.2, ease: 'power3.out' });
      });
    }
    setQty(1);
    render();
  }

  /* ---- recommendations ---- */
  function loadRecs(el) {
    if (!el.dataset.url || el.children.length) return;
    fetch(el.dataset.url).then(function (r) { return r.text(); }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var fresh = doc.querySelector('[data-recommendations]');
      if (fresh && fresh.innerHTML.trim()) el.innerHTML = fresh.innerHTML;
    }).catch(function () {});
  }

  $$('[data-product]').forEach(init);
  $$('[data-recommendations]').forEach(function (el) {
    if (!('IntersectionObserver' in window)) return loadRecs(el);
    var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { io.disconnect(); loadRecs(el); } }, { rootMargin: '0px 0px 400px 0px' });
    io.observe(el);
  });
  document.addEventListener('shopify:section:load', function (e) {
    $$('[data-product]', e.target).forEach(init);
    $$('[data-recommendations]', e.target).forEach(loadRecs);
  });
})();
