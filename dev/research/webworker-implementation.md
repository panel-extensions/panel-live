# Web Worker Implementation for panel-live

Detailed analysis of moving Pyodide execution from the main thread to a Web Worker,
including current architecture, Panel's existing infrastructure, a concrete design,
key challenges, and effort estimates.

---

## 1. Current Architecture (Main-Thread Pyodide)

### 1.1 Singleton Runtime

panel-live uses a shared singleton Pyodide instance managed by module-level variables
in `lib/panel-live.js`:

```js
let _pyodide = null;       // The Pyodide instance, shared across all <panel-live> elements
let _initPromise = null;    // Guards against duplicate initialization
const _installedPackages = new Set(['panel', 'bokeh', 'pyodide-http']);
const _loadedExtResources = new Set();
let _jsResourcesLoaded = false;
```

Every `<panel-live>` element on the page shares the same `_pyodide` instance.
Initialization happens exactly once; subsequent elements await the same `_initPromise`.

### 1.2 Key Functions That Interact With Pyodide

**`initPyodide(statusCallback)`** (lines 172-207):
- Loads Bokeh and Panel JS resources into the main document (`<script>` tags)
- Loads the Pyodide runtime from CDN via a `<script>` tag
- Calls `window.loadPyodide()` to initialize the WASM runtime
- Loads `micropip` and installs Bokeh + Panel wheels
- Runs `import panel as pn` to verify the installation
- Sets `_pyodide` and returns the instance
- All of this blocks the main thread during WASM compilation and package installation

**`detectAndInstallRequirements(code, statusCallback)`** (lines 209-225):
- Uses `panel.io.mime_render.find_requirements()` to detect imports in user code
- Compares against `_installedPackages` to avoid redundant installs
- Installs missing packages via `micropip.install()`
- Runs entirely in `_pyodide.runPythonAsync()` -- synchronous from the main thread's perspective during WASM execution

**`loadExtensionResources()`** (lines 238-260):
- Introspects `bokeh.model.Model.model_class_reverse_map` via Python
- Collects `__javascript__` and `__css__` URLs from registered models
- Loads those resources into the document via `loadScript()` / `loadCSS()`
- This function mixes Python execution (in Pyodide) with DOM manipulation (loading scripts)

**`runPanelCode(targetEl, code, statusCallback)`** (lines 289-399) -- three branches:

1. **Servable branch** (`.servable()` without `target=`):
   - First Python block: Sets up a Bokeh Document, runs user code via `exec()`
   - Calls `loadExtensionResources()` (Python + DOM)
   - Second Python block: Creates DOM elements via `js.document.createElement()`,
     calls `_doc_json()` to serialize the document, then calls
     `js.window.Bokeh.embed.embed_items()` directly from Python
   - Uses `_link_docs()` for bidirectional Python/JS document sync

2. **Servable-with-target branch** (`.servable(target=...)`):
   - First Python block: Same Document setup and `exec()`
   - Calls `loadExtensionResources()` (Python + DOM)
   - Second Python block: Calls `write_doc()` which handles its own DOM embedding

3. **Expression branch** (no `.servable()`):
   - First Python block: Runs code via `exec_with_return()` to capture the result
   - Calls `loadExtensionResources()` (Python + DOM)
   - Second Python block: Calls `write()` to embed the result, or sets `innerHTML`
     via `js.document.getElementById()` if there is no visual output

**Critical observation**: All three branches use `js.document` and `js.window.Bokeh`
from within Python code running in Pyodide. This tight coupling between Python execution
and DOM access is the primary obstacle to a worker migration.

### 1.3 Execution Queue

```js
let _execQueue = Promise.resolve();

function enqueueExecution(fn) {
  _execQueue = _execQueue.then(fn, fn);
  return _execQueue;
}
```

Because Pyodide is single-threaded and relies on shared mutable state
(`state.curdoc`, `set_curdoc()`, globals), all executions are serialized through
a promise chain. This prevents race conditions when multiple `<panel-live>` elements
try to run code simultaneously. In a worker model this serialization would move
inside the worker itself, since the worker's thread is naturally single-threaded.

---

## 2. Panel's Existing Worker Infrastructure

Panel already has a production-proven web worker architecture used by
`panel convert --to pyodide-worker`. It consists of two template files
(~190 lines total) and Python-side support.

### 2.1 Worker Side (`panel/_templates/pyodide_worker.js`)

- Loads Pyodide via `importScripts()` (works in worker context)
- Installs packages via micropip
- Executes user code and generates a Bokeh document
- Serializes the document to JSON via `_doc_json()`
- Sends the serialized JSON to the main thread via `postMessage`
- Handles bidirectional document patching via `_link_docs_worker(doc, sendPatch)`
- Message protocol:

