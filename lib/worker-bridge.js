// Worker Bridge — singleton manager for the Dedicated Worker (main thread side)

import { cdnUrls, _config } from './config.js';
import { loadScript, loadCSS } from './utils.js';
import { renderError } from './error-renderer.js';

// Capture script URL at module load time (before any async)
const _scriptUrl = (typeof document !== 'undefined' && document.currentScript)
  ? document.currentScript.src
  : null;

const DEFAULT_INIT_TIMEOUT_MS = 120_000;

let _bridge = null;

export function getWorkerBridge() {
  if (!_bridge) _bridge = new WorkerBridge();
  return _bridge;
}

// Track which JS/CSS extension resources have been loaded on main thread
const _loadedExtResources = new Set();

class WorkerBridge {
  constructor() {
    this._worker = null;
    this._initPromise = null;
    this._initTimer = null;
    this._refCount = 0;
    this._terminationTimer = null;
    this._runs = {};       // runId → { resolve, reject, targetEl, targetId, statusCallback }
    this._elements = {};   // targetId → { jsdoc, busy, patchQueue }
    this._jsResourcesLoaded = false;
  }

  // --- Init: create Worker, load Bokeh/Panel JS in parallel ---

  async init(statusCallback) {
    if (this._initPromise) return this._initPromise;
    this._initPromise = this._doInit(statusCallback);
    return this._initPromise;
  }

  async _doInit(statusCallback) {
    const urls = cdnUrls();

    // Store callback so _handleStatus() can forward worker messages during init
    this._initStatusCallback = statusCallback;

    // Pre-flight: file:// protocol cannot run workers or fetch CDN resources
    if (typeof location !== 'undefined' && location.protocol === 'file:') {
      throw new Error(
        'panel-live cannot run from a local file (file:// protocol). ' +
        'Serve the page via HTTP — for example: python -m http.server'
      );
    }

    // Warn (non-blocking) if cross-origin isolation is missing
    if (typeof crossOriginIsolated !== 'undefined' && !crossOriginIsolated) {
      console.warn(
        '[panel-live] Cross-origin isolation not enabled. ' +
        'Add COOP/COEP headers or use mini-coi.js for best performance.'
      );
    }

    // Resolve worker URL
    const workerUrl = _config.workerUrl || this._resolveWorkerUrl();

    // Create worker (with cross-origin blob wrapper if needed)
    this._worker = this._createWorker(workerUrl);
    this._worker.onmessage = (e) => this._onMessage(e.data);
    this._worker.onerror = (e) => this._onWorkerError(e);

    // Start worker init and main-thread JS loading in parallel
    const workerReady = new Promise((resolve, reject) => {
      this._initResolve = resolve;
      this._initReject = reject;
    });

    this._worker.postMessage({
      type: 'init',
      config: {
        pyodideUrl: urls.pyodide,
        bokehWhl: urls.bokehWhl,
        panelWhl: urls.panelWhl,
      },
    });

    // Load Bokeh + Panel JS on main thread in parallel
    statusCallback('Loading Bokeh & Panel JS...');
    await this._loadJSResources();

    // Wait for worker to finish init, with timeout
    const timeoutMs = _config.initTimeout || DEFAULT_INIT_TIMEOUT_MS;
    const timeout = new Promise((_, reject) => {
      this._initTimer = setTimeout(() => {
        reject(new Error(
          `Initialization timed out after ${timeoutMs / 1000}s. ` +
          'The CDN may be unreachable. Try refreshing the page.'
        ));
      }, timeoutMs);
    });

    try {
      await Promise.race([workerReady, timeout]);
    } finally {
      clearTimeout(this._initTimer);
      this._initTimer = null;
    }

    this._initStatusCallback = null;
  }

  async _loadJSResources() {
    if (this._jsResourcesLoaded) return;
    const urls = cdnUrls();
    for (const url of urls.bokehJs) await loadScript(url);
    await loadScript(urls.panelJs);
    this._jsResourcesLoaded = true;
  }

