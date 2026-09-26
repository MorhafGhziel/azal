/* AZAL — the bag: Ajax cart, drawer (re-rendered with the Section Rendering API), nav count, toast.
   Ported from src/ui/bag.ts; the numbers now come from Shopify's cart, not localStorage. */
(function () {
  'use strict';
  var A = window.AZAL, cfg = window.azal, gsap = window.gsap;
  if (!A) return;
  var $ = A.$, $$ = A.$$, env = A.env;
  var routes = cfg.routes, S = cfg.strings;
  var drawer = document.getElementById('CartDrawer');
  var lastFocus = null, toastTimer = 0;

  function sectionsWanted() {
    var ids = [];
    if (drawer) ids.push('cart-drawer');
    var page = $('[data-cart-page]');
    if (page && page.dataset.sectionId) ids.push(page.dataset.sectionId);
    return ids;
  }

  function post(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify(body),
    }).then(function (r) {
      return r.json().then(function (j) { if (!r.ok || j.status) { var e = new Error(j.description || j.message || S.cartError); e.data = j; throw e; } return j; });
    });
  }

  function renderSections(sections) {
    if (!sections) return;
    Object.keys(sections).forEach(function (id) {
      var html = sections[id];
      if (!html) return;
      var doc = new DOMParser().parseFromString(html, 'text/html');
      if (id === 'cart-drawer' && drawer) {
        var fresh = doc.getElementById('CartDrawer');
        if (!fresh) return;
        // keep the note if the shopper is typing in it
        var note = $('[data-cart-note]', drawer);
        var typing = note && document.activeElement === note;
        $('.drawer__title', drawer).replaceWith($('.drawer__title', fresh));
        $('[data-cart-body]', drawer).replaceWith($('[data-cart-body]', fresh));
        var oldFoot = $('.drawer__foot', drawer), newFoot = $('.drawer__foot', fresh);
        if (typing && oldFoot && newFoot) $('.sums', oldFoot).replaceWith($('.sums', newFoot));
        else if (oldFoot && newFoot) oldFoot.replaceWith(newFoot);
        else if (oldFoot) oldFoot.remove();
        else if (newFoot) $('.drawer__panel', drawer).append(newFoot);
      } else {
        var page = $('[data-cart-page]');
        var next = doc.querySelector('[data-cart-page]');
        if (page && next) page.replaceWith(next);
      }
    });
  }

  function setCount(n) {
    var prev = Number(($('[data-bag-count]') || {}).textContent || 0);
    $$('[data-bag-count]').forEach(function (el) { A.tick(el, n, n > prev); });
    $$('[data-bag]').forEach(function (b) { b.setAttribute('aria-label', S.cartCount.replace('__N__', n)); });
  }

  function refreshCount() {
    return fetch(routes.root + 'cart.js', { headers: { Accept: 'application/json' } }).then(function (r) { return r.json(); }).then(function (c) { setCount(c.item_count); return c; });
  }

  /* ---------- add ---------- */
  function add(items, btn, title) {
    if (btn) {
      if (btn.dataset.busy) return Promise.resolve();
      btn.dataset.busy = '1';
      btn.dataset.label = btn.innerHTML;
      btn.classList.add('is-loading');
      btn.setAttribute('aria-busy', 'true');
    }
    var body = { items: items, sections: sectionsWanted(), sections_url: location.pathname };
    return post(routes.cartAdd + '.js', body).then(function (res) {
      renderSections(res.sections);
      var first = res.items && res.items[0];
      if (btn) {
        btn.classList.remove('is-loading');
        btn.classList.add('is-added');
        btn.innerHTML = '<span>' + S.added + '</span>';
        setTimeout(function () { btn.classList.remove('is-added'); btn.innerHTML = btn.dataset.label; delete btn.dataset.busy; btn.removeAttribute('aria-busy'); }, 1600);
      }
      return refreshCount().then(function () {
        var name = title || (first && first.product_title) || '';
        var variant = first && first.variant_title && first.product_has_only_default_variant === false ? ', ' + first.variant_title : '';
        // the first add of a visit opens the bag; later ones only show the toast
        var opened = false;
        try { opened = sessionStorage.getItem('azal-bag-opened') === '1'; } catch (e) {}
        if (drawer && cfg.settings.cartType === 'drawer' && !opened) {
          try { sessionStorage.setItem('azal-bag-opened', '1'); } catch (e) {}
          open();
        } else toast(S.toast + ' — ' + name + variant);
        document.dispatchEvent(new CustomEvent('azal:cart:added', { detail: res }));
      });
    }).catch(function (err) {
      if (btn) { btn.classList.remove('is-loading'); btn.innerHTML = btn.dataset.label; delete btn.dataset.busy; btn.removeAttribute('aria-busy'); }
      toast(err.message || S.cartError, true);
      throw err;
    });
  }

  /* ---------- change a line ---------- */
  function change(line, qty) {
    var body = { line: Number(line), quantity: Math.max(0, qty), sections: sectionsWanted(), sections_url: location.pathname };
    var panel = drawer && $('.drawer__panel', drawer);
    if (panel) panel.setAttribute('aria-busy', 'true');
    return post(routes.cartChange + '.js', body).then(function (c) {
      renderSections(c.sections);
      setCount(c.item_count);
      if (panel) { panel.removeAttribute('aria-busy'); if (!drawer.hidden) panel.focus(); }
    }).catch(function (err) { if (panel) panel.removeAttribute('aria-busy'); toast(err.message, true); });
  }

  var noteTimer = 0;
  function update(body) { return post(routes.cartUpdate + '.js', body).catch(function (err) { toast(err.message, true); }); }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t.closest) return;
    var addBtn = t.closest('[data-add]');
    if (addBtn) {
      e.preventDefault();
      add([{ id: Number(addBtn.dataset.add), quantity: 1 }], addBtn).catch(function () {});
      return;
    }
    var q = t.closest('[data-qty-line]');
    if (q) { e.preventDefault(); change(q.dataset.qtyLine, Number(q.dataset.to)); return; }
    var bag = t.closest('[data-bag]');
    if (bag && drawer && cfg.settings.cartType === 'drawer') { e.preventDefault(); open(); return; }
    if (drawer && t.closest('[data-close]') && drawer.contains(t)) { close(); return; }
    if (t.closest('[data-toast-view]')) { hideToast(); if (drawer) open(); else location.href = routes.cart; }
  });
  document.addEventListener('change', function (e) {
    var a = e.target.closest && e.target.closest('[data-cart-attr]');
    if (a) { var attrs = {}; attrs[a.dataset.cartAttr] = a.checked ? 'Yes' : ''; update({ attributes: attrs }); }
  });
  document.addEventListener('input', function (e) {
    if (e.target.matches && e.target.matches('[data-cart-note]')) {
      clearTimeout(noteTimer);
      var v = e.target.value;
      noteTimer = setTimeout(function () { update({ note: v }); }, 450);
    }
  });

  /* ---------- drawer ---------- */
  function open() {
    if (!drawer || !drawer.hidden) return;
    lastFocus = document.activeElement;
    drawer.hidden = false;
    document.documentElement.classList.add('drawer-open');
    if (A.lenis) A.lenis.stop();
    var panel = $('.drawer__panel', drawer);
    var from = env.rtl ? -100 : 100;
    if (env.reduced) gsap && gsap.fromTo(drawer, { opacity: 0 }, { opacity: 1, duration: 0.2 });
    else {
      gsap.fromTo($('.drawer__dim', drawer), { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' });
      gsap.fromTo(panel, { xPercent: from }, { xPercent: 0, duration: 0.7, ease: 'expo.out' });
    }
    panel.focus();
  }
  function close(restore) {
    if (!drawer || drawer.hidden) return;
    var panel = $('.drawer__panel', drawer);
    var to = env.rtl ? -100 : 100;
    var done = function () {
      drawer.hidden = true;
      if (gsap) gsap.set([panel, drawer, $('.drawer__dim', drawer)], { clearProps: 'all' });
      document.documentElement.classList.remove('drawer-open');
      if (A.lenis) A.lenis.start();
      if (restore !== false && lastFocus) lastFocus.focus();
    };
    if (!gsap || env.reduced) done();
    else {
      gsap.to($('.drawer__dim', drawer), { opacity: 0, duration: 0.4 });
      gsap.to(panel, { xPercent: to, duration: 0.45, ease: 'power3.in', onComplete: done });
    }
  }
  if (drawer) drawer.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if (e.key !== 'Tab') return;
    var panel = $('.drawer__panel', drawer);
    var f = $$('a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])', panel).filter(function (x) { return x.offsetParent !== null; });
    if (!f.length) return;
    var a = f[0], z = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === a || document.activeElement === panel)) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  });

  /* ---------- toast ---------- */
  var toastEl = $('[data-toast]');
  function toast(text, isError) {
    if (!toastEl) return;
    toastEl.innerHTML = '';
    var s = document.createElement('span');
    s.textContent = text;
    toastEl.append(s);
    if (!isError) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'link'; b.setAttribute('data-toast-view', ''); b.textContent = S.viewCart;
      toastEl.append(b);
    }
    toastEl.classList.toggle('is-error', !!isError);
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 4200);
  }
  function hideToast() { if (toastEl) toastEl.classList.remove('is-on'); }

  // theme editor: keep the drawer open while its section is selected
  document.addEventListener('shopify:section:select', function (e) { if (e.detail.sectionId === 'cart-drawer') { drawer = document.getElementById('CartDrawer'); open(); } });
  document.addEventListener('shopify:section:deselect', function (e) { if (e.detail.sectionId === 'cart-drawer') close(false); });

  A.cart = { add: add, change: change, open: open, close: close, toast: toast, refreshCount: refreshCount };
})();