```
Worker -> Main:  {type: 'status', msg}                            Loading progress
Worker -> Main:  {type: 'render', docs_json, render_items, root_ids}  Initial render data
Worker -> Main:  {type: 'patch', patch, buffers}                  Python-side model changes
Worker -> Main:  {type: 'idle'}                                   Ready for next patch
Main -> Worker:  {type: 'rendered'}                               DOM is ready, link docs
Main -> Worker:  {type: 'patch', patch}                           User interaction (widget change)
Main -> Worker:  {type: 'location', location}                     URL/location sync
```

### 2.2 Main-Thread Handler (`panel/_templates/pyodide_handler.js`)

- Creates `new Worker("./app.js")`
- Receives `{type: 'render', docs_json, render_items, root_ids}` from the worker
- Creates DOM elements with `data-root-id` attributes
- Calls `Bokeh.embed.embed_items(docs_json, render_items)` -- all DOM work on main thread
- Sets up bidirectional Bokeh document sync:
  - JS-side: `jsdoc.on_change(send_change)` posts patches to the worker
  - Worker-side: `_link_docs_worker()` relays Python doc changes back
- Manages a message queue with busy/idle handshake to prevent race conditions

### 2.3 Python-Side Support (`panel/io/pyodide.py`)

- `_link_docs_worker(doc, sendPatch)`: Links a Python Document to a dispatch
  function that serializes changes and sends them to the main thread
- `_link_docs(doc, jsdoc)`: Links Python and JS documents (main-thread variant)
- `_doc_json(doc, root_els)`: Serializes a Bokeh Document plus render items to JSON
- `_process_document_events()`: Serializes Bokeh document events for cross-thread transfer
- `write_doc()`: Renders Document contents (works in both main thread and worker)

### 2.4 Key Design Insight

Panel solves the "Pyodide needs DOM access" problem by **never letting the worker
touch the DOM**. Instead:

1. Worker runs Python code and generates a Bokeh Document (pure data)
2. Worker serializes the document to JSON via `_doc_json()`
3. Worker sends the JSON to the main thread via `postMessage`
4. Main thread calls `Bokeh.embed.embed_items()` for all DOM rendering
5. Bidirectional sync relays JSON patches between the worker's Python doc
   and the main thread's Bokeh JS doc

This is the exact pattern panel-live needs to adopt.

---

## 3. Design for panel-live

### 3.1 SharedWorker Architecture

Use a **SharedWorker** so that multiple `<panel-live>` elements on the same page
share a single Pyodide instance. This matches the current singleton pattern
(`_pyodide`, `_initPromise`) and avoids duplicating 300-500MB of WASM memory.

```
Page
+---------------------------+
|  <panel-live> #1          |
|    |                      |
|    +--> port1 ---\        |        SharedWorker
|                   \       |     +------------------+
|  <panel-live> #2   +-----|---> | Pyodide instance  |
|    |               /      |     | micropip          |
|    +--> port2 ---/        |     | Execution queue   |
|                           |     +------------------+
|  <panel-live> #3          |
|    |                      |
|    +--> port3 -----------/
+---------------------------+
```

Each `<panel-live>` element connects to the SharedWorker and gets its own
`MessagePort`. The worker maintains a single Pyodide instance and serializes
execution requests internally.

**Fallback**: If `SharedWorker` is unavailable (Safari < 16, mobile browsers),
fall back to a Dedicated Worker. In the fallback case, the first `<panel-live>`
element creates the worker; subsequent elements communicate through a
main-thread coordination layer.

### 3.2 Message Protocol

```js
// Main thread -> Worker
{type: 'init', config: {pyodideVersion, panelVersion, ...}}
{type: 'install', packages: ['numpy', 'pandas'], portId: 'pl-1'}
{type: 'run', code: '...', targetId: 'pl-output-1', portId: 'pl-1', branch: 'servable'}
{type: 'write-file', name: 'helpers.py', content: '...'}
{type: 'patch', portId: 'pl-1', patch: {...}}

// Worker -> Main thread
{type: 'status', msg: 'Loading Pyodide...', portId: 'pl-1'}
{type: 'ready'}                                // Pyodide initialized
{type: 'render', portId: 'pl-1', docs_json: '...', render_items: '...', root_ids: [...]}
{type: 'result', portId: 'pl-1', hasOutput: true}  // Expression branch result
{type: 'write', portId: 'pl-1', targetId: '...', html: '...'}  // Simple HTML output
{type: 'patch', portId: 'pl-1', patch: {...}, buffers: [...]}
{type: 'idle', portId: 'pl-1'}
{type: 'error', portId: 'pl-1', message: '...', traceback: '...'}
```

