/* AZAL — header, search and filters.
   - Desktop dropdown menus (buttons with aria-expanded, Escape, focus leaving closes, hover on fine pointers)
   - Phone menu: nested accordions, focus trap, scroll lock (open/close itself lives in azal.js)
   - Country / language popovers (<details>): one open at a time, Escape, outside click, country filter
   - Announcement bar rotation with a pause button
   - Search dialog + predictive search combobox (Predictive Search API, section_id=predictive-search)
   - Facets: filters and sorting re-render through the Section Rendering API, drawer on small screens
   Everything is delegated from document so it keeps working after the theme editor re-renders a section. */
(function () {
  'use strict';

  var d = document;
  var cfg = window.azal || { routes: {}, settings: {} };
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
  var hoverable = window.matchMedia('(hover: hover) and (pointer: fine)');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  function lenis(action) {
    var l = window.AZAL && window.AZAL.lenis;
    if (l) l[action]();
  }
  function visible(el) {
    return !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
  }
  function focusables(root) {
    return $$(FOCUSABLE, root).filter(function (el) { return visible(el) && !el.closest('[hidden]'); });
  }
  /* keep Tab inside a container */
  function trapTab(e, root) {
    if (e.key !== 'Tab') return;
    var items = focusables(root);
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function debounce(fn, ms) {
    var t;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  }

  /* =====================================================================
     Desktop dropdowns
     ===================================================================== */
  var hoverTimer = null;

  function setDropdown(item, open, focusButton) {
    if (!item) return;
    var btn = $('.nav__toggle', item);
    if (!btn) return;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) keepInViewport($('[data-dropdown-panel]', item));
    item.classList.toggle('is-open', open);
    if (!open && focusButton) btn.focus();
  }
  /* a centered panel under an item near the edge would leave the screen: nudge it back */
  function keepInViewport(panel) {
    if (!panel) return;
    panel.style.transition = 'none';
    panel.style.setProperty('--shift', '0px');
    var r = panel.getBoundingClientRect();
    panel.style.transition = '';
    var vw = d.documentElement.clientWidth, pad = 16, shift = 0;
    if (r.left < pad) shift = pad - r.left;
    else if (r.right > vw - pad) shift = vw - pad - r.right;
    panel.style.setProperty('--shift', Math.round(shift) + 'px');
  }
  function closeDropdowns(except) {
    $$('[data-dropdown].is-open').forEach(function (item) { if (item !== except) setDropdown(item, false); });
  }

  d.addEventListener('click', function (e) {
    var toggle = e.target.closest && e.target.closest('.nav__toggle');
    if (toggle) {
      var item = toggle.closest('[data-dropdown]');
      var open = toggle.getAttribute('aria-expanded') !== 'true';
      closeDropdowns(item);
      setDropdown(item, open);
      return;
    }
    if (!(e.target.closest && e.target.closest('[data-dropdown]'))) closeDropdowns();
  });

  d.addEventListener('keydown', function (e) {
    var item = e.target.closest && e.target.closest('[data-dropdown]');
    if (!item) return;
    var btn = $('.nav__toggle', item);
    if (e.key === 'Escape' && item.classList.contains('is-open')) {
      e.preventDefault();
      setDropdown(item, false, true);
    } else if (e.key === 'ArrowDown' && e.target === btn) {
      e.preventDefault();
      closeDropdowns(item);
      setDropdown(item, true);
      var first = $('.nav__sub a', item);
      if (first) first.focus();
    } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && e.target.closest('.nav__sub')) {
      e.preventDefault();
      var links = $$('.nav__sub a', item);
      var i = links.indexOf(e.target);
      var next = links[(i + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length];
      if (next) next.focus();
    }
  });

  d.addEventListener('focusout', function (e) {
    var item = e.target.closest && e.target.closest('[data-dropdown]');
    if (!item || !item.classList.contains('is-open')) return;
    if (e.relatedTarget && item.contains(e.relatedTarget)) return;
    if (!e.relatedTarget) return; /* focus went to the page or window: leave it to click / Escape */
    setDropdown(item, false);
  });

  d.addEventListener('mouseover', function (e) {
    if (!hoverable.matches) return;
    var item = e.target.closest && e.target.closest('[data-dropdown]');
    if (!item) return;
    clearTimeout(hoverTimer);
    if (item.classList.contains('is-open')) return;
    hoverTimer = setTimeout(function () { closeDropdowns(item); setDropdown(item, true); }, 90);
  });
  d.addEventListener('mouseout', function (e) {
    if (!hoverable.matches) return;
    var item = e.target.closest && e.target.closest('[data-dropdown]');
    if (!item || (e.relatedTarget && item.contains(e.relatedTarget))) return;
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(function () {
      if (!item.contains(d.activeElement)) setDropdown(item, false);
    }, 220);
  });

  /* =====================================================================
     Phone menu: accordions, focus trap, scroll lock
     ===================================================================== */
  d.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-accordion]');
    if (!btn) return;
    var panel = d.getElementById(btn.getAttribute('aria-controls'));
    var open = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (panel) panel.hidden = !open;
  });

  function watchMenu(menu) {
    if (!menu || menu.__azalWatched) return;
    menu.__azalWatched = true;
    new MutationObserver(function () {
      d.documentElement.classList.toggle('menu-open', !menu.hidden);
      if (menu.hidden) {
        $$('[data-accordion][aria-expanded="true"]', menu).forEach(function (b) {
          b.setAttribute('aria-expanded', 'false');
          var p = d.getElementById(b.getAttribute('aria-controls'));
          if (p) p.hidden = true;
        });
      }
    }).observe(menu, { attributes: true, attributeFilter: ['hidden'] });
    menu.addEventListener('keydown', function (e) { trapTab(e, menu); });
  }
  watchMenu($('[data-menu]'));

  /* the theme editor re-renders the header: rebind the menu button there (azal.js binds once on load) */
  function bindMenuAfterEditorReload(section) {
    var menu = $('[data-menu]', section), btn = $('[data-menu-open]', section);
    if (!menu || !btn) return;
    watchMenu(menu);
    var close = function (focus) {
      if (menu.hidden) return;
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      lenis('start');
      if (focus) btn.focus();
    };
    btn.addEventListener('click', function () {
      menu.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      lenis('stop');
      var x = $('[data-menu-close]', menu);
      if (x) x.focus();
    });
    $('[data-menu-close]', menu).addEventListener('click', function () { close(true); });
    menu.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(true); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { close(false); }); });
  }

  /* =====================================================================
     Popovers built on <details>: localization selectors and desktop filters
     ===================================================================== */
  function inOpenDrawer(el) { return !!el.closest('.facets.is-drawer-open'); }
  function isPopover(det) {
    if (det.matches('[data-loc]')) return true;
    return det.matches('[data-facet]') && !inOpenDrawer(det) && window.matchMedia('(min-width: 990px)').matches;
  }
  function closePopovers(except) {
    $$('details[data-loc][open], details[data-facet][open]').forEach(function (det) {
      if (det !== except && isPopover(det)) det.open = false;
    });
  }

  d.addEventListener('toggle', function (e) {
    var det = e.target;
    if (!det.matches || !det.matches('details[data-loc], details[data-facet]') || !det.open) return;
    if (isPopover(det)) closePopovers(det);
    var search = $('[data-loc-search]', det);
    if (search) {
      search.hidden = false;
    }
  }, true);

  d.addEventListener('click', function (e) {
    var inside = e.target.closest && e.target.closest('details[data-loc], details[data-facet]');
    closePopovers(inside || null);
  });

  d.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var det = e.target.closest && e.target.closest('details[data-loc][open], details[data-facet][open]');
    if (!det || !isPopover(det)) return;
    e.preventDefault();
    e.stopPropagation();
    det.open = false;
    var summary = $('summary', det);
    if (summary) summary.focus();
  });

  /* country filter for long lists; Enter must never submit the first country */
  d.addEventListener('input', function (e) {
    if (!e.target.matches || !e.target.matches('[data-loc-filter]')) return;
    var q = e.target.value.trim().toLowerCase();
    var det = e.target.closest('details');
    var shown = 0;
    $$('.loc__opt', det).forEach(function (btn) {
      var match = !q || btn.textContent.toLowerCase().indexOf(q) > -1;
      btn.parentNode.hidden = !match;
      if (match) shown++;
    });
    var none = $('[data-loc-none]', det);
    if (none) none.hidden = shown > 0;
  });
  d.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.matches && e.target.matches('[data-loc-filter]')) {
      e.preventDefault();
      var first = $$('.loc__opt', e.target.closest('details')).filter(function (b) { return !b.parentNode.hidden; })[0];
      if (first) first.focus();
    }
  });

  /* =====================================================================
     Announcement bar
     ===================================================================== */
  function initAnnouncement(root) {
    if (!root || root.__azalAnn) return;
    root.__azalAnn = true;
    var msgs = $$('.announce__msg', root);
    if (msgs.length < 2) return;
    var speed = (parseInt(root.getAttribute('data-speed'), 10) || 5) * 1000;
    var pauseBtn = $('[data-announcement-pause]', root);
    var i = 0, timer = null, userPaused = false, hovering = false;

    function show(n) {
      msgs.forEach(function (m, k) {
        var on = k === n;
        m.classList.toggle('is-on', on);
        if (on) m.removeAttribute('aria-hidden'); else m.setAttribute('aria-hidden', 'true');
        $$('a', m).forEach(function (a) { if (on) a.removeAttribute('tabindex'); else a.setAttribute('tabindex', '-1'); });
      });
    }
    function stop() { clearInterval(timer); timer = null; }
    function start() {
      stop();
      if (userPaused || hovering) return;
      timer = setInterval(function () { i = (i + 1) % msgs.length; show(i); }, speed);
    }
    function setPaused(p) {
      userPaused = p;
      if (pauseBtn) {
        pauseBtn.setAttribute('aria-pressed', p ? 'true' : 'false');
        $('[data-icon="pause"]', pauseBtn).hidden = p;
        $('[data-icon="play"]', pauseBtn).hidden = !p;
      }
      if (p) stop(); else start();
    }
    if (pauseBtn) pauseBtn.addEventListener('click', function () { setPaused(!userPaused); });
    root.addEventListener('mouseenter', function () { hovering = true; stop(); });
    root.addEventListener('mouseleave', function () { hovering = false; start(); });
    root.addEventListener('focusin', function () { hovering = true; stop(); });
    root.addEventListener('focusout', function (e) { if (!root.contains(e.relatedTarget)) { hovering = false; start(); } });
    setPaused(reduced.matches);
  }
  $$('[data-announcement]').forEach(initAnnouncement);

  /* =====================================================================
     Search dialog + predictive search
     ===================================================================== */
  var opener = null;
  var psController = null;
  var psCache = {};

  function dialogEl() { return $('[data-search-dialog]'); }

  function openSearch(from) {
    var dlg = dialogEl();
    if (!dlg || typeof dlg.showModal !== 'function') return false;
    opener = from || null;
    closeDropdowns();
    closePopovers();
    if (!dlg.open) dlg.showModal();
    d.documentElement.classList.add('search-open');
    lenis('stop');
    var input = $('[data-ps-input]', dlg);
    if (input) {
      input.focus();
      input.select();
      if (input.value.trim()) runPredictive(input);
    }
    return true;
  }
  function closeSearch() {
    var dlg = dialogEl();
    if (dlg && dlg.open) dlg.close();
    if (dlg) afterSearchClosed(dlg);
  }
  /* runs from closeSearch() and from the dialog's own close event; safe to run twice */
  function afterSearchClosed(dlg) {
    if (!d.documentElement.classList.contains('search-open')) return;
    d.documentElement.classList.remove('search-open');
    lenis('start');
    var input = $('[data-ps-input]', dlg);
    if (input) collapse(input);
    var back = opener && visible(opener) ? opener : $('[data-menu-open]');
    if (back && visible(back)) back.focus();
    opener = null;
  }

  /* capture phase: runs before azal.js's page-transition click handler */
  d.addEventListener('click', function (e) {
    var trigger = e.target.closest && e.target.closest('[data-search-open]');
    if (!trigger || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var from = trigger;
    if (trigger.closest('[data-menu]')) from = $('[data-menu-open]');
    if (openSearch(from)) e.preventDefault();
  }, true);

  d.addEventListener('click', function (e) {
    var dlg = dialogEl();
    if (!dlg || !dlg.open) return;
    if (e.target.closest && e.target.closest('[data-search-close]')) { closeSearch(); return; }
    if (e.target === dlg) closeSearch(); /* the backdrop */
  });

  d.addEventListener('close', function (e) {
    if (!e.target.matches || !e.target.matches('[data-search-dialog]')) return;
    afterSearchClosed(e.target);
  }, true);

  function psParts(input) {
    var dlg = input.closest('[data-search-dialog]');
    return { results: $('[data-ps-results]', dlg), status: $('[data-ps-status]', dlg) };
  }
  function options(input) {
    return $$('[role="option"]', psParts(input).results);
  }
  function setActive(input, opt) {
    options(input).forEach(function (o) { o.setAttribute('aria-selected', o === opt ? 'true' : 'false'); o.classList.toggle('is-active', o === opt); });
    if (opt) {
      input.setAttribute('aria-activedescendant', opt.id);
      opt.scrollIntoView({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }
  function collapse(input) {
    var p = psParts(input);
    if (psController) psController.abort();
    setActive(input, null);
    if (input.hasAttribute('aria-expanded')) input.setAttribute('aria-expanded', 'false');
    if (p.results) { p.results.innerHTML = ''; p.results.classList.remove('is-open'); }
  }

  function renderPredictive(input, html) {
    var p = psParts(input);
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var body = doc.querySelector('.ps__body');
    p.results.innerHTML = body ? body.outerHTML : '';
    p.results.classList.toggle('is-open', !!body);
    input.setAttribute('aria-expanded', body ? 'true' : 'false');
    setActive(input, null);
    var count = body ? parseInt(body.getAttribute('data-ps-count'), 10) || 0 : 0;
    if (p.status) {
      var msg = p.status.getAttribute('data-template') || '';
      p.status.textContent = count ? (msg ? msg.replace('__N__', count) : String(count)) : ($('.ps__empty', p.results) || {}).textContent || '';
    }
  }

  function runPredictive(input) {
    if (!cfg.settings.predictiveSearch || !input.hasAttribute('role')) return;
    var q = input.value.trim();
    if (!q) { collapse(input); return; }
    if (psCache[q]) { renderPredictive(input, psCache[q]); return; }
    if (psController) psController.abort();
    psController = typeof AbortController === 'function' ? new AbortController() : null;
    var base = (cfg.routes && cfg.routes.predictiveSearch) || '/search/suggest';
    var url = base + '?q=' + encodeURIComponent(q) +
      '&section_id=predictive-search' +
      '&resources[type]=product,collection,page,article,query' +
      '&resources[limit]=6&resources[limit_scope]=each' +
      '&resources[options][unavailable_products]=last';
    var dlg = input.closest('[data-search-dialog]');
    dlg.classList.add('is-loading');
    fetch(url, { signal: psController ? psController.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (html) {
        psCache[q] = html;
        if (input.value.trim() === q) renderPredictive(input, html);
      })
      .catch(function (err) { if (!err || err.name !== 'AbortError') collapse(input); })
      .then(function () { dlg.classList.remove('is-loading'); });
  }
  var runPredictiveSoon = debounce(runPredictive, 260);

  d.addEventListener('input', function (e) {
    if (e.target.matches && e.target.matches('[data-ps-input]')) runPredictiveSoon(e.target);
  });

  d.addEventListener('keydown', function (e) {
    var input = e.target;
    if (!input.matches || !input.matches('[data-ps-input]')) return;
    var opts = options(input);
    var current = input.getAttribute('aria-activedescendant');
    var idx = -1;
    opts.forEach(function (o, i) { if (o.id === current) idx = i; });

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!opts.length) return;
      e.preventDefault();
      var next = e.key === 'ArrowDown' ? idx + 1 : idx - 1;
      if (next >= opts.length) next = 0;
      if (next < 0) next = opts.length - 1;
      setActive(input, opts[next]);
    } else if (e.key === 'Enter' && idx > -1) {
      var link = $('a', opts[idx]);
      if (link) { e.preventDefault(); window.location.href = link.href; }
    } else if (e.key === 'Escape') {
      /* first Escape closes the list, the second closes the dialog (handled here: browsers may skip the
         native dialog cancel after a prevented Escape) */
      e.preventDefault();
      if (input.getAttribute('aria-expanded') === 'true') collapse(input);
      else closeSearch();
    } else if (e.key === 'Home' || e.key === 'End') {
      if (idx > -1) setActive(input, null); /* give the keys back to the text field */
    }
  });

  /* pointer users: hovering an option marks it active so Enter and the pointer agree */
  d.addEventListener('mousemove', function (e) {
    var opt = e.target.closest && e.target.closest('[data-ps-results] [role="option"]');
    if (!opt || opt.classList.contains('is-active')) return;
    var input = $('[data-ps-input]', opt.closest('[data-search-dialog]'));
    if (input) setActive(input, opt);
  });

  /* =====================================================================
     Facets: filters + sorting
     ===================================================================== */
  var facetController = null;

  function sectionIdOf(el) {
    var sec = el.closest('.shopify-section');
    return sec ? sec.id.replace(/^shopify-section-/, '') : null;
  }

  function formUrl(form) {
    var params = new URLSearchParams();
    new FormData(form).forEach(function (value, key) {
      if (String(value).trim() !== '') params.append(key, value);
    });
    var action = form.getAttribute('action') || window.location.pathname;
    var qs = params.toString();
    return action + (qs ? '?' + qs : '');
  }

  function renderFacets(url, sectionId, push) {
    var section = sectionId && d.getElementById('shopify-section-' + sectionId);
    if (!section || !$('[data-results]', section)) { window.location.assign(url); return; }
    if (facetController) facetController.abort();
    facetController = typeof AbortController === 'function' ? new AbortController() : null;
    var results = $('[data-results]', section);
    section.classList.add('is-filtering');
    results.setAttribute('aria-busy', 'true');
    var fetchUrl = url + (url.indexOf('?') > -1 ? '&' : '?') + 'section_id=' + encodeURIComponent(sectionId);
    fetch(fetchUrl, { signal: facetController ? facetController.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var fresh = doc.getElementById('shopify-section-' + sectionId) || doc;
        var newResults = $('[data-results]', fresh);
        if (!newResults) { window.location.assign(url); return; }
        var activeId = d.activeElement && d.activeElement.id;

        results.innerHTML = newResults.innerHTML;
        ['[data-facets-active]', '[data-facets-count]', '[data-facets-open-count]'].forEach(function (sel) {
          var a = $(sel, section), b = $(sel, fresh);
          if (a && b) a.innerHTML = b.innerHTML;
        });
        $$('details[data-facet]', section).forEach(function (det) {
          var next = fresh.querySelector('#' + CSS.escape(det.id));
          if (!next) return;
          var body = $('[data-facet-body]', det), nextBody = $('[data-facet-body]', next);
          if (body && nextBody) body.innerHTML = nextBody.innerHTML;
          var sum = $('summary', det), nextSum = $('summary', next);
          if (sum && nextSum) sum.innerHTML = nextSum.innerHTML;
        });
        /* sort select and hidden search terms follow the URL */
        var sort = $('[data-facet-sort]', section), nextSort = $('[data-facet-sort]', fresh);
        if (sort && nextSort) sort.value = nextSort.value;

        if (push !== false) history.pushState({ azalFacets: sectionId }, '', url);
        if (activeId) {
          var again = d.getElementById(activeId);
          if (again && again !== d.activeElement) again.focus();
        }
      })
      .catch(function (err) { if (!err || err.name !== 'AbortError') window.location.assign(url); })
      .then(function () {
        section.classList.remove('is-filtering');
        results.removeAttribute('aria-busy');
      });
  }

  var submitSoon = debounce(function (form) { renderFacets(formUrl(form), sectionIdOf(form)); }, 650);

  d.addEventListener('change', function (e) {
    var form = e.target.closest && e.target.closest('[data-facet-form]');
    if (!form || e.target.matches('[data-facet-price]')) return;
    renderFacets(formUrl(form), sectionIdOf(form));
  });
  d.addEventListener('input', function (e) {
    if (!e.target.matches || !e.target.matches('[data-facet-price]')) return;
    var form = e.target.closest('[data-facet-form]');
    if (form) submitSoon(form);
  });
  d.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form.matches || !form.matches('[data-facet-form]')) return;
    e.preventDefault();
    var root = form.closest('[data-facets-root]');
    renderFacets(formUrl(form), sectionIdOf(form));
    if (root && root.classList.contains('is-drawer-open')) closeDrawer(root, true);
  });
  /* remove-filter pills, clear all: capture so the page transition does not take the click */
  d.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a[data-facet-link]');
    if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    var id = sectionIdOf(link);
    if (!id) return;
    e.preventDefault();
    var root = link.closest('[data-facets-root]');
    if (root && root.classList.contains('is-drawer-open')) closeDrawer(root, true);
    renderFacets(link.href, id);
  }, true);

  window.addEventListener('popstate', function (e) {
    if (e.state && e.state.azalFacets) renderFacets(window.location.href, e.state.azalFacets, false);
  });
  if (history.state == null && $('[data-facets-root]')) {
    var sid = sectionIdOf($('[data-facets-root]'));
    if (sid) history.replaceState({ azalFacets: sid }, '', window.location.href);
  }

  /* drawer on small screens */
  function openDrawer(root) {
    root.classList.add('is-drawer-open');
    d.documentElement.classList.add('facets-open');
    var btn = $('[data-facets-open]', root);
    if (btn) btn.setAttribute('aria-expanded', 'true');
    lenis('stop');
    var drawer = $('[data-facets-drawer]', root);
    var first = drawer && focusables(drawer)[0];
    if (first) first.focus();
  }
  function closeDrawer(root, focusButton) {
    root.classList.remove('is-drawer-open');
    d.documentElement.classList.remove('facets-open');
    var btn = $('[data-facets-open]', root);
    if (btn) {
      btn.setAttribute('aria-expanded', 'false');
      if (focusButton) btn.focus();
    }
    lenis('start');
  }
  d.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-facets-open], [data-facets-close]');
    if (!t) return;
    var root = t.closest('[data-facets-root]');
    if (t.matches('[data-facets-open]')) openDrawer(root); else closeDrawer(root, true);
  });
  d.addEventListener('keydown', function (e) {
    var root = e.target.closest && e.target.closest('.facets.is-drawer-open');
    if (!root) return;
    if (e.key === 'Escape') { e.preventDefault(); closeDrawer(root, true); return; }
    var drawer = $('[data-facets-drawer]', root);
    if (drawer && drawer.contains(e.target)) trapTab(e, drawer);
  });
  window.matchMedia('(min-width: 990px)').addEventListener('change', function (mq) {
    if (mq.matches) $$('.facets.is-drawer-open').forEach(function (r) { closeDrawer(r, false); });
  });

  /* =====================================================================
     Theme editor
     ===================================================================== */
  d.addEventListener('shopify:section:load', function (e) {
    var t = e.target;
    $$('[data-announcement]', t).forEach(initAnnouncement);
    if ($('[data-menu]', t)) bindMenuAfterEditorReload(t);
  });
  d.addEventListener('shopify:block:select', function (e) {
    var root = e.target.closest && e.target.closest('[data-announcement]');
    if (!root) return;
    var msgs = $$('.announce__msg', root);
    msgs.forEach(function (m) {
      var on = m === e.target;
      m.classList.toggle('is-on', on);
      if (on) m.removeAttribute('aria-hidden'); else m.setAttribute('aria-hidden', 'true');
    });
    var pause = $('[data-announcement-pause]', root);
    if (pause && pause.getAttribute('aria-pressed') !== 'true') pause.click();
  });
})();
