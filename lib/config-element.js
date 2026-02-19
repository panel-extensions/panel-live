// <panel-live-config> — Invisible configuration element

import { _config, setAutoRunOverride } from './config.js';

const STORAGE_KEY = 'panel-live:auto-run';

class PanelLiveConfig extends HTMLElement {
  connectedCallback() {
    // Read auto-run preference from localStorage
    // Only override when explicitly 'true' — otherwise leave as null
    // so per-element auto-run attributes take effect (e.g. pre-render pages)
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'true') {
        setAutoRunOverride(true);
      }
    } catch { /* localStorage may be unavailable */ }

    // Read playground-url attribute
    const playgroundUrl = this.getAttribute('playground-url');
    if (playgroundUrl) {
      _config.playgroundUrl = playgroundUrl;
    }
  }
}

customElements.define('panel-live-config', PanelLiveConfig);