The `portId` field identifies which `<panel-live>` element sent the request,
enabling the worker to route responses back to the correct element.

### 3.3 Worker Responsibilities

The worker handles everything that does not require DOM access:

- Pyodide initialization (`loadPyodide()`, `micropip.install()`)
- Package detection and installation (`find_requirements()`, `micropip.install()`)
- User code execution (`exec()`, `exec_with_return()`)
- Document creation and serialization (`Document()`, `_doc_json()`)
- Extension resource detection (introspecting `Model.model_class_reverse_map`)
- Bidirectional document patching (Python side of `_link_docs_worker()`)
- File system operations (`pathlib.Path(...).write_text()`)

### 3.4 Main Thread Responsibilities

The main thread handles everything that requires DOM access:

- Loading Bokeh and Panel JS resources (`<script>` tags)
- Loading extension CSS/JS resources
- Creating DOM elements for Bokeh roots (`<div data-root-id="...">`)
- Calling `Bokeh.embed.embed_items(docs_json, render_items)`
- Managing the JS-side Bokeh document (`jsdoc.on_change(...)`)
- CodeMirror editor creation and management
- Status UI updates (spinners, messages)
- Error display

### 3.5 Refactored `runPanelCode()` Flow (Servable Branch)

Current flow (all on main thread):

```
1. exec(user_code)              -- Python in Pyodide on main thread
2. loadExtensionResources()     -- Python + DOM (mixed)
3. Create DOM elements          -- Python using js.document
4. _doc_json()                  -- Python
5. Bokeh.embed.embed_items()    -- Python calling JS via js.window
6. _link_docs()                 -- Python + JS
```

Proposed flow (split across worker and main thread):

```
Worker:
  1. exec(user_code)              -- Python in worker
  2. Detect extension resources   -- Python only (return URLs)
  3. _doc_json(doc, ...)          -- Serialize document to JSON
  4. postMessage({type: 'render', docs_json, render_items, root_ids, ext_resources})

Main thread (on receiving 'render' message):
  5. Load extension JS/CSS        -- DOM only
  6. Create DOM elements          -- DOM only
  7. Bokeh.embed.embed_items()    -- JS only
  8. postMessage({type: 'rendered'})

Worker (on receiving 'rendered'):
  9. _link_docs_worker(doc, sendPatch)  -- Python only
```

### 3.6 Worker Module Structure

```
lib/
  panel-live.js          -- Main thread: custom element, CodeMirror, DOM
  panel-live-worker.js   -- SharedWorker: Pyodide, execution, serialization
  panel-live.css         -- Styles (unchanged)
```

The worker file would be approximately 150-250 lines, handling Pyodide
initialization, package management, and code execution. The main
`panel-live.js` would shrink by roughly 100 lines (the `runPanelCode()`
inline Python code and `initPyodide()` would move to the worker).

---

## 4. Key Challenges

### 4.1 Bokeh embed_items() Requires Main Thread

