// Worker Bridge — singleton manager for the Dedicated Worker (main thread side)

import { cdnUrls, _config } from './config.js';
import { loadScript, loadCSS } from './utils.js';
import { renderError } from './error-renderer.js';

// Capture script URL at module load time (before any async)
const _scriptUrl = (typeof document !== 'undefined' && document.currentScript)
  ? document.currentScript.src
  : null;

const DEFAULT_INIT_TIMEOUT_MS = 120_000;
const DEFAULT_STALL_TIMEOUT_MS = 120_000;
const MAX_CRASH_RETRIES = 1;

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
    this._stallTimer = null;
    this._crashRetries = 0;
    this._refCount = 0;
    this._terminationTimer = null;
    this._runs = {};       // runId → { resolve, reject, targetEl, targetId, statusCallback }
    this._evals = {};      // evalId → { resolve, reject }
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
        packageAliases: _config.packageAliases || {},
        disableJSPI: _config.disableJSPI !== false,
      },
    });

    // Start stall detection for init
    this._resetStallTimer();

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

  // --- Eval: execute code in worker without rendering, returns result ---

  eval(code) {
    const evalId = 'eval-' + Math.random().toString(36).slice(2, 10);
    return new Promise((resolve, reject) => {
      this._evals[evalId] = { resolve, reject };
      this._worker.postMessage({ type: 'eval', code, evalId });
    });
  }

  // --- Send server data to worker ---

  sendServerData(targetId, data) {
    this._worker.postMessage({ type: 'server-data', targetId, data });
  }

  // --- Install packages ---

  install(packages) {
    if (!packages || packages.length === 0) return;
    const pkgs = typeof packages === 'string'
      ? packages.split('\n').map(l => l.replace(/#.*$/, '').trim()).filter(Boolean).flatMap(l => l.split(/\s+/))
      : packages;
    if (pkgs.length === 0) return;
    const resolved = this._resolveAliases(pkgs);
    this._worker.postMessage({ type: 'install', packages: resolved });
  }

  _resolveAliases(packages) {
    const aliases = _config.packageAliases || {};
    return packages.map(pkg => aliases[pkg] || pkg);
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
    this._clearStallTimer();
    clearTimeout(this._terminationTimer);
    this._terminationTimer = null;
    this._initPromise = null;
    this._refCount = 0;
    this._crashRetries = 0;
    this._runs = {};
    this._evals = {};
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

  // --- Stall detection (silent STATUS_ACCESS_VIOLATION kills worker without onerror) ---

  _resetStallTimer() {
    clearTimeout(this._stallTimer);
    // Only run stall detection while init, runs, or evals are pending
    // Note: check _initResolve too — _initPromise may not be assigned yet
    // when called from inside _doInit (async timing)
    const hasPending = this._initPromise || this._initResolve
      || Object.keys(this._runs).length > 0
      || Object.keys(this._evals).length > 0;
    if (!hasPending) return;
    const timeoutMs = _config.stallTimeout || DEFAULT_STALL_TIMEOUT_MS;
    this._stallTimer = setTimeout(() => this._onWorkerStall(), timeoutMs);
  }

  _clearStallTimer() {
    clearTimeout(this._stallTimer);
    this._stallTimer = null;
  }

  _onWorkerStall() {
    console.error('[worker-bridge] Worker stall detected — no messages received within timeout. Worker may have crashed.');
    if (this._crashRetries < MAX_CRASH_RETRIES) {
      this._attemptRecovery();
    } else {
      this._rejectAllPending(new Error(
        'Worker stopped responding (possible browser crash). ' +
        'Try refreshing the page. If using Chrome/Edge, try Firefox as a workaround.'
      ));
    }
  }

  _attemptRecovery() {
    this._crashRetries++;
    console.warn(`[worker-bridge] Attempting crash recovery (retry ${this._crashRetries}/${MAX_CRASH_RETRIES})...`);

    // Terminate the dead worker
    if (this._worker) {
      this._worker.terminate();
      this._worker = null;
    }
    this._clearStallTimer();

    // Reject all pending runs and evals (they can't be replayed)
    for (const runId of Object.keys(this._runs)) {
      const run = this._runs[runId];
      delete this._runs[runId];
      run.reject(new Error('Worker crashed and is being recovered. Please try again.'));
    }
    for (const evalId of Object.keys(this._evals)) {
      const ev = this._evals[evalId];
      delete this._evals[evalId];
      ev.reject(new Error('Worker crashed and is being recovered. Please try again.'));
    }

    // Reject init promise if pending, then clear for fresh init
    if (this._initReject) {
      this._initReject(new Error('Worker crashed and is being recovered. Please try again.'));
    }
    this._initPromise = null;
    this._initResolve = null;
    this._initReject = null;
    clearTimeout(this._initTimer);
    this._initTimer = null;
  }

  _rejectAllPending(error) {
    this._clearStallTimer();
    for (const runId of Object.keys(this._runs)) {
      const run = this._runs[runId];
      delete this._runs[runId];
      run.reject(error);
    }
    for (const evalId of Object.keys(this._evals)) {
      const ev = this._evals[evalId];
      delete this._evals[evalId];
      ev.reject(error);
    }
    if (this._initReject) {
      this._initReject(error);
      this._initResolve = null;
      this._initReject = null;
    }
  }

  // --- Message validation ---

  _validateWorkerMessage(msg) {
    const validTypes = ['ready', 'status', 'render', 'no-output', 'stdout', 'stderr', 'patch', 'idle', 'error', 'done', 'eval-result', 'output'];
    if (!msg || typeof msg !== 'object' || !validTypes.includes(msg.type)) {
      return false;
    }
    switch (msg.type) {
      case 'render':
        return typeof msg.runId === 'string' && typeof msg.targetId === 'string' && typeof msg.docs_json === 'string';
      case 'no-output':
        return typeof msg.runId === 'string' && typeof msg.targetId === 'string';
      case 'error':
        return typeof msg.runId === 'string' && typeof msg.message === 'string';
      case 'stdout':
      case 'stderr':
        return typeof msg.runId === 'string' && typeof msg.text === 'string';
      case 'patch':
        return typeof msg.targetId === 'string' && msg.patch != null;
      case 'idle':
        return typeof msg.targetId === 'string';
      case 'status':
        return typeof msg.msg === 'string';
      case 'eval-result':
        return typeof msg.evalId === 'string';
      case 'output':
        return typeof msg.targetId === 'string';
      default:
        return true;
    }
  }

  // --- Message router ---

  _onMessage(msg) {
    if (!this._validateWorkerMessage(msg)) {
      console.warn('[worker-bridge] Invalid message rejected:', msg);
      return;
    }
    this._resetStallTimer();
    switch (msg.type) {
      case 'ready':
        clearTimeout(this._initTimer);
        this._initTimer = null;
        this._clearStallTimer();
        this._crashRetries = 0; // Reset retries on successful init
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
      case 'eval-result':
        this._handleEvalResult(msg);
        break;
      case 'output':
        this._handleOutput(msg);
        break;
      default:
        console.warn('[worker-bridge] Unknown message type:', msg.type);
    }
  }

  _onWorkerError(event) {
    console.error('[worker-bridge] Worker error:', event);
    this._clearStallTimer();

    // Build a specific, actionable error message
    let detail = event.message || 'unknown error';
    let isRecoverable = true;
    if (typeof location !== 'undefined' && location.protocol === 'file:') {
      detail = 'panel-live cannot run from a local file (file:// protocol). ' +
        'Serve the page via HTTP — for example: python -m http.server';
      isRecoverable = false;
    } else if (detail.includes('NetworkError') || detail.includes('Failed to fetch')) {
      detail = 'Network error loading the worker script. ' +
        'Check that the CDN is reachable and CORS headers are configured.';
      isRecoverable = false;
    }

    // Attempt recovery for crash-like errors (not network/file errors)
    if (isRecoverable && this._crashRetries < MAX_CRASH_RETRIES) {
      this._attemptRecovery();
      return;
    }

    const errorMsg = 'Worker error: ' + detail;

    // Reject all pending runs
    for (const runId of Object.keys(this._runs)) {
      const run = this._runs[runId];
      delete this._runs[runId];
      run.reject(new Error(errorMsg));
    }
    // Reject all pending evals
    for (const evalId of Object.keys(this._evals)) {
      const ev = this._evals[evalId];
      delete this._evals[evalId];
      ev.reject(new Error(errorMsg));
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

      // Parse the serialized data
      const docsJson = JSON.parse(docs_json);
      const renderItems = JSON.parse(render_items);
      const rootIds = JSON.parse(root_ids);

      // Create new root elements (appended after any existing pre-rendered content)
      for (const rootId of rootIds) {
        const el = document.createElement('div');
        el.setAttribute('data-root-id', String(rootId));
        el.id = `el-${rootId}`;
        targetEl.appendChild(el);
      }

      // Map roots — querySelectorAll('[data-root-id]') only finds newly created elements
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

      // Embed into new elements (pre-rendered content stays visible during this)
      const [views] = await window.Bokeh.embed.embed_items(docsJson, renderItems);

      // Now remove old content: keep only [data-root-id] elements
      const keep = new Set(targetEl.querySelectorAll('[data-root-id]'));
      for (const child of Array.from(targetEl.children)) {
        if (!keep.has(child)) child.remove();
      }

      // Render stdout/stderr before the root elements
      this._renderCapturedOutput(targetEl, stdout, stderr);

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

    // Suppress echo: events fired by applying Python patches should NOT
    // be sent back to the worker. Bokeh 3.x's apply_json_patch does not
    // accept a setter_id, so we track this state ourselves.
    elState._applyingPythonPatch = true;
    try {
      elState.jsdoc.apply_json_patch(patch, buffers);
    } catch (e) {
      console.error('[worker-bridge] Error applying worker patch:', e);
    } finally {
      elState._applyingPythonPatch = false;
    }
  }

  // --- Idle: worker finished processing a patch, flush queued patches ---

  _handleIdle(msg) {
    const { targetId } = msg;
    const elState = this._elements[targetId];
    if (!elState) return;

    if (elState.patchQueue.length > 0) {
      try {
        const patch = elState.jsdoc.create_json_patch(elState.patchQueue);
        elState.patchQueue = [];
        elState.busy = true;
        this._worker.postMessage({ type: 'patch', targetId, patch });
      } catch (e) {
        console.error('[worker-bridge] Error creating patch from queue:', e);
        elState.patchQueue = [];
        elState.busy = false;
      }
    } else {
      elState.busy = false;
    }
  }

  // --- Main→Worker change events (JS→Python doc sync) ---

  _sendChangeToWorker(targetId, event) {
    const elState = this._elements[targetId];
    if (!elState) return;

    // Skip events that originated from Python patches (echo suppression)
    if (elState._applyingPythonPatch) return;

    // Skip events that came from Python (legacy setter_id check)
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

  // --- Eval result handling ---

  _handleEvalResult(msg) {
    const { evalId, result, error } = msg;
    const pending = this._evals[evalId];
    if (!pending) return;
    delete this._evals[evalId];
    if (error) {
      pending.reject(new Error(error));
    } else {
      pending.resolve(result);
    }
  }

  // --- Output: client→server data from worker ---

  _handleOutput(msg) {
    const { targetId, data } = msg;
    // targetId is the output div ID — dispatch pl-output as bubbling event
    // so it reaches the parent <panel-live> element where the ESM listens
    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      targetEl.dispatchEvent(new CustomEvent('pl-output', {
        detail: { data },
        bubbles: true,
        composed: true,
      }));
    }
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
