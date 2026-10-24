/* Astra AI support entry point. Replaces the former Botpress iframe while preserving Help Centre access. */
(function () {
  'use strict';

  function isSupportRoute() {
    const path = location.pathname.replace(/\/+$/, '') || '/';
    return path === '/support' || path === '/listen/account';
  }

  function ensureSupportCard() {
    if (document.getElementById('ie-ai-support-card')) return;
    const listenerAccount = (location.pathname.replace(/\/+$/, '') || '/') === '/listen/account';
    const heading = document.querySelector('#app .page-heading');
    const listenerLibrary = document.querySelector('#app .listener-account-library');
    if (listenerAccount && !listenerLibrary) return;
    if (!listenerAccount && !heading) return;

    const card = document.createElement('section');
    card.id = 'ie-ai-support-card';
    card.className = 'settings-card card ie-ai-support-card';
    card.setAttribute('aria-labelledby', 'ie-ai-support-title');
    card.innerHTML = '<div class="setting-section"><div class="setting-icon" aria-hidden="true">✳</div><div><h2 id="ie-ai-support-title">Astra AI support</h2><p>Get help with common website, account, listener and label-workflow questions. Need a person? Astra can send a support request for human follow-up. Never share passwords, one-time codes or recovery codes in chat.</p></div></div>' +
      '<div class="ie-ai-support-status" id="ie-ai-support-status" role="status" aria-live="polite">Astra is loading…</div>' +
      '<p class="muted">Support requests are only sent after you review the details and consent to sharing them with the support team.</p>' +
      '<p><button class="button primary" id="ie-astra-support-open" type="button">Ask Astra or contact support</button> <a href="/help/">Open the public Help Centre ↗</a></p>';

    if (listenerAccount) listenerLibrary.insertAdjacentElement('beforebegin', card);
    else heading.insertAdjacentElement('afterend', card);

    const button = card.querySelector('#ie-astra-support-open');
    button.addEventListener('click', () => {
      const launcher = document.getElementById('ie-astra-launch');
      if (!launcher) {
        const status = document.getElementById('ie-ai-support-status');
        if (status) status.textContent = 'Astra is not connected yet. Please use the Help Centre while we reconnect the assistant.';
        return;
      }
      if (launcher.getAttribute('aria-expanded') !== 'true') launcher.click();
      const supportToggle = document.getElementById('ie-astra-support-toggle');
      const ticketForm = document.getElementById('ie-astra-ticket-form');
      if (supportToggle && ticketForm?.hidden) supportToggle.click();
    });
  }

  async function mountAssistant() {
    if (!isSupportRoute() || !window.sb?.auth) return;
    try {
      const { data, error } = await window.sb.auth.getSession();
      if (error || !data?.session?.user?.id) return;
      ensureSupportCard();
      const status = document.getElementById('ie-ai-support-status');
      if (status && document.getElementById('ie-astra-launch')) {
        status.textContent = 'Astra is ready. You can chat or request a human follow-up.';
      }
    } catch (_) {
      // Keep the public Help Centre available if authentication is unavailable.
    }
  }

  function loadAstraAssistant() {
    if (document.querySelector('script[data-ie-astra-loader]')) return;
    const script = document.createElement('script');
    script.src = '/js/astra-ai.js?v=3.3.113';
    script.defer = true;
    script.dataset.ieAstraLoader = '1';
    script.onerror = function () { script.remove(); };
    document.head.appendChild(script);
  }

  document.addEventListener('ie-view-rendered', mountAssistant);
  document.addEventListener('DOMContentLoaded', mountAssistant, { once: true });
  window.addEventListener('portal-ready', mountAssistant);
  document.addEventListener('DOMContentLoaded', loadAstraAssistant, { once: true });
  window.addEventListener('portal-ready', loadAstraAssistant);
})();
