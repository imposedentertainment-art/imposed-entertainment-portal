/* Prism — personalisation engine for Jitter UI.
 * Owns preference validation, local persistence and cross-tab change events.
 * Supabase remains the authority for account sync, OAuth, storage and email services.
 */
(function installPrism(global) {
  'use strict';
  if (global.Prism && global.Prism.version) return;

  const VERSION = '1.0.0';
  const STORAGE_KEY = 'ie-workspace-personalisation-v2';
  const LEGACY_KEY = 'ie-workspace-personalisation-v1';
  const defaults = Object.freeze({
    accent: '#d8bd73', theme: 'dark', palette: 'midnight-studio', density: 'standard',
    fontScale: 1, lineHeight: 1.5, contentWidth: 'standard', font: 'modern',
    radius: 'rounded', surface: 'default', navStyle: 'solid', buttonStyle: 'soft',
    cardStyle: 'elevated', artworkShape: 'rounded', motion: 'standard',
    glow: false, contrast: false, shadows: true, decorative: true
  });
  const enums = {
    theme: ['dark', 'light', 'system', 'amoled'],
    palette: ['light-skies', 'midnight-studio', 'graphite-minimal', 'plum-dusk', 'forest-room'],
    density: ['compact', 'standard', 'comfortable'],
    contentWidth: ['standard', 'wide', 'full'],
    font: ['modern', 'display', 'serif', 'mono'],
    radius: ['sharp', 'rounded'],
    surface: ['default', 'flat', 'glass'],
    navStyle: ['solid', 'floating', 'minimal'],
    buttonStyle: ['soft', 'solid', 'outline', 'pill'],
    cardStyle: ['elevated', 'outlined', 'minimal'],
    artworkShape: ['rounded', 'square', 'circle'],
    motion: ['system', 'standard', 'reduced', 'none']
  };
  let memoryState = { ...defaults };
  let persistence = 'local';
  const listeners = new Set();

  function normalise(input) {
    const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
    const out = { ...defaults };
    Object.keys(defaults).forEach(key => {
      if (!Object.prototype.hasOwnProperty.call(source, key)) return;
      const value = source[key];
      if (enums[key]) {
        if (enums[key].includes(value)) out[key] = value;
      } else if (key === 'accent') {
        if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) out.accent = value;
      } else if (key === 'fontScale') {
        const n = Number(value);
        if (Number.isFinite(n)) out.fontScale = Math.max(0.85, Math.min(1.3, n));
      } else if (key === 'lineHeight') {
        const n = Number(value);
        if (Number.isFinite(n)) out.lineHeight = Math.max(1.25, Math.min(1.9, n));
      } else if (['glow', 'contrast', 'shadows', 'decorative'].includes(key)) {
        if (typeof value === 'boolean') out[key] = value;
      }
    });
    return out;
  }

  function safeRead() {
    try {
      const currentRaw = global.localStorage.getItem(STORAGE_KEY);
      const legacyRaw = global.localStorage.getItem(LEGACY_KEY);
      const raw = currentRaw || legacyRaw;
      if (!raw) return { ...defaults };
      const parsed = JSON.parse(raw);
      const next = normalise(parsed);
      /* Heal malformed, stale, or out-of-range preferences once instead of
         re-reading the same invalid values on every reload. */
      const canonical = JSON.stringify(next);
      if (currentRaw !== canonical || legacyRaw !== canonical) {
        try {
          global.localStorage.setItem(STORAGE_KEY, canonical);
          global.localStorage.setItem(LEGACY_KEY, canonical);
          persistence = 'local';
        } catch (_) {
          persistence = 'memory';
        }
      }
      return next;
    } catch (_) {
      persistence = 'memory';
      return { ...memoryState };
    }
  }

  function publish(reason, state) {
    const detail = Object.freeze({ engine: 'prism', reason, state: { ...state }, persistence });
    listeners.forEach(callback => { try { callback(detail); } catch (error) {
      if (global.NullCore) global.NullCore.reportError(error, 'prism-listener');
    } });
    try { global.dispatchEvent(new global.CustomEvent('prism:change', { detail })); } catch (_) {}
    if (global.NullCore) global.NullCore.emit('prism:change', detail);
  }

  const api = {
    version: VERSION,
    defaults,
    get persistence() { return persistence; },
    read() {
      memoryState = safeRead();
      return { ...memoryState };
    },
    validate(value) { return normalise(value); },
    write(value, options) {
      const next = normalise(value);
      memoryState = next;
      try {
        global.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        global.localStorage.setItem(LEGACY_KEY, JSON.stringify(next));
        persistence = 'local';
      } catch (_) {
        persistence = 'memory';
      }
      if (!(options && options.silent)) publish('write', next);
      return { state: { ...next }, persistence };
    },
    reset() {
      memoryState = { ...defaults };
      try {
        global.localStorage.removeItem(STORAGE_KEY);
        global.localStorage.removeItem(LEGACY_KEY);
        persistence = 'local';
      } catch (_) { persistence = 'memory'; }
      publish('reset', memoryState);
      return { ...memoryState };
    },
    subscribe(callback) {
      if (typeof callback !== 'function') return () => {};
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    health() {
      return Object.freeze({ engine: 'prism', version: VERSION, persistence, preferenceCount: Object.keys(defaults).length });
    }
  };

  Object.defineProperty(global, 'Prism', { configurable: false, enumerable: false, writable: false, value: Object.freeze(api) });
  global.addEventListener('storage', event => {
    if (event.key !== STORAGE_KEY && event.key !== LEGACY_KEY) return;
    memoryState = safeRead();
    publish('external-change', memoryState);
  });
  if (global.CloudOS && typeof global.CloudOS.registerService === 'function') {
    global.CloudOS.registerService('prism-preferences', {
      version: VERSION,
      start() { memoryState = safeRead(); return api.health(); },
      stop() {}
    });
  }
  if (global.NullCore) global.NullCore.registerEngine('prism', {
    version: VERSION,
    capabilities: ['preference-validation', 'local-persistence', 'cross-tab-sync', 'appearance-state']
  });
})(window);
