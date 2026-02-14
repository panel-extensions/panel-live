# Lessons from Stlite: Recommended Issues for panel-live

Research from [whitphx/stlite](https://github.com/whitphx/stlite) — issues, PRs, codebase, and architecture. Organized as **new issues** to add and **adjustments** to existing `open-issues.md` entries.

Sources: ~150 stlite issues, ~200 PRs (1,218+ merged total), codebase architecture analysis, blog posts, and community discussions.

---

## New Issues to Add

### P1 — SharedWorker Mode for Multi-Instance Pages

When a documentation page has 10 `<panel-live>` elements, each with its own DedicatedWorker, memory usage balloons to 10 x 300-500MB. Stlite solved this with an opt-in SharedWorker mode (`sharedWorker: true` / `shared-worker` attribute) where multiple apps share a single Pyodide instance.

**Key lessons from stlite:**
- SharedWorker is **not available on Chrome Android** — automatic fallback to DedicatedWorker is required ([stlite #1398](https://github.com/whitphx/stlite/issues/1398), [PR #1413](https://github.com/whitphx/stlite/pull/1413)). Missing this fallback caused a full regression on mobile in stlite v0.73.1+.
- Top-level `await` in SharedWorker corrupts working directory state when multiple apps share a worker — each app needs its home directory restored after async yields ([stlite #1458](https://github.com/whitphx/stlite/issues/1458)).
- Playwright's WebKit does not support SharedWorker properly — real Safari testing via BrowserStack/LambdaTest is needed ([stlite #1831](https://github.com/whitphx/stlite/issues/1831)).

**Acceptance:** `<panel-live shared-worker>` or a global `PanelLive.configure({ sharedWorker: true })` shares a single Pyodide worker across all elements on the page. DedicatedWorker is the default. Automatic fallback on browsers without SharedWorker support.

**Relates to:** P0 Web Worker Support

---

### ~~P1 — CrossOriginWorker Wrapper~~ `DONE`

Module-type Web Workers (`type: "module"`) cannot use `importScripts()`, causing failures when the worker script is loaded from a CDN on a different origin. Stlite had to implement a `CrossOriginWorker` wrapper ([stlite #1217](https://github.com/whitphx/stlite/issues/1217), [PR #1219](https://github.com/whitphx/stlite/pull/1219)). Additionally, `file://` scheme completely breaks worker loading — a fallback to classic workers is required ([stlite #1246](https://github.com/whitphx/stlite/issues/1246)).

Since panel-live distributes its JS via CDN (`cdn.holoviz.org`), any worker file will be cross-origin relative to the host page. This must be solved for the web worker implementation to work in production.

**Done.** `_createWorker()` in `worker-bridge.js` detects cross-origin URLs and wraps them in a blob URL using `importScripts()`. The `file://` protocol is detected in a pre-flight check at the start of `_doInit()` with a clear error message. An init timeout (120s default, configurable via `PanelLive.configure({ initTimeout })`) catches unreachable CDNs.

**Relates to:** P0 Web Worker Support, P1 Distribution

---

### ~~P1 — Granular Loading Status Messages~~ `DONE`

Stlite users were confused by long loading phases with unclear labels ([stlite #428](https://github.com/whitphx/stlite/issues/428)). They added granular status messages: "Loading Python runtime", "Installing packages", "Running app". They also found that misleading labels (e.g. "Setting the loggers" actually loaded the entire Streamlit package) eroded user trust.

panel-live's status overlay should show distinct phases during initialization, especially once Pyodide moves to a worker where the main thread can update the UI during each phase.

**Done.** The worker sends 6 distinct status messages during init ("Loading Pyodide...", "Initializing Pyodide...", "Loading micropip...", "Installing Bokeh + Panel wheels...", "Initializing Panel...", "Detecting requirements..."). These are forwarded to the UI via `_handleStatus()`. Additionally, an init timeout (120s default) ensures that if the CDN is unreachable, users see a clear timeout error instead of an infinite spinner.

---

### P2 — Auto-Detect Packages from Imports

Stlite implemented automatic package detection from `import` statements using Pyodide's `loadPackagesFromImports()` ([stlite #857](https://github.com/whitphx/stlite/issues/857)). This was a significant UX win — users no longer need to manually declare requirements for common packages.

**Caveat:** The initial implementation also detected imports inside function bodies (lazy imports), causing unnecessary installation at startup. The fix was to restrict detection to module-level imports only ([stlite #962](https://github.com/whitphx/stlite/issues/962)).

panel-live has `<panel-requirements>` for explicit declaration, but auto-detection as a fallback would improve the out-of-box experience for simple examples.

**Acceptance:** When no `<panel-requirements>` is present, panel-live automatically detects and installs packages from module-level `import` statements in the user code.

---

### P2 — IndexedDB Caching for Pyodide and Packages

Stlite users requested browser-side caching of Pyodide and packages in IndexedDB to avoid re-downloading on page refresh ([stlite #653](https://github.com/whitphx/stlite/issues/653)). Package installation accounts for ~70% of boot-up time according to stlite user reports ([stlite #1022](https://github.com/whitphx/stlite/issues/1022)).

Stlite also found that the bottleneck is **loading packages into memory, not network transfer** — a single-archive download showed minimal improvement (6.96s vs 6.10s) because the real cost is in-memory initialization.

**Acceptance:** Pyodide runtime and installed packages are cached in IndexedDB. Second page load skips network download for cached resources. Cache is versioned and invalidated on version changes.

---

### P2 — Single HTML File Export

Stlite implemented HTML export from its sharing editor ([stlite #265](https://github.com/whitphx/stlite/issues/265), [#1012](https://github.com/whitphx/stlite/issues/1012)). Users can generate a self-contained HTML file that loads panel-live from CDN and embeds the code. No hosting needed — just share the file.

This would be a powerful addition to panel-live's sharing story. An "Export as HTML" button in playground mode that generates a standalone `.html` file with the current code, requirements, and configuration embedded.

**Acceptance:** Playground mode has an "Export HTML" action that downloads a self-contained `.html` file. The file works when opened in any browser (with internet for CDN resources).

**Relates to:** P2 Sharing Strategy

---

### P2 — Bundle Size Monitoring in CI

Stlite added bundle size diff reporting to CI PRs ([stlite #504](https://github.com/whitphx/stlite/issues/504), [#1685](https://github.com/whitphx/stlite/issues/1685), [PR #1843](https://github.com/whitphx/stlite/pull/1843)). They host bundle visualizer reports on Cloudflare Pages and post sticky comments on PRs with size changes.

panel-live's bundled JS/CSS is loaded on every page with interactive examples. Size regressions directly impact user experience. Tracking this in CI prevents unintentional bloat.

**Acceptance:** CI posts bundle size diff on every PR. Size increases above a threshold require explicit acknowledgment.

**Relates to:** P1 Distribution

---

### P2 — Pyodide URL Configurability for Enterprise

Users in corporate environments need custom Pyodide distribution URLs because standard CDN URLs may be blocked by corporate firewalls ([stlite #614](https://github.com/whitphx/stlite/issues/614), [#1102](https://github.com/whitphx/stlite/issues/1102)). Stlite added a `pyodideUrl` option for custom Pyodide distributions.

panel-live's `PanelLive.configure()` already has CDN URL configuration, but explicit documentation and testing of custom Pyodide URLs for enterprise deployment would lower the adoption barrier.

**Acceptance:** `PanelLive.configure({ pyodideUrl: "https://internal-cdn.example.com/pyodide/" })` works and is documented.

---

### P2 — Browser Compatibility Matrix

Stlite's README includes explicit browser compatibility information, performance expectations ("Expect 5-15 second initial load"), and a clear limitations section. panel-live lacks all three.

Stlite also found that specific browser+platform combinations behave differently:
- Chrome Android: no SharedWorker ([stlite #1398](https://github.com/whitphx/stlite/issues/1398))
- Safari: SharedWorker tests unreliable ([stlite #1831](https://github.com/whitphx/stlite/issues/1831))
- Print dialog resets dark mode ([stlite #657](https://github.com/whitphx/stlite/issues/657))
- Cross-domain iframes fail due to LocalStorage access ([stlite #476](https://github.com/whitphx/stlite/issues/476))

**Acceptance:** Documentation includes a browser compatibility matrix (Chrome, Firefox, Safari, Edge, mobile variants), performance expectations, and known platform-specific issues.

**Relates to:** P1 Documentation, P2 Document Known Limitations

---

### P2 — Load Code from URL (GitHub Gist/Raw)

Stlite sharing supports loading scripts from external URLs via hash fragment: `https://share.stlite.net/#https://raw.githubusercontent.com/.../app.py` with dependency syntax `#url=...&req=package` ([stlite #256](https://github.com/whitphx/stlite/issues/256), [PR #269](https://github.com/whitphx/stlite/pull/269)).

This enables a sharing ecosystem without server infrastructure — users can host code on GitHub Gist or any raw URL and generate a panel-live link that loads it.

**Acceptance:** The playground supports `#url=<raw-url>` in the hash to load code from an external URL. Optional `&req=package1,package2` for specifying requirements.

**Relates to:** P2 Sharing Strategy, P2 Zero-Install Deployment

---

### P2 — Separate View/Edit URLs for Sharing

Stlite uses the same URL hash but different domains for viewing vs editing: `share.stlite.net` (app-only view) and `edit.share.stlite.net` (full editor with live preview). The hash is bidirectional — the same hash works on both URLs.

panel-live could adopt a similar pattern: a lightweight "view" URL that only renders the app output, and an "edit" URL that includes the full editor. This makes shared links more professional when you want to show just the result.

**Acceptance:** Shared URLs support both a view-only mode and an edit mode, switchable via URL path or parameter.

**Relates to:** P2 Sharing Strategy

---

### P2 — Document Source Code Exposure

Enterprise users will ask about hiding or protecting source code in panel-live apps. Stlite's maintainer gave a definitive answer: "it's not possible to protect such code by nature of Stlite like other frontend apps" ([stlite #1048](https://github.com/whitphx/stlite/issues/1048)). Encoding is obfuscation, not encryption.

panel-live should proactively document this to set correct expectations and avoid repeated questions.

**Acceptance:** The security documentation page includes a clear section explaining that source code is visible to the browser and cannot be protected, with reasoning.

**Relates to:** P2 Document Browser Sandbox Security Model

---

### P3 — Patch `time.sleep` to Non-Blocking

`time.sleep()` in Pyodide uses busy-wait, consuming 100% CPU ([stlite #1473](https://github.com/whitphx/stlite/issues/1473)). Stlite is exploring patching it to use a non-blocking implementation. This affects any panel-live user code that uses `time.sleep()` for animations or polling.

**Acceptance:** `time.sleep()` in panel-live does not busy-wait. CPU usage stays low during sleep.

---

### P3 — Auto-Run on Code Change (Debounced)

Stlite's sharing editor auto-saves and re-runs on code changes ([stlite #948](https://github.com/whitphx/stlite/issues/948)). A debounced auto-run option for panel-live's editor mode would improve the interactive development experience.

**Acceptance:** Optional `auto-run="debounce"` attribute on `<panel-live>` that re-executes code after a configurable delay (e.g. 1 second) of no typing.

---

### P3 — File Change Tracking for Live Reload

Since Pyodide 0.27.0, `pyodide.FS.trackingDelegate` enables reacting to file system changes ([stlite #1374](https://github.com/whitphx/stlite/issues/1374)). Stlite plans to use this for syncing file modifications from the running app back to the editor.

This could enable a "live reload" developer experience in panel-live's editor/playground modes.

**Acceptance:** When Python code writes files (e.g. generated data), the editor UI can reflect those changes.

**Relates to:** P3 Filesystem Support

---

### P3 — Alternative Python Distributions (emscripten-forge)

Stlite explored supporting emscripten-forge as an alternative to Pyodide for more granular package selection ([stlite #553](https://github.com/whitphx/stlite/issues/553)). While Pyodide is the right default, abstracting the runtime interface would future-proof panel-live.

**Acceptance:** The runtime interface is cleanly abstracted so that alternative Python distributions could be plugged in without rewriting the UI or worker communication layers.

---

### P3 — Runtime AST Modification for Compatibility

Stlite experimented with runtime AST modification to make incompatible packages work in the browser ([stlite PR #1185](https://github.com/whitphx/stlite/pull/1185)). For example, rewriting import statements or patching module-level code that uses unavailable APIs (threads, subprocesses).

This is an advanced technique but could help panel-live handle packages that have minor incompatibilities with the Pyodide environment.

**Acceptance:** Research spike completed. Decision documented on whether AST modification is worth pursuing for panel-live.

---

### P2 — Pre-Compile Panel Python to Bytecode

Stlite pre-compiles Streamlit's `.py` files to `.pyc` bytecode at build time, resulting in **~9.5% faster loading** (~332ms reduction) ([stlite PR #590](https://github.com/whitphx/stlite/pull/590)). The approach: compile `.py` to `.pyc` in the wheel at build time, matching the Python version used by Pyodide.

panel-live could apply this to Panel and Bokeh wheels for measurable load time improvement.

**Acceptance:** Panel/Bokeh packages load with pre-compiled bytecode. Measured improvement documented.

---

### P2 — CSP Nonce Support (`styleNonce`)

Stlite added a `styleNonce` option for Content Security Policy compliance ([stlite PR #1825](https://github.com/whitphx/stlite/pull/1825)). This allows passing a nonce to dynamically injected `<style>` elements, which is required on sites with strict CSP headers that block inline styles.

panel-live injects styles and should support nonce-based CSP for enterprise/security-conscious deployments.

**Acceptance:** `PanelLive.configure({ styleNonce: "abc123" })` passes the nonce to all dynamically created style elements.

---

### P2 — Unify Docs Examples and E2E Tests (Single Source of Truth)

Stlite unified browser demos, docs examples, and E2E tests into a single source of truth ([stlite PR #1848](https://github.com/whitphx/stlite/pull/1848)). A centralized `demos/` directory with template-based URL substitution serves documentation, live demos, and test pages from the same source files.

This eliminates the problem of docs examples diverging from tested code and reduces maintenance burden.

**Acceptance:** Documentation examples are sourced from files that are also used as E2E test fixtures. A change to an example automatically updates both docs and tests.

**Relates to:** P1 Automated Testing, P1 Systematically Test Documentation

---

### P2 — Jedi-Based Code Completion via Worker

Stlite achieved Python code completion by installing `jedi` in Pyodide and bridging completion requests from the editor to the worker ([stlite PRs #1338](https://github.com/whitphx/stlite/pull/1338), [#1345](https://github.com/whitphx/stlite/pull/1345)). The approach: install jedi in Pyodide, run `getCodeCompletion()` in the worker, send results back to the editor via postMessage.

This is directly applicable to panel-live's P3 language server integration issue. CodeMirror's completion API can receive results from the same worker bridge.

**Acceptance:** Basic Python autocomplete works in the editor, powered by jedi running in the Pyodide worker.

**Relates to:** P3 Language Server Integration

---

### P3 — Changesets for Automated Versioning

Stlite adopted `@changesets/cli` for automated version bumping, changelog generation, and npm publishing ([stlite PR #1630](https://github.com/whitphx/stlite/pull/1630)). This provides structured release management with GitHub integration.

**Acceptance:** Releases use changesets or equivalent for automated versioning and changelog.

**Relates to:** P1 Distribution, P1 Release v0.1.0

---

## Adjustments to Existing Issues

### P0 — Web Worker Support (enrich)

Add the following details based on stlite's battle-tested experience:

1. **Design the worker to work WITHOUT SharedArrayBuffer.** Stlite's architecture uses pure `postMessage` with structured cloning — no `SharedArrayBuffer` required for basic functionality. This eliminates the COOP/COEP header requirement, simplifying deployment on any static hosting. `mini-coi.js` becomes an optional performance enhancement, not a requirement. This may also mitigate the P0 browser crash issue.

2. **Define a typed message protocol from the start.** Stlite uses TypeScript discriminated unions with message types like `WORKER_INITIAL_DATA`, `WEBSOCKET_MESSAGE`, `HTTP_REQUEST/RESPONSE`, `FILE_WRITE/READ`, `INSTALL_REQUIREMENTS`. Panel-live should define equivalent messages for its Bokeh server communication bridge.

3. **Keep the worker alive between re-runs.** Don't reinitialize Pyodide on each execution. Stlite's worker persists across re-runs — only a full reset triggers reinitialization.

4. **Plan for three execution contexts:** DedicatedWorker (default), SharedWorker (opt-in for multi-instance pages), and main-thread fallback (for environments where workers fail).

5. **Build a separate worker entry point.** esbuild supports this natively: `entryPoints: ['lib/index.js', 'lib/panel-live-worker.js']`.

---

### P0 — Browser Crash (enrich)

Add: Stlite's worker architecture avoids SharedArrayBuffer entirely for basic functionality, communicating via pure `postMessage`. This eliminates the main-thread memory pressure (~300-500MB) that likely causes the STATUS_ACCESS_VIOLATION crash. Moving Pyodide to a worker is likely the primary fix for this issue, not just a separate concern.

---

### P1 — Automated Testing (enrich)

Add based on stlite's testing evolution:

1. **Worker message protocol integration tests** — mock the worker and verify the message protocol end-to-end. This is the most important test category once workers are added.
2. **Cross-browser cloud testing** — Playwright's WebKit doesn't support SharedWorker properly. Budget for BrowserStack/LambdaTest for real Safari testing ([stlite #1831](https://github.com/whitphx/stlite/issues/1831)).
3. **Upstream test reuse** — consider running a subset of Panel's own E2E tests against panel-live as a compatibility check ([stlite #1456](https://github.com/whitphx/stlite/issues/1456)).
4. **Unify demos and E2E tests** — stlite unified browser demos, docs examples, and E2E tests into a single source of truth ([stlite PR #1848](https://github.com/whitphx/stlite/pull/1848)).
5. **Mobile regression testing** — always test on Chrome Android and Safari iOS. Stlite had a full regression on mobile when SharedWorker was added without a fallback.

---

### P1 — Distribution (enrich)

Add:
- **SRI hashes** for CDN assets (Subresource Integrity) for security-conscious deployments.
- **Bundle size tracking in CI** with sticky PR comments showing size diffs ([stlite PR #1843](https://github.com/whitphx/stlite/pull/1843)).
- **Changesets for versioning** — stlite uses `@changesets/action` for automated version management and changelog generation.

---

### P2 — postMessage Security (enrich)

Add: Stlite validates message types using TypeScript discriminated unions. Each message has a `type` field checked before processing. Origin validation is light because both sides are same-origin, but the typed message protocol prevents malformed message injection. panel-live should define its message types as part of the P0 worker implementation, not as a separate concern.

---

### P2 — Quarto Extension (enrich)

Add: Stlite's Quarto extension ([quarto-stlite](https://github.com/whitphx/quarto-stlite)) uses iframes, which was considered acceptable since stlite already renders in an isolated context. This validates the iframe approach for panel-live's Quarto extension. Shinylive also uses iframes for Quarto.

---

### P2 — Document Known Limitations (enrich)

Add these specific limitations documented from stlite's experience:
- **No threads:** `RuntimeError: can't start new thread` when Panel/Bokeh features try to create threads ([stlite #218](https://github.com/whitphx/stlite/issues/218))
- **No subprocess:** `OSError: [Errno 138] emscripten does not support processes` — unfixable ([stlite #802](https://github.com/whitphx/stlite/issues/802))
- **2GB memory limit:** WebAssembly hard limit. Users uploading large files will hit this ([stlite #1203](https://github.com/whitphx/stlite/issues/1203))
- **time.sleep busy-wait:** CPU-intensive, no progress bar animation during sleep
- **Async code:** `asyncio.get_event_loop()` works but integrating async results into the rendering pipeline is difficult
- **C extension packages:** Only packages compiled for wasm32/emscripten by Pyodide work (NumPy yes, TensorFlow no)
- **Pyodide version coupling:** Upstream Pyodide releases can silently break behavior (e.g. `toJs()` dictionary conversion changed in 0.29.0, pyarrow added in 0.27 then removed in 0.28) ([stlite #1854](https://github.com/whitphx/stlite/issues/1854))

---

### P2 — Sharing Strategy (enrich)

Add based on stlite's sharing evolution:
- **Single HTML export** — high-value feature for offline sharing ([stlite #265](https://github.com/whitphx/stlite/issues/265))
- **Load from URL** — `#url=<raw-url>&req=package` hash syntax for loading code from GitHub/Gist ([stlite #256](https://github.com/whitphx/stlite/issues/256))
- **Separate view/edit URLs** — same hash, different modes (app-only vs. full editor)
- **URL encoding insight:** For single-file code, simple base64url may outperform gzip compression. For multi-file state (code + requirements + config), Protocol Buffers provide forward/backward compatibility that JSON does not ([stlite #254](https://github.com/whitphx/stlite/issues/254), [#211](https://github.com/whitphx/stlite/issues/211)).

---

### P3 — URL Sharing with Compression (enrich)

Add: Stlite's experience suggests that for typical single-file code snippets, simple base64url encoding is competitive with compression. They removed LZString compression in favor of simpler base64url because it produced shorter URLs for typical code sizes ([stlite #254](https://github.com/whitphx/stlite/issues/254)). Gzip may only help for large multi-file apps. Consider Protobuf for structured sharing state (multi-file + requirements).

---

### P3 — Desktop Version (enrich)

Add based on stlite's production experience:
- **Tauri > Electron** since Pyodide only runs in the renderer process anyway, making Electron's Node.js main process irrelevant. Tauri is lighter and also supports mobile apps ([stlite #329](https://github.com/whitphx/stlite/issues/329)).
- **Snapshot/dump pattern:** Pre-download all Pyodide resources and wheels at build time, bundle into the app for offline capability and faster startup ([stlite PR #295](https://github.com/whitphx/stlite/pull/295)).
- **Security:** `nodeIntegration: false`, `contextIsolation: true`, block navigation to external URLs ([stlite PR #445](https://github.com/whitphx/stlite/pull/445)).
- **Node.js worker mode:** Optional elevated-privilege mode for real filesystem access via NODEFS, with explicit security documentation ([stlite #1817](https://github.com/whitphx/stlite/issues/1817)).

---

### P3 — React / Framework Wrappers (enrich)

Add: Stlite has a production `@stlite/react` package providing a React wrapper component. Users also requested embedding without iframes in React/Vue/Svelte ([stlite #1802](https://github.com/whitphx/stlite/issues/1802)). panel-live's Light DOM design and `PanelLiveController` API are better positioned for framework integration than stlite's approach.

---

### P3 — Filesystem Support (enrich)

Add based on stlite's filesystem experience:
- **IDBFS persistence:** Emscripten's IDBFS (IndexedDB-backed filesystem) enables files to survive page refresh. Stlite supports this for desktop apps. However, IDBFS broke between versions ([stlite #1855](https://github.com/whitphx/stlite/issues/1855)) — version-specific testing is important.
- **File change tracking:** Pyodide 0.27.0+ supports `pyodide.FS.trackingDelegate` for reacting to filesystem changes ([stlite #1374](https://github.com/whitphx/stlite/issues/1374)). This could sync file modifications from running code back to the editor.
- **NODEFS for desktop:** Real filesystem access in Electron/Tauri desktop mode via Emscripten's NODEFS.

---

### P3 — Private Package Feeds (enrich)

Add: Stlite's `mount()` API accepts an `installs` option with `index_urls`, `credentials`, `constraints`, and `pre` parameters for fine-grained package installation control ([stlite #614](https://github.com/whitphx/stlite/issues/614), [draft PR #1146](https://github.com/whitphx/stlite/pull/1146)). panel-live's `PanelLive.configure()` should support similar options.

---

## Patterns to Preserve (panel-live advantages over stlite)

These are areas where panel-live is ahead. Don't regress on them:

1. **Three modes in one element** (app/editor/playground) — stlite has no equivalent
2. **CSS custom properties (`--pl-*`)** for theming — stlite has no theming API
3. **`<panel-example>` child elements** — stlite has no built-in example selector
4. **`theme="auto"` with `prefers-color-scheme`** — stlite requires manual theme setting
5. **MkDocs fence integration** — stlite has no documentation-system integration for code fences
6. **Light DOM** — better framework integration than stlite's iframe approach
7. **Lighter weight** — CodeMirror + esbuild is much smaller than Monaco + Vite
8. **`PanelLiveController`** — richer runtime interaction API than stlite's controller
