/* AZAL — small behaviours for the store pages: account forms (country → province dropdowns, password recovery
   panel, delete confirmation) and opening a form's panel when it comes back with errors. No dependencies. */
(function () {
  'use strict';

  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------- country → province dropdowns (data from all_country_option_tags) ---------- */
  function fillProvinces(countrySelect) {
    var target = document.getElementById(countrySelect.getAttribute('data-province-target'));
    if (!target) return;
    var wrap = target.closest('[data-address-province-wrap]');
    var option = countrySelect.options[countrySelect.selectedIndex];
    var provinces = [];
    try { provinces = JSON.parse((option && option.getAttribute('data-provinces')) || '[]'); } catch (e) { provinces = []; }
    var wanted = target.value || target.getAttribute('data-default') || '';
    target.innerHTML = '';
    provinces.forEach(function (p) {
      // each entry is [code or name, localized name]
      var o = document.createElement('option');
      o.value = p[0];
      o.textContent = p[1];
      target.appendChild(o);
    });
    if (wrap) wrap.hidden = provinces.length === 0;
    target.disabled = provinces.length === 0;
    if (!wanted) return;
    for (var i = 0; i < target.options.length; i++) {
      if (target.options[i].value === wanted || target.options[i].textContent === wanted) { target.selectedIndex = i; break; }
    }
  }

  function initCountry(select) {
    if (select.dataset.ready) return;
    select.dataset.ready = '1';
    var def = select.getAttribute('data-default');
    if (def) {
      for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value === def || select.options[i].textContent === def) { select.selectedIndex = i; break; }
      }
    }
    fillProvinces(select);
    select.addEventListener('change', function () {
      var target = document.getElementById(select.getAttribute('data-province-target'));
      if (target) { target.value = ''; target.removeAttribute('data-default'); }
      fillProvinces(select);
    });
  }

  /* ---------- open any collapsed panel whose form came back with errors ---------- */
  function openErrored(root) {
    $$('details', root).forEach(function (d) {
      if (d.querySelector('.store-errors, [aria-invalid="true"]')) d.open = true;
    });
  }

  /* ---------- login ↔ password recovery ---------- */
  function initRecover() {
    var recover = document.querySelector('[data-recover]');
    if (!recover) return;
    var login = document.getElementById('login');
    function show(which, focus) {
      var r = which === 'recover';
      recover.classList.toggle('is-open', r);
      if (login) login.hidden = r;
      if (focus) {
        var title = (r ? recover : login).querySelector('.page__title');
        if (title) title.focus();
      }
    }
    if (recover.classList.contains('is-open') || location.hash === '#recover') show('recover', false);
    addEventListener('hashchange', function () {
      if (location.hash === '#recover') show('recover', true);
      else if (location.hash === '#login') show('login', true);
    });
  }

  /* ---------- confirm before deleting an address ---------- */
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (form.matches && form.matches('[data-confirm]') && !window.confirm(form.getAttribute('data-confirm'))) e.preventDefault();
  });

  function init(root) {
    $$('[data-address-country]', root).forEach(initCountry);
    openErrored(root);
  }

  init(document);
  initRecover();

  // theme editor: sections re-render in place
  document.addEventListener('shopify:section:load', function (e) { init(e.target); initRecover(); });
})();
