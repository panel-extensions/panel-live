// panel-live-worker.js — Dedicated Worker for Pyodide execution
// Runs in a Web Worker context. Never touches the DOM.

import workerSetup from './python/worker-setup.py';
import workerRender from './python/worker-render.py';

let pyodide = null;
let initPromise = null;
let packageAliases = {};
const installedPackages = new Set(['panel', 'bokeh', 'pyodide-http']);

// Internal execution queue (Pyodide is single-threaded)
let execQueue = Promise.resolve();
function enqueue(fn) {
  execQueue = execQueue.then(fn, fn);
  return execQueue;
}

// --- Message validation ---

function _validateMainMessage(msg) {
  const validTypes = ['init', 'run', 'install', 'write-file', 'rendered', 'patch', 'reset', 'eval'];
  if (!msg || typeof msg !== 'object' || !validTypes.includes(msg.type)) {
    return false;
  }
  switch (msg.type) {
    case 'init':
      return msg.config != null && typeof msg.config === 'object';
    case 'run':
      return typeof msg.code === 'string' && typeof msg.targetId === 'string' && typeof msg.runId === 'string';
    case 'install':
      return Array.isArray(msg.packages);
    case 'write-file':
      return typeof msg.name === 'string' && typeof msg.content === 'string';
    case 'rendered':
      return typeof msg.targetId === 'string' && typeof msg.runId === 'string';
    case 'patch':
      return typeof msg.targetId === 'string' && msg.patch != null;
    case 'reset':
      return typeof msg.targetId === 'string';
    case 'eval':
      return typeof msg.code === 'string' && typeof msg.evalId === 'string';
    default:
      return true;
  }
}

// --- Message handler ---

self.onmessage = async (event) => {
  const msg = event.data;
  if (!_validateMainMessage(msg)) {
    console.warn('[panel-live-worker] Invalid message rejected:', msg);
    return;
  }
  try {
    switch (msg.type) {
      case 'init':
        await handleInit(msg.config);
        break;
      case 'run':
        await enqueue(() => handleRun(msg));
        break;
      case 'install':
        await enqueue(() => handleInstall(msg.packages));
        break;
      case 'write-file':
        await enqueue(() => handleWriteFile(msg.name, msg.content));
        break;
      case 'rendered':
        await enqueue(() => handleRendered(msg));
        break;
      case 'patch':
        await enqueue(() => handlePatch(msg));
        break;
      case 'reset':
        await enqueue(() => handleReset(msg));
        break;
      case 'eval':
        await enqueue(() => handleEval(msg));
        break;
      default:
        console.warn('[panel-live-worker] Unknown message type:', msg.type);
    }
  } catch (e) {
    console.error('[panel-live-worker] Error handling message:', msg.type, e);
    if (msg.runId) {
      self.postMessage({
        type: 'error',
        runId: msg.runId,
        message: e.message || String(e),
        traceback: String(e),
      });
    } else if (msg.evalId) {
      self.postMessage({
        type: 'eval-result',
        evalId: msg.evalId,
        result: null,
        error: e.message || String(e),
      });
    }
  }
};

// --- Init: load Pyodide, micropip, install Bokeh+Panel wheels ---

