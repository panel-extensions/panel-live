// <panel-live-controls> — Visible toolbar with Run All + auto-run toggle

import { setAutoRunOverride } from './config.js';
import { resolveTheme, _darkMQ } from './theme.js';

const STORAGE_KEY = 'panel-live:auto-run';

class PanelLiveControls extends HTMLElement {
  connectedCallback() {
    // Guard: after relocation (insertBefore), DOM already exists — just re-attach listeners
    if (this._initialized) {
      if (this._runAllBtn) this._runAllBtn.addEventListener('click', this._onRunAll);
      if (this._checkbox) this._checkbox.addEventListener('change', this._onToggle);
      if (this._themeListener) _darkMQ.addEventListener('change', this._themeListener);
      return;
    }
    this._initialized = true;

    const rt = resolveTheme('auto');
    this.setAttribute('data-resolved-theme', rt);

    // Read initial auto-run state from localStorage
    let autoRunChecked = false;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'true') autoRunChecked = true;
    } catch { /* localStorage may be unavailable */ }

    // Render toolbar
    const bar = document.createElement('div');
    bar.className = 'pl-controls-bar';

    const runAllBtn = document.createElement('button');
    runAllBtn.className = 'pl-controls-run-all pl-btn';
    runAllBtn.title = 'Run all examples on this page. This will download + 300 MB and may take several seconds.';
    runAllBtn.textContent = 'Run All';

    const label = document.createElement('label');
    label.className = 'pl-controls-toggle';
    label.title = 'Automatically run examples when the page loads. This will download + 300 MB on each page visit.';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'pl-controls-checkbox';
    checkbox.checked = autoRunChecked;

    const span = document.createElement('span');
    span.className = 'pl-controls-toggle-label';
    span.textContent = 'Auto-run';

    label.appendChild(checkbox);
    label.appendChild(span);
    bar.appendChild(runAllBtn);
    bar.appendChild(label);

    // Divider between execution controls and navigation links
    const div1 = document.createElement('span');
    div1.className = 'pl-controls-divider';
    bar.appendChild(div1);

    // Navigation links to standalone pages (resolve root from MkDocs logo href)
    const logoEl = document.querySelector('.md-header__button.md-logo');
    const rootHref = logoEl ? logoEl.getAttribute('href') || '.' : '.';
    const root = rootHref.replace(/\/$/, '');

    const playgroundLink = document.createElement('a');
    playgroundLink.className = 'pl-controls-link';
    playgroundLink.href = root + '/playground.html';
    playgroundLink.textContent = 'Playground';
    playgroundLink.title = 'Open the full-screen playground';
    bar.appendChild(playgroundLink);

    const explorerLink = document.createElement('a');
    explorerLink.className = 'pl-controls-link';
    explorerLink.href = root + '/api-explorer.html';
    explorerLink.textContent = 'API';
    explorerLink.title = 'Open the API explorer';
    bar.appendChild(explorerLink);

    // Trailing divider to separate from MkDocs Material header controls
    const div2 = document.createElement('span');
    div2.className = 'pl-controls-divider';
    bar.appendChild(div2);

    this.appendChild(bar);

    // Wire Run All button
    this._onRunAll = async () => {
      runAllBtn.disabled = true;
      runAllBtn.textContent = 'Running\u2026';
      try {
        await window.PanelLive.runAll();
      } finally {
        runAllBtn.disabled = false;
        runAllBtn.textContent = 'Run All';
      }
    };
    runAllBtn.addEventListener('click', this._onRunAll);

    // Wire auto-run toggle
    this._onToggle = async () => {
      const checked = checkbox.checked;
      try {
        if (checked) {
          localStorage.setItem(STORAGE_KEY, 'true');
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch { /* localStorage may be unavailable */ }
      // checked → force all auto-run; unchecked → revert to per-element defaults
      setAutoRunOverride(checked ? true : null);
      // If toggled ON, run all immediately (user just opted in)
      if (checked) {
        runAllBtn.disabled = true;
        runAllBtn.textContent = 'Running\u2026';
        try {
          await window.PanelLive.runAll();
        } finally {
          runAllBtn.disabled = false;
          runAllBtn.textContent = 'Run All';
        }
      }
    };
    checkbox.addEventListener('change', this._onToggle);

    // Listen for theme changes
    this._themeListener = (e) => {
      this.setAttribute('data-resolved-theme', e.matches ? 'dark' : 'light');
    };
    _darkMQ.addEventListener('change', this._themeListener);

    // Auto-hide on pages with no panel-live elements, and
    // relocate into site header if present
    requestAnimationFrame(() => {
      if (!document.querySelector('panel-live')) {
        this.style.display = 'none';
        return;
      }
      // MkDocs Material: insert before the palette toggle
      const headerNav = document.querySelector('nav.md-header__inner');
      const palette = headerNav && headerNav.querySelector('[data-md-component="palette"]');
      if (headerNav && palette) {
        this.setAttribute('data-location', 'header');
        headerNav.insertBefore(this, palette);
      }
    });

    // Store references for cleanup
    this._runAllBtn = runAllBtn;
    this._checkbox = checkbox;
  }

  disconnectedCallback() {
    if (this._runAllBtn) this._runAllBtn.removeEventListener('click', this._onRunAll);
    if (this._checkbox) this._checkbox.removeEventListener('change', this._onToggle);
    if (this._themeListener) _darkMQ.removeEventListener('change', this._themeListener);
  }
}

customElements.define('panel-live-controls', PanelLiveControls);
