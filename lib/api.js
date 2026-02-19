// Public API: window.PanelLive

import { _config } from './config.js';
import { getWorkerBridge } from './worker-bridge.js';
import { PanelLiveController } from './controller.js';
import { getRegisteredElements } from './registry.js';

window.PanelLive = {
  /**
   * Set global configuration defaults. Must be called before first
   * init()/mount() or <panel-live> connectedCallback.
   */
  configure(overrides) {
    Object.assign(_config, overrides);
  },

  /**
   * Pre-warm Pyodide singleton. Idempotent (returns same promise on repeat calls).
   * @param {Object} [options]
   * @param {Function} [options.onStatus] - Status callback
   * @returns {Promise<void>}
   */
  async init(options) {
    const onStatus = (options && options.onStatus) || (msg => console.log('[PanelLive]', msg));
    await getWorkerBridge().init(onStatus);
  },

  /**
   * Programmatic creation. Returns a controller for runtime interaction.
   * @param {Object} options
   * @param {string|HTMLElement} target - CSS selector or DOM element
   * @returns {Promise<PanelLiveController>}
   */
  async mount(options, target) {
    const el = document.createElement('panel-live');
    if (options.mode) el.setAttribute('mode', options.mode);
    if (options.theme) el.setAttribute('theme', options.theme);
    if (options.layout) el.setAttribute('layout', options.layout);
    if (options.height) el.setAttribute('height', options.height);
    if (options.label) el.setAttribute('label', options.label);
    if (options.codeVisibility) el.setAttribute('code-visibility', options.codeVisibility);
    if (options.fullscreen) el.setAttribute('fullscreen', '');
    if (options.autoRun === false) el.setAttribute('auto-run', 'false');

    if (options.files) {
      for (const [name, content] of Object.entries(options.files)) {
        const fileEl = document.createElement('panel-file');
        fileEl.setAttribute('name', name);
        if (name === (options.entrypoint || Object.keys(options.files)[0])) {
          fileEl.setAttribute('entrypoint', '');
        }
        fileEl.textContent = content;
        el.appendChild(fileEl);
      }
    } else if (options.code) {
      el.textContent = options.code;
    }

    if (options.requirements) {
      const reqEl = document.createElement('panel-requirements');
      reqEl.textContent = Array.isArray(options.requirements)
        ? options.requirements.join('\n')
        : options.requirements;
      el.appendChild(reqEl);
    }

    if (options.examples) {
      for (const ex of options.examples) {
        const exEl = document.createElement('panel-example');
        exEl.setAttribute('name', ex.name || 'Example');
        if (ex.src) {
          exEl.setAttribute('src', ex.src);
        } else if (ex.code) {
          exEl.textContent = ex.code;
        }
        el.appendChild(exEl);
      }
    }

    // Resolve target
    if (typeof target === 'string') {
      target = document.querySelector(target);
    }
    if (!target) throw new Error('PanelLive.mount(): target not found');
    target.appendChild(el);

    return new PanelLiveController(el);
  },

  /**
   * Run (or re-run) all registered <panel-live> elements serially in document order.
   * Errors don't stop the sequence.
   * @returns {Promise<{total: number, errors: number}>}
   */
  async runAll() {
    const elements = getRegisteredElements();
    document.dispatchEvent(new CustomEvent('pl-run-all-start', {
      detail: { count: elements.length },
      bubbles: true,
    }));
    let errors = 0;
    for (const el of elements) {
      try {
        await el.run();
      } catch (e) {
        errors++;
        console.error('[PanelLive.runAll] Element error:', e);
      }
    }
    document.dispatchEvent(new CustomEvent('pl-run-all-end', {
      detail: { total: elements.length, errors },
      bubbles: true,
    }));
    return { total: elements.length, errors };
  },
};
