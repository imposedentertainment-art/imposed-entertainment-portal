/* Astra AI support and workspace chat. Authenticated, consent-based human escalation. */
(function () {
  'use strict';

  let mounted = false;
  let busy = false;
  const history = [];
  const css = [
    "#ie-astra-launch{position:fixed;right:18px;bottom:18px;z-index:9000;border:0;border-radius:999px;padding:13px 17px;background:#b3122a;color:#fff;font:600 14px/1.2 system-ui;box-shadow:0 8px 28px #0005;cursor:pointer}",
    "#ie-astra-panel{position:fixed;right:18px;bottom:76px;z-index:9001;width:min(390px,calc(100vw - 24px));height:min(570px,calc(100dvh - 105px));display:none;flex-direction:column;background:#101216;color:#f4f4f5;border:1px solid #333943;border-radius:18px;box-shadow:0 20px 70px #0008;overflow:hidden;font:14px/1.5 system-ui}",
    "#ie-astra-panel.open{display:flex}#ie-astra-head{padding:16px;border-bottom:1px solid #30343c;display:flex;align-items:center;justify-content:space-between;flex:0 0 auto}",
    "#ie-astra-head strong{font-size:16px}#ie-astra-head small{display:block;color:#a4aab5}#ie-astra-close{background:transparent;border:0;color:inherit;font-size:23px;cursor:pointer}",
    "#ie-astra-log{flex:1;min-height:0;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:10px}",
    ".ie-astra-msg{padding:10px 12px;border-radius:12px;max-width:92%;white-space:pre-wrap;overflow-wrap:anywhere}.ie-astra-user{align-self:flex-end;background:#b3122a;color:#fff}.ie-astra-ai{align-self:flex-start;background:#20242b}",
    "#ie-astra-form{padding:12px;border-top:1px solid #30343c;display:flex;gap:8px;flex:0 0 auto}#ie-astra-input{min-width:0;flex:1;resize:vertical;max-height:100px;background:#191c22;color:#fff;border:1px solid #444b56;border-radius:10px;padding:10px;font:inherit}",
    "#ie-astra-send,#ie-astra-ticket-submit{border:0;border-radius:10px;background:#b3122a;color:white;padding:9px 14px;font-weight:700;cursor:pointer}#ie-astra-send:disabled,#ie-astra-ticket-submit:disabled{opacity:.5;cursor:wait}",
    "#ie-astra-note{padding:0 14px 10px;color:#a4aab5;font-size:11px;flex:0 0 auto}#ie-astra-note a{color:#e7a1ac}",
    "#ie-astra-actions{padding:0 12px 10px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex:0 0 auto}",
    "#ie-astra-support-toggle{background:transparent;color:#f4f4f5;border:1px solid #565d69;border-radius:9px;padding:7px 10px;font:inherit;font-weight:600;cursor:pointer}",
    "#ie-astra-ticket-form{position:absolute;inset:58px 0 0;z-index:2;overflow:auto;background:#101216;padding:14px;display:grid;gap:10px;align-content:start;border-top:1px solid #30343c}",
    "#ie-astra-ticket-form[hidden]{display:none}#ie-astra-ticket-form label{display:grid;gap:4px;color:#d7d9de;font-size:12px}",
    "#ie-astra-ticket-form input,#ie-astra-ticket-form select,#ie-astra-ticket-form textarea{box-sizing:border-box;width:100%;background:#191c22;color:#fff;border:1px solid #444b56;border-radius:8px;padding:9px;font:inherit;font-size:14px}",
    "#ie-astra-ticket-form textarea{min-height:90px;resize:vertical}#ie-astra-ticket-consent{display:flex!important;grid-template-columns:auto 1fr;align-items:start;gap:8px!important;line-height:1.4}#ie-astra-ticket-consent input{width:auto;margin-top:3px}",
    "#ie-astra-ticket-cancel{background:transparent;color:#ddd;border:1px solid #444b56;border-radius:9px;padding:8px 12px;font:inherit;cursor:pointer}#ie-astra-ticket-actions{display:flex;gap:8px;justify-content:flex-end}",
    "@media(max-width:520px){#ie-astra-launch{right:12px;bottom:12px}#ie-astra-panel{right:8px;bottom:68px;width:calc(100vw - 16px);height:min(620px,calc(100dvh - 86px))}}"
  ].join("");

  function addMessage(role, text) {
    const log = document.getElementById('ie-astra-log');
    if (!log) return;
    const node = document.createElement('div');
    node.className = 'ie-astra-msg ' + (role === 'user' ? 'ie-astra-user' : 'ie-astra-ai');
    node.textContent = text;
    log.appendChild(node);
    log.scrollTop = log.scrollHeight;
    return node;
  }

  function setBusy(value) {
    busy = value;
    const send = document.getElementById('ie-astra-send');
    const submit = document.getElementById('ie-astra-ticket-submit');
    if (send) send.disabled = value;
    if (submit) submit.disabled = value;
  }

  async function send(text) {
    if (busy || !text.trim()) return;
    if (!window.sb?.auth) {
      addMessage('assistant', 'The secure assistant connection is not available right now. Please use the Help Centre.');
      return;
    }
    setBusy(true);
    addMessage('user', text);
    history.push({ role: 'user', content: text });
    const pending = addMessage('assistant', 'Thinking…');
    try {
      const { data, error } = await window.sb.functions.invoke('astra-chat', { body: { messages: history.slice(-12) } });
      if (error) throw error;
      const answer = String(data?.reply || 'I couldn’t produce a reply just now. Please try again.').slice(0, 8000);
      pending.textContent = answer;
      history.push({ role: 'assistant', content: answer });
    } catch (_) {
      pending.textContent = 'Astra could not connect just now. Check that your website account is linked to Discord, then try again. If it keeps happening, use the Help Centre.';
    } finally {
      setBusy(false);
    }
  }

  function toggleTicketForm(open) {
    const form = document.getElementById('ie-astra-ticket-form');
    const toggle = document.getElementById('ie-astra-support-toggle');
    if (!form || !toggle) return;
    form.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Close support form' : 'Talk to support';
    if (open) document.getElementById('ie-astra-ticket-subject')?.focus();
  }

  async function submitSupportTicket(event) {
    event.preventDefault();
    if (busy) return;
    const form = document.getElementById('ie-astra-ticket-form');
    if (!form || !window.sb?.functions) return;
    const category = document.getElementById('ie-astra-ticket-category').value;
    const subject = document.getElementById('ie-astra-ticket-subject').value.trim();
    const description = document.getElementById('ie-astra-ticket-description').value.trim();
    const contactEmail = document.getElementById('ie-astra-ticket-email').value.trim();
    const consent = document.getElementById('ie-astra-ticket-consent-check').checked;
    if (!consent) return;
    const ticketButton = document.getElementById('ie-astra-ticket-submit');
    const originalLabel = ticketButton.textContent;
    ticketButton.textContent = 'Sending…';
    setBusy(true);
    try {
      const { data, error } = await window.sb.functions.invoke('astra-chat', {
        body: {
          action: 'create_support_ticket',
          ticket: { category, subject, description, contactEmail, consent: true },
          messages: history.slice(-8)
        }
      });
      if (error) throw error;
      if (!data?.ticketReference) throw new Error('Ticket reference missing');
      form.reset();
      toggleTicketForm(false);
      if (data.supportNotified === true) {
        addMessage('assistant', 'Your support request has been sent to the team. Keep this reference for follow-up: ' + data.ticketReference + '.');
      } else {
        addMessage('assistant', 'Your request was saved as ' + data.ticketReference + ', but the live support alert could not be confirmed. Please also use the Help Centre link below so the team sees your request.');
      }
    } catch (_) {
      addMessage('assistant', 'I could not confirm the support handoff. Please use the Help Centre link below instead. Do not include passwords or sign-in codes.');
    } finally {
      setBusy(false);
      if (ticketButton) ticketButton.textContent = originalLabel;
    }
  }

  async function mount() {
    if (mounted || !window.sb?.auth) return;
    try {
      const { data } = await window.sb.auth.getSession();
      if (!data?.session?.user?.id) return;
    } catch (_) {
      return;
    }
    mounted = true;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    const launch = document.createElement('button');
    launch.id = 'ie-astra-launch';
    launch.type = 'button';
    launch.textContent = '✳ Ask Astra AI';
    launch.setAttribute('aria-expanded', 'false');
    launch.setAttribute('aria-controls', 'ie-astra-panel');

    const panel = document.createElement('section');
    panel.id = 'ie-astra-panel';
    panel.setAttribute('aria-label', 'Astra AI support assistant');
    panel.innerHTML = '<div id="ie-astra-head"><div><strong>✳ Astra AI</strong><small>Imposed Entertainment assistant</small></div><button id="ie-astra-close" type="button" aria-label="Close assistant">×</button></div>' +
      '<div id="ie-astra-log" role="log" aria-live="polite"></div>' +
      '<div id="ie-astra-actions"><button id="ie-astra-support-toggle" type="button" aria-expanded="false" aria-controls="ie-astra-ticket-form">Talk to support</button><span>Prefer self-service? <a href="/help/">Help Centre</a></span></div>' +
      '<div id="ie-astra-note">Never share passwords, sign-in codes or payment credentials. A support request shares the details and recent chat you approve with the support team.</div>' +
      '<form id="ie-astra-form"><textarea id="ie-astra-input" rows="1" maxlength="2000" placeholder="Ask Astra a question…" aria-label="Message Astra AI" required></textarea><button id="ie-astra-send" type="submit">Send</button></form>' +
      '<form id="ie-astra-ticket-form" hidden><strong>Contact the support team</strong>' +
      '<label for="ie-astra-ticket-category">What do you need help with?<select id="ie-astra-ticket-category" name="category" required><option value="general">General question</option><option value="account">Account or sign-in</option><option value="technical">Website or technical issue</option><option value="release">Release or label workflow</option><option value="billing">Billing</option><option value="privacy">Privacy or data request</option></select></label>' +
      '<label for="ie-astra-ticket-subject">Subject<input id="ie-astra-ticket-subject" name="subject" minlength="3" maxlength="120" required placeholder="A short summary"></label>' +
      '<label for="ie-astra-ticket-description">Tell us what happened<textarea id="ie-astra-ticket-description" name="description" minlength="5" maxlength="4000" required placeholder="Include what you were trying to do and any error you saw."></textarea></label>' +
      '<label for="ie-astra-ticket-email">Reply email (optional)<input id="ie-astra-ticket-email" name="email" type="email" maxlength="254" autocomplete="email" placeholder="you@example.com"></label>' +
      '<label id="ie-astra-ticket-consent" for="ie-astra-ticket-consent-check"><input id="ie-astra-ticket-consent-check" type="checkbox" required><span>I agree to share this request and up to eight recent chat messages with the Imposed Entertainment support team so they can respond.</span></label>' +
      '<div id="ie-astra-ticket-actions"><button id="ie-astra-ticket-cancel" type="button">Cancel</button><button id="ie-astra-ticket-submit" type="submit">Send support request</button></div></form>';

    document.body.append(launch, panel);
    addMessage('assistant', 'Hi! I’m Astra, your Imposed Entertainment assistant. Ask me a question, or choose Talk to support for a human follow-up.');
    function togglePanel(open) {
      panel.classList.toggle('open', open);
      launch.setAttribute('aria-expanded', String(open));
      if (open) document.getElementById('ie-astra-input').focus();
    }
    launch.addEventListener('click', () => togglePanel(!panel.classList.contains('open')));
    document.getElementById('ie-astra-close').addEventListener('click', () => togglePanel(false));
    document.getElementById('ie-astra-support-toggle').addEventListener('click', () => {
      toggleTicketForm(document.getElementById('ie-astra-ticket-form').hidden);
    });
    document.getElementById('ie-astra-ticket-cancel').addEventListener('click', () => toggleTicketForm(false));
    document.getElementById('ie-astra-ticket-form').addEventListener('submit', submitSupportTicket);
    document.getElementById('ie-astra-form').addEventListener('submit', event => {
      event.preventDefault();
      const input = document.getElementById('ie-astra-input');
      const value = input.value.trim();
      if (!value) return;
      input.value = '';
      send(value);
    });
    document.getElementById('ie-astra-input').addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        document.getElementById('ie-astra-form').requestSubmit();
      }
    });
    window.sb.auth.onAuthStateChange((_event, session) => {
      if (!session?.user?.id) {
        launch.remove();
        panel.remove();
        style.remove();
        mounted = false;
        busy = false;
        history.length = 0;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', mount, { once: true });
  window.addEventListener('portal-ready', mount);
  document.addEventListener('ie-view-rendered', mount);
})();
