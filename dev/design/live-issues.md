# Panel Live - Issues & Roadmap

Outstanding issues for the Panel Live feature. See also `live-dream.md` for vision and `live-analysis.md` for architecture notes.

**Priority levels:**

- **P0 - Blocker**: Must resolve before any public release. Fundamental decisions or critical bugs.
- **P1 - Critical**: Required for a credible MVP / initial release.
- **P2 - Important**: Needed for a polished, competitive product.
- **P3 - Nice-to-have**: Future enhancements and stretch goals.

**Current state:** 36 issues total. 21 resolved, 4 partially resolved, 7 open. The web component (`lib/panel-live.js`) implements the `<panel-live>` custom element with 3 modes (app, editor, playground), declarative + imperative API, CSS custom properties theming (`--pl-*` variables with light/dark presets), CodeMirror 5 editor, multi-file support (`<panel-file>`), explicit requirements (`<panel-requirements>`), and an interactive API explorer. CSS is in a separate `panel-live.css` file. Pyodide runs inline on the main thread (no iframe mode, no web worker yet).

---

## Category 1: Foundation & Architecture Decisions

These issues must be resolved first as they shape everything else.

### P0 - Design Extensible User/Developer-Facing API [RESOLVED]

**Decision:** The API uses a single `<panel-live>` custom element (Light DOM) with `mode="app|editor|playground"` attribute. Full specification in `api-design.md`.

**Key design decisions:**

1. **`<panel-live>` custom element** — not `<script type="panel">`; attributes configure behavior naturally; 3 of 4 competitors use custom elements
2. **Light DOM** — required because Bokeh's `embed_items()` uses `document.getElementById()` which can't reach into Shadow DOM
3. **Single element, mode as attribute** — `mode="app|editor|playground"` is simpler than 3 separate tag types
4. **Dual API** — declarative HTML for simple cases, imperative JS (`PanelLive.mount()`) for framework integration
5. **`theme="auto"` default** — respects `prefers-color-scheme` media query; overridable with `"dark"` or `"light"`

**What's specified:**

- HTML attributes: `mode`, `theme`, `layout`, `src`, `fullscreen`, `height`, `auto-run`, `label`, `examples-src`, `code-visibility`
- Child elements: `<panel-file>` (multi-file), `<panel-requirements>` (pip specifiers), `<panel-example>` (playground examples) — all with `src` attribute support
- JS API: `PanelLive.configure()`, `.init()`, `.mount()` returning `PanelLiveController`
- CSS custom properties: `--pl-*` variables for full theming with light/dark presets
- Events: `pl-status`, `pl-ready`, `pl-error`, `pl-run-start`, `pl-run-end`
- Future: `worker` attribute reserved for transparent web worker support via adapter pattern

**Unblocks:** Multi-file Support, Requirements / Package Specification, Playground Layout Options, Customizable Styling.

---

### P0 - Settle on Name [RESOLVED]

**Decision:** The name is **`panel-live`**. This mirrors the "shinylive" naming convention and communicates interactivity.

**Implications:**

- JS library: `PanelLive`
- Script types: `<script type="panel">`, `<script type="panel-editor">`, `<script type="panel-playground">`
- CDN path: `cdn.holoviz.org/panel-live/1.0.0/panel-live.min.js`
- npm package: `panel-live`
- Sphinx extension: `sphinx-panel-live` (directive: `.. panel-live::`)
- MkDocs extension: `mkdocs-panel-live`
- CSS: `panel-live.css`

---

### P0 - Determine Repository [RESOLVED — UPDATED]

**Decision (updated):** The code will live in a **separate `panel-live` repo** under the `panel-extensions` GitHub organization (`https://github.com/panel-extensions/panel-live`). The repo will be scaffolded using the `copier-template-panel-extension` template, producing a Python package (`panel-live`) that can provide Sphinx and MkDocs extensions.

**Previous decision:** The code was initially planned to stay in the panel repo for version coupling simplicity. The separate repo approach was chosen to keep panel-live independently releasable and to leverage the panel-extensions ecosystem.

**Hosting:** The live site will use GitHub Pages from the `panel-extensions/panel-live` repo or a separate `holoviz-dev/panel-live` deployment.

---

### P0 - Web Worker Support

**Problem:** Pyodide runs on the main thread, blocking the page during load (~5-15 seconds) and during Python execution. The page becomes completely unresponsive.

**Why it matters:** **Every competitor uses web workers** (stlite, gradio-lite, shinylive, PyScript). This is table stakes for a credible product. Without workers, embedding in documentation or content pages degrades the entire page experience.

**Current state:** No web worker usage in panel-live. However, **Panel already has a complete, production-proven web worker implementation** used by `panel convert --to pyodide-worker` (the default target). This should be adapted rather than built from scratch.

**Existing Panel worker architecture** (2 template files, ~190 lines total):

- `panel/_templates/pyodide_worker.js` — Runs Pyodide in a Web Worker. Loads packages, executes user code, returns serialized Bokeh document JSON via `postMessage`. Never touches the DOM.
- `panel/_templates/pyodide_handler.js` — Main thread handler. Creates the Worker, receives the rendered document, calls `Bokeh.embed.embed_items()` to do all DOM work, then sets up bi-directional sync via Bokeh's JSON patch protocol.

**Message protocol (proven pattern):**

```
Worker → Main:  {type: 'status', msg}         Loading progress
Worker → Main:  {type: 'render', docs_json, render_items, root_ids}   Initial render
Worker → Main:  {type: 'patch', patch, buffers}   Python-side changes
Worker → Main:  {type: 'idle'}                 Ready for next patch
Main → Worker:  {type: 'rendered'}             DOM is ready, link docs
Main → Worker:  {type: 'patch', patch}         User interaction (widget change)
Main → Worker:  {type: 'location', location}   URL/location sync
```

**Key design insight — how Panel solves "Pyodide needs DOM access":**

Pyodide in the worker **never touches the DOM**. Instead:
1. Worker runs Python code → generates Bokeh document JSON (`_doc_json()`)
2. Worker sends serialized JSON to main thread via `postMessage`
3. Main thread calls `Bokeh.embed.embed_items()` for all DOM rendering
4. Bi-directional sync uses `_link_docs_worker(doc, sendPatch)` (Python side) and `jsdoc.on_change(send_change)` (JS side) to relay JSON patches between the worker's Python doc and the main thread's Bokeh JS doc
5. Event queue with busy/idle handshake prevents race conditions

**Adaptation plan for panel-live:**

1. Adapt `pyodide_worker.js` to work dynamically (current version uses build-time template variables `{{ code }}`, `{{ env_spec }}`, etc. — panel-live needs to send code at runtime via `postMessage`)
2. Adapt `pyodide_handler.js` to target arbitrary containers (current version assumes full-page rendering with `document.querySelectorAll('[data-root-id]')`)
3. Support re-running code (current worker is one-shot; panel-live editor/playground needs to re-execute)
4. Consider SharedWorker for multiple apps on one page (reduces memory from ~300-500MB per app to ~300-500MB total)

**Acceptance criteria:** Pyodide loads and runs Python in a web worker. Main thread stays responsive (no jank). Loading spinner/progress animates smoothly during load.

