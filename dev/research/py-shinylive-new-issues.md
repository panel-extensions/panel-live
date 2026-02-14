# py-shinylive Research: Findings Relevant to panel-live

Research conducted across the [py-shinylive](https://github.com/posit-dev/py-shinylive) Python CLI package, the [shinylive](https://github.com/posit-dev/shinylive) web runtime (TypeScript/React), and the [quarto-ext/shinylive](https://github.com/quarto-ext/shinylive) Quarto extension. Covers open/closed issues, merged PRs, and codebase architecture.

---

## New Issues to Add to open-issues.md

### ~~P1 — Switch COEP Header to `credentialless`~~ `ALREADY HANDLED`

**Source:** shinylive [#112](https://github.com/posit-dev/shinylive/issues/112) (closed, implemented)

Shinylive switched `Cross-Origin-Embedder-Policy` from `require-corp` to `credentialless`. This allows cross-origin requests for embedded content (MathJax, OpenStreetMap tiles, CDN fonts) to work without requiring explicit CORP headers from the remote server, while still enabling `SharedArrayBuffer`.

**Already handled.** `serve.py` (line 29) and `docs/mini-coi.js` (line 34) already use `credentialless`.

---

### ~~P1 — Call `pyodide_http.patch_all()` During Initialization~~ `ALREADY HANDLED`

**Source:** shinylive [PR #204](https://github.com/posit-dev/shinylive/pull/204) (merged)

Standard Python HTTP libraries (`urllib.request`, `requests`, `httpx`) do not work in Pyodide because browser fetch APIs differ from native sockets. Shinylive now calls `pyodide_http.patch_all()` during initialization, which monkey-patches these libraries to use browser-native `fetch()` under the hood.

**Already handled.** Panel's `panel/io/pyodide.py` calls `pyodide_http.patch_all()` automatically on import. No action needed in panel-live.

---

### P1 — Export CLI for Static Deployment

**Source:** py-shinylive codebase (`_export.py`, `_main.py`, `_deps.py`, `_app_json.py`)

Shinylive's most distinctive feature is `shinylive export myapp/ site/`, which:
1. Reads all files from an app directory
2. Analyzes Python imports using AST to determine required Pyodide packages
3. Copies only needed `.whl` files (not the full Pyodide distribution)
4. Renders HTML from a Mustache template with injected app code
5. Writes an `app.json` manifest with all file contents

This produces a fully self-contained static directory that can be deployed to any static host (GitHub Pages, Netlify, S3). No server needed.

Panel-live has no equivalent. The existing P2 "render mode" and P2 "Sharing Strategy" issues touch on this, but an explicit export command would be a major feature.

**Action:** Implement `panel-live export myapp/ site/` CLI command that bundles Panel app code with panel-live assets into a deployable static directory. Use AST-based import detection for selective package inclusion.

**Acceptance:** `panel-live export` produces a static directory that works when served by any HTTP server. Only required packages are included.

---

### P2 — LZString Compression for URL Sharing

**Source:** py-shinylive codebase (`_url.py`), shinylive (`src/Components/share.ts`, `lzstring-worker.ts`), py-shinylive [PR #23](https://github.com/posit-dev/py-shinylive/pull/23)

Shinylive uses LZString compression (`lzstring` Python package / `lz-string` npm package) for URL sharing instead of base64. This produces significantly shorter URLs. On the JS side, compression is offloaded to a dedicated Web Worker via `MessageChannel` to avoid blocking the UI on large codebases.

Panel-live currently uses plain base64 encoding (P3 "URL Sharing with Compression" notes gzip as a future option). LZString is a better fit because it's designed specifically for URL-safe compression and is available in both Python and JavaScript.

Additionally, shinylive's `ShinyliveApp` class provides a Python API for programmatic URL manipulation:
```python
app = ShinyliveApp.from_local("./myapp/")
url = app.to_url(mode="editor")
```

**Action:** Replace base64 URL encoding with LZString compression. Offload compression to a worker. Consider adding a Python API for generating panel-live URLs programmatically.

**Acceptance:** URL sharing uses LZString compression, producing shorter URLs. A Python utility exists for generating panel-live URLs from local files.

---

### P2 — Gist Sharing

**Source:** shinylive codebase (`src/Components/gist.ts`), open-issues P2 "Sharing Strategy"

Shinylive implements full GitHub Gist integration: fetching gist data from the GitHub API with base64 encoding, handling truncated files (>1MB) by fetching raw content, detecting binary vs text content, and converting to a file array. Users share via `?gist=GIST_ID` URL parameter.

This is already mentioned in the Sharing Strategy issue but deserves its own issue given the concrete implementation pattern from shinylive.

**Action:** Implement `?gist=GIST_ID` URL parameter support that fetches gist content from the GitHub API, extracts files, and loads them into the panel-live editor/app.

**Acceptance:** Users can share panel-live apps via GitHub Gist URLs. The gist content loads correctly in all modes.

---

### ~~P2 — Graceful Error When Worker/Pyodide Initialization Fails~~ `DONE`

**Source:** shinylive [#171](https://github.com/posit-dev/shinylive/issues/171) (open), shinylive [#133](https://github.com/posit-dev/shinylive/issues/133) (open)

When the service worker fails (e.g., not running under a web server, opened as `file://`), Shinylive shows a blank white screen with no error message. Similarly, "ServiceWorker controller not found!" errors occur when served over HTTPS in certain Chrome/Edge configurations.

**Done.** Implemented in `worker-bridge.js` and `error-renderer.js`:
- **`file://` pre-flight check:** `_doInit()` throws immediately with an actionable message ("Serve the page via HTTP — for example: python -m http.server").
- **`crossOriginIsolated` warning:** Non-blocking `console.warn` when COOP/COEP headers are missing.
- **Enhanced `_onWorkerError()`:** Detects network failures and `file://` context, produces specific error messages instead of generic "Worker crashed".
- **Init timeout (120s):** `Promise.race` against a configurable timeout prevents infinite spinner when CDN is unreachable.
- **Non-Python error rendering:** `renderError()` now detects system errors (no `File "..."` or `Error:` patterns) and renders them as clean `.pl-system-error` messages without traceback parsing or "Copy error" button.
- The existing `_initAndRun` catch block in `panel-live-element.js` already calls `renderError()` and sets status to `'error'`, so all error paths reach the user.

---

### P2 — Service Worker Fragility Behind Auth Proxies

**Source:** shinylive [#66](https://github.com/posit-dev/shinylive/issues/66) (open), shinylive [#35](https://github.com/posit-dev/shinylive/issues/35) (open)

When Shinylive is served behind authentication (corporate SSO, Posit Connect), service worker ES module registration fails because the browser's fetch for the service worker JS file gets redirected to a login page. This is a known class of issues with service workers behind auth proxies.

Panel-live uses `mini-coi.js` (a service worker) for cross-origin isolation in the docs site. If panel-live is ever deployed behind an auth proxy (enterprise documentation, internal portals), this will break. Document this limitation and consider fallback strategies.

**Action:** Document that `mini-coi.js` service worker registration may fail behind authentication proxies. Provide guidance for server-side COOP/COEP header configuration as an alternative. Consider detecting service worker registration failure and showing a helpful message.

**Acceptance:** Documentation covers auth proxy limitations. A fallback strategy is documented for enterprise deployments.

---

### P2 — Version Pin Passthrough to micropip `PARTIAL`

**Source:** py-shinylive [#45](https://github.com/posit-dev/py-shinylive/issues/45) (closed), shinylive [PR #194](https://github.com/posit-dev/shinylive/pull/194) (merged)

Even when specifying `isodate==0.6.0` in requirements, the latest version was installed instead. The fix was to pass full requirement specifiers (not just package names) to `micropip.install()`. For example, `micropip.install("isodate==0.6.0")` instead of `micropip.install("isodate")`.

**Partial.** The `installedPackages` tracking in `panel-live-worker.js` has been hardened:
- `handleInstall()` now normalizes package names correctly, handling `~=`, `[extras]`, `@ url` specifiers (was only splitting on `[=<>!]`).
- Auto-detected requirements comparison is now case-insensitive (e.g. `Numpy` matches `numpy`).
- Full version specifiers are already passed through to `micropip.install()` — the `<panel-requirements>` element passes raw requirement strings directly.

**Remaining:** Installation progress/completion feedback in the status area (shinylive PR #195 pattern). Currently, installation shows "Installing: pkg1, pkg2..." but no "done" signal for the last package.

**Acceptance:** `<panel-requirements>isodate==0.6.0</panel-requirements>` installs exactly version 0.6.0. Package installation shows progress and completion status.

---

### P2 — AST-Based Import Detection

**Source:** py-shinylive codebase (`_deps.py`)

Shinylive uses Python's `ast` module to parse source files and extract import statements, mapping module names to package keys (handling mismatches like `cv2` -> `opencv-python`). It then recursively resolves transitive dependencies from `pyodide-lock.json`. This enables selective package bundling for export and faster loading.

Panel-live currently only detects imports at runtime. Build-time import analysis would enable:
- Selective package pre-bundling for export
- Faster loading by pre-fetching only needed packages
- Better error messages ("package X requires a pure Python wheel")

**Action:** Implement AST-based import detection as a Python utility. Use it for the export command and optionally for build-time optimization of documentation examples.

**Acceptance:** A Python utility can analyze Panel code and produce a list of required packages with their Pyodide availability status.

---

### P2 — PostMessage API for Iframe Communication

**Source:** shinylive [#33](https://github.com/posit-dev/shinylive/issues/33) (open), shinylive [#166](https://github.com/posit-dev/shinylive/pull/166) (merged)

Shinylive implemented PostMessage communication for iframe embedding: the embedded app posts a "ready" message to the parent window, and the parent can send `setFiles` messages to update the app content dynamically.

Panel-live already has custom events (`pl-status`, `pl-ready`). For iframe embedding (P2), PostMessage equivalents are needed so parent pages can:
- Detect when panel-live is ready
- Update code dynamically
- Receive execution status updates
- Trigger runs programmatically

**Action:** Implement PostMessage API for `<panel-live>` when embedded in iframes. Support at minimum: `ready` signal (outbound), `setCode` (inbound), `run` (inbound), `status` (outbound).

**Acceptance:** A parent page can embed panel-live in an iframe and programmatically update/run code via PostMessage.

---

### P2 — Editor State Persistence (localStorage)

**Source:** shinylive [#76](https://github.com/posit-dev/shinylive/issues/76) (open)

Users lose their work when navigating away from the editor. Shinylive has an open request for "My Apps" using browser localStorage/IndexedDB. While a full "My Apps" system is complex, simple auto-save of editor state to localStorage is straightforward and high-value.

Panel-live's playground mode would benefit from auto-saving the current editor content to localStorage, with a "Restore last session" option on load.

**Action:** Auto-save editor content to localStorage on changes (debounced). On playground load, offer to restore the last session if saved content exists and differs from the default.

**Acceptance:** Editor content survives page refreshes in playground mode. Users can restore their last session.

---

### P2 — Self-Hosting Documentation

**Source:** shinylive [#109](https://github.com/posit-dev/shinylive/issues/109) (open)

Questions about hosting on private intranets without internet access. Shinylive requires all Pyodide assets, packages, and web files to be served locally. Panel-live loads everything from CDN by default.

For enterprise/offline use, all assets need to be hostable locally. `PanelLive.configure()` supports custom CDN URLs, but there's no documentation or guide for self-hosting all required assets.

**Action:** Document how to self-host all panel-live assets (JS bundle, Pyodide, Panel/Bokeh wheels, CSS) on a private server. Provide a script or CLI command to download all required assets for offline use.

**Acceptance:** A documented guide enables running panel-live on an air-gapped network with all assets served locally.

---

### P2 — Document Pure Python Wheel Limitation

**Source:** py-shinylive [#44](https://github.com/posit-dev/py-shinylive/issues/44) (closed), py-shinylive [#6](https://github.com/posit-dev/py-shinylive/issues/6) (closed)

Pyodide can only install pure Python wheels or packages pre-compiled for Emscripten. Users frequently try to install packages with C extensions (`numpy` works because it's pre-built, but arbitrary C-extension packages don't). Error messages from micropip are cryptic ("Can't find a pure Python 3 wheel").

Additionally, standard Python HTTP libraries don't work in Pyodide (see `pyodide_http.patch_all()` above), and CORS restrictions apply to all fetch requests.

**Action:** Create a "Known Limitations" documentation page (already in P2) that explicitly covers: pure Python wheel requirement, pre-built packages list, HTTP library restrictions, CORS constraints, and `file://` protocol limitations. Include workarounds for each.

**Acceptance:** Users encountering package installation or networking errors can find clear explanations and workarounds in the documentation.

---

### P2 — Chrome/Edge vs Firefox Performance Differences

**Source:** shinylive [#191](https://github.com/posit-dev/shinylive/issues/191) (open)

Huge performance differences observed between Chrome/Edge and Firefox, seemingly related to graphics rendering. This is an open issue with no solution in shinylive.

Panel-live should test and document browser-specific performance characteristics. Bokeh's Canvas/WebGL rendering pipeline may behave differently across browsers. This investigation could also inform the P0 browser crash issue.

**Action:** Benchmark panel-live performance across Chrome, Edge, Firefox, and Safari. Document any significant differences. Investigate whether Bokeh's rendering backend contributes to Chrome/Edge issues.

**Acceptance:** Performance characteristics across browsers are documented. Any browser-specific optimizations are identified.

---

### P3 — Pre-Bundle Common HoloViz Packages

**Source:** py-shinylive [#38](https://github.com/posit-dev/py-shinylive/issues/38) (open), shinylive codebase (`shinylive_requirements.json`)

Shinylive pre-bundles common packages (plotly, seaborn, plotnine, etc.) in their distribution archive so they don't need to be downloaded at runtime. Their `shinylive_requirements.json` lists packages from both local builds and PyPI.

Panel-live could pre-bundle common HoloViz packages (hvPlot, HoloViews, Param) alongside Panel and Bokeh to reduce runtime download times. Currently each package is fetched from PyPI via micropip at runtime.

**Action:** Investigate pre-bundling common HoloViz packages in the panel-live distribution. Measure the size impact vs. load time improvement.

**Acceptance:** Common HoloViz packages load significantly faster due to pre-bundling, without unacceptable distribution size increase.

---

### P3 — Quarto Extension Implementation Details

**Source:** quarto-ext/shinylive codebase, py-shinylive `extension` CLI subcommands

The Quarto shinylive extension is a **Lua filter** that:
1. Identifies code blocks with `{shinylive-python}` classes
2. Calls the py-shinylive CLI (`shinylive extension info/base-htmldeps/language-resources/app-resources`) to get HTML dependency information as JSON
3. Injects required JS/CSS into the document head
4. Converts code blocks to HTML

The pattern of having the Lua filter call back into a Python CLI for dependency info is clever - it keeps the extension thin while the Python package handles complex logic. Panel-live's P2 Quarto Extension should follow this same architecture.

Key syntax features:
- `#| standalone: true` directive for complete apps
- `#| components: [editor, viewer]` for layout control
- `#| viewerHeight: 420` for sizing
- `## file: filename` for multi-file apps within a single code block

**Action:** When implementing the Quarto extension (existing P2), follow the Lua filter + CLI callback pattern. Support `{panel-live-python}` code blocks with `#|` directives. Add `panel-live extension` CLI subcommands for Quarto integration.

**Acceptance:** The panel-live Quarto extension follows the same architecture as shinylive's proven extension pattern.

---

### P3 — Resizable Layout Panels

**Source:** shinylive codebase (`ResizableGrid` component)

Shinylive implements a `ResizableGrid` React component with draggable dividers between editor, terminal, and viewer panels. Users can resize panels by dragging the dividers.

Panel-live has fixed horizontal/vertical layout modes. Adding draggable dividers between the code editor and output panes would improve the editor and playground experience.

**Action:** Implement draggable resize handles between the code editor and output area. Support saving the user's preferred split ratio.

**Acceptance:** Users can drag to resize editor and output panels in editor and playground modes.

---

### P3 — Terminal / Console Panel

**Source:** shinylive codebase (`Terminal.tsx`, xterm.js)

Shinylive includes a full xterm.js terminal with tab completion, Ctrl+C interrupt support, and color-formatted error output. The terminal shows stdout/stderr output and supports interactive Python commands.

Panel-live currently shows stdout/stderr inline. A terminal panel (even read-only) would improve the debugging experience, especially for longer-running apps that produce console output.

**Action:** Consider adding an optional terminal/console panel (using xterm.js or a simpler approach) for displaying stdout/stderr output with proper formatting.

**Acceptance:** Users can see formatted console output in a dedicated panel when running code.

---

### P3 — Code Formatting via Black

**Source:** shinylive codebase (`usePyodide.tsx` load_python_pre), shinylive [PR #142](https://github.com/posit-dev/shinylive/pull/142)

Shinylive runs Black (the Python code formatter) inside Pyodide for code formatting. This is already listed as P3 "Autoformatting" in open-issues, but shinylive's implementation confirms Black works in Pyodide and provides a concrete implementation pattern.

Additionally, shinylive added smart keybindings for common operations (assignment operator, pipe operator) with proper spacing logic and multi-cursor support.

**Prior art:** Black is loaded lazily and runs in the Pyodide environment. The formatting is triggered by a button or keyboard shortcut.

---

### P3 — Language Server via Pyright in Web Worker

**Source:** shinylive codebase (`src/language-server/client.ts`, `pyright-client.ts`), shinylive [#205](https://github.com/posit-dev/shinylive/issues/205) (closed), shinylive [#209](https://github.com/posit-dev/shinylive/issues/209) (open)

Shinylive integrated Pyright as a language server running in a Web Worker, providing real-time type checking, diagnostics, and code completion. The `LanguageServerClient` abstract class manages LSP communication, and `PyrightClient` runs Pyright via Pyodide in a worker.

Known issue: accepting LSP completions sometimes inserts text incorrectly (shinylive #209). The CodeMirror + LSP integration has edge cases.

**Prior art:** This confirms the P3 "Language Server Integration" approach is viable. Pyright runs in-browser via Pyodide in a worker.

---

## Enhancements to Existing Issues

### P0 — Browser Crash: Add `credentialless` COEP Investigation

Shinylive's switch to `credentialless` COEP (shinylive #112) may be directly relevant. The `require-corp` policy causes more restrictive resource loading that could contribute to memory pressure or failed resource loads that trigger crashes.

### P2 — Sharing Strategy: Add Gist Support and CLI URL Tool

Shinylive has concrete implementations: `?gist=GIST_ID` support (gist.ts), and a `shinylive url encode/decode` CLI command for programmatic URL generation. Add these as specific sub-items.

### P2 — Reproducibility: Version Pin Passthrough `PARTIAL`

Ensure `<panel-requirements>` passes full version specifiers to micropip (py-shinylive #45 fix). **Partial:** `installedPackages` tracking now handles all specifier formats (`~=`, `[extras]`, `@ url`) and uses case-insensitive comparison. Full specifiers are already passed through to `micropip.install()`.

### P2 — Quarto Extension: Follow Lua Filter + CLI Pattern

The extension should be a thin Lua filter that calls `panel-live extension` CLI subcommands for dependency resolution (same architecture as shinylive).

### P3 — URL Sharing with Compression: Use LZString

LZString is a better choice than gzip for URL-safe compression. It's designed for this purpose and available in both Python and JavaScript. Offload compression to a worker.

### P3 — Offline Support: Service Worker Caching

Shinylive also hasn't solved this (shinylive #188). The Pyodide distribution + packages are many MB, making caching strategies complex. A community member attempted it but couldn't make it work.

### P3 — Language Server Integration: Pyright is Viable

Shinylive's implementation confirms Pyright runs in-browser via Pyodide worker. Watch for LSP completion edge cases (shinylive #209).

---

### P3 — Expose URL Parameters to Running Apps

**Source:** shinylive [PR #217](https://github.com/posit-dev/shinylive/pull/217) (open)

Shinylive saves URL query parameters as a `.urlParams` file accessible to the running Shiny app. This enables apps to read configuration from the URL.

Panel-live could expose query parameters to running Panel apps, enabling use cases like: `?dataset=iris` to pre-configure which dataset an example loads, or `?theme=dark` to pass through to the Panel app.

**Action:** Consider making URL query parameters accessible to running Panel code via a Python-side mechanism (e.g., `panel_live.get_url_params()`).

**Acceptance:** Panel apps running in panel-live can read URL query parameters passed to the host page.

---

### P3 — Module-to-Package Name Mapping

**Source:** py-shinylive [PR #7](https://github.com/posit-dev/py-shinylive/pull/7), [PR #36](https://github.com/posit-dev/py-shinylive/pull/36)

Python import names often differ from package names (e.g., `import cv2` maps to `opencv-python`). Pyodide's `pyodide-lock.json` has three naming conventions: dictionary key (`jsonschema-specifications`), name field (`jsonschema_specifications`), and import name (`cv2`). Shinylive built mapping logic to handle all three.

Panel-live's `detectAndInstallRequirements()` delegates to `pyodide.loadPackagesFromImports()`, which handles some of this internally. But for any build-time import analysis (AST-based detection), this mapping layer needs explicit handling.

**Action:** When implementing AST-based import detection, build a mapping from pyodide-lock.json's `imports` field to resolve module names to package keys correctly.

**Acceptance:** Import detection correctly resolves `cv2` -> `opencv-python` and similar mismatched names.

---

## Architecture Insights (Not Issues, but Useful Context)

### Shinylive's Dual Repository Structure

Shinylive separates the Python CLI tool (py-shinylive) from the web runtime (shinylive). The Python package handles export, asset management, URL encoding, and Quarto extension integration. The web runtime is a React 18 + TypeScript app with CodeMirror 6, xterm.js, and Pyodide. Web assets are versioned tarballs published as GitHub releases, downloaded and cached locally by the Python CLI.

### Panel-live's Simpler Architecture is an Advantage

Panel-live bundles everything into a single web component with no framework dependency (no React). This is simpler to embed, lighter weight, and works in any HTML page. The trade-off is less built-in functionality (no multi-file tabs, no terminal, no language server).

### Shinylive's Service Worker for COOP/COEP

Shinylive's service worker dynamically injects COOP/COEP headers on responses, making deployment to any static host possible without server configuration. Panel-live uses `mini-coi.js` for a similar purpose. The main risk of service worker approaches is fragility behind auth proxies (shinylive #35, #66).

### Dual-Mode Proxy Pattern for Worker Execution

Shinylive defines a `PyodideProxy` interface with two implementations: `NormalPyodideProxy` (main thread) and `WebWorkerPyodideProxy` (dedicated worker). A factory function selects the mode at runtime. Each worker command creates a fresh `MessageChannel` — the main thread sends one port to the worker and listens on the other, avoiding global message handler conflicts. This is cleaner than panel-live's current single-message-handler approach in `worker-bridge.js`.

### HTTP-over-MessagePort Pattern

Shinylive's `messageporthttp.ts` converts Web API Request objects into ASGI scope dictionaries, streams request bodies to the worker, and reconstructs Response objects. This is the key infrastructure for running a full Shiny server in a worker. Panel-live's worker architecture is simpler (render-and-return) but this pattern would be needed for full Panel server functionality in a worker.

### AwaitableQueue Pattern

Shinylive implements a promise-based async queue for serializing operations. Similar in purpose to panel-live's execution queue but more general.

---

## Summary: Priority-Ordered New Issues

| Priority | Issue | Source |
|----------|-------|--------|
| ~~**P1**~~ | ~~Switch COEP to `credentialless`~~ | shinylive #112 | **ALREADY HANDLED** |
| ~~**P1**~~ | ~~Call `pyodide_http.patch_all()`~~ | shinylive PR #204 | **ALREADY HANDLED** |
| **P1** | Export CLI for static deployment | py-shinylive codebase |
| **P2** | LZString compression for URL sharing | py-shinylive #23, codebase |
| **P2** | Gist sharing | shinylive gist.ts |
| ~~**P2**~~ | ~~Graceful error on init failure~~ | shinylive #171, #133 | **DONE** |
| **P2** | Service worker auth proxy docs | shinylive #66, #35 |
| **P2** | Version pin passthrough to micropip | py-shinylive #45 | **PARTIAL** |
| **P2** | AST-based import detection | py-shinylive _deps.py |
| **P2** | PostMessage API for iframe | shinylive #33, #166 |
| **P2** | Editor state persistence | shinylive #76 |
| **P2** | Self-hosting documentation | shinylive #109 |
| **P2** | Document pure Python wheel limitation | py-shinylive #44, #6 |
| **P2** | Chrome/Edge vs Firefox performance | shinylive #191 |
| **P3** | Pre-bundle HoloViz packages | py-shinylive #38 |
| **P3** | Quarto extension implementation details | quarto-ext/shinylive |
| **P3** | Resizable layout panels | shinylive ResizableGrid |
| **P3** | Terminal/console panel | shinylive Terminal.tsx |
| **P3** | Code formatting via Black | shinylive usePyodide.tsx |
| **P3** | Expose URL params to running apps | shinylive PR #217 |
| **P3** | Module-to-package name mapping | py-shinylive PR #7, #36 |
| **P3** | Language server via Pyright | shinylive language-server/ |
