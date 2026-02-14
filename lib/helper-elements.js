// <panel-file>, <panel-requirements>, <panel-example>

import { fetchPythonSource } from './utils.js';

class PanelFile extends HTMLElement {
  get name() { return this.getAttribute('name') || 'app.py'; }
  get entrypoint() { return this.hasAttribute('entrypoint'); }
  get src() { return this.getAttribute('src') || null; }
  get code() { return this.textContent; }

  /** Fetch content from src if set, otherwise return inline text */
  async resolveCode() {
    if (this.src) return await fetchPythonSource(this.src);
    return this.textContent;
  }
}

class PanelRequirements extends HTMLElement {
  get packages() { return this.textContent; }
}

class PanelExample extends HTMLElement {
  get label() { return this.getAttribute('name') || 'Example'; }
  get src() { return this.getAttribute('src') || null; }
  get code() { return this.textContent; }

  /** Fetch content from src if set, otherwise return inline text */
  async resolveCode() {
    if (this.src) return await fetchPythonSource(this.src);
    return this.textContent.trim();
  }
}

customElements.define('panel-file', PanelFile);
customElements.define('panel-requirements', PanelRequirements);
customElements.define('panel-example', PanelExample);
