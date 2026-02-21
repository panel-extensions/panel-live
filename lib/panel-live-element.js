// <panel-live> — Main Custom Element

import { resolveTheme, onThemeChange } from './theme.js';
import { uid, fetchPythonSource, loadScript, loadCSS } from './utils.js';
import { _config, _autoRunOverride, cdnUrls } from './config.js';
import { encodeCode, getCodeFromHash, setCodeInHash } from './url-sharing.js';
import { createEditor, setEditorTheme, getEditorCode, setEditorCode } from './codemirror.js';
import { renderError } from './error-renderer.js';
import { getWorkerBridge } from './worker-bridge.js';
import { registerElement, unregisterElement } from './registry.js';

// Shared promise: loads Bokeh + Panel JS once for all pre-rendered elements
let _prerenderJsReady = null;
function _ensurePrerenderJs() {
  if (!_prerenderJsReady) {
    _prerenderJsReady = (async () => {
      const urls = cdnUrls();
      for (const url of urls.bokehJs) await loadScript(url);
      await loadScript(urls.panelJs);
    })();
  }
  return _prerenderJsReady;
}

class PanelLive extends HTMLElement {

  static get observedAttributes() {
    return ['mode', 'theme', 'layout', 'src', 'height', 'auto-run', 'label', 'code-visibility', 'code-position', 'preview'];
  }

  constructor() {
    super();
    // NOTE: We intentionally do NOT use Shadow DOM because Bokeh's
    // embed_items() and document.getElementById() search the main DOM tree.
    // Shadow DOM would hide the output containers from Bokeh's renderer.
    this._rendered = false;
    this._running = false;
    this._status = 'idle';
    this._view = null; // CM6 EditorView
    this._outputEl = null;
    this._statusEl = null;
    this._resolvedTheme = null;
    this._unsubTheme = null;
    this._bridgeRegistered = false;
    this._prerenderData = null;
  }

  connectedCallback() {
    registerElement(this);
    if (!this._rendered) {
      console.log('[panel-live] <panel-live> connected, mode=%s theme=%s', this.mode, this.theme);
      // Resolve theme immediately and set data attribute for CSS
      this._setupTheme();
      // Defer render: connectedCallback fires when the opening tag is parsed,
      // BEFORE the browser has parsed children. We need children to
      // exist so _extractCode() can read the text content.
      requestAnimationFrame(async () => {
        await this._extractCode();
        // Eagerly fetch src code so the editor shows it before the user runs
        if (this._srcUrl && !this._code.trim()) {
          try {
            this._code = await fetchPythonSource(this._srcUrl);
          } catch (e) {
            console.warn('[panel-live] Failed to fetch src:', this._srcUrl, e);
          }
        }
        this._hideSourceNodes();
        this._render();
        this._rendered = true;
      });
    }
  }