**Blocks:** Keep page responsive during load. Related to: Browser Crash (main thread memory pressure).

---

### P0 - Browser Crash (STATUS_ACCESS_VIOLATION)

**Problem:** The browser keeps crashing with `STATUS_ACCESS_VIOLATION` - both behind Jupyter server proxy and locally on Windows, including when using `serve.py`. Sometimes stops around "Loaded pyodide-http", sometimes crashes immediately.

**Why it matters:** A crashing browser is a showstopper. Users cannot evaluate or trust the product.

**Current state:** `serve.py` adds COOP/COEP headers for SharedArrayBuffer (reduces Pyodide memory ~50%). `live-analysis.md` documents that without these headers, Pyodide doubles memory usage. But crashes still occur.

**Likely causes:**

- Main thread memory pressure without web workers (single Pyodide instance, but still ~300-500MB)
- Missing COOP/COEP headers when served behind proxies that strip them
- Versions of panel, bokeh and pyodide that do not work well together

**Browser-specific observation:** Firefox seldom crashes (if at all), while Edge/Chrome crash frequently. This suggests a Chromium-specific memory management issue, possibly related to V8's handling of large WASM heaps or SharedArrayBuffer allocation.

**Suggested approach:**

1. Reproduce and document exact crash conditions (browser, OS, number of apps) — especially Chrome/Edge vs Firefox comparison
2. Add memory monitoring / logging before crash point
3. Web Worker support (P0 above) should significantly reduce main thread memory pressure
4. Investigate SharedArrayBuffer availability and fallback behavior
5. Profile Chromium-specific WASM heap behavior

**Acceptance criteria:** No browser crashes on reference hardware (8GB RAM machine) with up to 3 concurrent apps. Known limitations documented.

---

### ~~P1 - Evaluate PyScript as Foundation~~ [RESOLVED — REJECTED]

**Decision:** PyScript will **not** be used as a foundation or dependency.

**Reasons:**

1. **Extra dependency risk** — PyScript must be version-compatible with both Pyodide and Panel. Three-way version coupling is fragile and hard to maintain.
2. **Stability concerns** — PyScript has historically been unstable, with breaking API changes across releases.
3. **Not needed** — The web component (`lib/panel-live.js`) proves that everything works without PyScript: Pyodide loading, code execution, editor (CodeMirror), extension resource loading, and Panel rendering.
4. **Panel already has worker support** — `panel/_templates/pyodide_worker.js` provides a proven web worker pattern, eliminating PyScript's `coincident` as a motivation.

**POC evaluation completed** — see `research/pyscript-evaluation.md` for the full investigation. The POC confirmed that PyScript adds a layer of abstraction with no meaningful value for Panel's use case.

---

### ~~P1 - Folder and File Structure~~ [RESOLVED]

**Problem:** The monolithic `panel-embed.js` (1479 lines IIFE) is hard to maintain, test, or tree-shake.

**Why it matters:** A proper structure is needed before adding features, tests, or build tooling. Technical debt compounds fast.

**Previous structure:**

```text
live/
  serve.py             # dev server
  src/
    panel-embed.js     # 1479-line monolith
    panel-runner.html  # iframe runner
  demos/
    playground.html    # full-page playground
    embed-iframe.html  # iframe demos
    embed-inline.html  # inline demos
  examples/            # 2 example .py files
```

**Resolution:** The repo now matches the confirmed structure exactly:

```text
panel-live/
  src/panel_live/      # Python package (__init__.py, main.py, fences.py)
  lib/                 # Web component library
    panel-live.js
    panel-live.css
  examples/
    *.py
  docs/                # Documentation site (MkDocs/zensical)
    index.md, demo.md, examples.md
    assets/js/, assets/css/
  tests/               # Tests (conftest.py, test_core.py, ui/)
  serve.py             # Dev server with COOP/COEP headers
```

The iframe runner (`panel-runner.html`, `runner.html`) has been removed from the architecture. The refactored `panel-live.js` uses inline-only execution where Pyodide runs on the main thread and Bokeh renders directly into the output container. Future web worker support will use `postMessage` for serialized document exchange, not iframes.

**Blocked by:** Settle on Name (resolved).

---

### ~~P1 - Separate CSS~~ [RESOLVED]

**Resolution:** CSS extracted from `panel-live.js` into a standalone `panel-live.css` file (372 lines). The JS file no longer contains or auto-injects any CSS. HTML pages load the stylesheet explicitly via `<link rel="stylesheet" href="panel-live.css">` before the script tag. This enables CSS syntax highlighting, linting, autoprefixing, and clean separation of concerns. CSS custom properties (`--pl-*`) with light/dark theme presets are preserved.

---

## Category 2: Bugs & Stability

Issues that affect reliability of the current implementation.

### ~~P0 - Does Not Work with panel-material-ui~~ [RESOLVED]

**Problem:** A "shim" error appeared in the browser console when creating apps that use panel-material-ui.

**Resolution:** Confirmed working in `docs/playground.html` — `pmui.Button(label="Click Me")` renders successfully. The original issue may have been related to an older panel-material-ui version or missing extension resource loading. The web component POC's `loadExtensionResources()` correctly loads PMU's JS/CSS dependencies.

**Status:** No longer a blocker. Keep an eye on more complex PMU widgets (e.g., DataGrid, Select) but basic functionality is confirmed.

---

### ~~P1 - Cannot Select Code with Mouse~~ [RESOLVED]

**Resolution:** The web component rewrite uses standard CodeMirror 5 integration with no CSS blocking selection (`user-select`, `pointer-events`). Code selection works in all modes (editor and playground). The original issue was caused by overlapping transparent elements in the old `panel-embed.js` architecture.

---

### P1 - Handle Python Errors Properly [PARTIALLY RESOLVED]

**Problem:** Python exceptions go to the browser console but aren't communicated well to the user. Tracebacks are raw and unformatted.

**Why it matters:** Users (especially beginners) need clear, visible error messages to debug their code. This is critical for the editor/playground use case.

**Current state:** Errors now display inline in the output area with themed styling (`--pl-error-color`, `--pl-error-bg`), HTML-escaped, in a `<pre>` block. All 3 modes (app, editor, playground) handle errors identically via `runPanelCode()`. Top-level execution errors and import errors are caught and displayed.

**Remaining work (downgraded to P2):**

1. Structured traceback formatting with syntax highlighting (filename, line number, error type)
2. Collapsible error panel in playground mode (errors currently replace the app output)
3. "Copy error" button for bug reporting
4. Capture `sys.stderr` and `console.error` from the Pyodide context for async/callback errors

**Acceptance criteria:** All Python errors visible to the user in a formatted error panel. Tracebacks show file, line number, and error message clearly.

---

### P2 - Tracking Prevention Blocks CDN Resources

**Problem:** Browser tracking prevention blocks `cdnjs.cloudflare.com` resources (CodeMirror CSS), logged as: `Tracking Prevention blocked access to storage for https://cdnjs.cloudflare.com/...`

**Why it matters:** Users with strict browser settings (common in corporate environments) get a broken editor.

**Suggested approach:**

