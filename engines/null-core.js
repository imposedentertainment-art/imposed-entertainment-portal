/* Null Core — Jitter UI foundation engine.
 * Responsibilities: lifecycle, configuration, event bus, diagnostics and engine contracts.
 * This engine deliberately does not own product/business logic or DOM rendering.
 */
(function installNullCore(global) {
  'use strict';

  if (global.NullCore && global.NullCore.version) return;

  const VERSION = '1.0.0';
  const startedAt = Date.now();
  const listeners = new Map();
  const engines = new Map();
  const diagnostics = [];
  const MAX_DIAGNOSTICS = 100;
  let lifecycle = 'created';
  let config = Object.freeze({});
  let bootPromise = null;

  function safeName(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9.-]/g, '');
  }

  function record(level, code, detail) {
    const entry = Object.freeze({
      at: new Date().toISOString(),
      level: ['info', 'warn', 'error'].includes(level) ? level : 'info',
      code: safeName(code) || 'general',
      detail: String(detail || '').slice(0, 500)
    });
    diagnostics.push(entry);
    if (diagnostics.length > MAX_DIAGNOSTICS) diagnostics.shift();
    if (entry.level === 'error' && global.console && typeof global.console.error === 'function') {
      global.console.error('[Null Core]', entry.code, entry.detail);
    } else if (entry.level === 'warn' && global.console && typeof global.console.warn === 'function') {
      global.console.warn('[Null Core]', entry.code, entry.detail);
    }
    return entry;
  }

  function emit(name, detail) {
    const key = safeName(name);
    if (!key) return;
    const event = Object.freeze({ name: key, detail, at: Date.now() });
    const callbacks = listeners.get(key);
    if (callbacks) {
      for (const callback of [...callbacks]) {
        try { callback(event); } catch (error) {
          record('error', 'event-listener', error && error.message);
        }
      }
    }
    try {
      if (typeof global.CustomEvent === 'function') {
        global.dispatchEvent(new global.CustomEvent('nullcore:' + key, { detail: event }));
      }
    } catch (error) {
      record('warn', 'native-event', error && error.message);
    }
  }

  const api = {
    version: VERSION,
    get lifecycle() { return lifecycle; },
    get uptimeMs() { return Math.max(0, Date.now() - startedAt); },

    configure(value) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        record('warn', 'invalid-config', 'Configuration must be a plain object.');
        return config;
      }
      config = Object.freeze({ ...value });
      emit('config-ready', { keys: Object.keys(config) });
      return config;
    },

    readConfig(fallback) {
      if (Object.keys(config).length) return config;
      return this.configure(fallback && typeof fallback === 'object' ? fallback : {});
    },

    on(name, callback) {
      const key = safeName(name);
      if (!key || typeof callback !== 'function') return () => {};
      if (!listeners.has(key)) listeners.set(key, new Set());
      listeners.get(key).add(callback);
      return () => {
        const callbacks = listeners.get(key);
        if (callbacks) {
          callbacks.delete(callback);
          if (!callbacks.size) listeners.delete(key);
        }
      };
    },

    emit,

    registerEngine(name, engine) {
      const key = safeName(name);
      if (!key || !engine || typeof engine !== 'object') {
        record('warn', 'engine-registration-invalid', 'Engine needs a valid name and object.');
        return false;
      }
      if (engines.has(key)) {
        record('warn', 'engine-duplicate', 'Duplicate engine registration: ' + key);
        return false;
      }
      engines.set(key, Object.freeze({
        name: key,
        version: String(engine.version || 'unspecified'),
        status: 'registered',
        capabilities: Object.freeze(Array.isArray(engine.capabilities) ? [...engine.capabilities] : [])
      }));
      emit('engine-registered', { name: key });
      return true;
    },

    getEngines() {
      return [...engines.values()].map(engine => ({ ...engine, capabilities: [...engine.capabilities] }));
    },

    reportError(error, context) {
      const message = error instanceof Error ? error.message : String(error || 'Unknown error');
      return record('error', context || 'runtime', message);
    },

    getDiagnostics() {
      return diagnostics.map(entry => ({ ...entry }));
    },

    health() {
      return Object.freeze({
        engine: 'null-core',
        version: VERSION,
        lifecycle,
        uptimeMs: this.uptimeMs,
        registeredEngines: engines.size,
        diagnosticCount: diagnostics.length
      });
    },

    start() {
      if (bootPromise) return bootPromise;
      lifecycle = 'starting';
      record('info', 'startup', 'Null Core startup initiated.');
      bootPromise = Promise.resolve().then(() => {
        lifecycle = 'ready';
        emit('core-ready', this.health());
        record('info', 'ready', 'Null Core is ready.');
        return this.health();
      }).catch(error => {
        lifecycle = 'failed';
        record('error', 'startup-failed', error && error.message);
        throw error;
      });
      return bootPromise;
    }
  };

  Object.defineProperty(global, 'NullCore', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: Object.freeze(api)
  });

  global.addEventListener('error', event => {
    if (event && event.error) api.reportError(event.error, 'window-error');
  });
  global.addEventListener('unhandledrejection', event => {
    if (event && event.reason) api.reportError(event.reason, 'unhandled-rejection');
  });

  api.registerEngine('null-core', {
    version: VERSION,
    capabilities: ['lifecycle', 'configuration', 'events', 'diagnostics', 'engine-registry']
  });
  api.start();
})(window);