`Bokeh.embed.embed_items()` manipulates the DOM directly. It cannot run in a
worker. The solution (as Panel's existing worker code demonstrates) is to
serialize the document to JSON in the worker and send it to the main thread
for embedding. The `_doc_json()` function in `panel.io.pyodide` already
produces exactly the format `embed_items()` expects.

**Mitigation**: Already solved by Panel's template code. Panel-live can reuse
the same pattern.

### 4.2 Servable Branch Creates DOM Elements Mid-Execution

In the current code (lines 331-348), the servable branch runs Python that
directly creates DOM elements:

```python
target_el = js.document.getElementById(__panel_target_id__)
for root in doc.roots:
    el = js.document.createElement('div')
    el.setAttribute('data-root-id', str(root.id))
    target_el.appendChild(el)
```

In a worker, `js.document` is not available. The root IDs and their structure
must be sent as data to the main thread.

**Mitigation**: The worker sends `root_ids` as part of the `render` message.
The main thread creates the DOM elements:

```js
// Main thread handler
function handleRender(msg, targetEl) {
  targetEl.innerHTML = '';
  for (const rootId of msg.root_ids) {
    const el = document.createElement('div');
    el.setAttribute('data-root-id', String(rootId));
    el.id = `el-${rootId}`;
    targetEl.appendChild(el);
  }
  const views = await Bokeh.embed.embed_items(
    JSON.parse(msg.docs_json),
    JSON.parse(msg.render_items)
  );
  // ... set up jsdoc sync
}
```

### 4.3 `js` Module Unavailable in Workers

Pyodide's `js` module provides access to the browser's global scope
(`window`, `document`, etc.). In a Worker context, `js` maps to the
worker's global scope (`self`), which does not include `document`,
`window.Bokeh`, or any DOM APIs.

Code currently using `js.document.getElementById()`,
`js.document.createElement()`, and `js.window.Bokeh.embed.embed_items()`
must be refactored to avoid `js` module DOM access entirely.

**Mitigation**: Replace all `js.document.*` and `js.window.Bokeh.*` calls
in the Python execution code with serialization + message passing. Panel's
`_doc_json()` and `_link_docs_worker()` already provide the needed
abstraction.

### 4.4 The Expression Branch Uses `write()`

The expression branch calls `panel.io.pyodide.write(target_id, result)`,
which internally does DOM manipulation. In a worker, this function cannot
work as-is.

**Mitigation options**:
1. Serialize the result to HTML in the worker and send it to the main thread
   as a `{type: 'write', html: '...'}` message
2. Convert the expression result to a Bokeh document and use the same
   `_doc_json()` serialization path as the servable branch
3. Use `panel.io.pyodide.write_doc()` which might be adaptable to worker mode

Option 2 is cleanest because it unifies all three branches into one
serialization path. `pn.panel(result)` can wrap any expression result
into a Panel object, which can then be added to a Document and serialized.

### 4.5 SharedWorker Browser Support

| Browser | SharedWorker Support |
|---------|---------------------|
| Chrome (desktop) | Yes |
| Firefox (desktop) | Yes |
| Safari 16+ | Yes |
| Safari < 16 | No |
| Edge (desktop) | Yes (Chromium) |
| Chrome Android | No |
| Firefox Android | No |
| Safari iOS | No (WKWebView limitation) |

SharedWorker support on mobile is essentially non-existent. The implementation
must include a fallback to a Dedicated Worker.

**Fallback strategy**:

```js
function createWorker(url) {
  if (typeof SharedWorker !== 'undefined') {
    const sw = new SharedWorker(url);
    return sw.port;  // MessagePort interface
  }
  // Fall back to Dedicated Worker
  const w = new Worker(url);
  return w;  // Worker has the same postMessage/onmessage interface
}
```

Both `MessagePort` and `Worker` share the `postMessage`/`onmessage` interface,
making the abstraction relatively clean. The worker code needs a small
conditional at the top to handle both cases:

```js
// panel-live-worker.js
if (typeof SharedWorkerGlobalScope !== 'undefined') {
  // SharedWorker mode: handle connections
  self.onconnect = (e) => {
    const port = e.ports[0];
    handlePort(port);
  };
} else {
  // Dedicated Worker mode: use self directly
  handlePort(self);
}
```

### 4.6 Re-Execution and State Reset

The current singleton model allows re-running code because the same Python
namespace can be cleared and rebuilt. In a worker, re-execution needs to:

1. Clear the previous Bokeh Document state (`set_curdoc(Document())`)
2. Clean up any linked document callbacks
3. Execute the new code
4. Serialize and send the new document

**Option A**: Reset within the same worker (faster, but risks state leaks):
```python
# Worker-side reset between runs
from bokeh.document import Document
from bokeh.io.doc import set_curdoc
doc = Document()
set_curdoc(doc)
state.curdoc = doc
# exec(new_code)
```

**Option B**: Terminate and recreate the worker (slower, but guaranteed clean state):
- Advantages: Reclaims all WASM memory, no state leaks
- Disadvantages: Re-initialization takes 5-15 seconds
- Useful for "hard reset" or when memory pressure is detected

Recommendation: Use Option A by default, with Option B available as a "full reset"
escape hatch (e.g., a "Reset Runtime" button in playground mode).

### 4.7 Execution Serialization in SharedWorker

With multiple `<panel-live>` elements sharing one worker, execution must be
serialized. Pyodide is single-threaded, and shared Python state (`state.curdoc`)
means concurrent execution would corrupt state.

The worker should maintain its own execution queue:

```js
// Inside worker
let execQueue = Promise.resolve();

function enqueue(fn) {
  execQueue = execQueue.then(fn, fn);
  return execQueue;
}

function handlePort(port) {
  port.onmessage = async (e) => {
    const msg = e.data;
    if (msg.type === 'run') {
      await enqueue(() => executeCode(msg, port));
    }
    // ...
  };
}
```

This mirrors the existing `_execQueue` pattern but lives in the worker.

---

## 5. Effort Estimate

### Phase 1: Dedicated Worker (MVP)

| Task | Description | Effort |
|------|-------------|--------|
| Create `panel-live-worker.js` | Worker file with Pyodide init, package management, code execution | Medium |
| Refactor `initPyodide()` | Move from main thread to worker, add message-based status reporting | Small |
| Refactor `runPanelCode()` servable branch | Split into worker execution + main-thread DOM rendering | Medium |
| Refactor `runPanelCode()` expression branch | Serialize result in worker, render on main thread | Medium |
| Main-thread message handler | Receive render/patch/error messages, do DOM work, relay patches back | Medium |
| Execution queue in worker | Move `_execQueue` into worker, handle concurrent requests | Small |
| Extension resource loading | Worker detects resources, main thread loads JS/CSS | Small |
| Error handling | Structured error messages from worker to main thread | Small |
| Testing and debugging | Verify all three branches work, test re-execution, multi-element pages | Medium |

**Total Phase 1**: ~2-3 weeks for one developer

### Phase 2: SharedWorker + Fallback

| Task | Description | Effort |
|------|-------------|--------|
| SharedWorker wrapper | `onconnect` handler, port management, routing by `portId` | Small |
| Fallback detection | Feature-detect SharedWorker, fall back to Dedicated Worker | Small |
| Port abstraction | Unified interface for SharedWorker port vs. Dedicated Worker | Small |
| Multi-element testing | Test 3-5 elements sharing one worker, verify isolation | Medium |
| Memory monitoring | Detect high memory usage, offer "reset runtime" | Small |

**Total Phase 2**: ~1 week for one developer

### Phase 3: Polish and Edge Cases

| Task | Description | Effort |
|------|-------------|--------|
| Write-file support | `{type: 'write-file'}` for multi-file `<panel-file>` support | Small |
| Explicit requirements | `{type: 'install'}` for `<panel-requirements>` packages | Small |
| Worker termination/recreation | "Full reset" capability | Small |
| COOP/COEP removal | Workers may not need cross-origin isolation headers | Small |
| Performance profiling | Measure message serialization overhead, optimize if needed | Medium |
| Documentation | Update API docs, add worker architecture diagram | Small |

**Total Phase 3**: ~1 week for one developer

### Summary

| Phase | Scope | Effort | Cumulative |
|-------|-------|--------|------------|
| Phase 1 | Dedicated Worker MVP | 2-3 weeks | 2-3 weeks |
| Phase 2 | SharedWorker + fallback | 1 week | 3-4 weeks |
| Phase 3 | Polish and edge cases | 1 week | 4-5 weeks |

---

## 6. Recommendation

Start with a **Dedicated Worker** (Phase 1). This delivers the most critical
benefit -- an unblocked main thread -- with minimal complexity. SharedWorker
(Phase 2) can follow once the Dedicated Worker is stable and tested.

The strongest accelerator is **reusing Panel's existing worker code**. The
`pyodide_worker.js` template and `_link_docs_worker()` Python function
provide proven solutions for the hardest problems (document serialization
and bidirectional sync). Panel-live's adaptation mainly involves making
these patterns dynamic (runtime code injection instead of build-time templates)
and multi-instance aware (port routing instead of single-page assumptions).

The main risk is the **expression branch**, which currently uses
`panel.io.pyodide.write()` in a way that assumes DOM access. This branch
needs the most design work. The recommended approach is to unify all
branches through document serialization (`_doc_json()`), converting
expression results to Panel objects before serialization.

---

## 7. Maintenance Strategy for Worker Code

panel-live should maintain its own copy of the worker code rather than importing from Panel directly. This avoids regression errors if Panel's internal worker API changes.

**Approach:**

1. Copy and adapt Panel's `pyodide_worker.js` and `pyodide_handler.js` into `lib/panel-live-worker.js`
2. Document which Panel internal APIs the worker depends on (`_doc_json()`, `_link_docs_worker()`, `_process_document_events()`)
3. Pin the Panel version compatibility (e.g., "tested with Panel 1.x–1.y")
4. Add a CI check or manual review step when upgrading Panel to verify worker compatibility
5. Keep the adaptation minimal — avoid adding panel-live-specific logic into the copied Panel code where possible; instead, wrap or compose around it

**Why own copy over direct import:**

- Panel's worker templates are internal, undocumented APIs with no stability guarantee
- Panel may refactor the worker protocol between releases
- panel-live's needs diverge from Panel's (dynamic code injection, multi-instance SharedWorker, re-execution support)
- An own copy gives panel-live control over when to adopt changes