1. Prefer a non-blocked CDN (e.g., `cdn.jsdelivr.net`) as the primary CDN for CodeMirror assets
2. Upgrading to CodeMirror 6 (separate issue) may resolve this entirely by bundling CM6 into the build
3. Bundling CodeMirror CSS into the panel-live CSS file during build as a longer-term solution

**Acceptance criteria:** Editor works with browser tracking prevention enabled. No third-party CDN dependencies for core functionality.

---

### P2 - CodeMirror 5 is Legacy

**Problem:** The POC uses CodeMirror 5 which is in maintenance mode. CodeMirror 6 is the actively developed version with better accessibility, mobile support, and extensibility.

**Why it matters:** CodeMirror 5 won't receive new features. Competitors use CodeMirror 6 or Monaco. The `playground.html` inconsistently uses a raw `<textarea>` instead of CodeMirror.

**Suggested approach:** Upgrade to CodeMirror 6. This also resolves the Tracking Prevention issue (bundle CM6 in the build) and potentially the mouse selection issue.

**Acceptance criteria:** CodeMirror 6 used consistently across editor and playground modes. Same editing experience in both.

---

### P2 - postMessage Security

**Problem:** The old `panel-embed.js` used `window.addEventListener('message', ...)` in `panel-runner.html` without validating `event.origin`.

**Current state:** The refactored `panel-live.js` has no iframe mode and no `postMessage` handlers — Pyodide runs inline on the main thread. This issue is **largely mitigated** by the architecture change. However, it will become relevant again when web worker support is added (workers use `postMessage` for communication).

**Future consideration:** When implementing web worker support, ensure the worker↔main thread `postMessage` protocol validates message structure and uses a nonce or token. Since workers are same-origin by design, cross-origin attacks are less of a concern than with iframes.

**Acceptance criteria:** Any future `postMessage` handlers validate message structure. Documented security model.

---

### P2 - Memory Leak on Re-run (Hypothesis)

**Problem:** `live-analysis.md` documents that Pyodide proxy functions may accumulate across runs. No cleanup mechanism exists. **Note:** This is currently a hypothesis that needs testing, not a confirmed bug.

**Why it matters:** In playground/editor mode, users re-run frequently. If memory does grow with each run, it would eventually degrade performance or crash.

**Suggested approach:**

1. **First, confirm whether memory actually leaks** via browser profiling (DevTools Memory tab) across 20+ re-runs of the same app
2. If confirmed: investigate `pyodide.runPython` cleanup, `destroy()` proxies, or full namespace reset between runs
3. If not confirmed: close this issue

**Acceptance criteria:** Browser profiling results documenting memory behavior across 20+ consecutive re-runs. If leak confirmed: memory usage stays stable. If not: issue closed with evidence.

---

### P2 - Docs Theme Toggle Does Not Update Editor/Playground Theme

**Problem:** When switching the docs site theme (light ↔ dark), the `<panel-live>` editor and playground instances do not update their theme to match. The component renders with the theme that was active at page load and does not react to subsequent changes.

**Why it matters:** The docs site (MkDocs/Material) has a theme toggle. Users expect all page content — including embedded interactive examples — to follow the site theme. A mismatch between a dark site chrome and a light editor (or vice versa) looks broken.

**Likely cause:** The `<panel-live>` element resolves `theme="auto"` once during `connectedCallback()` by reading `prefers-color-scheme`, but MkDocs Material toggles theme via a `data-md-color-scheme` attribute on `<body>`, not via the OS media query. The component has no `MutationObserver` or event listener watching for host-page theme changes.

**Suggested approach:**

1. Watch for `prefers-color-scheme` media query changes (`matchMedia.addEventListener('change', ...)`)
2. Optionally watch for `data-md-color-scheme` attribute changes on `<body>` (MkDocs Material convention) or a configurable CSS selector
3. When theme changes, update `data-resolved-theme` and re-apply `--pl-*` CSS variable presets
4. Ensure CodeMirror editor theme switches accordingly (default ↔ Dracula)

**Acceptance criteria:** Toggling the docs site theme immediately updates all `<panel-live>` instances on the page. Works for both `prefers-color-scheme` changes and MkDocs Material theme toggle.

---

## Category 3: Developer Experience & Features

Features needed for a competitive product.

### ~~P1 - Interactive API Explorer Page~~ [RESOLVED]

**Resolution:** `docs/api-explorer.html` provides a full interactive explorer. Users can switch between all 3 display modes (app, editor, playground), change themes (auto, light, dark), toggle layout (horizontal, vertical), configure code-position (first, last), label, height, auto-run, and code-visibility (visible, hidden, collapsed). A sidebar with 14 example snippets, featured CSS variable controls (color pickers, range sliders), and advanced CSS overrides lets users configure every aspect. The generated HTML panel updates live, showing the exact markup needed to reproduce the current configuration, with a Copy button.

---

### ~~P2 - Multi-file Support~~ [RESOLVED]

**Resolution:** The `<panel-file>` custom element supports multi-file apps. Each `<panel-file name="utils.py">` child declares a file; one is marked `entrypoint` (or the first is used by default). Files also support `src` attribute for loading from external URLs. At runtime, `_extractCode()` resolves all file contents and `_initAndRun()` writes non-entrypoint files to Pyodide's virtual filesystem via `pathlib.Path().write_text()` before executing the entrypoint. The imperative `PanelLive.mount({files: {...}})` API also supports multi-file apps.

---

### ~~P2 - Requirements / Package Specification~~ [RESOLVED]

**Resolution:** The `<panel-requirements>` custom element allows explicit package specification (one package per line, pip specifier format, comments supported). `installExplicitRequirements()` installs them via micropip before code execution, with progress shown in the status bar. Auto-detection via `find_requirements()` remains as a fallback for all code execution. The imperative API also supports `PanelLive.mount({requirements: [...]})`. Both explicit and auto-detected packages are tracked in `_installedPackages` to avoid reinstallation.

---

### P1 - Copy Code Button

**Problem:** No way to easily copy code from the editor or app view. Additionally, there's no way to copy the `<panel-live>` embedding HTML for reuse in other pages or for reporting issues.

**Why it matters:** Users want to copy examples to their own projects. This is a primary use case for documentation embeddings. Being able to copy the embedding code (not just the Python) makes it trivial to share or report issues with a fully reproducible snippet.

**Suggested approach:**

1. **Copy Python code:** Add a copy-to-clipboard button (top-right corner of code block, like GitHub code blocks). Show brief "Copied!" confirmation. Visible in editor and app (visible code) modes.
2. **Copy embedding code:** Add a second action (e.g., "Copy Embed" button or a dropdown with options) that copies the `<panel-live>` HTML markup. Two formats:
   - **Minimal:** Just the `<panel-live>` tag with its content and any dependency imports — suitable for pasting into an existing page that already loads `panel-live.js`/`.css`
   - **Full standalone HTML:** A complete, self-contained HTML file including `<script>`/`<link>` tags for panel-live assets, COOP/COEP `<meta>` tags, and the `<panel-live>` element — can be saved as `.html` and opened directly

**Acceptance criteria:** Copy Python button visible on hover/focus in editor and app (visible code) modes. Copy embed action available in editor and playground modes. Both formats produce valid, runnable output. Works across browsers.

