// <panel-live-config> — Invisible configuration element

import { _config } from './config.js';

class PanelLiveConfig extends HTMLElement {
  connectedCallback() {
    // Read playground-url attribute
    const playgroundUrl = this.getAttribute('playground-url');
    if (playgroundUrl) {
      _config.playgroundUrl = playgroundUrl;
    }
  }
}

customElements.define('panel-live-config', PanelLiveConfig);