  _resolveWorkerUrl() {
    // Try to resolve from the script URL (panel-live.js → panel-live-worker.js)
    if (_scriptUrl) {
      return _scriptUrl.replace(/panel-live\.js(\?.*)?$/, 'panel-live-worker.js$1');
    }
    // Fallback: look for script tag with panel-live in src
    if (typeof document !== 'undefined') {
      const scripts = document.querySelectorAll('script[src*="panel-live"]');
      for (const s of scripts) {
        if (s.src && s.src.includes('panel-live.js')) {
          return s.src.replace(/panel-live\.js(\?.*)?$/, 'panel-live-worker.js$1');
        }
      }
    }
    return 'panel-live-worker.js';
  }

  _createWorker(url) {
    try {
      const scriptOrigin = new URL(url, location.href).origin;
      if (scriptOrigin === location.origin) {
        return new Worker(url);
      }
    } catch {
      return new Worker(url);
    }
    // Cross-origin: blob wrapper using importScripts() (standard workaround)
    const blob = new Blob(
      [`importScripts(${JSON.stringify(url)});`],
      { type: 'application/javascript' }
    );
    const blobUrl = URL.createObjectURL(blob);
    const worker = new Worker(blobUrl);
    URL.revokeObjectURL(blobUrl);
    return worker;
  }

  // --- Run: execute code in worker, returns promise that resolves when done ---

  run(targetEl, code, statusCallback) {
    const targetId = targetEl.id;
    const runId = 'run-' + Math.random().toString(36).slice(2, 10);

    return new Promise((resolve, reject) => {
      this._runs[runId] = { resolve, reject, targetEl, targetId, statusCallback };
      this._worker.postMessage({ type: 'run', code, targetId, runId });
    });
  }

  // --- Install packages ---

  install(packages) {
    if (!packages || packages.length === 0) return;
    const pkgs = typeof packages === 'string'
      ? packages.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
      : packages;
    if (pkgs.length === 0) return;
    this._worker.postMessage({ type: 'install', packages: pkgs });
  }

  // --- Write file to Pyodide filesystem ---

  writeFile(name, content) {
    this._worker.postMessage({ type: 'write-file', name, content });
  }

  // --- Reset a target element (before re-run) ---

  reset(targetId) {
    // Clean up main-thread state for this element
    if (this._elements[targetId]) {
      delete this._elements[targetId];
    }
    this._worker.postMessage({ type: 'reset', targetId });
  }

  // --- Element ref counting ---

  registerElement() {
    this._refCount++;
    // Cancel any pending termination if elements are re-attached
    if (this._terminationTimer) {
      clearTimeout(this._terminationTimer);
      this._terminationTimer = null;
    }
  }

  // --- Terminate worker (hard reset) ---

  terminate() {
    if (this._worker) {
      this._worker.terminate();
      this._worker = null;
    }
    clearTimeout(this._initTimer);
    this._initTimer = null;
    clearTimeout(this._terminationTimer);
    this._terminationTimer = null;
    this._initPromise = null;
    this._refCount = 0;
    this._runs = {};
    this._elements = {};
    _bridge = null;
  }

  // --- Cleanup for a specific element (called from disconnectedCallback) ---

  cleanupElement(targetId) {
    if (this._elements[targetId]) {
      delete this._elements[targetId];
    }
    this._refCount--;
    if (this._refCount <= 0) {
      this._terminationTimer = setTimeout(() => {
        if (this._refCount <= 0) this.terminate();
      }, 5000);
    }
  }

  // --- Message router ---

  _onMessage(msg) {
    switch (msg.type) {
      case 'ready':
        clearTimeout(this._initTimer);
        this._initTimer = null;
        if (this._initResolve) {
          this._initResolve();
          this._initResolve = null;
          this._initReject = null;
        }
        break;
      case 'status':
        this._handleStatus(msg);
        break;
      case 'render':
        this._handleRender(msg);
        break;
      case 'no-output':
        this._handleNoOutput(msg);
        break;
      case 'stdout':
        this._handleStdout(msg);
        break;
      case 'stderr':
        this._handleStderr(msg);
        break;
      case 'patch':
        this._handleWorkerPatch(msg);
        break;
      case 'idle':
        this._handleIdle(msg);
        break;
      case 'error':
        this._handleError(msg);
        break;
      case 'done':
        // done is sent after render/no-output; resolve is called there
        break;
      default:
        console.warn('[worker-bridge] Unknown message type:', msg.type);
    }
  }