---

### P2 - Prescript / Setup Code

**Problem:** No mechanism exists to run setup code before the user's Python code executes. Common needs include calling `pn.extension(design="material")`, importing shared modules, or setting default parameter values — but currently each code block must repeat this boilerplate.

**Why it matters:** Documentation pages often want a consistent design or shared imports across all examples. Repeating `pn.extension(...)` or `import panel_material_ui as pmui` in every code block is noisy, error-prone, and obscures the actual example. A prescript mechanism also enables site-wide configuration (e.g., "all examples on this site use Material design") without modifying individual examples.

**Suggested approach:**

1. **HTML-level:** Support a `<panel-prescript>` child element (or `prescript` attribute) on `<panel-live>` that contains Python code to execute before the user's code. The prescript code runs once per Pyodide session, before the first user code execution.
2. **MkDocs-level:** Add a `prescript` option to the custom fence configuration in `zensical.toml` / `mkdocs.yml`, so all `` ```panel `` blocks on the site automatically run the prescript. Per-block override via fence attributes.
3. **Use cases:**
   - `pn.extension(design="material")` — apply Material design to all examples
   - Shared imports (`import panel_material_ui as pmui`)
   - Default parameter overrides (`pmui.Paper.param.margin.default = 10`)
   - Common data setup (e.g., loading a shared DataFrame)

**Acceptance criteria:** Prescript code runs before user code in all modes. Configurable at both the element level and the MkDocs site level. Prescript errors are reported clearly (not silently swallowed).

**Related to:** MkDocs Extension (resolved), Document MkDocs Integration (P2).

---

### ~~P1 - Loading Progress (All Modes)~~ [RESOLVED]

**Resolution:** All 3 modes now use identical loading UI: a `.pl-status` bar with `.pl-spinner` CSS animation and stage text. Loading stages progress through: "Loading Bokeh & Panel JS..." → "Loading Pyodide..." → "Initializing Pyodide..." → "Loading micropip..." → "Installing Bokeh + Panel wheels..." → "Initializing Panel..." → "Running app...". The same `initPyodide()` + `_initAndRun()` code path is used for all modes, ensuring consistent behavior. Note: animation may still stutter when the main thread is blocked during Pyodide initialization (web worker support will fully resolve this).

---

### P2 - Choose and Configure Editor Theme [PARTIALLY RESOLVED]

**Current state:** The `theme` attribute (`"auto"`, `"light"`, `"dark"`) switches between CodeMirror's default light theme and Dracula for dark. `theme="auto"` respects `prefers-color-scheme` media query. The resolved theme is applied to both the editor and the surrounding UI via `data-resolved-theme` attribute and `--pl-*` CSS variables.

**Remaining work:**

1. Additional built-in editor themes beyond default/Dracula (e.g., `one-light`, `one-dark`, `solarized`)
2. High-contrast theme for accessibility
3. Configurable editor theme independent of UI theme (e.g., dark UI with light editor)

**Acceptance criteria:** Default theme looks professional in both light and dark contexts. Users can switch themes via attribute.

---

### ~~P2 - Align Styles Across Modes~~ [RESOLVED]

**Resolution:** The refactored `panel-live.js` uses a unified CSS variable system (`--pl-*`) with light/dark theme presets. All 3 modes share the same component classes (`.pl-container`, `.pl-status`, `.pl-btn`, `.pl-editor-header`, `.pl-output`). Styles live in a separate `panel-live.css` file loaded via `<link>` tag. The `theme` attribute and `data-resolved-theme` ensure consistent theming across modes.

---

### ~~P2 - Customizable Styling / Branding~~ [RESOLVED]

**Resolution:** Full `--pl-*` CSS variable system is implemented, covering all configurable values: colors (`--pl-bg`, `--pl-text`, `--pl-accent`, `--pl-border`, `--pl-error-color`, `--pl-error-bg`, `--pl-output-bg`), spacing (`--pl-radius`), and more. Light and dark theme presets are built in, with `theme="auto"` detecting `prefers-color-scheme`. The `label` attribute configures the header pill text (defaults to "PYTHON"). Users can override any `--pl-*` variable in their own CSS to brand the component.

---

### ~~P2 - Playground Layout Options~~ [RESOLVED]

**Resolution:** The `layout` attribute is implemented with `"horizontal"` (side-by-side, default) and `"vertical"` (code above, preview below) options. The layout is applied via CSS flex-direction on the `.pl-playground` container. Auto-detection based on container width is not yet implemented but could be added as a future enhancement.

---

### P2 - Version Info Display & Version Switching

**Problem:** Users have no way to see which versions of Pyodide, Python, Panel, Bokeh, and other installed packages are running. In playground mode, there is also no way to switch between versions of Pyodide, Panel, or Bokeh and restart the runtime with the new versions.

**Why it matters:** Version visibility is essential for debugging ("does my code fail because of a Panel bug fixed in a newer release?") and for reproducing issues ("which exact versions was this shared snippet running on?"). Version switching in the playground lets users test their code against different releases, verify bug fixes, and explore new features — all without leaving the browser.

**Suggested approach:**

1. **Version info display (all modes):**
   - Show an info panel / popover (e.g., triggered by an ℹ️ icon or "About" link) listing runtime versions: Pyodide, Python, Panel, Bokeh, and any user-installed packages with their versions
   - Query versions at runtime from `pyodide.version`, `panel.__version__`, `bokeh.__version__`, `sys.version`, and `micropip.list()` or equivalent
   - Optionally include this info in the URL-shared state so recipients see the same environment

2. **Version switching (playground mode):**
   - Provide a UI (dropdown, settings panel, or modal) to select versions of Pyodide, Panel, and Bokeh
   - Changing a version triggers a full runtime restart: tear down the current Pyodide instance, load the selected Pyodide version, reinstall packages at the selected versions, and re-run the user's code
   - Show available versions (fetched from CDN/PyPI metadata or a curated list)
   - Warn users that switching versions restarts the runtime and clears any in-memory state

**Acceptance criteria:** All modes display current runtime/package versions on demand. Playground mode allows users to switch Pyodide, Panel, and Bokeh versions and restart the runtime. Version info is accurate and updates after a version switch.

**Related to:** API Design (P0), Loading Progress (P1).

---

### P3 - URL Sharing with Compression

**Problem:** URL sharing exists (gzip + base64url in hash) but could be improved.

**Why it matters:** Sharing is a key use case for playgrounds and documentation. Shorter URLs are easier to share.

**Current state:** Working basic implementation.

**Suggested improvements:**

- Show a "Share" button that copies the URL
- Preview the URL length / warn if too long
- Consider py.cafe's approach with `c=` parameter for gzip-compressed JSON

**Acceptance criteria:** Share button visible in playground/editor modes. Generates compact, shareable URL.

---

### ~~P3 - Dark Theme Support~~ [RESOLVED]

**Resolution:** `theme="auto"|"light"|"dark"` attribute is implemented. `"auto"` (default) detects from `prefers-color-scheme` media query. The resolved theme is stored in `data-resolved-theme` attribute, which drives `--pl-*` CSS variable presets for dark and light modes. The editor uses Dracula theme in dark mode and CodeMirror default in light mode. Note: Panel app output area always uses a white background (`--pl-output-bg: #ffffff`) because Panel apps render with light theme by default.

