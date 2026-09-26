/* AZAL — product: gallery (images, videos, YouTube/Vimeo, 3D models + AR), variant picker, prices,
   selling plans, quantity rules, gift card recipient form, add to cart, pickup availability, share,
   phone buy bar, and lazy product recommendations.
   Used by sections/product.liquid and sections/featured-product.liquid ([data-product]) and
   sections/product-recommendations.liquid ([data-recommendations]). No dependencies; uses window.AZAL
   (assets/azal.js, assets/azal-cart.js) when present and falls back to a normal form post otherwise. */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function $(selector, scope) { return (scope || doc).querySelector(selector); }
  function $$(selector, scope) { return Array.prototype.slice.call((scope || doc).querySelectorAll(selector)); }
  function isRtl() { return root.dir === 'rtl'; }
  function isReduced() { return reducedMotion.matches || !!(window.AZAL && window.AZAL.env && window.AZAL.env.reduced); }
  function parseJson(el) {
    if (!el) return null;
    try { return JSON.parse(el.textContent); } catch (e) { return null; }
  }

  /* ------------------------------------------------------------------ */
  /* Gallery                                                             */
  /* ------------------------------------------------------------------ */

  var xrReady = false;

  function Gallery(el) {
    this.el = el;
    this.track = $('[data-track]', el);
    this.items = this.track ? $$('.pdp-media__item', this.track) : [];
    this.thumbs = $$('[data-thumb]', el);
    this.counter = $('[data-gallery-index]', el);
    this.active = this.items[0] || null;
    this.modelUis = {};
    if (!this.track) return;
    this.bind();
    this.setupModels();
  }

  Gallery.prototype.bind = function () {
    var self = this;

    this.thumbs.forEach(function (thumb) {
      thumb.addEventListener('click', function () { self.show(thumb.getAttribute('data-thumb')); });
    });

    $$('[data-gallery-step]', this.el).forEach(function (btn) {
      btn.addEventListener('click', function () { self.step(Number(btn.getAttribute('data-gallery-step'))); });
    });

    this.track.addEventListener('keydown', function (event) {
      if (event.target !== self.track) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      var forward = event.key === 'ArrowRight' ? 1 : -1;
      self.step(isRtl() ? -forward : forward);
    });

    $$('[data-deferred-load]', this.track).forEach(function (btn) {
      btn.addEventListener('click', function () { self.loadDeferred(btn.closest('.pdp-media__item'), true); });
    });

    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) self.setActive(entry.target);
        });
      }, { root: this.track, threshold: [0.6] });
      this.items.forEach(function (item) { self.observer.observe(item); });
    } else {
      this.track.addEventListener('scroll', function () {
        var width = self.track.clientWidth || 1;
        var index = Math.round(Math.abs(self.track.scrollLeft) / width);
        if (self.items[index]) self.setActive(self.items[index]);
      }, { passive: true });
    }
  };

  Gallery.prototype.indexOf = function (item) { return this.items.indexOf(item); };

  Gallery.prototype.step = function (direction) {
    var index = this.indexOf(this.active) + direction;
    if (index < 0) index = this.items.length - 1;
    if (index >= this.items.length) index = 0;
    this.goTo(this.items[index]);
  };

  Gallery.prototype.show = function (mediaId, instant) {
    var item = this.items.filter(function (i) { return i.getAttribute('data-media-id') === String(mediaId); })[0];
    if (item) this.goTo(item, instant);
  };

  Gallery.prototype.goTo = function (item, instant) {
    if (!item || !this.track) return;
    var trackRect = this.track.getBoundingClientRect();
    var itemRect = item.getBoundingClientRect();
    // Physical pixels, so this is correct in both LTR and RTL scroll containers.
    var delta = isRtl() ? itemRect.right - trackRect.right : itemRect.left - trackRect.left;
    if (Math.abs(delta) > 1) {
      this.track.scrollBy({ left: delta, behavior: instant || isReduced() ? 'auto' : 'smooth' });
    }
    this.setActive(item);
  };

  Gallery.prototype.setActive = function (item) {
    if (!item || item === this.active && item.classList.contains('is-active')) return;
    var self = this;
    var id = item.getAttribute('data-media-id');
    this.items.forEach(function (i) {
      var on = i === item;
      i.classList.toggle('is-active', on);
      if (!on) self.pause(i);
    });
    this.thumbs.forEach(function (thumb) {
      if (thumb.getAttribute('data-thumb') === id) {
        thumb.setAttribute('aria-current', 'true');
        var list = thumb.closest('.pdp-media__thumbs');
        if (list && list.scrollWidth > list.clientWidth) {
          var listRect = list.getBoundingClientRect();
          var thumbRect = thumb.getBoundingClientRect();
          if (thumbRect.left < listRect.left || thumbRect.right > listRect.right) {
            list.scrollBy({ left: thumbRect.left - listRect.left - listRect.width / 2 + thumbRect.width / 2, behavior: isReduced() ? 'auto' : 'smooth' });
          }
        }
      } else {
        thumb.removeAttribute('aria-current');
      }
    });
    if (this.counter) this.counter.textContent = String(this.indexOf(item) + 1);
    this.active = item;
  };

  Gallery.prototype.loadDeferred = function (item, focus) {
    if (!item || item.hasAttribute('data-loaded')) return;
    var box = $('[data-deferred]', item);
    var template = box && $('template', box);
    if (!template) return;
    item.setAttribute('data-loaded', '');
    var content = template.content.firstElementChild ? template.content.cloneNode(true) : null;
    if (!content) return;
    var poster = $('[data-deferred-load]', box);
    box.appendChild(content);
    if (poster) poster.remove();
    this.goTo(item, true);

    var type = item.getAttribute('data-media-type');
    var media = box.querySelector('video, iframe, model-viewer');
    if (type === 'video' && media && media.play) {
      var playing = media.play();
      if (playing && playing.catch) playing.catch(function () {});
    }
    if (type === 'model') this.setupModelUi(item, media);
    if (focus && media) {
      if (!media.hasAttribute('tabindex') && media.tagName !== 'IFRAME' && media.tagName !== 'VIDEO') media.setAttribute('tabindex', '-1');
      media.focus();
    }
  };

  Gallery.prototype.pause = function (item) {
    if (!item.hasAttribute('data-loaded')) return;
    var video = $('video', item);
    if (video && !video.paused) video.pause();
    var iframe = $('iframe', item);
    if (iframe && iframe.contentWindow) {
      var src = iframe.getAttribute('src') || '';
      if (src.indexOf('youtube') > -1) iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
      else if (src.indexOf('vimeo') > -1) iframe.contentWindow.postMessage('{"method":"pause"}', '*');
    }
    var ui = this.modelUis[item.getAttribute('data-media-id')];
    if (ui && ui.pause) ui.pause();
  };

  Gallery.prototype.setupModelUi = function (item, viewer) {
    var self = this;
    if (!viewer || !window.Shopify || !window.Shopify.loadFeatures) return;
    window.Shopify.loadFeatures([{
      name: 'model-viewer-ui',
      version: '1.0',
      onLoad: function (error) {
        if (error || !window.Shopify.ModelViewerUI) return;
        self.modelUis[item.getAttribute('data-media-id')] = new window.Shopify.ModelViewerUI(viewer);
      }
    }]);
  };

  Gallery.prototype.setupModels = function () {
    var models = parseJson($('[data-product-models]', this.el));
    if (!models || !models.length || !window.Shopify || !window.Shopify.loadFeatures) return;
    window.Shopify.loadFeatures([{
      name: 'shopify-xr',
      version: '1.0',
      onLoad: function (error) {
        if (error) return;
        var setup = function () {
          if (!window.ShopifyXR) {
            doc.addEventListener('shopify_xr_initialized', setup, { once: true });
            return;
          }
          window.ShopifyXR.addModels(models);
          window.ShopifyXR.setupXRElements();
          xrReady = true;
        };
        setup();
      }
    }]);
  };

  /* ------------------------------------------------------------------ */
  /* Product (main product and featured product)                         */
  /* ------------------------------------------------------------------ */

  function Product(el) {
    if (el.__azalProduct) return;
    el.__azalProduct = this;
    this.el = el;
    this.data = parseJson($('[data-product-json]', el)) || { variants: [] };
    this.variants = this.data.variants || [];
    this.formId = el.getAttribute('data-form-id');
    this.form = this.formId ? doc.getElementById(this.formId) : null;
    this.updateUrl = el.getAttribute('data-update-url') === 'true';
    this.addButton = this.form ? $('[data-add-button]', this.form) : null;
    this.errorEl = this.form ? $('[data-form-error]', this.form) : null;
    this.qtyInput = $('[data-qty-input]', el);
    this.planInput = this.form ? $('[data-selling-plan-input]', this.form) : null;
    this.barWrap = $('[data-buy-bar-wrap]', el);
    this.barButton = this.barWrap ? $('[data-bar-button]', this.barWrap) : null;
    var galleryEl = $('[data-gallery]', el);
    this.gallery = galleryEl ? new Gallery(galleryEl) : null;

    var initialId = this.form ? Number(($('[data-variant-input]', this.form) || {}).value) : null;
    this.current = this.variants.filter(function (v) { return v.id === initialId; })[0] || this.variants[0] || null;

    this.bindOptions();
    this.bindQuantity();
    this.bindPlans();
    this.bindRecipient();
    this.bindForm();
    this.bindBar();
    this.renderAvailability();
    this.syncQuantityRules(this.current, true);
  }

  /* ---- options ---- */

  Product.prototype.selectedOptions = function () {
    return $$('[data-options] fieldset', this.el).map(function (fieldset) {
      var checked = $('input:checked', fieldset);
      return checked ? checked.value : null;
    });
  };

  Product.prototype.bindOptions = function () {
    var self = this;
    $$('[data-option-value]', this.el).forEach(function (input) {
      input.addEventListener('change', function () { self.onOptionChange(input); });
    });
  };

  Product.prototype.onOptionChange = function (input) {
    // Combined listings: a value that belongs to another product takes the shopper there.
    var productUrl = input.getAttribute('data-product-url');
    if (productUrl && this.data.url && productUrl.split('?')[0] !== this.data.url.split('?')[0]) {
      var variantId = input.getAttribute('data-variant-id');
      window.location.href = productUrl + (variantId ? (productUrl.indexOf('?') > -1 ? '&' : '?') + 'variant=' + variantId : '');
      return;
    }

    var fieldset = input.closest('fieldset');
    var current = fieldset && $('[data-option-current]', fieldset);
    if (current) current.textContent = input.value;

    var selected = this.selectedOptions();
    var match = this.variants.filter(function (v) {
      return v.options.every(function (value, i) { return value === selected[i]; });
    })[0] || null;
    this.setVariant(match);
  };

  Product.prototype.renderAvailability = function () {
    var selected = this.selectedOptions();
    var variants = this.variants;
    $$('[data-options] fieldset', this.el).forEach(function (fieldset, optionIndex) {
      $$('[data-option-value]', fieldset).forEach(function (input) {
        // Same rule as Shopify's product_option_value.available: earlier options stay as selected.
        var available = variants.some(function (v) {
          if (!v.available || v.options[optionIndex] !== input.value) return false;
          for (var j = 0; j < optionIndex; j++) {
            if (v.options[j] !== selected[j]) return false;
          }
          return true;
        });
        var wrapper = input.closest('.pdp-value');
        if (wrapper) wrapper.classList.toggle('is-unavailable', !available);
        var text = wrapper && $('[data-unavailable-text]', wrapper);
        if (text) text.hidden = available;
      });
    });
  };

  /* ---- variant change ---- */

  Product.prototype.setVariant = function (variant) {
    this.current = variant;
    this.renderAvailability();
    this.renderPrice();
    this.renderButtons();
    this.syncQuantityRules(variant, false);

    var status = $('[data-options-status]', this.el);
    var addLabels = this.addButton ? this.addButton.dataset : {};

    if (!variant) {
      if (status) status.textContent = addLabels.labelUnavailable || '';
      this.updatePickup(null);
      return;
    }

    $$('[data-variant-input]', this.el).forEach(function (input) {
      input.value = variant.id;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    if (status) status.textContent = variant.available ? '' : (addLabels.labelSoldOut || '');

    if (this.updateUrl && window.history && window.history.replaceState) {
      var url = new URL(window.location.href);
      url.searchParams.set('variant', variant.id);
      window.history.replaceState({ variant: variant.id }, '', url.toString());
    }

    if (variant.media && this.gallery) this.gallery.show(variant.media);

    this.updatePickup(variant);

    this.el.dispatchEvent(new CustomEvent('azal:variant:change', { bubbles: true, detail: { variant: variant, sectionId: this.el.getAttribute('data-section-id') } }));
  };

  Product.prototype.selectedPlan = function () {
    return this.planInput ? this.planInput.value : '';
  };

  Product.prototype.renderPrice = function () {
    var variant = this.current;
    var plan = this.selectedPlan();
    var html = '';
    if (variant) html = plan && variant.plans && variant.plans[plan] ? variant.plans[plan].html : variant.priceHtml;

    $$('[data-product-price]', this.el).forEach(function (el) {
      if (variant) {
        el.innerHTML = html;
        el.classList.remove('is-unavailable');
      } else {
        el.classList.add('is-unavailable');
      }
    });

    $$('[data-badge-sale]', this.el).forEach(function (badge) { badge.hidden = !(variant && variant.available && variant.sale); });
    $$('[data-badge-sold-out]', this.el).forEach(function (badge) { badge.hidden = !(variant && !variant.available); });

    // Price shown beside each purchase option.
    $$('[data-plan-price]', this.el).forEach(function (el) {
      var id = el.getAttribute('data-plan-price');
      if (!variant) { el.textContent = ''; return; }
      if (!id) el.textContent = variant.priceShort;
      else el.textContent = variant.plans && variant.plans[id] ? variant.plans[id].short : '';
    });

    var barPrice = this.barWrap && $('[data-bar-price]', this.barWrap);
    if (barPrice && variant) barPrice.textContent = plan && variant.plans && variant.plans[plan] ? variant.plans[plan].short : variant.priceShort;
  };

  Product.prototype.renderButtons = function () {
    var variant = this.current;
    var buttons = [this.addButton, this.barButton].filter(Boolean);
    var labels = this.addButton ? this.addButton.dataset : null;
    if (!labels) return;
    var text = !variant ? labels.labelUnavailable : variant.available ? labels.labelAdd : labels.labelSoldOut;
    var enabled = !!(variant && variant.available);
    buttons.forEach(function (btn) {
      if (btn.dataset.busy) return;
      btn.disabled = !enabled;
      var label = $('[data-add-label]', btn);
      if (label) label.textContent = text;
      else btn.textContent = text;
    });
  };

  /* ---- quantity ---- */

  Product.prototype.bindQuantity = function () {
    var self = this;
    var input = this.qtyInput;
    if (!input) return;
    $$('[data-qty-step]', this.el).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var step = Number(input.step) || 1;
        self.setQuantity(Number(input.value) + Number(btn.getAttribute('data-qty-step')) * step);
      });
    });
    input.addEventListener('change', function () { self.setQuantity(Number(input.value)); });
  };

  Product.prototype.setQuantity = function (value) {
    var input = this.qtyInput;
    if (!input) return;
    var min = Number(input.min) || 1;
    var max = input.max ? Number(input.max) : Infinity;
    var step = Number(input.step) || 1;
    if (!isFinite(value) || value < min) value = min;
    if (value > max) value = max;
    // Snap to the increment, counted from the minimum.
    var offset = (value - min) % step;
    if (offset) value -= offset;
    input.value = value;
    var down = $('[data-qty-step="-1"]', this.el);
    var up = $('[data-qty-step="1"]', this.el);
    if (down) down.disabled = value <= min;
    if (up) up.disabled = value + step > max;
  };

  Product.prototype.syncQuantityRules = function (variant, initial) {
    var input = this.qtyInput;
    if (!input) return;
    if (variant) {
      input.min = variant.min || 1;
      input.step = variant.step || 1;
      if (variant.max) input.max = variant.max; else input.removeAttribute('max');
      var rules = $('[data-qty-rules]', this.el);
      if (rules) {
        var parts = [];
        if (variant.step > 1) parts.push(rules.dataset.tplStep.replace('[n]', variant.step));
        if (variant.min > 1) parts.push(rules.dataset.tplMin.replace('[n]', variant.min));
        if (variant.max) parts.push(rules.dataset.tplMax.replace('[n]', variant.max));
        rules.textContent = parts.join(' · ');
        rules.hidden = parts.length === 0;
      }
    }
    this.setQuantity(initial ? Number(input.value) : Number(input.min));
  };

  /* ---- selling plans ---- */

  Product.prototype.bindPlans = function () {
    var self = this;
    if (!this.form || !this.planInput) return;
    $$('[data-plan-radio]', this.form).forEach(function (radio) {
      radio.addEventListener('change', function () {
        if (!radio.checked) return;
        self.planInput.value = radio.value;
        self.renderPrice();
      });
    });
  };

  /* ---- gift card recipient ---- */

  Product.prototype.bindRecipient = function () {
    var box = this.form && $('[data-recipient]', this.form);
    if (!box) return;
    var toggle = $('[data-recipient-toggle]', box);
    var fields = $('[data-recipient-fields]', box);
    var offset = $('[data-recipient-offset]', box);
    var sync = function () {
      var on = toggle.checked;
      fields.hidden = !on;
      $$('input, textarea', fields).forEach(function (field) { field.disabled = !on; });
      if (offset) offset.value = String(new Date().getTimezoneOffset());
      if (!on) {
        $$('[data-recipient-error]', fields).forEach(function (err) { err.textContent = ''; });
        $$('[aria-invalid]', fields).forEach(function (field) { field.removeAttribute('aria-invalid'); });
        var summary = $('[data-recipient-errors]', fields);
        if (summary) summary.textContent = '';
      }
    };
    toggle.addEventListener('change', sync);
    sync();
    this.recipient = { box: box, toggle: toggle, fields: fields };
  };

  Product.prototype.showRecipientErrors = function (errors) {
    if (!this.recipient || !errors || typeof errors !== 'object') return false;
    var fields = this.recipient.fields;
    var found = false;
    var first = null;
    $$('[data-recipient-field]', fields).forEach(function (field) {
      var key = field.getAttribute('data-recipient-field');
      var err = $('[data-recipient-error="' + key + '"]', fields);
      var message = errors[key] || (key === 'send_on' && errors.send_on);
      if (message) {
        found = true;
        field.setAttribute('aria-invalid', 'true');
        if (err) err.textContent = Array.isArray(message) ? message.join(' ') : String(message);
        if (!first) first = field;
      } else {
        field.removeAttribute('aria-invalid');
        if (err) err.textContent = '';
      }
    });
    if (first) first.focus();
    return found;
  };

  /* ---- add to cart ---- */

  Product.prototype.bindForm = function () {
    var self = this;
    if (!this.form) return;
    this.form.addEventListener('submit', function (event) {
      var cart = window.AZAL && window.AZAL.cart;
      if (!cart || !cart.add) return; // no Ajax cart: let the browser post the form to /cart/add
      event.preventDefault();
      self.add(event.submitter || self.addButton);
    });
  };

  Product.prototype.add = function (button) {
    var self = this;
    var variant = this.current;
    if (!variant || !variant.available) return;
    if (this.errorEl) this.errorEl.textContent = '';

    // Native validation for the gift card recipient email.
    if (this.recipient && this.recipient.toggle.checked) {
      var email = $('[data-recipient-field="email"]', this.recipient.fields);
      if (email && !email.checkValidity()) {
        this.showRecipientErrors({ email: email.validationMessage });
        return;
      }
    }

    var item = { id: variant.id, quantity: 1 };
    var properties = {};
    var data = new FormData(this.form); // includes inputs joined with the form attribute (quantity)
    data.forEach(function (value, key) {
      if (key === 'quantity') item.quantity = Math.max(1, Number(value) || 1);
      else if (key === 'selling_plan' && value) item.selling_plan = Number(value);
      else {
        var match = key.match(/^properties\[(.+)\]$/);
        if (match && value !== '') properties[match[1]] = value;
      }
    });
    if (Object.keys(properties).length) item.properties = properties;

    var nameEl = $('.pdp__name', this.el);
    var title = nameEl ? nameEl.textContent.trim() : '';
    var trigger = button || this.addButton; // the add button or the phone buy bar button shows the loading state

    window.AZAL.cart.add([item], trigger, title).then(function () {
      if (self.recipient && self.recipient.toggle.checked) self.showRecipientErrors({});
    }).catch(function (error) {
      var info = error && error.data;
      var errors = info && (info.errors || (typeof info.description === 'object' ? info.description : null));
      if (self.showRecipientErrors(errors)) return;
      if (self.errorEl) self.errorEl.textContent = (info && typeof info.description === 'string' && info.description) || (error && error.message) || '';
    });
  };

  /* ---- pickup availability ---- */

  Product.prototype.updatePickup = function (variant) {
    var container = $('[data-pickup]', this.el);
    if (!container) return;
    if (!variant) { container.innerHTML = ''; return; }
    var base = container.getAttribute('data-base-url') || '/';
    if (base.charAt(base.length - 1) !== '/') base += '/';
    var requested = variant.id;
    this.pickupRequest = requested;
    var self = this;
    fetch(base + 'variants/' + variant.id + '/?section_id=product-pickup-availability')
      .then(function (response) { return response.ok ? response.text() : ''; })
      .then(function (html) {
        if (self.pickupRequest !== requested) return;
        var fresh = new DOMParser().parseFromString(html, 'text/html').querySelector('[data-pickup-content]');
        container.innerHTML = '';
        if (fresh) container.appendChild(fresh);
      })
      .catch(function () { container.innerHTML = ''; });
  };

  /* ---- phone buy bar: appears once the add to cart button scrolls away ---- */

  Product.prototype.bindBar = function () {
    var bar = this.barWrap;
    if (!bar) return;
    if (!this.addButton || !('IntersectionObserver' in window)) { bar.remove(); this.barWrap = null; this.barButton = null; return; }
    new IntersectionObserver(function (entries) {
      var entry = entries[0];
      var on = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      bar.classList.toggle('is-on', on);
      bar.setAttribute('aria-hidden', String(!on));
      if (on) bar.removeAttribute('inert'); else bar.setAttribute('inert', '');
    }).observe(this.addButton);
  };

  /* ------------------------------------------------------------------ */
  /* Document-level helpers: pickup dialog, share                        */
  /* ------------------------------------------------------------------ */

  doc.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;

    var open = target.closest('[data-pickup-open]');
    if (open) {
      var content = open.closest('[data-pickup-content]');
      var dialog = content && $('[data-pickup-dialog]', content);
      if (dialog && dialog.showModal) {
        dialog.showModal();
        if (window.AZAL && window.AZAL.lenis) window.AZAL.lenis.stop();
      }
      return;
    }

    if (target.closest('[data-pickup-close]')) {
      var closing = target.closest('[data-pickup-dialog]');
      if (closing) closing.close();
      return;
    }

    // click on the dialog backdrop
    if (target.matches && target.matches('[data-pickup-dialog]')) {
      var rect = target.getBoundingClientRect();
      var inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (!inside) target.close();
      return;
    }

    var share = target.closest('[data-share-button]');
    if (share) {
      var url = share.getAttribute('data-share-url');
      var status = share.parentNode && $('[data-share-status]', share.parentNode);
      if (navigator.share) {
        navigator.share({ title: share.getAttribute('data-share-title'), url: url }).catch(function () {});
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
          if (status) {
            status.textContent = share.getAttribute('data-copied');
            setTimeout(function () { status.textContent = ''; }, 3000);
          }
        }).catch(function () { if (status) status.textContent = url; });
      } else if (status) {
        status.textContent = url;
      }
    }
  });

  doc.addEventListener('close', function (event) {
    if (event.target && event.target.matches && event.target.matches('[data-pickup-dialog]') && window.AZAL && window.AZAL.lenis) window.AZAL.lenis.start();
  }, true);

  /* ------------------------------------------------------------------ */
  /* Recommendations (Product Recommendations API)                       */
  /* ------------------------------------------------------------------ */

  function loadRecommendations(el) {
    var url = el.getAttribute('data-url');
    if (!url || el.hasAttribute('data-requested') || $('[data-recommendations-loaded]', el)) return;
    el.setAttribute('data-requested', '');
    fetch(url)
      .then(function (response) { return response.ok ? response.text() : ''; })
      .then(function (html) {
        var fresh = new DOMParser().parseFromString(html, 'text/html').querySelector('[data-recommendations]');
        if (fresh && fresh.innerHTML.trim()) {
          el.innerHTML = fresh.innerHTML;
          el.classList.add('is-loaded');
        } else {
          el.classList.add('is-empty');
        }
      })
      .catch(function () { el.classList.add('is-empty'); });
  }

  function watchRecommendations(scope) {
    $$('[data-recommendations]', scope).forEach(function (el) {
      if (!('IntersectionObserver' in window)) { loadRecommendations(el); return; }
      var io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        loadRecommendations(el);
      }, { rootMargin: '0px 0px 600px 0px' });
      io.observe(el);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Boot + theme editor                                                 */
  /* ------------------------------------------------------------------ */

  function init(scope) {
    $$('[data-product]', scope).forEach(function (el) { new Product(el); });
    // galleries outside a product form (none today, but keeps the gallery reusable)
    $$('[data-gallery]', scope).forEach(function (el) {
      if (!el.closest('[data-product]') && !el.__azalGallery) el.__azalGallery = new Gallery(el);
    });
    watchRecommendations(scope);
  }

  function boot() { init(doc); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();

  doc.addEventListener('shopify:section:load', function (event) { init(event.target); });
  doc.addEventListener('shopify:block:select', function (event) {
    // keep a selected media-related block visible; open collapsible rows while editing them
    var details = event.target && event.target.matches && event.target.matches('details') ? event.target : null;
    if (details) details.open = true;
  });

  window.AZALProduct = { Product: Product, Gallery: Gallery, xrReady: function () { return xrReady; } };
})();