async function handleInit(config) {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    packageAliases = config.packageAliases || {};

    // Disable JSPI before loading Pyodide — Chrome 137+ ships JSPI enabled by
    // default, which causes STATUS_ACCESS_VIOLATION crashes during heavy WASM
    // operations like `import panel as pn`. Removing the JSPI APIs before
    // importScripts forces Pyodide to use the proven pre-JSPI async scheduler.
    // See: pyodide#5702, pyodide#5705
    if (config.disableJSPI !== false && typeof WebAssembly !== 'undefined') {
      if (WebAssembly.Suspending) delete WebAssembly.Suspending;
      if (WebAssembly.promising) delete WebAssembly.promising;
    }

    self.postMessage({ type: 'status', msg: 'Loading Pyodide...' });
    importScripts(config.pyodideUrl);

    self.postMessage({ type: 'status', msg: 'Initializing Pyodide...' });
    pyodide = await self.loadPyodide({
      ...(config.disableJSPI !== false && { enableRunUntilComplete: false }),
    });

    self.postMessage({ type: 'status', msg: 'Loading micropip...' });
    await pyodide.loadPackage('micropip');

    self.postMessage({ type: 'status', msg: 'Installing Bokeh + Panel wheels...' });
    const micropip = pyodide.pyimport('micropip');
    await micropip.install([config.bokehWhl, config.panelWhl]);

    self.postMessage({ type: 'status', msg: 'Initializing Panel...' });
    await pyodide.runPythonAsync(`
import panel as pn
print("Panel", pn.__version__, "ready (worker)")
`);

    // Set up streaming stdout/stderr callbacks as JS globals
    pyodide.globals.set('__stream_stdout__', (text) => {
      if (self._currentRunId) {
        self.postMessage({ type: 'stdout', text, runId: self._currentRunId });
      }
    });
    pyodide.globals.set('__stream_stderr__', (text) => {
      if (self._currentRunId) {
        self.postMessage({ type: 'stderr', text, runId: self._currentRunId });
      }
    });

    // Initialize __active_docs__ dict
    await pyodide.runPythonAsync('__active_docs__ = {}');

    self.postMessage({ type: 'ready' });
  })();
  return initPromise;
}

function _resolveAliases(packages) {
  return packages.map(pkg => packageAliases[pkg] || pkg);
}

// --- Run: detect requirements, execute code, serialize, send render ---

async function handleRun(msg) {
  const { code, targetId, runId } = msg;
  self._currentRunId = runId;

  try {
    // Detect and install requirements
    self.postMessage({ type: 'status', msg: 'Detecting requirements...' });
    pyodide.globals.set('__user_code__', code);
    const newPkgs = await pyodide.runPythonAsync(`
from panel.io.mime_render import find_requirements
import json
json.dumps(find_requirements(__user_code__))
`);
    const requirements = JSON.parse(newPkgs);
    const toInstall = requirements.filter(pkg => !installedPackages.has(pkg.toLowerCase()));
    if (toInstall.length > 0) {
      const resolved = _resolveAliases(toInstall);
      self.postMessage({ type: 'status', msg: 'Installing: ' + toInstall.join(', ') + '...' });
      const micropip = pyodide.pyimport('micropip');
      await micropip.install(resolved);
      toInstall.forEach(pkg => installedPackages.add(pkg.toLowerCase()));
    }

    // Reset document state before execution
    await pyodide.runPythonAsync(`
from bokeh.io.doc import set_curdoc
from bokeh.document import Document
set_curdoc(Document())
`);

    // Run setup (creates doc, execs user code, detects ext resources)
    self.postMessage({ type: 'status', msg: 'Running code...' });
    pyodide.globals.set('__panel_user_code__', code);
    pyodide.globals.set('__panel_target_id__', targetId);
    await pyodide.runPythonAsync(workerSetup);

    // Get stdout/stderr captured during execution
    let capturedStdout = '';
    let capturedStderr = '';
    try {
      capturedStdout = pyodide.globals.get('__captured_stdout__') || '';
      capturedStderr = pyodide.globals.get('__captured_stderr__') || '';
    } catch { /* ignore */ }

    // Get extension resources
    const extResourcesJson = pyodide.globals.get('__ext_resources__');
    const extResources = JSON.parse(extResourcesJson || '{"js":[],"css":[]}');

    // Run render (serialize doc to JSON)
    await pyodide.runPythonAsync(workerRender);
    const renderResult = pyodide.globals.get('__render_result__');

    if (renderResult === '__NO_OUTPUT__') {
      self.postMessage({
        type: 'no-output',
        runId,
        targetId,
        stdout: capturedStdout,
        stderr: capturedStderr,
      });
    } else {
      const { docs_json, render_items, root_ids } = JSON.parse(renderResult);
      self.postMessage({
        type: 'render',
        runId,
        targetId,
        docs_json,
        render_items,
        root_ids,
        ext_resources: extResources,
        stdout: capturedStdout,
        stderr: capturedStderr,
      });
    }

    self.postMessage({ type: 'done', runId });
  } catch (e) {
    // Get any captured output before the error
    let capturedStdout = '';
    let capturedStderr = '';
    try {
      capturedStdout = pyodide.globals.get('__captured_stdout__') || '';
      capturedStderr = pyodide.globals.get('__captured_stderr__') || '';
    } catch { /* ignore */ }

    self.postMessage({
      type: 'error',
      runId,
      targetId,
      message: e.message || String(e),
      traceback: String(e),
      stdout: capturedStdout,
      stderr: capturedStderr,
    });
  } finally {
    self._currentRunId = null;
  }
}

