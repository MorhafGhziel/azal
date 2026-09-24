import { copy } from '../i18n';

export default function notfound(el: HTMLElement) {
  el.innerHTML = `<div class="page page--center"><h1 class="page__title" tabindex="-1">404</h1><a class="link" href="/">${copy.order.back}</a></div>`;
}
