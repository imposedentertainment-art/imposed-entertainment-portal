/* Optional Botpress webchat loader.
   The generated public webchat configuration URL is deliberately optional: the
   support form and public help centre continue working before Botpress is configured. */
(function () {
  'use strict';

  const CONFIG_KEY = 'BOTPRESS_WEBCHAT_SHAREABLE_URL';
  const LOADED_ATTR = 'data-ie-botpress-loaded';

  function onWorkspaceSupportRoute() {
    const path = location.pathname.replace(/\/+$/, '') || '/';
    return path === '/support' || path === '/listen/account';
  }

  function getTrustedShareableUrl() {
    const raw = String(window.IMPOSED_CONFIG?.[CONFIG_KEY] || '').trim();
    if (!raw) return '';
    try {
      const url = new URL(raw);
      const configUrl = new URL(url.searchParams.get('configUrl') || '');
      if (url.protocol !== 'https:' ||
          url.hostname !== 'cdn.botpress.cloud' ||
          url.pathname !== '/webchat/v5.0/shareable.html' ||
          configUrl.protocol !== 'https:' ||
          configUrl.hostname !== 'files.bpcontent.cloud') return '';
      return url.href;
    } catch (_) {
      return '';
    }
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
    card.innerHTML = '<div class="setting-section"><div class="setting-icon" aria-hidden="true">✳</div><div><h2 id="ie-ai-support-title">AI support assistant</h2><p>Get help with common website and account questions before contacting the team. Never share passwords, one-time codes or recovery codes in chat.</p></div></div><div class="ie-ai-support-status" id="ie-ai-support-status" role="status" aria-live="polite"></div><p class="muted">The assistant only appears for signed-in accounts. Account-specific checks must still be authorised by the server.</p><p><a href="/help/">Open the public Help Centre ↗</a></p>';
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
      const url = getTrustedShareableUrl();
      if (!url) {
        if (status) status.textContent = (location.pathname.replace(/\/+$/, '') || '/') === '/listen/account'
          ? 'The AI assistant is not connected yet. Use the Help Centre for listener questions.'
          : 'The AI assistant is not connected yet. Use the support form below or the Help Centre.';
        return;
      }
      if (document.querySelector('#ie-botpress-frame')) return;
      const frame = document.createElement('iframe');
      frame.id = 'ie-botpress-frame';
      frame.title = 'Imposed Entertainment AI support assistant';
      frame.src = url;
      frame.loading = 'lazy';
      frame.referrerPolicy = 'strict-origin';
      frame.setAttribute('allow', 'clipboard-write');
      frame.style.cssText = 'display:block;width:100%;height:min(620px,70vh);min-height:420px;border:1px solid var(--border,#29313b);border-radius:12px;background:#fff;margin-top:16px';
      const card = document.getElementById('ie-ai-support-card');
      if (card) card.appendChild(frame);
      window[LOADED_ATTR] = true;
      if (status) status.textContent = 'The assistant is ready. You can chat below.';

    } catch (_) {
      // Support must remain usable even if auth state or the third-party widget fails.
    }
  }

  document.addEventListener('ie-view-rendered', mountAssistant);
  document.addEventListener('DOMContentLoaded', mountAssistant, { once: true });
  window.addEventListener('portal-ready', mountAssistant);
})();