---

### P2 - Zero-Install Deployment / Link Sharing

**Problem:** There's no way to share a panel-live app by simply sending a URL. Currently requires a server with specific headers (COOP/COEP for SharedArrayBuffer). Can we make it work by just opening a GitHub raw URL, GitHub Pages link, or similar static host?

**Why it matters:** The killer feature for adoption is "send a link, it just works." Panel core contributors should be able to test apps by clicking a link. Embedding in blog posts, READMEs, and documentation should be trivial - no server setup required.

**Design questions:**

- Can panel-live work from GitHub Pages? (GitHub Pages supports custom headers via `_headers` file on some providers, but not natively)
- Can we fall back gracefully when COOP/COEP headers are missing? (No SharedArrayBuffer, but still functional with slightly higher memory usage)
- Could we provide a hosted service (like `panel-live.holoviz.org/run?url=...`) that proxies content with correct headers?
- How do competitors handle this? (shinylive.io hosts apps, py.cafe provides a hosted service, stlite works from any static host)

**Suggested approach:**

1. Ensure panel-live works without COOP/COEP headers (graceful degradation - no SharedArrayBuffer, higher memory, but functional)
2. Host a reference deployment on GitHub Pages via `holoviz-dev/panel-live`
3. Support URL parameter to load code from external source: `panel-live.holoviz.org/?gist=xxx` or `?url=https://raw.githubusercontent.com/...`
4. Document "share your app" workflow

**Acceptance criteria:** A panel core contributor can click a single link and see a working Panel app in their browser. No server setup, no local installation.

**Related to:** Distribution (P1), URL Sharing (P3).

---

### P3 - Offline Support

**Problem:** All resources loaded from CDN. No service worker for caching. No offline mode.

**Why it matters:** PyScript supports offline usage. Corporate environments may have restricted internet access.

**Acceptance criteria:** After first load, the app works without internet connection (Pyodide and packages cached).

---

## Category 4: Documentation & Ecosystem Integration

### P1 - Documentation [PARTIALLY RESOLVED]

**Problem:** Zero documentation exists for this feature.

**Why it matters:** Without docs, nobody outside the core team can use it. Docs are required for any public release.

**Resolution:** A docs site is built with MkDocs/zensical (`pixi run -e docs serve`) and includes: `index.md` (landing page), `demo.md` (interactive demos of all 3 modes), `examples.md` (example gallery), and API reference via the `panel` fence syntax. The custom fence extension (`src/panel_live/fences.py`) enables `` ```panel `` code blocks in Markdown that render as live `<panel-live>` elements.

**Remaining work:**

1. Getting Started guide (embed an app in 5 minutes)
2. Comprehensive API reference (all attributes, JS API, CSS custom properties)
3. Configuration guide (versions, themes, packages)
4. Architecture overview (for contributors)
5. Migration guide from pyscript.com / raw Pyodide

**Acceptance criteria:** Complete documentation covering all supported features. Published on panel.holoviz.org.

**Blocked by:** Settle on Name (resolved).

---

### P2 - Follow Diataxis Documentation Framework

**Problem:** The docs site has content but lacks a clear organizational structure. Pages mix tutorials, reference, and explanation without a guiding framework. As the project matures, this will make the docs harder to navigate and maintain.

**Why it matters:** The [Diataxis framework](https://diataxis.fr/) provides a proven structure for technical documentation, dividing content into four categories based on user needs: tutorials (learning-oriented), how-to guides (task-oriented), reference (information-oriented), and explanation (understanding-oriented). Following this structure ensures users can find what they need quickly.

**Suggested approach:**

1. **Immediate focus:** `index.md` (landing page), live examples/playgrounds, how-to guides, and auto-generated Python API reference
2. **Short-term:** Add a single tutorial (e.g., "Embed a live Panel app in your MkDocs site in 5 minutes")
3. **Medium-term:** Add a JavaScript API reference guide to replace `dev/design/api-design.md` once the API stabilizes
4. **Long-term:** Consolidate material from `dev/` folder into concise explanation pages as the project matures and the rate of change slows

**Acceptance criteria:** Docs site navigation clearly maps to Diataxis categories. Each page has a clear purpose (tutorial, how-to, reference, or explanation). Landing page, examples, how-to guides, and Python reference are in place.

**Related to:** Documentation (P1), Examples Gallery (P2).

---

### P1 - Examples Gallery [PARTIALLY RESOLVED]

**Problem:** Need a comprehensive, curated collection of examples covering common use cases.

**Why it matters:** Examples are the primary way users discover capabilities. Competitors (shinylive, streamlit playground) have extensive example galleries.

**Current state:** 12 standalone `.py` files in `examples/` (hello, slider, kpi-dashboard, interactive-plot, mini-calculator, color-palette, markdown-preview, tabs-layout, unit-converter, data-explorer, echart-viz, stock-ticker) plus 2 inline-only examples (form, dataframe) in the API explorer — 14 total. The API explorer dropdown includes all 14. Examples cover: indicators/gauges, Bokeh plots, widgets/forms, color generation, Markdown, layout types (Tabs/FlexBox/GridBox), unit conversion with `watch`, Tabulator with filters, ECharts radar, and Bokeh area charts.

**Infrastructure complete:**
- `<panel-example>` elements with `src` attribute support ✅
- `examples-src` attribute for JSON URL loading ✅
- `<panel-example>` inline code support ✅
- API explorer dropdown wired to all examples ✅

**Remaining work:**

- 3+ more examples to reach 15+ target (suggested: hvPlot, Plotly, chat/streaming, ML demo, panel-material-ui)
- Default example set when no `<panel-example>` or `examples-src` configured
- Standalone examples gallery page (separate from api-explorer)

**Acceptance criteria:** 15+ curated examples covering common use cases. Each example works reliably and loads in <15 seconds. Sensible defaults appear when no examples are configured.

---

### P2 - Landing Page Should Showcase Generic Python Support

**Problem:** The `docs/index.md` landing page only shows Panel examples, giving the impression that `<panel-live>` is limited to Panel apps. In reality, the component runs **any Python code** — including plain PyData objects (DataFrames, Matplotlib plots, etc.) that Pyodide supports.

**Why it matters:** Many potential users are not (yet) Panel users. Showing a non-Panel example early on the landing page — ideally the first "app mode" demo — immediately communicates the broader value proposition: "run any Python in the browser." This lowers the barrier to adoption and positions panel-live as a general-purpose tool, not just a Panel showcase.

**Suggested approach:**

1. Add an app-mode example near the top of `docs/index.md` (before or right after the current Panel slider demo) that uses a well-known PyData library **without importing Panel**. Good candidates:
   - A Matplotlib or hvPlot figure (recognizable to nearly all Python users)
   - A pandas DataFrame rendered as HTML
   - A NumPy computation with formatted output
2. Add a brief sentence or heading making the point explicit, e.g. "Works with any Python code — not just Panel."

**Acceptance criteria:** The landing page includes at least one non-Panel Python example in app mode. The page copy explicitly communicates that panel-live supports arbitrary Python code.

**Related to:** Documentation (P1), Examples Gallery (P2).

---

### P2 - Sphinx Extension

**Problem:** No Sphinx extension exists. The current `nbsite` pyodide directive is limited (one instance per page, no template support, code not editable).

**Why it matters:** Panel's documentation uses Sphinx. Interactive examples in docs are a primary motivator for this entire feature (see `live-dream.md`). Shinylive has excellent Quarto+Sphinx integration.

**Suggested approach:**

1. Sphinx directive: `.. panel-live::` that embeds a panel-editor or panel-playground
2. Support code from directive body or external file reference
3. Support options: `layout`, `theme`, `requirements`, `height`
4. Load panel-live JS/CSS from CDN or bundled with docs
5. Automated tests: a pytest fixture that builds a minimal Sphinx project with a `.. panel-live::` directive and verifies the output HTML contains a `<panel-live>` element
6. User documentation: installation, `conf.py` configuration, directive syntax reference, attributes, and a troubleshooting section

**Acceptance criteria:** Working Sphinx extension that can embed interactive Panel apps in documentation pages. Multiple instances per page. Tests verify directive produces valid `<panel-live>` HTML. Documentation published in panel-live docs.

**Blocked by:** Build, Distribute.

---

### ~~P2 - MkDocs Extension~~ [RESOLVED]

**Problem:** No MkDocs extension exists. MkDocs is increasingly popular in the Python ecosystem.

**Why it matters:** Some HoloViz projects and many third-party users use MkDocs. py.cafe has `mkdocs-pycafe` as a reference implementation.

**Resolution:** `src/panel_live/fences.py` implements a custom fence for `pymdownx.superfences` that transforms `` ```panel `` Markdown fences into `<panel-live>` HTML elements. Configured in `zensical.toml` under `custom_fences`. Supports attributes: `mode`, `theme`, `height`, `layout`, `auto-run`, `label`, `code-visibility`, `code-position`. The docs site uses this extension for all interactive examples (see `docs/demo.md`).

