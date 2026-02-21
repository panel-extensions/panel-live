# Closed Issues

Resolved and rejected issues from the panel-live project.

---

## ~~P0 — Design Extensible User/Developer-Facing API~~

**Resolved.** The API uses a single `<panel-live>` custom element (Light DOM) with `mode="app|editor|playground"`. Full specification covers HTML attributes, child elements, JS API, CSS custom properties, and events.

---

## ~~P0 — Settle on Name~~

**Resolved.** The name is **panel-live**, mirroring the "shinylive" convention.

---

## ~~P0 — Determine Repository~~

**Resolved.** Separate `panel-live` repo under `panel-extensions` GitHub organization.

---

## ~~P0 — Does Not Work with panel-material-ui~~

**Resolved.** Confirmed working — `pmui.Button(label="Click Me")` renders successfully. The original issue was related to an older version.

---

## ~~P1 — Evaluate PyScript as Foundation~~

**Rejected.** PyScript adds dependency risk, has stability concerns, and provides no meaningful value for Panel's use case. The POC confirms everything works without it.

---

## ~~P1 — Folder and File Structure~~

**Resolved.** Repo structure finalized: `src/panel_live/` (Python), `lib/` (JS/CSS), `docs/`, `tests/`, `examples/`.

---

## ~~P1 — Separate CSS~~

**Resolved.** CSS extracted from JS into standalone `panel-live.css` (372 lines). CSS custom properties (`--pl-*`) with light/dark presets preserved.

---

## ~~P1 — Cannot Select Code with Mouse~~

**Resolved.** CodeMirror 5 integration works correctly. The original issue was caused by overlapping elements in the old architecture.

---

## ~~P1 — Interactive API Explorer Page~~

**Resolved.** Full interactive explorer at `docs/api-explorer.html` with mode/theme/layout controls, 14 example snippets, CSS variable controls, and live HTML generation.

---

## ~~P1 — Loading Progress (All Modes)~~

**Resolved.** All 3 modes use identical loading UI with status bar, spinner, and stage progression text.

---

## ~~P2 — Multi-file Support~~

**Resolved.** `<panel-file>` custom element supports multi-file apps with `name`, `entrypoint`, and `src` attributes. Files written to Pyodide's virtual filesystem.

---

## ~~P2 — Requirements / Package Specification~~

**Resolved.** `<panel-requirements>` element allows explicit pip package specification. Auto-detection via `find_requirements()` as fallback.

---

## ~~P2 — MkDocs Extension~~