  _onWorkerError(event) {
    console.error('[worker-bridge] Worker error:', event);

    // Build a specific, actionable error message
    let detail = event.message || 'unknown error';
    if (typeof location !== 'undefined' && location.protocol === 'file:') {
      detail = 'panel-live cannot run from a local file (file:// protocol). ' +
        'Serve the page via HTTP — for example: python -m http.server';
    } else if (detail.includes('NetworkError') || detail.includes('Failed to fetch')) {
      detail = 'Network error loading the worker script. ' +
        'Check that the CDN is reachable and CORS headers are configured.';
    }

    const errorMsg = 'Worker error: ' + detail;

    // Reject all pending runs
    for (const runId of Object.keys(this._runs)) {
      const run = this._runs[runId];
      delete this._runs[runId];
      run.reject(new Error(errorMsg));
    }
    // Reject init if pending
    if (this._initReject) {
      this._initReject(new Error(errorMsg));
      this._initResolve = null;
      this._initReject = null;
    }
  }

  // --- Status: forward to the most recent run's statusCallback ---

  _handleStatus(msg) {
    // Forward to all active run callbacks (typically just one)
    for (const run of Object.values(this._runs)) {
      if (run.statusCallback) run.statusCallback(msg.msg);
    }
    // Also forward to init callback if no runs yet
    if (Object.keys(this._runs).length === 0 && this._initStatusCallback) {
      this._initStatusCallback(msg.msg);
    }
  }

  // --- Render: load ext resources, create DOM roots, embed Bokeh, link docs ---

  async _handleRender(msg) {
    const { runId, targetId, docs_json, render_items, root_ids, ext_resources, stdout, stderr } = msg;
    const run = this._runs[runId];
    if (!run) return;

    try {
      const { targetEl } = run;

      // Load extension JS/CSS on main thread
      if (ext_resources) {
        for (const url of ext_resources.css || []) {
          if (!_loadedExtResources.has(url)) { _loadedExtResources.add(url); loadCSS(url); }
        }
        for (const url of ext_resources.js || []) {
          if (!_loadedExtResources.has(url)) { _loadedExtResources.add(url); await loadScript(url); }
        }
      }

      // Render captured stdout/stderr
      this._renderCapturedOutput(targetEl, stdout, stderr);

      // Parse the serialized data
      const docsJson = JSON.parse(docs_json);
      const renderItems = JSON.parse(render_items);
      const rootIds = JSON.parse(root_ids);

      // Clear target and create root divs
      targetEl.innerHTML = '';

      // Re-render stdout before roots
      this._renderCapturedOutput(targetEl, stdout, stderr);

      // Create root elements
      for (const rootId of rootIds) {
        const el = document.createElement('div');
        el.setAttribute('data-root-id', String(rootId));
        el.id = `el-${rootId}`;
        targetEl.appendChild(el);
      }

      // Map roots
      const rootEls = targetEl.querySelectorAll('[data-root-id]');
      const dataRoots = [];
      for (const el of rootEls) {
        el.innerHTML = '';
        dataRoots.push([el.getAttribute('data-root-id'), el.id]);
      }
      dataRoots.sort((a, b) => a[0] < b[0] ? -1 : 1);
      const roots = {};
      for (let i = 0; i < dataRoots.length; i++) {
        roots[rootIds[i]] = dataRoots[i][1];
      }
      renderItems[0]['roots'] = roots;
      renderItems[0]['root_ids'] = rootIds;

      // Embed via Bokeh
      const [views] = await window.Bokeh.embed.embed_items(docsJson, renderItems);

      // Set up bidirectional sync: JS→Python
      const jsdoc = [...views.roots.values()][0].model.document;
      this._elements[targetId] = { jsdoc, busy: false, patchQueue: [] };

      jsdoc.on_change((event) => {
        this._sendChangeToWorker(targetId, event);
      }, false);

      // Tell worker DOM is ready so it can call _link_docs_worker
      this._worker.postMessage({ type: 'rendered', targetId, runId });

      // Resolve the run promise
      delete this._runs[runId];
      run.resolve();
    } catch (e) {
      console.error('[worker-bridge] Error in _handleRender:', e);
      delete this._runs[runId];
      run.reject(e);
    }
  }