**Inspiration:** <https://github.com/py-cafe/mkdocs-pycafe>, <https://mkdocs.py.cafe/en/latest/>

---

### P2 - Document MkDocs Integration for Third-Party Users

**Problem:** The MkDocs custom fence extension (`src/panel_live/fences.py`) works for our own docs site, but there is no documentation explaining how other users can add live Panel code blocks to their own MkDocs projects.

**Why it matters:** The MkDocs extension is one of panel-live's key differentiators. Without a guide, only people who read the source code can figure out the setup. Third-party adoption requires clear, copy-pasteable instructions.

**Suggested content:**

1. **Installation:** `pip install panel-live` (or add to MkDocs project dependencies)
2. **MkDocs configuration:** How to register the custom fence in `mkdocs.yml` under `pymdownx.superfences` `custom_fences` — validator, formatter, class reference
3. **Asset loading:** How to include `panel-live.js` and `panel-live.css` in the MkDocs site (CDN `<script>`/`<link>` tags via `extra_javascript`/`extra_css`, or local copy)
4. **Fence syntax reference:** All supported attributes (`mode`, `theme`, `height`, `layout`, `auto-run`, `label`, `code-visibility`, `code-position`) with examples
5. **COOP/COEP headers:** Note about required headers for SharedArrayBuffer and how to configure them for common hosting providers (GitHub Pages, Netlify, Cloudflare Pages)
6. **Troubleshooting:** Common issues (missing assets, headers, pymdownx version requirements)

**Acceptance criteria:** A user with an existing MkDocs site can follow the guide to add live Panel code blocks in under 10 minutes. Guide published in the panel-live docs.

**Related to:** Documentation (P1), MkDocs Extension (resolved).

---

### P2 - Quarto Extension

**Problem:** No Quarto extension exists. Quarto is increasingly popular for scientific publishing, technical documentation, and literate programming. Users who author in Quarto have no way to embed live `<panel-live>` apps.

**Why it matters:** Quarto is becoming the default authoring tool for many data scientists and researchers. Shinylive already has a well-regarded Quarto extension (`quarto-ext/shinylive`) that serves as prior art. Supporting Quarto broadens panel-live's reach beyond Sphinx and MkDocs users.

**Suggested approach:**