**Resolved.** `src/panel_live/fences.py` implements custom fence for `pymdownx.superfences`. Supports all attributes via `` ```{.panel ...} `` syntax.

---

## ~~P2 — Align Styles Across Modes~~

**Resolved.** Unified `--pl-*` CSS variable system shared by all 3 modes. Styles in separate `panel-live.css`.

---

## ~~P2 — Customizable Styling / Branding~~

**Resolved.** Full `--pl-*` CSS variable system with light/dark presets. `theme="auto"` detects `prefers-color-scheme`.

---

## ~~P2 — Playground Layout Options~~

**Resolved.** `layout` attribute with `"horizontal"` and `"vertical"` values.

---

## ~~P2 — Pixi Commands~~

**Resolved.** `pixi.toml` defines tasks across multiple environments: test, lint, docs, build, serve.

---

## ~~P2 — GitHub Actions CI/CD~~

**Resolved.** CI with pytest, Playwright UI tests, and pre-commit linting on PRs and pushes.

---

## ~~P3 — Dark Theme Support~~

**Resolved.** `theme="auto"|"light"|"dark"` with `prefers-color-scheme` detection, Dracula for dark, CodeMirror default for light.

---

## ~~P1 — Duplicate Execution Logic~~

**Resolved.** Single `runPanelCode()` function with 3-branch execution strategy. No iframe mode, no duplication.

---

## ~~P1 — Copy Code Button~~

**Resolved.** Copy button with `navigator.clipboard.writeText()` and "Copied!" toast feedback in all editor/playground modes. "Copy error" button on error panels.

---

## ~~P2 — Docs Theme Toggle Does Not Update Instances~~

**Resolved.** `MutationObserver` watches `data-md-color-scheme` on `document.body` and updates CodeMirror theme dynamically. `MediaQuery` listener handles system preference changes.

---

## ~~P2 — Landing Page Should Showcase Generic Python Support~~

**Resolved.** Landing page includes a matplotlib example (no Panel imports) immediately after the default slider demo, under a "Works with any Python" section.

---

## ~~P2 — Revise README for Broader Audience~~

**Resolved.** README leads with "Write, edit, and run Python interactively in the browser" and "Turn any web page into an interactive Python playground". No Panel-centric framing.

---

## ~~P1 — Fix events/ Page Navigation~~

**Resolved.** Events page moved from under "Styling" to its own "Events" section in `zensical.toml` navigation. The page now appears correctly in the sidebar.

---

## ~~P2 — Rename "Competitors" to "Alternatives"~~

**Resolved.** All references to "competitors" in `docs/explanation/design.md` replaced with "alternatives" — section heading, comparison table intro, and differentiators list.

---

## ~~P2 — Enable "org" Mode in MkDocs~~

**Resolved.** `mode="org"` in the fence syntax delegates to `pymdownx.superfences.fence_code_format()` to render a standard syntax-highlighted code block. No `<panel-live>` element is inserted. Documented in how-to/mode.md and reference/html-api.md. Tests in `tests/test_fences.py`.

---

## ~~P1 — Handle Python Errors Properly~~

**Resolved.** Tracebacks are parsed into structured frames. User-code frames (`<exec>`, `<module>`, `<string>`, `<ast>`) are shown prominently; internal Pyodide/Panel frames are hidden behind a collapsible `<details>` section. Error type and message are displayed in a header. A "Copy error" button copies the full traceback. Remaining: syntax highlighting in traceback, async/callback error capture.

---

## ~~P1 — Warn on Invalid Source URLs~~

**Resolved.** `fetchPythonSource()` validates HTTP status, checks `Content-Type` header, and detects HTML responses. Invalid URLs produce a clear error message instead of a cryptic `SyntaxError`.

---

## ~~P1 — Build System~~

**Resolved.** esbuild bundles ES modules from `lib/` into `dist/panel-live.js` (main IIFE) + `dist/panel-live-worker.js` (worker IIFE) + `dist/panel-live.css` with source maps. Build script: `build.mjs`.

---

## ~~P1 — Python Code as String Concatenation~~

**Resolved.** 6 Python bootstrap scripts in `lib/python/` (servable-setup, servable-render, servable-target-setup, servable-target-render, expression-exec, expression-render). Imported as text strings via esbuild `.py` text loader.

---

## ~~P1 — Display Print Statements~~

**Resolved.** `sys.stdout` and `sys.stderr` are captured via `io.StringIO()` in all 3 execution branches (servable, servable-target, expression). Output is rendered as a `<pre class="pl-stdout">` element above the app output.

---

## ~~P2 — Tracking Prevention Blocks CDN Resources~~

**Resolved.** CodeMirror 6 is bundled via esbuild. No CDN dependency for the editor.

---

## ~~P2 — CodeMirror 5 is Legacy~~

**Resolved.** Full CodeMirror 6 migration with ESM imports, bundled via esbuild. Python syntax highlighting, oneDark theme, VS Code keybindings.

---

## ~~P2 — Auto Layout Based on Window Size~~

**Resolved.** `layout="auto"` switches between horizontal (wide) and vertical (narrow ≤768px) via CSS `@media` query on `data-layout="auto"` attribute. Auto is now the default for playground mode.

---

## ~~P2 — Error Boundaries Between Apps~~

**Resolved.** Bokeh `curdoc` is reset to a fresh `Document()` in a `finally` block after each execution, preventing cross-contamination between apps.

---

## ~~P2 — VS Code Keyboard Shortcuts~~

**Resolved.** VS Code keybindings added via CM6: Ctrl+D (select next occurrence), Ctrl+Shift+K (delete line), Ctrl+L (select line), Ctrl+/ (toggle comment).

---

## ~~P2 — Support GitHub URLs in `src` Attribute~~

**Resolved.** `resolveSourceUrl()` detects GitHub blob URLs and converts them to `raw.githubusercontent.com` URLs before fetching.

---

## ~~P3 — Link to panel-live Docs from Editor / Playground~~

**Resolved.** A `?` help link button is added to all editor and playground headers, linking to the panel-live docs site.

---

## ~~P0 — Web Worker Support~~

**Resolved.** Pyodide now runs in a Dedicated Worker (singleton per page). The main thread stays responsive during load and execution — spinners animate smoothly, the page remains interactive. Architecture: `panel-live-worker.js` runs Pyodide/micropip/user code in the worker; `worker-bridge.js` manages the worker from the main thread, handling Bokeh `embed_items()`, bidirectional document sync via JSON patches, real-time `print()` streaming, and error rendering. All 3 execution branches (servable, servable-target, expression) are unified into `worker-setup.py` + `worker-render.py`. The worker has an internal execution queue for serializing multi-element execution.

---

## ~~P1 — Python Code as String Concatenation (Update)~~

**Updated.** The 6 branch-specific Python scripts (servable-setup, servable-render, servable-target-setup, servable-target-render, expression-exec, expression-render) have been unified into 2 scripts: `worker-setup.py` (all branches) and `worker-render.py` (serialization via `_doc_json()`). Still imported as text strings via esbuild `.py` text loader.

---

## ~~P1 — Display Print Statements (Update)~~

**Updated.** Print output now streams in real-time via the Web Worker's `StreamingWriter` class, which calls JS callbacks on each `write()`. Output appears incrementally in a `<pre class="pl-stdout">` element as code executes, rather than only after completion.

---

## ~~P1 — JS Modular Architecture~~

**Resolved.** Monolithic `panel-live.js` decomposed into 13 focused ES modules in `lib/`. Each module has a single responsibility with named exports: `config.js` (configuration/CDN URLs), `utils.js` (utilities), `theme.js` (dark mode), `codemirror.js` (editor), `worker-bridge.js` (worker communication), `error-renderer.js` (error display), `helper-elements.js` (child elements), `url-sharing.js` (URL encoding), `panel-live-element.js` (custom element), `controller.js` (runtime API), `api.js` (public API), `panel-live-worker.js` (Dedicated Worker), and `index.js` (entry point). Bundled by esbuild into `dist/panel-live.js` (main IIFE) + `dist/panel-live-worker.js` (worker IIFE) + `dist/panel-live.css`.

---

## ~~P1 — Vitest Unit Test Suite~~

**Resolved.** 69 Vitest unit tests across 6 test modules covering config, utils, theme, url-sharing, error-renderer, and worker-bridge. Tests run in a jsdom environment via `pixi run test-js`. V8 coverage reporting available via `pixi run test-js-coverage`.

---

## ~~P1 — Run Button Causes Layout Flicker~~

**Resolved.** Output height preserved via `minHeight` lock during re-run. Status bar uses absolute positioning over the output area. No visible layout shift.

---

## ~~P2 — Improve UX (Buttons, Tooltips, Layout)~~

**Resolved.** Tooltips added to all buttons. Code toggle redesigned with "Expand Code" / "Collapse Code" labels. Toggle buttons use `.pl-btn secondary` class for visual consistency with Copy/Share/Reset buttons.

---

## ~~P2 — Show Web Component Syntax in Docs~~

**Resolved.** All how-to guide pages systematically show both MkDocs fence syntax and `<panel-live>` HTML web component syntax.

---

## ~~P2 — Working Examples Across How-To Guides~~

**Resolved.** All how-to guides include live `<panel-live>` elements that render and execute. No indicative-only examples remain.

---

## ~~P2 — Update Mini-Coi Documentation~~

**Resolved.** mini-coi.js setup documented in `docs/how-to/mkdocs-integration.md` with usage instructions and troubleshooting.

---

## ~~P2 — Document MkDocs Integration for Third-Party Users~~

**Resolved.** `docs/how-to/mkdocs-integration.md` provides complete setup instructions including `zensical.toml`/`mkdocs.yml` configuration, custom fence registration, asset setup, and troubleshooting.

---

## ~~P1 — Automated Testing~~

**Resolved.** Expanded from 69 to 123 Vitest JS unit tests across 9 test modules. New test files: `helper-elements.test.js` (16 tests for `<panel-file>`, `<panel-requirements>`, `<panel-example>`), `api.test.js` (12 tests for `PanelLive.configure()` and `PanelLive.mount()`), `controller.test.js` (6 tests for `PanelLiveController`), plus 18 message validation tests in `worker-bridge.test.js`.

---

## ~~P1 — Systematically Test Documentation~~

**Resolved.** All documentation pages reviewed. Code examples verified as working or clearly marked as illustrative. Prose descriptions added to examples page for LLM accessibility. All how-to guides include live `<panel-live>` elements.

---

## ~~P2 — Simplify Index Page Examples for Mobile~~

**Resolved.** Editor example on `index.md` simplified from 35-line color palette generator to an 11-line greeting demo using TextInput + IntSlider. Fits comfortably on mobile screens.

---

## ~~P2 — Playground Default Example~~

**Resolved.** Playground default replaced with a welcoming example featuring name input, emoji greeting, and link to panel-live docs. Two legacy examples modernized from `param.watch()` to `pn.bind()` pattern.

---

## ~~P2 — postMessage Security~~

**Resolved.** Structural message validation added to both sides: `_validateWorkerMessage()` in `worker-bridge.js` whitelists valid message types and checks type-specific required fields; `_validateMainMessage()` in `panel-live-worker.js` does the same for incoming messages. Invalid messages rejected with `console.warn`. Design rationale documented in `docs/explanation/design.md`.

---

## ~~P2 — CSP Nonce Support~~

**Resolved.** `styleNonce` added to `_defaults` in `config.js`. `loadScript()` and `loadCSS()` in `utils.js` apply the nonce to dynamically created `<script>` and `<link>` elements when truthy. Design rationale documented in `docs/explanation/design.md`.

---

## ~~P2 — Document Known Limitations~~

**Resolved.** `docs/reference/known-limitations.md` covers all limitations: no threads, no subprocess, 2GB memory limit, `time.sleep` busy-wait, C extension packages, no `.plot()`/`.show()`, source code exposure, CORS constraints, performance expectations, and Pyodide version coupling. Landing page links to it.

---

## ~~P2 — Document Browser Sandbox Security Model~~

**Resolved.** `docs/explanation/security.md` explains the client-side execution model, what the browser sandbox prevents, source code visibility, COOP/COEP context, and comparison with server-side execution.

---

## ~~P2 — Browser Compatibility Matrix~~

**Resolved.** `docs/reference/browser-compatibility.md` includes browser support table (Chrome 90+, Firefox 90+, Edge 90+, Safari 16.4+, mobile variants), WebAssembly/SharedArrayBuffer requirements, performance expectations, known platform-specific issues, and minimum hardware recommendations.

---

## ~~P2 — Self-Hosting Documentation~~

**Resolved.** `docs/how-to/self-hosting.md` covers what to download, directory structure, `PanelLive.configure()` setup, server COOP/COEP headers (Apache, Nginx, Caddy), and verification checklist.

---

## ~~P2 — Service Worker Fragility Behind Auth Proxies~~

**Resolved.** `docs/how-to/auth-proxy-setup.md` documents the problem, symptoms, server-side COOP/COEP header configuration for Apache/Nginx/Caddy/Cloudflare/Netlify/Vercel, and when mini-coi.js suffices vs when server headers are required.

---

## ~~P2 — Document Claude.ai Usage~~

**Resolved.** `docs/how-to/claude-artifacts.md` documents how panel-live works in Claude.ai HTML artifacts, including example artifact HTML, sandbox constraints, and tips for prompting Claude.

---

## ~~P2 — LLM Page Accessibility~~

**Resolved.** Prose descriptions added before every example in `docs/examples.md`, explaining what APIs and patterns each example demonstrates. All documentation pages have clear semantic headings and structured content.

---

## ~~P2 — Review `label` Attribute Naming~~

**Resolved.** Decision: keep `label`. Rationale documented in `docs/how-to/label.md` — it's the most semantic term, aligns with HTML/accessibility conventions, and leaves `title`/`description` available for future attributes.

---

## ~~P2 — Panel Live Skill for Claude Code~~

**Resolved.** `skills/panel-live.md` created with quick start (HTML + MkDocs fence), three modes with examples, all HTML attributes, child elements, JS API, constraints, and architecture summary.

---

## ~~P2 — Iframe Embedding~~

**Resolved.** `docs/how-to/iframe-embedding.md` documents basic iframe patterns, COOP/COEP requirements, recommended iframe attributes, same-origin vs cross-origin considerations, and known limitations.

---

## ~~P2 — DeckGL Extension Not Working in WASM Runtime~~

**Resolved.** DeckGL works using a JSON spec approach with `pn.pane.DeckGL(json_spec, ...)` — this bypasses the `@deck.gl/core` loading issue that affected `pn.extension("deckgl")`. Example moved from "Not Working" to the main examples page.

---

## ~~P2 — Requirements Whitespace Splitting~~

**Resolved.** `worker-bridge.js` `install()` now splits by any whitespace (not just newlines). Fixes `<panel-requirements>fastparquet requests</panel-requirements>` producing a single invalid package name.

---

## ~~P2 — Package Aliases (`packageAliases`)~~

**Resolved.** `packageAliases` config maps package names to wheel URLs. Resolved in both `worker-bridge.js` (explicit install) and `panel-live-worker.js` (auto-detected requirements). Passed from main thread to worker during init. Empty defaults — infrastructure for future use (e.g. DuckDB once a compatible wheel exists).

---

## ~~P2 — Playground URL on Subpages~~

**Resolved.** `_updatePlaygroundLink()` derives site root from `<script src="...panel-live.js">` tag. Previously resolved relative to current page, producing wrong URLs from subpages like `/examples/`.

---

## ~~P2 — CSS Button Height and Toggle Visibility~~

**Resolved.** `.pl-btn` uses `display: inline-flex; align-items: center` instead of `line-height: 1`. Playground link stays visible when code is expanded (only Copy is hidden via `.copy-btn.pl-toggle-btn` selector).

---

## ~~P0 — Browser Crash (STATUS_ACCESS_VIOLATION)~~

**Resolved.** Chrome 137+ ships JSPI (JavaScript Promise Integration) enabled by default, which conflicts with Pyodide's async scheduler and causes `STATUS_ACCESS_VIOLATION` crashes during heavy WASM operations like `import panel as pn`. The crash was hardware/environment-dependent — reproducible on one specific Windows laptop (Chrome and Edge) but not on a second Windows laptop, iOS iPhone, iOS tablet, or Firefox.

**Root cause:** JSPI's `WebAssembly.Suspending`/`WebAssembly.promising` APIs. See [pyodide#5702](https://github.com/pyodide/pyodide/issues/5702), [pyodide#5705](https://github.com/pyodide/pyodide/issues/5705).

**Fix:**

1. **JSPI disabled by default** — `disableJSPI: true` in config. Before loading Pyodide in the worker, `WebAssembly.Suspending` and `WebAssembly.promising` are deleted, and `loadPyodide({ enableRunUntilComplete: false })` forces the proven pre-JSPI async scheduler. Users can opt back in via `PanelLive.configure({ disableJSPI: false })` when Pyodide ships a JSPI-compatible release.
2. **Stall detection + crash recovery** — `STATUS_ACCESS_VIOLATION` kills the worker silently (no `onerror`). A 45-second stall timer detects unresponsive workers. On first stall, the bridge terminates the dead worker and allows re-initialization. After max retries, pending promises are rejected with an actionable error message.
3. **Enhanced `_onWorkerError`** — Crash-like errors (non-network, non-file) trigger recovery instead of immediate rejection.

**Confirmed:** 4 targeted experiments confirmed JSPI as the cause. Stress test (26 diverse examples including matplotlib, seaborn, altair, plotly, hvplot, holoviews, xarray, colorcet) passed 26/26 in 6.0s on the crash-prone machine. Docs site verified working.

**Note:** Enterprise antivirus (Sophos StackPivot detection, [pyodide#5768](https://github.com/pyodide/pyodide/issues/5768)) is a separate trigger that cannot be mitigated in JavaScript — requires endpoint config or user workaround.

---

## ~~P1 — Don't Auto-Run Pyodide on Home Page~~

**Resolved.** Multiple complementary mechanisms prevent Pyodide from auto-loading on page visit:

1. **`auto-run="false"` default** — MkDocs fence formatter (`fences.py`) now defaults to `auto-run="false"`. All examples require an explicit click to activate Pyodide.
2. **`PanelLive.runAll()` API** — Sequential execution of all `<panel-live>` elements on a page, enabling page-level "Run All" buttons. Dispatches `pl-run-all-start` and `pl-run-all-end` events.
3. **Preview badge** — Pre-rendered output shows a small "Run" badge overlay instead of static text. Clicking the badge or the output activates Pyodide.
4. **`preview` attribute** — Static image placeholder for examples that can't be pre-rendered (streaming, periodic callbacks). Clicking the image activates Pyodide.
5. **Run placeholder** — "Click Run to execute this example" text shown when no preview and no pre-render are available.
6. **Element registry** — `registerElement()`/`unregisterElement()` tracks connected elements in document order for `runAll()`.

---

## ~~P2 — Analyze mkdocs-jupyterlite~~

**Resolved.** Full analysis in `dev/research/mkdocs-jupyterlite-analysis.md`. Reviewed NickCrews/mkdocs-jupyterlite (plugin + iframe approach) and DerThorsten fork (superfences + REPL approach), plus upstream JupyterLite issues. Key findings informed panel-live's Light DOM architecture, CDN-first approach, and editor state persistence strategy.

---

## ~~P2 — Analyze jupyterlite-sphinx~~

**Resolved.** Full analysis in `dev/research/jupyterlite-sphinx-analysis.md`. Reviewed 20+ issues/PRs, codebase architecture, and adopter experiences (NumPy, SciPy). Findings informed the Sphinx extension design: CDN assets (no build overhead), click-to-run default, parallel build safety, versioned CDN URLs, and version config in `conf.py`.

---

## ~~P3 — Static Preview Image or GIF~~

**Resolved.** `preview` attribute implemented on `<panel-live>`. Displays a static image (PNG/GIF) in the output area before the user clicks Run. Clickable image with "Run" badge overlay. When `auto-run="false"` with no preview and no pre-render, a "Click Run to execute this example" placeholder text is shown. Supported in MkDocs fences, Sphinx directive (`:preview:` option), and Quarto Lua filter (`#| preview:` directive). Documented in `docs/how-to/preview.md`.