  disconnectedCallback() {
    unregisterElement(this);
    // Unsubscribe from centralized theme observer
    if (this._unsubTheme) {
      this._unsubTheme();
      this._unsubTheme = null;
    }
    // Destroy CM6 editor
    if (this._view) {
      this._view.destroy();
      this._view = null;
    }
    // Clean up worker bridge state for this element
    if (this._outputEl && this._outputEl.id) {
      try {
        const bridge = getWorkerBridge();
        bridge.cleanupElement(this._outputEl.id);
      } catch { /* bridge may not exist yet */ }
    }
    this._bridgeRegistered = false;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal || !this._rendered) return;
    if (name === 'theme') {
      this._setupTheme();
    }
    this._render();
  }

  // --- Properties (matching API spec attributes) ---

  get mode() { return this.getAttribute('mode') || 'app'; }
  set mode(v) { this.setAttribute('mode', v); }

  get theme() { return this.getAttribute('theme') || 'auto'; }
  set theme(v) { this.setAttribute('theme', v); }

  get layout() {
    const v = this.getAttribute('layout');
    if (v) return v;
    return this.mode === 'editor' ? 'vertical' : 'auto';
  }
  set layout(v) { this.setAttribute('layout', v); }

  get label() { return this.getAttribute('label') || 'Python'; }
  set label(v) { this.setAttribute('label', v); }

  get codeVisibility() { return this.getAttribute('code-visibility') || 'visible'; }
  set codeVisibility(v) { this.setAttribute('code-visibility', v); }

  get codePosition() { return this.getAttribute('code-position') || 'first'; }
  set codePosition(v) { this.setAttribute('code-position', v); }

  get preview() { return this.getAttribute('preview') || ''; }
  set preview(v) { this.setAttribute('preview', v); }

  get autoRun() {
    if (_autoRunOverride !== null) return _autoRunOverride;
    return !this.hasAttribute('auto-run') || this.getAttribute('auto-run') !== 'false';
  }
  set autoRun(v) { this.setAttribute('auto-run', v ? 'true' : 'false'); }

  get status() { return this._status; }

  // --- Theme resolution ---

  _setupTheme() {
    // Unsubscribe previous listener
    if (this._unsubTheme) {
      this._unsubTheme();
      this._unsubTheme = null;
    }
    this._resolvedTheme = resolveTheme(this.theme);
    this.setAttribute('data-resolved-theme', this._resolvedTheme);

    // If auto, subscribe to centralized theme change observer
    if (this.theme === 'auto') {
      this._unsubTheme = onThemeChange((resolved) => {
        this._resolvedTheme = resolved;
        this.setAttribute('data-resolved-theme', this._resolvedTheme);
        if (this._view) {
          setEditorTheme(this._view, this._resolvedTheme === 'dark');
        }
      });
    }
  }

  // --- Event helpers ---

  _emit(name, detail) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  _setStatus(status, message) {
    this._status = status;
    this._emit('pl-status', { status, message });
  }

  _showPreviewBadge(statusEl, outputEl) {
    statusEl.textContent = 'Run';
    statusEl.title = 'Click to make interactive (downloads ~300 MB)';
    statusEl.classList.add('pl-preview-badge');
    statusEl.querySelector('.pl-spinner')?.remove();
    statusEl.addEventListener('click', () => {
      this._runFromEditor(outputEl, statusEl);
    }, { once: true });
  }

  _showPreviewImage(statusEl, outputEl) {
    const img = document.createElement('img');
    img.src = this.preview;
    img.alt = 'Preview — click Run to make interactive';
    img.className = 'pl-preview-image';
    img.style.cursor = 'pointer';
    outputEl.appendChild(img);

    statusEl.textContent = 'Run';
    statusEl.title = 'Click to make interactive (downloads ~300 MB)';
    statusEl.classList.add('pl-preview-badge');
    statusEl.querySelector('.pl-spinner')?.remove();
    statusEl.addEventListener('click', () => {
      this._runFromEditor(outputEl, statusEl);
    }, { once: true });

    img.addEventListener('click', () => {
      this._runFromEditor(outputEl, statusEl);
    }, { once: true });
  }

  _showRunPlaceholder(statusEl, outputEl) {
    const placeholder = document.createElement('div');
    placeholder.className = 'pl-run-placeholder';
    placeholder.textContent = 'Click Run to execute this example';
    placeholder.style.cursor = 'pointer';
    placeholder.addEventListener('click', () => {
      this._runFromEditor(outputEl, statusEl);
    }, { once: true });
    outputEl.appendChild(placeholder);

    statusEl.classList.add('hidden');
  }

  // --- Hide source text nodes (after extraction) ---

  _hideSourceNodes() {
    // Clear raw text nodes so they don't render visibly in Light DOM.
    // Child custom elements (<panel-example> etc.) are hidden via CSS.
    for (const node of Array.from(this.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent = '';
      }
    }
  }

  // --- Code extraction ---

  async _extractCode() {
    // Check for <panel-file> children
    const files = this.querySelectorAll('panel-file');
    if (files.length > 0) {
      this._files = {};
      let entrypoint = null;
      for (const f of files) {
        this._files[f.name] = await f.resolveCode();
        if (f.entrypoint || !entrypoint) entrypoint = f.name;
      }
      this._entrypoint = entrypoint;
      this._code = this._files[this._entrypoint];
    } else {
      // Direct text content (ignoring child elements)
      let code = '';
      for (const node of this.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          code += node.textContent;
        }
      }
      this._code = code.trim();
      this._files = null;
    }

    // Check for <panel-example> children
    const examples = this.querySelectorAll('panel-example');
    if (examples.length > 0) {
      this._examples = [];
      for (const ex of examples) {
        this._examples.push({ label: ex.label, code: await ex.resolveCode() });
      }
      // If no direct text content, use first example as default
      if (!this._code) {
        this._code = this._examples[0].code;
      }
    } else {
      this._examples = null;
    }

    // Check for examples-src attribute (JSON URL)
    const examplesSrc = this.getAttribute('examples-src');
    if (examplesSrc && !this._examples) {
      try {
        const resp = await fetch(examplesSrc);
        if (resp.ok) {
          const data = await resp.json();
          this._examples = Array.isArray(data) ? data : [];
          if (!this._code && this._examples.length > 0) {
            this._code = this._examples[0].code || '';
          }
        }
      } catch (e) {
        console.warn('[panel-live] Failed to load examples from', examplesSrc, e);
      }
    }

    // Check for <panel-requirements> child element or data-requirements attribute
    const reqEl = this.querySelector('panel-requirements');
    this._requirements = reqEl ? reqEl.packages
      : (this.getAttribute('data-requirements') || null);

    // Check for src attribute
    if (this.hasAttribute('src')) {
      this._srcUrl = this.getAttribute('src');
    }

    // Check for pre-rendered output (from Sphinx build-time execution)
    const prerenderScript = this.querySelector('script.panel-live-prerender');
    if (prerenderScript) {
      try {
        this._prerenderData = JSON.parse(prerenderScript.textContent);
      } catch (e) {
        console.warn('[panel-live] Failed to parse pre-render data:', e);
      }
    }

    // Check URL hash for shared code (overrides inline code in playground mode)
    const hashCode = getCodeFromHash();
    if (hashCode && this.mode === 'playground') {
      this._code = hashCode;
    }

    console.log('[panel-live] Code extracted (%d chars), files=%s, src=%s',
      (this._code || '').length,
      this._files ? Object.keys(this._files).join(', ') : 'none',
      this._srcUrl || 'none');
  }


  // --- Rendering ---

  _render() {
    const mode = this.mode;
    const layout = this.layout;
    const rt = this._resolvedTheme || resolveTheme(this.theme);

    // Destroy previous CM6 editor if any
    if (this._view) {
      this._view.destroy();
      this._view = null;
    }

    // Clear previous render (light DOM children that we added)
    // Preserve original source children by checking for our container
    const container = this.querySelector('.pl-container');
    if (container) container.remove();

    if (mode === 'app') {
      this._renderAppMode(rt);
    } else if (mode === 'editor') {
      this._renderEditorMode(rt, layout);
    } else if (mode === 'playground') {
      this._renderPlaygroundMode(rt, layout);
    }
  }

  _renderAppMode(rt) {
    const container = document.createElement('div');
    container.className = 'pl-container';
    const h = this.getAttribute('height');
    if (h) container.style.height = h;

    container.innerHTML = `
      <div class="pl-output-wrapper">
        <div class="pl-status"><span class="pl-spinner"></span> Initializing...</div>
        <div class="pl-output" id="${uid()}"></div>
      </div>
    `;
    this.appendChild(container);

    const statusEl = container.querySelector('.pl-status');
    const outputEl = container.querySelector('.pl-output');
    this._outputEl = outputEl;
    this._statusEl = statusEl;

    if (this._prerenderData) {
      this._embedPreRendered(outputEl, statusEl);
    }
    if (this.autoRun) {
      this._initAndRun(outputEl, this._code, msg => { statusEl.textContent = msg; }, statusEl);
    } else if (this._prerenderData) {
      this._showPreviewBadge(statusEl, outputEl);
    } else if (this.preview) {
      this._showPreviewImage(statusEl, outputEl);
    } else {
      this._showRunPlaceholder(statusEl, outputEl);
    }
  }

  _renderEditorMode(rt, layout) {
    if (layout === 'horizontal' || layout === 'auto') {
      return this._renderEditorHorizontal(rt, layout);
    }
    const outputId = uid();
    const pillLabel = this.label;
    const codeVis = this.codeVisibility;
    const container = document.createElement('div');
    container.className = 'pl-container pl-editor-stacked' + (this.codePosition === 'last' ? ' code-last' : '');
    const h = this.getAttribute('height');
    if (h) container.style.height = h;

    // Build code section (header + editor div)
    let codeHtml = `
      <div class="pl-editor-header">
        <span class="pl-lang">${this._escapeHtml(pillLabel)}</span>
        <span class="pl-title"></span>
        <span class="pl-shortcut">Ctrl+Enter to run</span>
        <a class="pl-btn secondary pl-help-link" href="https://panel-extensions.github.io/panel-live/" target="_blank" rel="noopener" title="panel-live docs">?</a>
        <button class="pl-btn secondary copy-btn" title="Copy code">Copy<span class="pl-toast">Copied!</span></button>
        <button class="pl-btn run-btn" title="Run code (Ctrl+Enter)">Run</button>
      </div>
      <div class="pl-editor-area"></div>
    `;

    if (codeVis === 'hidden') {
      // No editor, no toggle — output only
      container.innerHTML = `
        <div class="pl-output-wrapper">
          <div class="pl-status"><span class="pl-spinner"></span> Initializing...</div>
          <div class="pl-output" id="${outputId}"></div>
        </div>
      `;
    } else if (codeVis === 'collapsed') {
      container.innerHTML = `
        <div class="pl-code-section pl-collapsed">
          ${codeHtml}
        </div>
        <div class="pl-code-toggle">
          <button title="Toggle code visibility">Expand Code</button>
          <span class="pl-toggle-spacer"></span>
          <button class="pl-btn secondary copy-btn pl-toggle-btn" title="Copy code">Copy<span class="pl-toast">Copied!</span></button>
          <a class="pl-btn secondary pl-toggle-btn pl-playground-link" title="Open in Playground" target="_blank" rel="noopener">Playground &#x2197;</a>
        </div>
        <div class="pl-output-wrapper">
          <div class="pl-status"><span class="pl-spinner"></span> Initializing...</div>
          <div class="pl-output" id="${outputId}"></div>
        </div>
      `;
    } else {
      container.innerHTML = `
        ${codeHtml}
        <div class="pl-output-wrapper">
          <div class="pl-status"><span class="pl-spinner"></span> Initializing...</div>
          <div class="pl-output" id="${outputId}"></div>
        </div>
      `;
    }

    this.appendChild(container);

    const editorArea = container.querySelector('.pl-editor-area');
    const runBtn = container.querySelector('.run-btn');
    const statusEl = container.querySelector('.pl-status');
    const outputEl = container.querySelector('.pl-output');
    this._outputEl = outputEl;
    this._statusEl = statusEl;

    // Wire code toggle
    const toggleBtn = container.querySelector('.pl-code-toggle button');
    if (toggleBtn) {
      const codeSection = container.querySelector('.pl-code-section');
      toggleBtn.addEventListener('click', () => {
        const isCollapsed = codeSection.classList.contains('pl-collapsed');
        if (isCollapsed) {
          codeSection.classList.remove('pl-collapsed');
          codeSection.classList.add('pl-expanded');
          toggleBtn.textContent = 'Collapse Code';
          if (this._view) this._view.requestMeasure();
        } else {
          codeSection.classList.remove('pl-expanded');
          codeSection.classList.add('pl-collapsed');
          toggleBtn.textContent = 'Expand Code';
        }
      });
    }

    // Create CM6 editor (skip for hidden — no visible editor)
    if (codeVis !== 'hidden' && editorArea) {
      this._view = createEditor(editorArea, this._code, rt, () => {
        this._runFromEditor(outputEl, statusEl);
      });
    }

    if (runBtn) {
      runBtn.addEventListener('click', () => {
        this._runFromEditor(outputEl, statusEl);
      });
    }

    for (const cb of container.querySelectorAll('.copy-btn')) {
      cb.addEventListener('click', () => {
        const code = this._view ? getEditorCode(this._view) : this._code;
        navigator.clipboard.writeText(code).then(() => {
          const toast = cb.querySelector('.pl-toast');
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 1500);
        });
      });
    }

    // Wire playground link in toggle bar
    const playgroundLink = container.querySelector('.pl-playground-link');
    if (playgroundLink) {
      this._updatePlaygroundLink(playgroundLink);
    }

    // Pre-render and/or auto-run
    if (this._prerenderData) {
      this._embedPreRendered(outputEl, statusEl);
    }
    if (this.autoRun) {
      this._initAndRun(outputEl, this._code, msg => { statusEl.textContent = msg; }, statusEl);
    } else if (this._prerenderData) {
      this._showPreviewBadge(statusEl, outputEl);
    } else if (this.preview) {
      this._showPreviewImage(statusEl, outputEl);
    } else {
      this._showRunPlaceholder(statusEl, outputEl);
    }
  }

  _renderEditorHorizontal(rt, layout) {
    const outputId = uid();
    const pillLabel = this.label;
    const codeVis = this.codeVisibility;
    const codePosClass = this.codePosition === 'last' ? ' code-last' : '';
    this.setAttribute('data-layout', layout);
    const container = document.createElement('div');
    container.className = 'pl-container pl-resizable';
    const h = this.getAttribute('height');
    if (h) { container.style.height = h; container.style.minHeight = h; }

    if (codeVis === 'hidden') {
      // No editor, just output
      container.innerHTML = `
        <div class="pl-output-wrapper">
          <div class="pl-status"><span class="pl-spinner"></span> Initializing...</div>
          <div class="pl-output" id="${outputId}"></div>
        </div>
      `;
      this.appendChild(container);

      const statusEl = container.querySelector('.pl-status');
      const outputEl = container.querySelector('.pl-output');
      this._outputEl = outputEl;
      this._statusEl = statusEl;

      if (this._prerenderData) {
        this._embedPreRendered(outputEl, statusEl);
      }
      if (this.autoRun) {
        this._initAndRun(outputEl, this._code, msg => { statusEl.textContent = msg; }, statusEl);
      } else if (this._prerenderData) {
        this._showPreviewBadge(statusEl, outputEl);
      } else if (this.preview) {
        this._showPreviewImage(statusEl, outputEl);
      } else {
        statusEl.classList.add('hidden');
      }
      return;
    }

    // Build editor pane content based on code-visibility
    let editorContent;
    if (codeVis === 'collapsed') {
      editorContent = `
        <div class="pl-code-section pl-collapsed">
          <div class="pl-editor-header">
            <span class="pl-lang">${this._escapeHtml(pillLabel)}</span>
            <span class="pl-title"></span>
            <span class="pl-shortcut">Ctrl+Enter to run</span>
            <a class="pl-btn secondary pl-help-link" href="https://panel-extensions.github.io/panel-live/" target="_blank" rel="noopener" title="panel-live docs">?</a>
            <button class="pl-btn secondary copy-btn" title="Copy code">Copy<span class="pl-toast">Copied!</span></button>
            <button class="pl-btn run-btn" title="Run code (Ctrl+Enter)">Run</button>
          </div>
          <div class="pl-editor-area"></div>
        </div>
        <div class="pl-code-toggle">
          <button title="Toggle code visibility">Expand Code</button>
          <span class="pl-toggle-spacer"></span>
          <button class="pl-btn secondary copy-btn pl-toggle-btn" title="Copy code">Copy<span class="pl-toast">Copied!</span></button>
          <a class="pl-btn secondary pl-toggle-btn pl-playground-link" title="Open in Playground" target="_blank" rel="noopener">Playground &#x2197;</a>
        </div>
      `;
    } else {
      editorContent = `
        <div class="pl-editor-header">
          <span class="pl-lang">${this._escapeHtml(pillLabel)}</span>
          <span class="pl-title"></span>
          <span class="pl-shortcut">Ctrl+Enter to run</span>
          <a class="pl-btn secondary pl-help-link" href="https://panel-extensions.github.io/panel-live/" target="_blank" rel="noopener" title="panel-live docs">?</a>
          <button class="pl-btn secondary copy-btn" title="Copy code">Copy<span class="pl-toast">Copied!</span></button>
          <button class="pl-btn run-btn" title="Run code (Ctrl+Enter)">Run</button>
        </div>
        <div class="pl-editor-area"></div>
      `;
    }

    container.innerHTML = `
      <div class="pl-playground${codePosClass}">
        <div class="pl-editor-pane${codeVis === 'collapsed' ? ' pl-pane-collapsed' : ''}">
          ${editorContent}
        </div>
        <div class="pl-drag-handle"></div>
        <div class="pl-preview-pane">
          <div class="pl-status"><span class="pl-spinner"></span> Initializing...</div>
          <div class="pl-output" id="${outputId}"></div>
        </div>
      </div>
    `;
    this.appendChild(container);

    const editorArea = container.querySelector('.pl-editor-area');
    const runBtn = container.querySelector('.run-btn');
    const statusEl = container.querySelector('.pl-status');
    const outputEl = container.querySelector('.pl-output');
    const dragHandle = container.querySelector('.pl-drag-handle');
    const editorPane = container.querySelector('.pl-editor-pane');
    const previewPane = container.querySelector('.pl-preview-pane');
    this._outputEl = outputEl;
    this._statusEl = statusEl;

    // Wire code toggle
    const toggleBtn = container.querySelector('.pl-code-toggle button');
    if (toggleBtn) {
      const codeSection = container.querySelector('.pl-code-section');
      toggleBtn.addEventListener('click', () => {
        const isCollapsed = codeSection.classList.contains('pl-collapsed');
        if (isCollapsed) {
          codeSection.classList.remove('pl-collapsed');
          codeSection.classList.add('pl-expanded');
          editorPane.classList.remove('pl-pane-collapsed');
          toggleBtn.textContent = 'Collapse Code';
          if (this._view) this._view.requestMeasure();
        } else {
          codeSection.classList.remove('pl-expanded');
          codeSection.classList.add('pl-collapsed');
          editorPane.classList.add('pl-pane-collapsed');
          toggleBtn.textContent = 'Expand Code';
        }
      });
    }

    // Create CM6 editor
    if (editorArea) {
      this._view = createEditor(editorArea, this._code, rt, () => {
        this._runFromEditor(outputEl, statusEl);
      });
    }

    if (runBtn) {
      runBtn.addEventListener('click', () => {
        this._runFromEditor(outputEl, statusEl);
      });
    }

    for (const cb of container.querySelectorAll('.copy-btn')) {
      cb.addEventListener('click', () => {
        const code = this._view ? getEditorCode(this._view) : this._code;
        navigator.clipboard.writeText(code).then(() => {
          const toast = cb.querySelector('.pl-toast');
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 1500);
        });
      });
    }

    // Wire playground link in toggle bar
    const playgroundLink = container.querySelector('.pl-playground-link');
    if (playgroundLink) {
      this._updatePlaygroundLink(playgroundLink);
    }

    // Draggable split handle
    this._initDragHandle(dragHandle, editorPane, previewPane, 'horizontal');

    // Auto-run on load
    if (this._prerenderData) {
      this._embedPreRendered(outputEl, statusEl);
    }
    if (this.autoRun) {
      this._initAndRun(outputEl, this._code, msg => { statusEl.textContent = msg; }, statusEl);
    } else if (this._prerenderData) {
      this._showPreviewBadge(statusEl, outputEl);
    } else if (this.preview) {
      this._showPreviewImage(statusEl, outputEl);
    } else {
      this._showRunPlaceholder(statusEl, outputEl);
    }
  }

  _renderPlaygroundMode(rt, layout) {
    const layoutClass = layout === 'vertical' ? 'vertical' : '';
    const codePosClass = this.codePosition === 'last' ? ' code-last' : '';
    this.setAttribute('data-layout', layout);
    const outputId = uid();
    const pillLabel = this.label;
    const container = document.createElement('div');
    container.className = 'pl-container pl-resizable';
    const h = this.getAttribute('height');
    if (h) { container.style.height = h; container.style.minHeight = h; }

    // Build header buttons
    let examplesHtml = '';
    if (this._examples && this._examples.length > 0) {
      const opts = this._examples.map((ex, i) =>
        `<option value="${i}">${this._escapeHtml(ex.label)}</option>`
      ).join('');
      examplesHtml = `<select class="pl-examples-select"><option value="" disabled selected>Examples...</option>${opts}</select>`;
    }

    container.innerHTML = `
      <div class="pl-playground ${layoutClass}${codePosClass}">
        <div class="pl-editor-pane">
          <div class="pl-editor-header">
            <span class="pl-lang">${this._escapeHtml(pillLabel)}</span>
            ${examplesHtml}
            <span class="pl-title"></span>
            <a class="pl-btn secondary pl-help-link" href="https://panel-extensions.github.io/panel-live/" target="_blank" rel="noopener" title="panel-live docs">?</a>
            <button class="pl-btn secondary share-btn" title="Copy shareable link">Share<span class="pl-toast">Link copied!</span></button>
            <button class="pl-btn secondary copy-btn" title="Copy code">Copy<span class="pl-toast">Copied!</span></button>
            <button class="pl-btn secondary reset-btn" title="Reset to original code">Reset</button>
            <button class="pl-btn secondary maximize-btn" title="Toggle fullscreen">&#x26F6;</button>
            <button class="pl-btn run-btn" title="Run code (Ctrl+Enter)">Run</button>
          </div>
          <div class="pl-editor-area"></div>
        </div>
        <div class="pl-drag-handle"></div>
        <div class="pl-preview-pane">
          <div class="pl-status"><span class="pl-spinner"></span> Initializing...</div>
          <div class="pl-output" id="${outputId}"></div>
        </div>
      </div>
    `;
    this.appendChild(container);

    const editorArea = container.querySelector('.pl-editor-area');
    const runBtn = container.querySelector('.run-btn');
    const resetBtn = container.querySelector('.reset-btn');
    const shareBtn = container.querySelector('.share-btn');
    const examplesSelect = container.querySelector('.pl-examples-select');
    const statusEl = container.querySelector('.pl-status');
    const outputEl = container.querySelector('.pl-output');
    const dragHandle = container.querySelector('.pl-drag-handle');
    const editorPane = container.querySelector('.pl-editor-pane');
    const previewPane = container.querySelector('.pl-preview-pane');
    this._outputEl = outputEl;
    this._statusEl = statusEl;

    // Create CM6 editor
    this._view = createEditor(editorArea, this._code, rt, () => {
      this._runFromEditor(outputEl, statusEl);
    });

    runBtn.addEventListener('click', () => {
      this._runFromEditor(outputEl, statusEl);
    });

    resetBtn.addEventListener('click', () => {
      if (this._view) {
        setEditorCode(this._view, this._code);
      }
    });

    // Share button: encode code in URL hash and copy to clipboard
    shareBtn.addEventListener('click', () => {
      const code = this._view ? getEditorCode(this._view) : this._code;
      setCodeInHash(code);
      const url = location.href;
      navigator.clipboard.writeText(url).then(() => {
        const toast = shareBtn.querySelector('.pl-toast');
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 1500);
      });
    });

    const copyBtn = container.querySelector('.copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const code = this._view ? getEditorCode(this._view) : this._code;
        navigator.clipboard.writeText(code).then(() => {
          const toast = copyBtn.querySelector('.pl-toast');
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 1500);
        });
      });
    }

    // Examples dropdown
    if (examplesSelect) {
      examplesSelect.addEventListener('change', () => {
        const idx = parseInt(examplesSelect.value, 10);
        const example = this._examples[idx];
        if (example) {
          if (this._view) {
            setEditorCode(this._view, example.code);
          }
          this._runFromEditor(outputEl, statusEl);
        }
        examplesSelect.selectedIndex = 0; // reset to "Examples..."
      });
    }

    // Maximize (fullscreen toggle)
    const maximizeBtn = container.querySelector('.maximize-btn');
    maximizeBtn.addEventListener('click', () => {
      if (this.hasAttribute('fullscreen')) {
        this.removeAttribute('fullscreen');
      } else {
        this.setAttribute('fullscreen', '');
      }
      if (this._view) this._view.requestMeasure();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.hasAttribute('fullscreen')) {
        this.removeAttribute('fullscreen');
        if (this._view) this._view.requestMeasure();
      }
    });

    // Draggable split handle
    this._initDragHandle(dragHandle, editorPane, previewPane, layout);

    // Auto-run on load
    if (this._prerenderData) {
      this._embedPreRendered(outputEl, statusEl);
    }
    if (this.autoRun) {
      this._initAndRun(outputEl, this._code, msg => { statusEl.textContent = msg; }, statusEl);
    } else if (this._prerenderData) {
      this._showPreviewBadge(statusEl, outputEl);
    } else if (this.preview) {
      this._showPreviewImage(statusEl, outputEl);
    } else {
      this._showRunPlaceholder(statusEl, outputEl);
    }
  }

  _initDragHandle(handle, editorPane, previewPane, layout) {
    const isVertical = layout === 'vertical';
    const isReversed = handle.parentElement.classList.contains('code-last');
    let dragging = false;
    let startPos = 0;
    let startEditorSize = 0;
    let totalSize = 0;

    const onMouseDown = (e) => {
      e.preventDefault();
      dragging = true;
      handle.classList.add('dragging');
      const playground = handle.parentElement;
      if (isVertical) {
        startPos = e.clientY;
        startEditorSize = editorPane.offsetHeight;
        totalSize = playground.offsetHeight;
      } else {
        startPos = e.clientX;
        startEditorSize = editorPane.offsetWidth;
        totalSize = playground.offsetWidth;
      }
      editorPane.style.flex = 'none';
      previewPane.style.flex = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e) => {
      if (!dragging) return;
      let delta = isVertical ? e.clientY - startPos : e.clientX - startPos;
      if (isReversed) delta = -delta;
      const handleSize = isVertical ? handle.offsetHeight : handle.offsetWidth;
      const newEditorSize = Math.max(100, Math.min(totalSize - handleSize - 100, startEditorSize + delta));
      const newPreviewSize = totalSize - handleSize - newEditorSize;
      if (isVertical) {
        editorPane.style.height = newEditorSize + 'px';
        previewPane.style.height = newPreviewSize + 'px';
      } else {
        editorPane.style.width = newEditorSize + 'px';
        previewPane.style.width = newPreviewSize + 'px';
      }
    };

    const onMouseUp = () => {
      dragging = false;
      handle.classList.remove('dragging');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    handle.addEventListener('mousedown', onMouseDown);
  }

  // --- Pre-rendered content ---

  async _embedPreRendered(outputEl, statusEl) {
    if (!this._prerenderData) return;

    try {
      const data = this._prerenderData;

      // Pre-rendered error: render as static error panel (no Bokeh needed)
      if (data.error) {
        renderError(outputEl, data.error);
        return;
      }

      // Load Bokeh + Panel JS (shared across all elements)
      await _ensurePrerenderJs();

      // Parse pre-render data and remap DOM IDs to unique values
      // (multiple elements may share the same cached pre-render data)
      const docsJson = JSON.parse(data.docs_json);
      const renderItems = JSON.parse(data.render_items);

      outputEl.innerHTML = '';
      for (const item of renderItems) {
        if (item.roots) {
          const newRoots = {};
          for (const [modelId, origDomId] of Object.entries(item.roots)) {
            const newDomId = uid();
            newRoots[modelId] = newDomId;
            const el = document.createElement('div');
            el.id = newDomId;
            outputEl.appendChild(el);
          }
          item.roots = newRoots;
        }
      }

      // Load extension JS/CSS if needed (e.g. Vega, Plotly, DeckGL)
      if (data.ext_resources) {
        for (const url of data.ext_resources.css || []) {
          await loadCSS(url);
        }
        for (const url of data.ext_resources.js || []) {
          await loadScript(url);
        }
      }

      // Embed via Bokeh
      await window.Bokeh.embed.embed_items(docsJson, renderItems);

      console.log('[panel-live] Pre-rendered content embedded');
    } catch (e) {
      console.warn('[panel-live] Failed to embed pre-rendered content:', e);
    }
  }

  // --- Execution ---

  async _initAndRun(outputEl, code, statusCallback, statusEl) {
    try {
      if (statusEl) {
        statusEl.classList.remove('pl-preview-badge');
        statusEl.title = '';
      }
      this._setStatus('loading', 'Initializing...');

      // Fetch src if needed
      if (this._srcUrl && !this._code.trim()) {
        console.log('[panel-live] Fetching source from %s', this._srcUrl);
        statusCallback('Fetching source...');
        code = await fetchPythonSource(this._srcUrl);
        this._code = code;
        if (this._view) {
          setEditorCode(this._view, code);
        }
      }

      const bridge = getWorkerBridge();

      // Register this element with the bridge for ref counting
      if (!this._bridgeRegistered) {
        bridge.registerElement();
        this._bridgeRegistered = true;
      }

      await bridge.init(statusCallback);

      // Install explicit requirements if any
      if (this._requirements) {
        bridge.install(this._requirements);
      }

      // Write multi-file support
      if (this._files) {
        for (const [name, content] of Object.entries(this._files)) {
          if (name !== this._entrypoint) {
            bridge.writeFile(name, content);
          }
        }
      }

      console.log('[panel-live] Running app (mode=%s, %d chars)', this.mode, (code || '').length);
      this._setStatus('running', 'Running app...');
      this._emit('pl-run-start');
      statusCallback('Running app...');
      await bridge.run(outputEl, code, statusCallback);
      console.log('[panel-live] App rendered successfully (mode=%s)', this.mode);
      if (statusEl) statusEl.classList.add('hidden');
      this._setStatus('ready', 'App rendered');
      this._emit('pl-ready');
      this._emit('pl-run-end');
    } catch (error) {
      console.error('[panel-live] Error in _initAndRun:', error);
      renderError(outputEl, error.message || String(error));
      if (statusEl) statusEl.classList.add('hidden');
      this._setStatus('error', error.message || String(error));
      this._emit('pl-error', { error: error.message || String(error), traceback: String(error) });
      this._emit('pl-run-end');
    }
  }

  async _runFromEditor(outputEl, statusEl) {
    if (this._running) return;
    this._running = true;

    // Preserve output dimensions to prevent collapse during re-run
    const currentHeight = outputEl.offsetHeight;
    if (currentHeight > 0) {
      outputEl.style.minHeight = currentHeight + 'px';
    }

    statusEl.classList.remove('hidden', 'pl-preview-badge');
    statusEl.title = '';
    statusEl.innerHTML = '<span class="pl-spinner"></span> Running...';

    const bridge = getWorkerBridge();

    // Ensure worker is initialized (needed when auto-run is disabled)
    await bridge.init(msg => { statusEl.textContent = msg; });

    if (this._requirements) {
      bridge.install(this._requirements);
    }

    // Reset previous state for this element and clean up Bokeh views
    bridge.reset(outputEl.id);
    this._cleanupBokehViews(outputEl);

    // Fetch src if needed (when auto-run was disabled, _initAndRun didn't run)
    if (this._srcUrl && !this._code.trim()) {
      console.log('[panel-live] Fetching source from %s', this._srcUrl);
      statusEl.textContent = 'Fetching source...';
      const fetched = await fetchPythonSource(this._srcUrl);
      this._code = fetched;
      if (this._view) {
        setEditorCode(this._view, fetched);
      }
    }

    const code = this._view ? getEditorCode(this._view) : this._code;
    console.log('[panel-live] Run from editor (%d chars)', code.length);
    this._setStatus('running', 'Running...');
    this._emit('pl-run-start');
    try {
      await bridge.run(outputEl, code, msg => { statusEl.textContent = msg; });
      console.log('[panel-live] Editor run completed');
      outputEl.style.minHeight = '';
      statusEl.classList.add('hidden');
      this._setStatus('ready', 'Run completed');
      this._emit('pl-ready');
    } catch (error) {
      console.error('[panel-live] Error in editor run:', error);
      renderError(outputEl, error.message || String(error));
      outputEl.style.minHeight = '';
      statusEl.classList.add('hidden');
      this._setStatus('error', error.message || String(error));
      this._emit('pl-error', { error: error.message || String(error), traceback: String(error) });
    }
    this._emit('pl-run-end');
    this._running = false;
  }

  _cleanupBokehViews(el) {
    if (window.Bokeh && window.Bokeh.index && window.Bokeh.index.roots) {
      try {
        for (const root of Array.from(window.Bokeh.index.roots)) {
          try { if (root.el && el.contains(root.el)) root.remove(); } catch (e) {}
        }
      } catch (e) {}
    }
    el.innerHTML = '';
  }

  // --- Public methods (used by PanelLiveController) ---

  run() {
    if (this._outputEl && this._statusEl) {
      return this._runFromEditor(this._outputEl, this._statusEl);
    }
    return Promise.resolve();
  }

  getCode() {
    if (this._view) return getEditorCode(this._view);
    return this._code || '';
  }

  setCode(code) {
    if (this._view) {
      setEditorCode(this._view, code);
    }
  }

  async eval(code) {
    const bridge = getWorkerBridge();
    await bridge.init(() => {});
    return bridge.eval(code);
  }

  receiveServerData(data) {
    const bridge = getWorkerBridge();
    if (bridge._worker) {
      const targetId = this._outputEl ? this._outputEl.id : this.id;
      bridge.sendServerData(targetId, data);
    }
  }

  _updatePlaygroundLink(linkEl) {
    const code = this._view ? getEditorCode(this._view) : (this._code || '');
    const encoded = encodeCode(code);
    let baseUrl;
    if (_config.playgroundUrl) {
      // Configured playground URL takes priority
      const url = new URL(_config.playgroundUrl, location.href);
      url.hash = 'code=' + encoded;
      linkEl.href = url.toString();
      return;
    }
    // Derive site root from the panel-live.js script URL (lives at <root>/assets/js/panel-live.js)
    const script = document.querySelector('script[src*="panel-live.js"]');
    if (script && script.src && !script.src.startsWith('blob:')) {
      try {
        const scriptUrl = new URL(script.src, location.href);
        const idx = scriptUrl.pathname.lastIndexOf('/assets/');
        if (idx >= 0) {
          baseUrl = new URL(scriptUrl.pathname.substring(0, idx + 1), scriptUrl);
        }
      } catch { /* fall through */ }
    }
    if (!baseUrl) baseUrl = new URL('.', location.href);
    const url = new URL('playground.html', baseUrl);
    url.hash = 'code=' + encoded;
    linkEl.href = url.toString();
  }

  _escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

customElements.define('panel-live', PanelLive);
console.log('[panel-live] <panel-live> custom element registered');
