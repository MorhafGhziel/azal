/* AZAL — the cart: Ajax add/change, the cart drawer (an accessible modal dialog) and the cart page.
   Both are re-rendered with the Section Rendering API after every change, so every line, discount and total
   stays in step. Public API: AZAL.cart.add(items, btn, title), .change(key, qty), .open(), .close(), .refresh(), .toast(). */
(function () {
  'use strict';
  var A = window.AZAL;
  var cfg = window.azal || { routes: {}, strings: {}, settings: {} };
  if (!A) return;
  var $ = A.$, $$ = A.$$, env = A.env;
  var routes = cfg.routes, S = cfg.strings || {};
  var gsap = window.gsap;
  var lastFocus = null, toastTimer = 0, noteTimer = 0;
  var queue = Promise.resolve();
  var qtyTimers = {};

  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function drawerEl() { return document.getElementById('CartDrawer'); }
  function pageEl() { return $('[data-cart-page]'); }
  function panelEl() { var d = drawerEl(); return d && $('.drawer__panel', d); }
  function isDrawerMode() { return !!drawerEl() && cfg.settings.cartType === 'drawer'; }

  function msg(root, name, fallback) {
    var live = root && $('[data-cart-live]', root);
    return (live && live.getAttribute('data-msg-' + name)) || fallback || '';
  }

  function sectionsWanted() {
    var ids = [];
    if (drawerEl()) ids.push('cart-drawer');
    var page = pageEl();
    if (page && page.dataset.sectionId) ids.push(page.dataset.sectionId);
    return ids;
  }

  function post(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok || (j.status && typeof j.status === 'number' && j.status >= 400)) {
          var e = new Error((typeof j.description === 'string' && j.description) || (typeof j.message === 'string' && j.message) || S.cartError || 'Error');
          e.data = j;
          throw e;
        }
        return j;
      });
    });
  }

  /* ---------- re-render ---------- */
  // Replace the [data-cart-replace] regions of `oldRoot` with the same regions of `newRoot`.
  function patchRegions(oldRoot, newRoot, keys) {
    keys.forEach(function (key) {
      var sel = '[data-cart-replace="' + key + '"]';
      var a = $(sel, oldRoot), b = $(sel, newRoot);
      if (a && b) a.replaceWith(b);
      else if (a && !b) a.remove();
    });
  }

  function rememberFocus(root) {
    var el = document.activeElement;
    if (!root || !el || !root.contains(el)) return null;
    return { id: el.id, line: el.closest('[data-line]') ? el.closest('[data-line]').getAttribute('data-line') : null, qtyTo: el.getAttribute('data-to') };
  }

  function restoreFocus(root, mem, fallback) {
    if (!mem || !root) return;
    var target = mem.id && document.getElementById(mem.id);
    if (!target && mem.line) {
      // the same line if it still exists, otherwise the one that moved into its place, otherwise the previous one
      var line = $('[data-line="' + mem.line + '"]', root) || $('[data-line="' + (Number(mem.line) - 1) + '"]', root);
      if (line) target = $('.cart-qty__input', line);
    }
    if (!target || target.offsetParent === null) target = fallback;
    if (target) target.focus({ preventScroll: true });
  }

  function renderDrawer(html) {
    var drawer = drawerEl();
    if (!drawer || !html) return;
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var fresh = doc.getElementById('CartDrawer');
    if (!fresh) return;
    var mem = rememberFocus(drawer);
    var wasEmpty = drawer.getAttribute('data-cart-empty');
    var nowEmpty = fresh.getAttribute('data-cart-empty');
    patchRegions(drawer, fresh, ['title', 'lines', 'summary']);
    if (wasEmpty !== nowEmpty) patchRegions(drawer, fresh, ['extras']);
    drawer.setAttribute('data-cart-empty', nowEmpty);
    var foot = $('.drawer__foot', drawer);
    if (foot) foot.hidden = nowEmpty === 'true';
    restoreFocus(drawer, mem, panelEl());
  }

  function renderPage(html) {
    var page = pageEl();
    if (!page || !html) return;
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var fresh = doc.querySelector('[data-cart-page]');
    if (!fresh) return;
    var mem = rememberFocus(page);
    if (page.getAttribute('data-cart-empty') !== fresh.getAttribute('data-cart-empty')) {
      page.replaceWith(fresh);
      var title = $('.page__title', fresh);
      if (mem && title) title.focus();
      return;
    }
    patchRegions(page, fresh, ['count', 'lines', 'summary']);
    restoreFocus(page, mem, $('.page__title', page));
  }

  function renderSections(sections) {
    if (!sections) return;
    Object.keys(sections).forEach(function (id) {
      if (id === 'cart-drawer') renderDrawer(sections[id]);
      else renderPage(sections[id]);
    });
    document.dispatchEvent(new CustomEvent('azal:cart:rendered'));
  }

  function setBusy(on) {
    [drawerEl(), pageEl()].forEach(function (root) {
      if (!root) return;
      $$('[data-cart-replace="lines"], [data-cart-replace="summary"]', root).forEach(function (el) {
        if (on) el.setAttribute('aria-busy', 'true');
        else el.removeAttribute('aria-busy');
      });
    });
  }

  // one live region speaks: the open drawer's, otherwise the cart page's
  function announce(text, isError) {
    if (!text) return;
    var d = drawerEl();
    var root = d && !d.hidden ? d : (pageEl() || d);
    if (!root) return;
    var live = $(isError ? '[data-cart-error]' : '[data-cart-live]', root);
    if (!live) return;
    live.textContent = '';
    // clear first so screen readers announce a repeated message too
    setTimeout(function () { live.textContent = text; }, 30);
  }
  function clearErrors() {
    $$('[data-cart-error], [data-line-error]').forEach(function (el) { el.textContent = ''; });
  }

  function setCount(n) {
    var prevEl = $('[data-bag-count]');
    var prev = Number((prevEl && prevEl.textContent) || 0);
    $$('[data-bag-count]').forEach(function (el) { if (A.tick) A.tick(el, n, n > prev); else el.textContent = n; });
    if (S.cartCount) $$('[data-bag]').forEach(function (b) { b.setAttribute('aria-label', S.cartCount.replace('__N__', n)); });
  }

  function refreshCount() {
    return fetch(routes.root + 'cart.js', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (c) { setCount(c.item_count); return c; });
  }

  // Re-render the drawer and the cart page from the server (after an add made elsewhere, e.g. by an app).
  function refresh() {
    var ids = sectionsWanted();
    if (!ids.length) return refreshCount();
    var url = location.pathname + '?sections=' + encodeURIComponent(ids.join(','));
    return fetch(url, { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (s) { renderSections(s); return refreshCount(); });
  }

  /* ---------- add ---------- */
  function restoreBtn(btn) {
    if (!btn) return;
    btn.classList.remove('is-loading');
    if (btn.dataset.label) btn.innerHTML = btn.dataset.label;
    delete btn.dataset.busy;
    btn.removeAttribute('aria-busy');
  }

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
        if (S.added) btn.innerHTML = '<span>' + S.added + '</span>';
        setTimeout(function () { btn.classList.remove('is-added'); restoreBtn(btn); }, 1600);
      }
      return refreshCount().then(function () {
        var name = title || (first && first.product_title) || '';
        var variant = first && first.variant_title && first.product_has_only_default_variant === false ? ', ' + first.variant_title : '';
        // the first add of a visit opens the drawer; later ones show the toast
        var opened = false;
        try { opened = sessionStorage.getItem('azal-bag-opened') === '1'; } catch (e) {}
        if (isDrawerMode() && !opened) {
          try { sessionStorage.setItem('azal-bag-opened', '1'); } catch (e) {}
          open(btn);
        } else {
          toast((S.toast || '') + ' — ' + name + variant);
        }
        document.dispatchEvent(new CustomEvent('azal:cart:added', { detail: res }));
      });
    }).catch(function (err) {
      restoreBtn(btn);
      toast(err.message || S.cartError, true);
      throw err;
    });
  }

  /* ---------- change a line (by line item key) ---------- */
  function change(key, qty, line) {
    queue = queue.then(function () {
      clearErrors();
      setBusy(true);
      var body = { id: String(key), quantity: Math.max(0, Number(qty) || 0), sections: sectionsWanted(), sections_url: location.pathname };
      return post(routes.cartChange + '.js', body).then(function (c) {
        renderSections(c.sections);
        setCount(c.item_count);
        setBusy(false);
        var item = null;
        (c.items || []).forEach(function (i) { if (i.key === key) item = i; });
        var root = pageEl() || drawerEl();
        if (body.quantity > 0 && item && item.quantity < body.quantity) {
          var t = msg(root, 'max', S.cartError).replace('__N__', item.quantity);
          lineError(item.key, t);
          announce(t, true);
        } else {
          announce(msg(root, body.quantity === 0 ? 'removed' : 'updated', ''));
        }
        document.dispatchEvent(new CustomEvent('azal:cart:changed', { detail: c }));
      }).catch(function (err) {
        setBusy(false);
        var text = err.message || S.cartError;
        // put the quantity back to what the cart holds
        $$('[data-key="' + key + '"] .cart-qty__input').forEach(function (i) { i.value = i.getAttribute('data-qty-prev'); });
        lineError(key, text);
        announce(text, true);
      });
    });
    return queue;
  }

  function lineError(key, text) {
    $$('[data-key="' + key + '"] [data-line-error]').forEach(function (el) { el.textContent = text; });
  }

  function keyOf(el) {
    var li = el.closest('[data-key]');
    return li ? li.getAttribute('data-key') : null;
  }

  // +/- update the field at once and send one request after a short pause (fast taps become one change)
  function nudge(input, to) {
    var key = keyOf(input);
    if (!key) return;
    input.value = Math.max(0, to);
    clearTimeout(qtyTimers[key]);
    qtyTimers[key] = setTimeout(function () { change(key, Number(input.value)); }, 350);
  }

  function update(body) {
    return post(routes.cartUpdate + '.js', body).catch(function (err) { announce(err.message || S.cartError, true); });
  }

  /* ---------- events ---------- */
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
    if (q) {
      e.preventDefault();
      var li = q.closest('[data-key]');
      var input = li && $('.cart-qty__input', li);
      var to = Number(q.getAttribute('data-to'));
      if (q.classList.contains('cart-qty__btn') && input) {
        var step = Number(input.step) || 1;
        var min = Number(input.getAttribute('data-min')) || 1;
        var cur = Number(input.value) || 0;
        var next = q.getAttribute('data-dir') === '1' ? cur + step : cur - step;
        if (next > 0 && next < min) next = q.getAttribute('data-dir') === '1' ? min : 0;
        if (input.max && next > Number(input.max)) next = Number(input.max);
        nudge(input, next);
      } else {
        change(keyOf(q), to);
      }
      return;
    }

    var bag = t.closest('[data-bag]');
    if (bag && isDrawerMode()) { e.preventDefault(); open(bag); return; }

    var drawer = drawerEl();
    if (drawer && drawer.contains(t) && t.closest('[data-close]')) { e.preventDefault(); close(); return; }

    if (t.closest('[data-toast-view]')) {
      hideToast();
      if (isDrawerMode()) open(); else location.href = routes.cart;
    }
  });

  document.addEventListener('change', function (e) {
    var t = e.target;
    if (!t.matches) return;
    if (t.matches('[data-cart-attr]')) {
      var attrs = {};
      attrs[t.getAttribute('data-cart-attr')] = t.checked ? 'Yes' : '';
      // keep both copies (drawer and page) in step
      $$('[data-cart-attr="' + t.getAttribute('data-cart-attr') + '"]').forEach(function (x) { x.checked = t.checked; });
      update({ attributes: attrs });
      return;
    }
    if (t.matches('.cart-qty__input')) {
      var key = keyOf(t);
      if (key) { clearTimeout(qtyTimers[key]); change(key, Number(t.value)); }
    }
  });

  document.addEventListener('keydown', function (e) {
    var t = e.target;
    // Enter in a quantity field updates that line instead of submitting the whole cart form
    if (e.key === 'Enter' && t.matches && t.matches('.cart-qty__input')) {
      e.preventDefault();
      var key = keyOf(t);
      if (key) { clearTimeout(qtyTimers[key]); change(key, Number(t.value)); }
      return;
    }
    var drawer = drawerEl();
    if (!drawer || drawer.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    var panel = panelEl();
    var f = $$(FOCUSABLE, panel).filter(function (x) { return x.offsetParent !== null || x === document.activeElement; });
    if (!f.length) { e.preventDefault(); panel.focus(); return; }
    var first = f[0], last = f[f.length - 1];
    if (!panel.contains(document.activeElement)) { e.preventDefault(); first.focus(); return; }
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  document.addEventListener('input', function (e) {
    var t = e.target;
    if (!t.matches || !t.matches('[data-cart-note]')) return;
    clearTimeout(noteTimer);
    var v = t.value;
    // mirror the note into the other copy
    $$('[data-cart-note]').forEach(function (x) { if (x !== t) x.value = v; });
    noteTimer = setTimeout(function () { update({ note: v }); }, 450);
  });

  /* ---------- drawer ---------- */
  function open(opener) {
    var drawer = drawerEl();
    if (!drawer || !drawer.hidden) return;
    lastFocus = opener && opener.focus ? opener : document.activeElement;
    drawer.hidden = false;
    document.documentElement.classList.add('drawer-open');
    $$('[data-bag]').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
    if (A.lenis) A.lenis.stop();
    var panel = panelEl();
    var from = env.rtl ? -100 : 100;
    if (gsap) {
      if (env.reduced) gsap.fromTo(drawer, { opacity: 0 }, { opacity: 1, duration: 0.2 });
      else {
        gsap.fromTo($('.drawer__dim', drawer), { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' });
        gsap.fromTo(panel, { xPercent: from }, { xPercent: 0, duration: 0.7, ease: 'expo.out' });
      }
    }
    panel.focus();
  }

  function close(restore) {
    var drawer = drawerEl();
    if (!drawer || drawer.hidden) return;
    var panel = panelEl();
    var to = env.rtl ? -100 : 100;
    var done = function () {
      drawer.hidden = true;
      if (gsap) gsap.set([panel, drawer, $('.drawer__dim', drawer)], { clearProps: 'all' });
      document.documentElement.classList.remove('drawer-open');
      $$('[data-bag]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
      if (A.lenis) A.lenis.start();
      if (restore !== false && lastFocus && document.contains(lastFocus)) lastFocus.focus();
    };
    if (!gsap || env.reduced) done();
    else {
      gsap.to($('.drawer__dim', drawer), { opacity: 0, duration: 0.4 });
      gsap.to(panel, { xPercent: to, duration: 0.45, ease: 'power3.in', onComplete: done });
    }
  }

  /* ---------- toast ---------- */
  function toast(text, isError) {
    var el = $('[data-toast]');
    if (!el) return;
    el.innerHTML = '';
    var s = document.createElement('span');
    s.textContent = text;
    el.append(s);
    if (!isError && S.viewCart) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'link';
      b.setAttribute('data-toast-view', '');
      b.textContent = S.viewCart;
      el.append(b);
    }
    el.classList.toggle('is-error', !!isError);
    el.setAttribute('role', isError ? 'alert' : 'status');
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 4200);
  }
  function hideToast() { var el = $('[data-toast]'); if (el) el.classList.remove('is-on'); }

  // back/forward cache: the cart may have changed on another page
  addEventListener('pageshow', function (e) { if (e.persisted) refresh(); });

  // theme editor: keep the drawer open while its section is selected
  document.addEventListener('shopify:section:select', function (e) { if (e.detail.sectionId === 'cart-drawer') open(); });
  document.addEventListener('shopify:section:deselect', function (e) { if (e.detail.sectionId === 'cart-drawer') close(false); });

  A.cart = { add: add, change: change, open: open, close: close, toast: toast, refresh: refresh, refreshCount: refreshCount, render: renderSections };
})();