1. Create a Quarto extension (`panel-live` filter) that transforms a `{panel-live}` code block into `<panel-live>` HTML, similar to how `fences.py` works for MkDocs
2. Support attributes via Quarto's cell option syntax (e.g., `#| mode: editor`, `#| height: 500px`)
3. Automatically inject `panel-live.js` and `panel-live.css` via the extension's resource handling
4. Reference [shinylive Quarto extension](https://github.com/quarto-ext/shinylive) for patterns and conventions
5. Document installation (`quarto add panel-extensions/panel-live`) and usage

**Acceptance criteria:** Working Quarto extension that embeds interactive `<panel-live>` apps in Quarto HTML documents. Multiple instances per page. Published as an installable Quarto extension.

**Related to:** Sphinx Extension (P2), MkDocs Extension (resolved).

---

### P2 - Links from Panel Website and README

**Problem:** No links to the playground from the Panel website or GitHub README.

**Why it matters:** Discoverability. Users won't find the feature if it's not linked.

**Acceptance criteria:** Panel website navigation includes playground link. Panel GitHub README mentions the feature with link.

**Blocked by:** Documentation, Distribute.

---

### P2 - Revise README for Broader Audience

**Problem:** The README positions panel-live primarily as a Panel tool ("Run interactive Panel apps"). In reality, it runs any Python code — DataFrames, Matplotlib plots, NumPy computations — via Pyodide. Additionally, the README duplicates content that belongs in the docs site (detailed MkDocs configuration, development setup), making it harder to maintain.

**Why it matters:** The project has seconds to capture a visitor's interest on GitHub. A Panel-only pitch excludes the vast majority of Python users. Duplicated content drifts out of sync and adds maintenance burden.

**Suggested approach:**

1. **Broaden the tagline:** "Run interactive Python apps directly in the browser" (drop "Panel" from the headline; mention Panel as the primary framework below)
2. **Lead with a general example:** Show a non-Panel example first (e.g., a pandas DataFrame or Matplotlib plot), then Panel examples
3. **Trim duplicated content:** Replace detailed MkDocs config and development setup sections with brief summaries + links to the docs site
4. **Keep it scannable:** Hero line -> 3 code examples (app/editor/playground) -> features bullet list -> links to docs/demos/playground -> install one-liner -> development link

**Acceptance criteria:** README communicates "any Python" value prop within the first 2 paragraphs. No content that duplicates the docs site verbatim. Development section links to docs rather than duplicating pixi/uv instructions.

**Related to:** Landing Page Should Showcase Generic Python Support (P2), Links from Panel Website and README (P2).

---

### P2 - Document Known Limitations

**Problem:** Panel-live has known limitations (main-thread execution blocks UI, browser crashes on some hardware, no offline support, CodeMirror 5 is legacy, etc.) but these are scattered across individual issues in `live-issues.md`. Users have no single place to check what works and what doesn't.

**Why it matters:** Setting correct expectations prevents frustration and support burden. Users evaluating the tool need to quickly understand what's production-ready vs. experimental. This is also a prerequisite for a credible v0.1.0 release.

**Suggested content:**

1. **Runtime:** Pyodide runs on the main thread; page may freeze during load (5-15s); web worker support planned
2. **Browser compatibility:** Chrome/Edge may crash on machines with <8GB RAM; Firefox is more stable; COOP/COEP headers required for SharedArrayBuffer
3. **Package support:** Only packages available in Pyodide/micropip work; C extensions must have Emscripten builds
4. **Editor:** CodeMirror 5 (maintenance mode); CDN may be blocked by tracking prevention
5. **Performance:** First load ~10-15s on broadband; subsequent runs ~1-2s; no service worker caching yet

**Acceptance criteria:** A "Known Limitations" section in the docs (or standalone page) covering runtime, browser, package, editor, and performance limitations. Linked from the README.

**Related to:** Browser Crash (P0), Web Worker Support (P0), Documentation (P1), Release v0.1.0 (P1).

---

## Category 5: Build, Test & Deploy

### P1 - Build System

**Problem:** No build step. Raw JS file served directly. The monolithic IIFE cannot be tree-shaken, minified, or bundled with dependencies.

**Why it matters:** Production distribution requires minification, source maps, and dependency bundling (e.g., CodeMirror). Panelite has a build system that can serve as a template.

**Suggested approach:**

- Use esbuild, Rollup, or Vite for bundling
- Produce: `panel-live.min.js`, `panel-live.css`, `panel-live.esm.js`
- Source maps for debugging
- Follow panelite patterns where applicable

**Acceptance criteria:** Build produces minified JS + CSS bundles. Source maps available. Build runs in CI.

**Blocked by:** Folder and File Structure.

---

### P1 - Automated Testing [PARTIALLY RESOLVED]

**Problem:** Zero tests for the playground/embed feature.

**Why it matters:** Without tests, every change risks regressions. The feature is complex (Pyodide loading, code execution, editor interaction, multiple modes) and fragile.

**Reference:** `scripts/panelite/test/test_panelite.py` - Playwright-based test suite for Panelite provides a template.

**Resolution:** Test infrastructure is in place with `tests/conftest.py` (autouse fixtures for Panel state reset), `tests/test_core.py` (Python package tests), and `tests/ui/test_ui.py` (Playwright E2E test). Tests run via `pixi run test` and `pixi run -e test-ui test-ui`. CI runs tests on every PR.

**Remaining work:**

1. Expand UI test coverage beyond the current basic test (more modes, re-run, error handling)
2. Unit tests for JS utilities (code parsing, requirements detection)
3. Test error handling scenarios
4. Achieve >80% coverage of critical paths

**Acceptance criteria:** Playwright test suite covering core user flows. Tests run in CI. >80% coverage of critical paths.

**Blocked by:** Build System (need a reliable way to serve the test pages).

---

### P1 - Distribution (CDN / npm) [PARTIALLY RESOLVED]

**Problem:** Not distributed anywhere. No CDN hosting, no npm package.

**Why it matters:** Users need a stable URL to load the library from. `cdn.holoviz.org` is the standard for HoloViz projects.

**Resolution:** CDN hosting is live at `cdn.holoviz.org/panel-live/latest/panel-live.js` and `cdn.holoviz.org/panel-live/latest/panel-live.css`. The docs site loads from these URLs. A Python wheel can be built via `pixi run -e build build-wheel`.

**Remaining work:**

- Publish to npm for JS ecosystem users
- Version-pinned URLs (e.g., `cdn.holoviz.org/panel-live/1.0.0/panel-live.min.js`)
- Minified production builds (`panel-live.min.js`)
- Automated release workflow for CDN uploads

**Acceptance criteria:** Stable, versioned CDN URL. Works via `<script src="...">`. npm package published.

**Blocked by:** Build System, Settle on Name (resolved).

---

### ~~P2 - Pixi Commands~~ [RESOLVED]

**Problem:** No pixi commands defined for playground development.

**Why it matters:** Panelite uses `pixi run lite-build` and similar. Developers need consistent tooling.

**Resolution:** `pixi.toml` defines comprehensive tasks across multiple environments: `pixi run test` (pytest), `pixi run test-coverage`, `pixi run -e test-ui test-ui` (Playwright), `pixi run lint` (pre-commit), `pixi run -e docs serve` (docs dev server), `pixi run -e docs build` (static site), `pixi run -e build build-wheel`, `pixi run serve` (dev server with COOP/COEP headers), and `pixi run sync-assets` (copy lib/ to docs/assets/).

---

### ~~P2 - GitHub Actions CI/CD~~ [RESOLVED]

**Problem:** No CI/CD pipeline for the playground.

**Why it matters:** Need automated testing, building, and deployment. Panelite has `.github/workflows/jupyterlite.yaml` as a template.

**Resolution:** `.github/workflows/ci.yml` implements CI with pytest, Playwright UI tests, and pre-commit linting. Tests run on PRs and pushes to main.

**Remaining work:**

1. **Dev build:** Deploy to dev URL on push to main
2. **Release:** Build, test, deploy to `cdn.holoviz.org` on tag
3. **Alpha/Beta/RC:** Pre-release builds similar to panelite

**Blocked by:** Build System, Automated Testing.

---

### P1 - Release v0.1.0

**Problem:** No formal release of panel-live has been made. Users can only use `latest` from CDN or install from git.

**Why it matters:** A versioned release signals stability, enables version pinning (the README already advises this), and is required for PyPI/conda-forge distribution.

**Prerequisites (must be resolved before release):**

- [ ] ~~P2 - MkDocs Extension~~ [DONE]
- [ ] P2 - Sphinx Extension — at minimum a working directive
- [ ] P0 - Browser Crash — stable in Chrome, Edge, and Firefox (no crashes on reference hardware)
- [ ] P1 - Documentation [PARTIAL] — at minimum: getting started guide + API reference
- [ ] P1 - Distribution [PARTIAL] — versioned CDN URLs + published PyPI package
- [ ] P1 - Automated Testing [PARTIAL] — reasonable test coverage for release confidence
- [ ] P2 - Known Limitations — documented so users know what to expect
- [ ] Update GitHub repo description and topics at https://github.com/panel-extensions/panel-live

**Not blocking v0.1.0** (important but can follow):

- P0 - Web Worker Support (significant effort; v0.1 can ship with main-thread execution and a known limitation note)
- P1 - Build System (current unminified JS works; optimization can follow)
- P2 - npm package (CDN + PyPI is sufficient for v0.1)

**Acceptance criteria:** Tagged v0.1.0 release on GitHub. PyPI package published. Versioned CDN URLs live. Release notes document features and known limitations.

**Related to:** Distribution (P1), Documentation (P1), Automated Testing (P1), Browser Crash (P0), Known Limitations (P2).

---

## Category 6: Technical Debt

### P1 - Python Code as String Concatenation

**Problem:** All Python code executed via Pyodide is built as concatenated strings in JavaScript (`'import js\n' + 'import panel as pn\n' + ...`). Indentation errors are invisible and hard to debug.

**Why it matters:** Fragile and error-prone. Any modification risks subtle Python syntax errors that are extremely hard to trace.

**Suggested approach:** Use template literals with proper indentation. Or better: load Python bootstrap code from separate `.py` files bundled during build.

**Acceptance criteria:** Python bootstrap code maintained in `.py` files, not JS string concatenation.

---

### ~~P1 - Duplicate Execution Logic~~ [RESOLVED]

**Resolution:** The web component rewrite has a single `runPanelCode()` function with a 3-branch execution strategy (servable, servable+target, expression). There is no iframe mode, so no duplication between inline/iframe code paths. All 3 display modes (app, editor, playground) use the same `_initAndRun()` → `runPanelCode()` path.

---

### P2 - Error Boundaries Between Apps

**Problem:** If one inline app crashes during sequential execution, it may prevent subsequent apps from running.

**Why it matters:** In documentation pages with multiple embedded apps, one broken example shouldn't break the rest.

**Acceptance criteria:** Each app runs in isolation. One app's failure doesn't affect others. Failed apps show error state, remaining apps continue.

---

## Category 7: Future / Nice-to-Have

These are stretch goals for after MVP.

### P3 - React / Framework Wrappers

**Problem:** Stlite provides `@stlite/react`. Modern web apps built with React/Vue/Svelte would benefit from native wrappers.

**Acceptance criteria:** npm package for React (at minimum) that wraps panel-live as a React component.

---

### P3 - Desktop Version (Electron/Tauri)

**Problem:** Stlite has a desktop version. Could be useful for offline tools.

**Acceptance criteria:** Documented approach for wrapping panel-live in Electron or Tauri.

---

### P3 - Filesystem Support

**Problem:** No virtual filesystem access for user code. PyScript supports filesystem access.

**Acceptance criteria:** Users can read/write files in a virtual filesystem. IndexedDB persistence.

---

### P3 - Media Access (Camera, Microphone)

**Problem:** No access to browser media devices from Python code.

**Why it matters:** Enables ML demos (image classification, audio processing) directly in the browser. See `live-dream.md` Pyodide Pane section.

**Acceptance criteria:** Python code can access camera/microphone streams via Pyodide.

---

### P3 - Notebook-like Experience

**Problem:** Only single-cell execution. No multi-cell notebook-like workflow.

**Why it matters:** For learning and exploration, a notebook-style interface (multiple cells, incremental execution) is powerful.

**Acceptance criteria:** Optional multi-cell mode where users can add/remove/reorder cells.

---

### P3 - Test panel-live in Claude.ai Artifact Sandbox

**Problem:** Claude.ai can generate HTML artifacts for users. It's unknown whether `<panel-live>` renders correctly inside Claude's artifact sandbox (which has restrictions on external scripts, CDN access, and iframe behavior).

**Why it matters:** If panel-live works in Claude artifacts, it becomes a powerful way for Claude to generate interactive Python visualizations on the fly — a unique differentiator. If it doesn't, we need to understand what restrictions prevent it.

**Suggested approach:**

1. Manually test: ask Claude to generate an artifact with `<panel-live>` CDN tags + inline code
2. Document what works and what doesn't (CDN blocked? sandbox restrictions? CSP issues?)
3. If blocked: investigate workarounds (inline bundle, data URIs, etc.)

**Acceptance criteria:** Documented test results. If feasible: a prompt template or guide for using panel-live in Claude artifacts.

---

## Dependency Graph

```text
API Design [RESOLVED] ──┬──> Multi-file Support [RESOLVED]
                         └──> Requirements / Package Spec [RESOLVED]
                         (Playground Layout [RESOLVED], Customizable Styling [RESOLVED])

Folder/File Structure ───┬──> Build System ──┬──> Distribution ──┬──> Sphinx Extension
                         │                   ├──> Automated Testing  ├──> MkDocs Extension
                         │                   └──> Pixi Commands      ├──> Quarto Extension
                         └──> GitHub Actions                         └──> Links

MkDocs Extension [RESOLVED] ──> Prescript / Setup Code

Web Worker Support ──────┬──> Keep Page Responsive
                         └──> Browser Crash (partial fix)

Evaluate PyScript [RESOLVED — REJECTED]

Separate CSS [RESOLVED] ──> (Customize Styling [RESOLVED], Align Styles [RESOLVED])

Interactive API Explorer [RESOLVED]
Examples Gallery [PARTIALLY RESOLVED]

CodeMirror 6 Upgrade ────┬──> Tracking Prevention (bundle CM6)
                         └──> Editor Theme Config [PARTIALLY RESOLVED]
                         (Mouse Selection [RESOLVED])

Duplicate Execution [RESOLVED]
Loading Progress [RESOLVED]
Dark Theme [RESOLVED]

Distribution ────────────┬──> Documentation ──> Links

Known Limitations ───────> Release v0.1.0
README Revision ─────────> Release v0.1.0
Release v0.1.0 ──────────> (blocks: Sphinx Extension, Browser Crash, Documentation,
                            Distribution, Automated Testing, Known Limitations)
```

## Suggested Execution Order

**Phase 1 - Decisions & Foundations [COMPLETE]:**
~~API Design~~ [DONE], ~~Evaluate PyScript~~ [REJECTED], ~~Name~~ [DONE], ~~Repository~~ [DONE], ~~panel-material-ui~~ [DONE], ~~Mouse Selection~~ [DONE], ~~Loading Progress~~ [DONE], ~~Align Styles~~ [DONE], ~~Customizable Styling~~ [DONE], ~~Dark Theme~~ [DONE], ~~Playground Layout~~ [DONE], ~~Duplicate Execution~~ [DONE]

**Phase 2 - Core Architecture:**
Web Worker Support, ~~Folder/File Structure~~ [DONE], ~~Separate CSS~~ [DONE], Build System, CodeMirror 6 Upgrade, Fix Browser Crash (especially Chrome/Edge), ~~Interactive API Explorer~~ [DONE]

**Phase 3 - Developer Experience:**
Handle Python Errors (remaining: structured tracebacks, collapsible panel, copy button), Copy Code, Prescript / Setup Code, Editor Theme (remaining: additional themes, high-contrast), Python string concatenation cleanup

**Phase 4 - Polish & Release:**
Automated Testing [PARTIAL], Distribution [PARTIAL], Documentation [PARTIAL], Examples Gallery (remaining: 3+ more examples, defaults, gallery page), ~~Pixi Commands~~ [DONE], ~~GitHub Actions CI/CD~~ [DONE], postMessage Security (for future worker support), Memory Leak investigation, Error Boundaries, Known Limitations, Revise README

**Phase 5 - Release & Ecosystem:**
Release v0.1.0 (meta-issue, depends on Phase 4 items), Sphinx Extension, Quarto Extension, ~~MkDocs Extension~~ [DONE], Links, ~~Multi-file Support~~ [DONE], ~~Requirements Specification~~ [DONE], Version Info / Switching, URL Sharing improvements, Zero-Install Deployment, Offline Support, Diataxis Documentation Framework

**Phase 6 - Future:**
React wrapper, Desktop version, Filesystem, Media access, Notebook experience, Claude.ai Artifact Sandbox
