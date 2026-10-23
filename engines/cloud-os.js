/* Cloud OS — application environment engine.
 * Depends on Null Core. Coordinates environment services without owning UI rendering.
 */
(function installCloudOS(global) {
  'use strict';

  if (global.CloudOS && global.CloudOS.version) return;
  const core = global.NullCore;
  if (!core) {
    global.dispatchEvent(new CustomEvent('cloudos:error', { detail: { code: 'null-core-missing' } }));
    return;
  }

  const VERSION = '1.0.0';
  const services = new Map();
  let status = 'created';
  let startPromise = null;

  function normalise(name) {
    return String(name || '').trim().toLowerCase().replace(/[^a-z0-9.-]/g, '');
  }

  const api = {
    version: VERSION,
    get status() { return status; },

    registerService(name, service) {
      const key = normalise(name);
      if (!key || !service || typeof service !== 'object' || services.has(key)) {
        core.reportError('Invalid or duplicate Cloud OS service: ' + key, 'cloudos-service-registration');
        return false;
      }
      services.set(key, Object.freeze({
        name: key,
        version: String(service.version || 'unspecified'),
        start: typeof service.start === 'function' ? service.start : null,
        stop: typeof service.stop === 'function' ? service.stop : null,
        state: 'registered'
      }));
      core.emit('cloudos:service-registered', { name: key });
      return true;
    },

    getServices() {
      return [...services.values()].map(service => ({ name: service.name, version: service.version, state: service.state }));
    },

    async start() {
      if (startPromise) return startPromise;
      startPromise = (async () => {
        status = 'starting';
        core.emit('cloudos:starting', { version: VERSION });
        try {
          for (const [name, service] of services) {
            if (!service.start) continue;
            try {
              await service.start({ core, config: core.readConfig(global.IMPOSED_CONFIG || {}) });
              services.set(name, Object.freeze({ ...service, state: 'ready' }));
              core.emit('cloudos:service-ready', { name });
            } catch (error) {
              services.set(name, Object.freeze({ ...service, state: 'failed' }));
              core.reportError(error, 'cloudos-service-' + name);
              // Optional service failures are isolated; they do not prevent OS startup.
            }
          }
          status = 'ready';
          core.registerEngine('cloud-os', { version: VERSION, capabilities: ['service-registry', 'service-lifecycle', 'environment-status'] });
          core.emit('cloudos:ready', this.health());
          return this.health();
        } catch (error) {
          status = 'failed';
          core.reportError(error, 'cloudos-startup');
          throw error;
        }
      })();
      return startPromise;
    },

    async stop() {
      for (const [name, service] of [...services.entries()].reverse()) {
        if (service.state !== 'ready' || !service.stop) continue;
        try {
          await service.stop();
          services.set(name, Object.freeze({ ...service, state: 'stopped' }));
        } catch (error) {
          core.reportError(error, 'cloudos-stop-' + name);
        }
      }
      status = 'stopped';
      core.emit('cloudos:stopped', this.health());
      startPromise = null;
      return this.health();
    },

    health() {
      const list = this.getServices();
      return Object.freeze({
        engine: 'cloud-os',
        version: VERSION,
        status,
        serviceCount: list.length,
        readyServices: list.filter(service => service.state === 'ready').length,
        failedServices: list.filter(service => service.state === 'failed').length
      });
    }
  };

  Object.defineProperty(global, 'CloudOS', { configurable: false, enumerable: false, writable: false, value: Object.freeze(api) });
  core.on('core-ready', () => { api.start().catch(error => core.reportError(error, 'cloudos-start')); });
  if (core.lifecycle === 'ready') api.start().catch(error => core.reportError(error, 'cloudos-start'));
})(window);