  // --- No output: expression returned None ---

  _handleNoOutput(msg) {
    const { runId, targetId, stdout, stderr } = msg;
    const run = this._runs[runId];
    if (!run) return;

    const { targetEl } = run;
    targetEl.innerHTML = '';
    this._renderCapturedOutput(targetEl, stdout, stderr);

    if (!stdout && !stderr) {
      targetEl.innerHTML = '<p style="color:#666;padding:16px;">Code executed (no visual output)</p>';
    }

    delete this._runs[runId];
    run.resolve();
  }

  // --- Stdout/stderr streaming ---

  _handleStdout(msg) {
    const run = this._runs[msg.runId];
    if (!run) return;
    this._appendOutput(run.targetEl, msg.text, 'pl-stdout');
  }

  _handleStderr(msg) {
    const run = this._runs[msg.runId];
    if (!run) return;
    this._appendOutput(run.targetEl, msg.text, 'pl-stderr');
  }

  _appendOutput(targetEl, text, className) {
    if (!text) return;
    let pre = targetEl.querySelector(`pre.${className}`);
    if (!pre) {
      pre = document.createElement('pre');
      pre.className = className;
      targetEl.prepend(pre);
    }
    pre.textContent += text;
  }

  // --- Worker→Main patches (Python→JS doc sync) ---

  _handleWorkerPatch(msg) {
    const { targetId, patch, buffers } = msg;
    const elState = this._elements[targetId];
    if (!elState || !elState.jsdoc) return;

    try {
      elState.jsdoc.apply_json_patch(patch, buffers);
    } catch (e) {
      console.error('[worker-bridge] Error applying worker patch:', e);
    }
  }

  // --- Idle: worker finished processing a patch, flush queued patches ---

  _handleIdle(msg) {
    const { targetId } = msg;
    const elState = this._elements[targetId];
    if (!elState) return;

    if (elState.patchQueue.length > 0) {
      const patch = elState.jsdoc.create_json_patch(elState.patchQueue);
      elState.patchQueue = [];
      elState.busy = true;
      this._worker.postMessage({ type: 'patch', targetId, patch });
    } else {
      elState.busy = false;
    }
  }

  // --- Main→Worker change events (JS→Python doc sync) ---

  _sendChangeToWorker(targetId, event) {
    const elState = this._elements[targetId];
    if (!elState) return;

    // Skip events that came from Python
    if (event.setter_id != null && event.setter_id === 'py') return;

    if (elState.busy && event.model && event.attr) {
      // Coalesce: remove older events for same model+attr
      elState.patchQueue = elState.patchQueue.filter(
        e => !(e.model === event.model && e.attr === event.attr)
      );
      elState.patchQueue.push(event);
      return;
    }

    const patch = elState.jsdoc.create_json_patch([event]);
    elState.busy = true;
    this._worker.postMessage({ type: 'patch', targetId, patch });
  }

  // --- Error handling ---

  _handleError(msg) {
    const { runId, targetId, message, traceback, stdout, stderr } = msg;
    const run = this._runs[runId];
    if (!run) return;

    const { targetEl } = run;
    this._renderCapturedOutput(targetEl, stdout, stderr);
    renderError(targetEl, traceback || message);

    delete this._runs[runId];
    run.reject(new Error(message));
  }

  // --- Render captured stdout/stderr as <pre> ---

  _renderCapturedOutput(targetEl, stdout, stderr) {
    const text = ((stdout || '') + (stderr || '')).trimEnd();
    if (!text) return;
    let pre = targetEl.querySelector('pre.pl-stdout');
    if (!pre) {
      pre = document.createElement('pre');
      pre.className = 'pl-stdout';
      targetEl.prepend(pre);
    }
    // Only set if not already streaming
    if (!pre.textContent) {
      pre.textContent = text;
    }
  }
}
