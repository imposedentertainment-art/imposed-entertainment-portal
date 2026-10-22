/* Cloudflare Turnstile integration for Supabase password sign-in, invite signup and email codes. */
let tsToken = '', tsWidget = null, tsEl = null, tsLoading = null;
const TS_KEY = () => (window.IMPOSED_CONFIG && window.IMPOSED_CONFIG.TURNSTILE_SITE_KEY) || '';
const IE_PRODUCTION_SIGNIN_URL = 'https://imposed-entertainment-portal.pages.dev/signin';
function isPreviewPortalHost() {
  const host = String(location.hostname || '').toLowerCase();
  return host !== 'imposed-entertainment-portal.pages.dev' && host.endsWith('.imposed-entertainment-portal.pages.dev');
}
function showProductionPortalLink() {
  const status = document.getElementById('captcha-status');
  if (!status || document.getElementById('ie-production-auth-link')) return;
  const link = document.createElement('a');
  link.id = 'ie-production-auth-link';
  link.className = 'link-button';
  link.href = IE_PRODUCTION_SIGNIN_URL;
  link.textContent = 'Open the production sign-in page';
  status.insertAdjacentElement('afterend', link);
}
function captchaStatus(message, state='info') {
  const el = document.getElementById('captcha-status');
  if (!el) return;
  el.textContent = message;
  el.dataset.state = state;
}
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve();
  if (tsLoading) return tsLoading;
  tsLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.defer = true;
    s.onload = () => window.turnstile ? resolve() : reject(new Error('Cloudflare loaded without its verification API.'));
    s.onerror = () => { tsLoading = null; reject(new Error('Cloudflare could not load. Check content blockers, network access and the site domain.')); };
    document.head.appendChild(s);
  });
  return tsLoading;
}
async function mountCaptcha() {
  const el = document.getElementById('cf-turnstile');
  if (!el) return;
  if (isPreviewPortalHost()) {
    captchaStatus('This preview deployment cannot sign in because its hostname is not on the production security allowlist. Use the production portal instead.', 'error');
    showProductionPortalLink();
    return;
  }
  if (!TS_KEY()) {
    captchaStatus('Security verification is not configured. Contact the portal administrator.', 'error');
    return;
  }
  if (el === tsEl && tsWidget !== null && window.turnstile) return;
  if (window.turnstile && tsWidget !== null) { try { window.turnstile.remove(tsWidget); } catch (_) {} }
  tsEl = el; tsToken = ''; tsWidget = null;
  captchaStatus('Loading Cloudflare security check…');
  try {
    await loadTurnstile();
    if (document.getElementById('cf-turnstile') !== el) return;
    tsWidget = window.turnstile.render(el, {
      sitekey: TS_KEY(), theme: 'light', size: 'flexible',
      callback: token => { tsToken = token; captchaStatus('Security check complete.', 'success'); },
      'expired-callback': () => { tsToken = ''; captchaStatus('Security check expired. Please complete it again.', 'error'); },
      'timeout-callback': () => { tsToken = ''; captchaStatus('Security check timed out. Please try again.', 'error'); },
      'error-callback': code => {
        tsToken = '';
        captchaStatus('Cloudflare verification failed (' + String(code || 'unknown') + '). Check the Turnstile hostname allowlist and Supabase CAPTCHA secret.', 'error');
        toast('Cloudflare verification failed. Check the Turnstile domain and Supabase CAPTCHA settings.', 'error');
      }
    });
  } catch (e) {
    captchaStatus(e.message || 'Could not load Cloudflare security verification.', 'error');
    toast(e.message || 'Could not load Cloudflare security verification.', 'error');
  }
}
function captchaToken() {
  if (isPreviewPortalHost()) throw new Error('Sign-in is disabled on preview deployments. Open the production sign-in page to continue.');
  if (!TS_KEY()) throw new Error('Security verification is not configured. Contact the portal administrator.');
  if (!window.turnstile || tsWidget === null) throw new Error('Cloudflare security verification has not loaded. Please reload and try again.');
  if (!tsToken) throw new Error('Complete the Cloudflare security check first.');
  return tsToken;
}
function resetCaptcha() {
  tsToken = '';
  if (window.turnstile && tsWidget !== null) {
    try { window.turnstile.reset(tsWidget); captchaStatus('Complete the security check to continue.'); } catch (_) {}
  }
}
