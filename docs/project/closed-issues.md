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
