/* Imposed Entertainment 1.4.50 — navigation and interaction quality layer. */
(function () {
  'use strict';
  if (window.__ieQualityLayer) return;
  window.__ieQualityLayer = true;
  var dialog = null, input = null, list = null, previousFocus = null, activeIndex = 0, items = [];

  function navItems() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll('.desktop-nav button.nav-link, .desktop-nav button.new-btn, .mobile-nav button, .nav button[data-action="dashboard"]'));
    var seen = new Set();
    return nodes.filter(function (node) {
      var label = (node.innerText || node.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
      var action = node.getAttribute('data-action') || (node.hasAttribute('data-pf') ? 'discover' : '');
      var key = action + '|' + label;
      if (!label || !action || seen.has(key) || node.disabled || node.hidden || node.offsetParent === null) return false;
      seen.add(key);
      return true;
    }).map(function (node) {
      return { label: (node.innerText || node.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim(), action: node.getAttribute('data-action') || 'discover', node: node };
    });
  }

  function ensureDialog() {
    if (dialog) return;
    dialog = document.createElement('section');
    dialog.className = 'ie-command-overlay';
    dialog.hidden = true;
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', 'Quick navigation');
    dialog.innerHTML = '<div class="ie-command-backdrop" data-ie-close></div><div class="ie-command-dialog"><div class="ie-command-heading"><span class="ie-command-mark" aria-hidden="true">⌘</span><div><strong>Quick navigation</strong><small>Jump to any workspace area</small></div><kbd>ESC</kbd></div><label class="ie-command-search"><span aria-hidden="true">⌕</span><input type="search" autocomplete="off" spellcheck="false" placeholder="Search pages and actions…" aria-label="Search pages and actions" aria-controls="ie-command-results"></label><div id="ie-command-results" class="ie-command-results" role="listbox" aria-label="Navigation results"></div><footer><span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span><span><kbd>↵</kbd> to open</span><span><kbd>Ctrl</kbd> <kbd>K</kbd> to open</span></footer></div>';
    document.body.appendChild(dialog);
    input = dialog.querySelector('input');
    list = dialog.querySelector('.ie-command-results');
    dialog.addEventListener('click', function (event) {
      if (event.target.closest('[data-ie-close]')) close();
      var option = event.target.closest('[data-ie-index]');
      if (option) choose(Number(option.dataset.ieIndex));
    });
    input.addEventListener('input', renderResults);
    input.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        activeIndex = (activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % Math.max(items.length, 1);
        paintActive();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        choose(activeIndex);
      }
    });
    dialog.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key === 'Tab') {
        var focusable = Array.prototype.slice.call(dialog.querySelectorAll('input,button,[tabindex="0"]')).filter(function (n) { return !n.disabled && n.offsetParent !== null; });
        if (!focusable.length) return;
        if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable[focusable.length - 1].focus(); }
        else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) { event.preventDefault(); focusable[0].focus(); }
      }
    });
  }

  function open() {
    ensureDialog();
    previousFocus = document.activeElement;
    dialog.hidden = false;
    document.body.classList.add('ie-command-open');
    input.value = '';
    activeIndex = 0;
    renderResults();
    requestAnimationFrame(function () { input.focus(); });
  }
  function close() {
    if (!dialog || dialog.hidden) return;
    dialog.hidden = true;
    document.body.classList.remove('ie-command-open');
    if (previousFocus && previousFocus.isConnected && previousFocus.focus) previousFocus.focus();
  }
  function renderResults() {
    var query = input.value.trim().toLowerCase();
    items = navItems().filter(function (item) { return !query || item.label.toLowerCase().includes(query) || item.action.toLowerCase().includes(query); }).slice(0, 12);
    activeIndex = Math.min(activeIndex, Math.max(items.length - 1, 0));
    list.replaceChildren();
    if (!items.length) {
      var empty = document.createElement('p');
      empty.className = 'ie-command-empty';
      empty.textContent = 'No matching pages. Try a shorter search.';
      list.appendChild(empty);
      return;
    }
    items.forEach(function (item, index) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'ie-command-option' + (index === activeIndex ? ' is-active' : '');
      button.dataset.ieIndex = String(index);
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', String(index === activeIndex));
      var label = document.createElement('span');
      label.textContent = item.label;
      var action = document.createElement('small');
      action.textContent = item.action === 'new' ? 'Create' : 'Open';
      button.append(label, action);
      list.appendChild(button);
    });
  }
  function paintActive() {
    list.querySelectorAll('[data-ie-index]').forEach(function (node, index) {
      node.classList.toggle('is-active', index === activeIndex);
      node.setAttribute('aria-selected', String(index === activeIndex));
    });
    var selected = list.querySelector('[data-ie-index="' + activeIndex + '"]');
    if (selected) selected.scrollIntoView({ block: 'nearest' });
  }
  function choose(index) {
    var item = items[index];
    if (!item) return;
    close();
    if (item.node && item.node.isConnected) { item.node.click(); return; }
    if (item.action === 'discover') { var discover = document.querySelector('[data-pf="discover"]'); if (discover) discover.click(); }
  }

  // Keep the command palette discoverable as a real in-product action as well as a shortcut.
  document.addEventListener('click', function (event) {
    var trigger = event.target && event.target.closest ? event.target.closest('[data-ie-quicknav-open]') : null;
    if (!trigger) return;
    event.preventDefault();
    open();
  });

  document.addEventListener('keydown', function (event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (dialog && !dialog.hidden) close(); else open();
      return;
    }
    if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      var target = event.target;
      if (target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable)) return;
      event.preventDefault();
      open();
    }
  });

  // Defer non-critical artwork decoding and give outbound links safe new-tab defaults.
  function improveMedia(root) {
    (root || document).querySelectorAll('img').forEach(function (img) {
      if (!img.hasAttribute('loading') && !img.closest('.brand,.auth-logo,.boot-brand')) img.loading = 'lazy';
      if (!img.hasAttribute('decoding')) img.decoding = 'async';
    });
    (root || document).querySelectorAll('a[target="_blank"]').forEach(function (anchor) {
      var rel = new Set((anchor.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
      rel.add('noopener'); rel.add('noreferrer');
      anchor.setAttribute('rel', Array.from(rel).join(' '));
    });
  }
  improveMedia(document);
  function syncMobileCurrent() {
    var active = document.querySelector('.desktop-nav .nav-link.active, .desktop-nav button[data-pf].active');
    if (!active) return;
    var action = active.getAttribute('data-action');
    var profileAction = active.getAttribute('data-pf');
    document.querySelectorAll('.mobile-nav button').forEach(function (button) {
      var current = action ? button.getAttribute('data-action') === action : !!profileAction && button.getAttribute('data-pf') === profileAction;
      button.classList.toggle('active', current);
      if (current) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }
  syncMobileCurrent();
  var observer = new MutationObserver(function (records) {
    records.forEach(function (record) {
      record.addedNodes.forEach(function (node) {
        if (node.nodeType === 1) {
          if (node.matches && node.matches('img,a[target="_blank"]')) improveMedia(node.parentNode || document);
          else if (node.querySelectorAll) improveMedia(node);
        }
      });
    });
    syncMobileCurrent();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // Tell users when a stale service worker has been replaced, without interrupting a form.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      var app = document.getElementById('app');
      if (app && app.getAttribute('aria-busy') === 'true') return;
      try { if (sessionStorage.getItem('ie-sw-updated-notice') === '1') return; sessionStorage.setItem('ie-sw-updated-notice', '1'); } catch (_) { /* Storage can be unavailable in private browsing. */ }
      var root = document.getElementById('toast-root');
      if (!root || root.querySelector('.ie-update-notice')) return;
      var notice = document.createElement('div');
      notice.className = 'toast info ie-update-notice';
      notice.setAttribute('role', 'status');
      var text = document.createElement('span');
      text.textContent = 'Portal updated. Refresh when convenient to load the latest improvements.';
      var button = document.createElement('button');
      button.type = 'button'; button.className = 'ie-update-refresh'; button.textContent = 'Refresh';
      button.addEventListener('click', function () { location.reload(); });
      notice.append(text, button); root.appendChild(notice);
    });
  }
  window.IEQuickNavigation = { open: open, close: close };
})();