// --- Eval: execute code and return result (no rendering) ---

async function handleEval(msg) {
  const { code, evalId } = msg;
  self._currentRunId = evalId;  // enables stdout/stderr streaming
  try {
    if (!initPromise) {
      throw new Error('Worker not initialized — call init before eval');
    }
    await initPromise;
    const result = await pyodide.runPythonAsync(code);
    let jsResult = null;
    if (result != null) {
      // Proxy objects can't be sent via postMessage — convert to JS
      if (typeof result.toJs === 'function') {
        jsResult = result.toJs({ dict_converter: Object.fromEntries });
        result.destroy();
      } else {
        jsResult = result;
      }
    }
    self.postMessage({ type: 'eval-result', evalId, result: jsResult });
  } catch (e) {
    self.postMessage({
      type: 'eval-result', evalId, result: null,
      error: e.message || String(e),
    });
  } finally {
    self._currentRunId = null;
  }
}

// --- Rendered: main thread finished DOM rendering, link docs for sync ---

async function handleRendered(msg) {
  const { targetId, runId } = msg;
  try {
    // Create sendPatch function for this targetId
    const sendPatch = (patch, buffers, msgId) => {
      self.postMessage({
        type: 'patch',
        targetId,
        patch,
        buffers,
      });
    };
    pyodide.globals.set('__sendPatch__', sendPatch);
    pyodide.globals.set('__panel_target_id__', targetId);

    await pyodide.runPythonAsync(`
from panel.io.pyodide import _link_docs_worker
doc = __active_docs__.get(__panel_target_id__)
if doc:
    _link_docs_worker(doc, __sendPatch__, setter='js')
`);
  } catch (e) {
    console.error('[panel-live-worker] Error in handleRendered:', e);
  }
}

// --- Patch: apply JS→Python patch for bidirectional sync ---

async function handlePatch(msg) {
  const { targetId, patch } = msg;
  try {
    pyodide.globals.set('__patch__', patch);
    pyodide.globals.set('__panel_target_id__', targetId);
    await pyodide.runPythonAsync(`
from panel.io.pyodide import _convert_json_patch
doc = __active_docs__.get(__panel_target_id__)
if doc:
    doc.apply_json_patch(_convert_json_patch(__patch__), setter='js')
`);
  } catch (e) {
    console.error('[panel-live-worker] Error applying patch:', e);
  }
  self.postMessage({ type: 'idle', targetId });
}

// --- Reset: clean up document callbacks for a targetId before re-run ---

async function handleReset(msg) {
  const { targetId } = msg;
  try {
    pyodide.globals.set('__panel_target_id__', targetId);
    await pyodide.runPythonAsync(`
doc = __active_docs__.get(__panel_target_id__)
if doc:
    # Remove all callbacks to prevent stale refs
    doc.callbacks._change_callbacks.clear()
    doc.callbacks._event_callbacks.clear()
    del __active_docs__[__panel_target_id__]
`);
  } catch (e) {
    console.error('[panel-live-worker] Error in reset:', e);
  }
}

// --- Install: install additional packages ---

async function handleInstall(packages) {
  if (!packages || packages.length === 0) return;
  const resolved = _resolveAliases(packages);
  self.postMessage({ type: 'status', msg: 'Installing: ' + packages.join(', ') + '...' });
  const micropip = pyodide.pyimport('micropip');
  await micropip.install(resolved);
  packages.forEach(pkg => {
    const bare = pkg.split(/[=<>!~\[@ ]/)[0].trim().toLowerCase();
    if (bare) installedPackages.add(bare);
  });
}

// --- WriteFile: write a file to the Pyodide filesystem ---

async function handleWriteFile(name, content) {
  pyodide.globals.set('__file_name__', name);
  pyodide.globals.set('__file_content__', content);
  await pyodide.runPythonAsync(`
import pathlib
pathlib.Path(__file_name__).write_text(__file_content__)
`);
}
