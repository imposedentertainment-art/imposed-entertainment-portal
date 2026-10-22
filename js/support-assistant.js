/* Optional Botpress webchat loader.
   The generated public webchat configuration URL is deliberately optional: the
   support form and public help centre continue working before Botpress is configured. */
(function () {
  'use strict';

  const CONFIG_KEY = 'BOTPRESS_WEBCHAT_SCRIPT_URL';
  const LOADED_ATTR = 'data-ie-botpress-loaded';

  function onWorkspaceSupportRoute() {
    return (location.pathname.replace(/\/+$/, '') || '/') === '/support';
  }

  function getTrustedScriptUrl() {
    const raw = String(window.IMPOSED_CONFIG?.[CONFIG_KEY] || '').trim();
    if (!raw) return '';
    try {
      const url = new URL(raw);
      if (url.protocol !== 'https:' || url.hostname !== 'files.bpcontent.cloud') return '';
      return url.href;
    } catch (_) {
      return '';
    }
  }

  function ensureSupportCard() {
    if (document.getElementById('ie-ai-support-card')) return;
    const listenerAccount = (location.pathname.replace(/\\/+$/, '') || '/') === '/listen/account';
    const heading = document.querySelector('#app .page-heading');
    const listenerLibrary = document.querySelector('#app .listener-account-library');
    if (listenerAccount && !listenerLibrary) return;
    if (!listenerAccount && !heading) return;
    const card = document.createElement('section');
    card.id = 'ie-ai-support-card';
    card.className = 'settings-card card ie-ai-support-card';
    card.setAttribute('aria-labelledby', 'ie-ai-support-title');
    card.innerHTML = '<div class="setting-section"><div class="setting-icon" aria-hidden="true">✳</div><div><h2 id="ie-ai-support-title">AI support assistant</h2><p>Get help with common portal questions before sending a message to the team. Never share passwords, one-time codes or recovery codes in chat.</p></div></div><div class="ie-ai-support-status" id="ie-ai-support-status" role="status" aria-live="polite"></div><p class="muted">The assistant only appears in this signed-in workspace. Account-specific checks must still be authorised by the server.</p><p><a href="/help/">Open the public Help Centre ↗</a></p>';
    if (listenerAccount) listenerLibrary.insertAdjacentElement('beforebegin', card);
    else heading.insertAdjacentElement('afterend', card);
  }

  async function mountAssistant() {
    if (!onWorkspaceSupportRoute()) return;
    try {
      if (typeof sb === 'undefined' || !sb?.auth) return;
      const { data, error } = await sb.auth.getSession();
      if (error || !data?.session?.user?.id) return;
      ensureSupportCard();
      const status = document.getElementById('ie-ai-support-status');
      if (window[LOADED_ATTR]) { if (status) status.textContent = 'The assistant is ready. Open the chat control in the corner to start.'; return; }
      const url = getTrustedScriptUrl();
      if (!url) {
        if (status) status.textContent = 'The AI assistant is not connected yet. The support form and Help Centre are available in the meantime.';
        return;
      }
      if (document.querySelector('script[data-ie-botpress-script]')) return;
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.dataset.ieBotpressScript = 'true';
      script.onload = function () {
        window[LOADED_ATTR] = true;
        if (status) status.textContent = 'The assistant is ready. Open the chat control in the corner to start.';
      };
      script.onerror = function () {
        if (status) status.textContent = 'The assistant could not load. Please use the support form below instead.';
        script.remove();
      };
      document.head.appendChild(script);
      if (status) status.textContent = 'Connecting the assistant…';
    } catch (_) {
      // Support must remain usable even if auth state or the third-party widget fails.
    }
  }

  document.addEventListener('ie-view-rendered', mountAssistant);
  document.addEventListener('DOMContentLoaded', mountAssistant, { once: true });
  window.addEventListener('portal-ready', mountAssistant);
})();
