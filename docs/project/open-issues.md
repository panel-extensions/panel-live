# Open Issues

Outstanding issues and planned improvements for panel-live.

**Priority levels:** P0 = Blocker, P1 = Critical, P2 = Important, P3 = Nice-to-have.

---

## P0 — Browser Crash (STATUS_ACCESS_VIOLATION)

The browser crashes with `STATUS_ACCESS_VIOLATION` in Chrome/Edge on some machines. Firefox is more stable. `serve.py` adds COOP/COEP headers for SharedArrayBuffer, but crashes still occur.

**Update:** Scope appears narrow — only reproducible on one specific Windows laptop in Edge/Chrome. Testing on iOS tablet, iOS iPhone, and a second Windows laptop all work fine. ~~Crash warnings in README.md and index.md should be softened to reflect that this affects some Edge/Chrome users, with Firefox as a known workaround.~~ **Done:** Banner in `docs/overrides/main.html` softened, README.md updated.

**Likely causes:** Main thread memory pressure (~300-500MB), missing COOP/COEP headers behind proxies, version incompatibilities. Moving Pyodide to a Dedicated Worker (now done) isolates the ~300-500MB from the main thread, which may mitigate this.

**Acceptance:** No crashes on 8GB RAM machines with up to 3 concurrent apps.

---

## P1 — Distribution `PARTIAL`

esbuild bundling is done. CDN hosting is live at `cdn.holoviz.org/panel-live/latest/`. **Remaining:** CI workflow that publishes versioned assets to `cdn.holoviz.org/panel-live/vX.Y.Z/` on git tag, npm package, minified builds, automated release workflow. Users should be able to load specific versioned assets (including `mini-coi.js` and other dependencies) instead of only `latest/`, to ensure reproducibility.

Additional items informed by competitor research:

- SRI hashes for CDN assets (Subresource Integrity) for security-conscious deployments
- Bundle size tracking in CI with sticky PR comments showing size diffs
- Changesets or equivalent for automated versioning and changelog generation

---

## P1 — Documentation `PARTIAL`

Docs site built with MkDocs/zensical. Getting Started tutorial created (`docs/tutorials/getting-started.md`). Security model documented (`docs/explanation/security.md`). Known limitations, browser compatibility reference pages added. How-to guides for self-hosting, auth proxy setup, Claude artifacts, and iframe embedding created. **Remaining:** comprehensive API reference, configuration guide, architecture overview.

---

## P1 — Examples Gallery `PARTIAL`

Review existing examples. Simplify, beautify, comment and use recommended APIs (`param.bind` or `@param.depends`, not `watch`). Those examples should represent Panel and the HoloViz ecosystem from its best side.

Specific improvements needed:

- ~~Add a LaTeX example — attempted but rendering broken (KaTeX/MathJax JS resources not loading in Pyodide).~~ **Done:** `docs/assets/examples/latex-demo.py` — interactive KaTeX equation rendering. Moved from "Not Working" to examples page.
- ~~Add a Plotly example~~ **Done:** `docs/assets/examples/plotly-demo.py` — grouped bar chart with RadioButtonGroup
- ~~Add Seaborn and plotnine examples~~ **Done (Seaborn):** `docs/assets/examples/seaborn-demo.py` — violin plot in expression mode. Plotnine still needed.
- ~~Add xarray, Polars, DuckDB, and SQLite examples (consider separate subpages for non-HoloViz examples to reduce page load time)~~ **Done (xarray, Polars):** examples added. **DuckDB:** blocked upstream — no compatible wheel for Pyodide v0.28+ (emscripten 4.x). `packageAliases` infrastructure ready for when a wheel is available. See `docs/project/not-working/duckdb.md`.
- ~~**KPI Dashboard:** Change "Quarterly target" to "Target" — current text takes up too much space~~ **Done**
- ~~**Streaming Random Walk:** The "follow" checkbox has no visible effect. Investigate and fix if buggy. Add a tooltip explaining the expected behavior.~~ **Done:** Rollover increased to 50 so table scrollbar appears and follow has a visible effect.
- ~~**Matplotlib:** Still takes up too much vertical space. Reduce layout height.~~ **Done:** Responsive image CSS rule added (`.pl-output img { max-width: 100%; height: auto; }`)
- ~~**DeckGL:** Current example is not realistic or visually appealing.~~ **Done:** Replaced with 3D HexagonLayer over Manhattan with elevation scale and hex radius controls.
- ~~**Mini Calculator / Unit Converter:** Replace dropdown widgets with RadioButton or ButtonRadioGroup where there are only a few options. Optimize layout for a natural, compact flow.~~ **Done**

Prose descriptions added before every example in `docs/examples.md` for LLM accessibility.

---

## P1 — Release v0.1.0

No formal release yet. Depends on: browser crash fix, documentation, distribution, testing, known limitations. (Sphinx extension is P2, not a blocker.)

---

## P2 — Choose and Configure Editor Theme `PARTIAL`

Light/dark switching works via CM6 Compartment with oneDark theme. **Remaining:** additional built-in themes, high-contrast theme, configurable editor theme independent of UI theme.

---

## P2 — Prescript / Setup Code

No mechanism for setup code before user code (e.g. `pn.extension(design="material")`). Needs `<panel-prescript>` element and MkDocs-level configuration.

---

## P2 — Memory Leak on Re-run (Hypothesis)

Pyodide proxy functions may accumulate across runs. Needs browser profiling to confirm or close.

**Update:** Worker ref counting (`registerElement()`/`cleanupElement()`) is now implemented — when all `<panel-live>` elements disconnect, the worker terminates after a 5s grace period, freeing ~300-500MB. Proxy function cleanup on re-run still needs profiling. (Source: gradio-lite confirmed sessions accumulate without explicit cleanup.)

---

## P2 — Sphinx Extension

No Sphinx extension. Required for Panel's own Sphinx-based documentation.

Success Criteria:

- Automated tests. Relevant pytests. Also in Github actions
- Manual testing easy via sphinx docs in docs-sphinxs folder. Relevant pixi commands. This should mimic what is needed for panel to use this. Including being able to specify the version of panel-live, pyodide, bokeh and panel including alpha, beta and rc releases of panel+bokeh wheels.
- Can technically replace current panel pyodide sphinx extension in https://github.com/holoviz-dev/nbsite/tree/main/nbsite/pyodide and https://github.com/holoviz/panel/blob/main/doc/conf.py.
- Easy to understand for Panel maintainers that this will be an easy, working and beneficial change. That its a drop in replacement.

Complication:

- Would probably require that code can be pre-executed/ pre-rendered (i.e. a "static" mode)
- Might also require either a way to share an environment over multiple panel-live elements. Or a way to run code e2e isolated but display a selection of lines (e.g. lines 19-23) in the editor to be able to tell a story.

---

## P2 — Quarto Extension

No Quarto extension. Shinylive's Quarto extension provides prior art.

**Architecture note:** Shinylive's Quarto extension uses a thin Lua filter that calls back into a Python CLI (`shinylive extension info/base-htmldeps/...`) for dependency resolution. This keeps the extension thin while the Python package handles complex logic. Panel-live should follow the same Lua filter + CLI callback pattern. (Source: quarto-ext/shinylive codebase.)

Success Criteria:

- Automated tests. Relevant pytests. Also in Github actions
- Manual testing easy via quarto docs in docs-quarto folder. Relevant pixi commands to install, run, build and test.
- Can technically replace https://github.com/awesome-panel/holoviz-quarto. I.e. we can deprecate this repository and refer to panel-live.

---

## P2 — Version Info Display & Version Switching

No way to see runtime versions or switch versions in playground mode.

---

## P2 — Zero-Install Deployment / Link Sharing `PARTIAL`

URL sharing via base64-encoded hash is working (playground mode). **Remaining:** graceful COOP/COEP fallback, hosted reference deployment.

---

## P2 — Links from Panel Website and README

No links from the Panel website or GitHub README to the playground. The Panel docs at `panel.holoviz.org/how_to/wasm/` should link to panel-live and recommend it as the easiest and most powerful option for running Panel in the browser.

---

## P2 — Migrate HoloViz Projects to panel-live

Getting HoloViz ecosystem projects to adopt panel-live for their documentation could be transformative for Panel and the wider HoloViz ecosystem. Start with panel-reactflow as an experiment.

**Update:** Hugging Face Spaces is another adoption vector. [gradio-lite is no longer maintained](https://discuss.huggingface.co/t/gradio-lite-mostly-dead-on-all-spaces/169640) — the repo is frozen with no updates. This creates a gap for browser-based Python WASM frameworks on HF Spaces that panel-live can fill. A panel-live HF Spaces template (see below) would make it trivial for HF users to adopt panel-live.

**Acceptance:** At least one HoloViz project (e.g. panel-reactflow) uses panel-live in its documentation.

---

## P2 — Hugging Face Spaces Template

Create a `panel-extensions/panel-live-template` Hugging Face Space with `sdk: static` that serves as a starter template for panel-live apps on HF Spaces. Model it on the existing [`gradio/gradio-lite-template`](https://huggingface.co/spaces/gradio/gradio-lite-template) pattern: a `README.md` with YAML frontmatter (`sdk: static`) and an `index.html` that loads panel-live from CDN.

**Motivation:** [gradio-lite is no longer maintained](https://discuss.huggingface.co/t/gradio-lite-mostly-dead-on-all-spaces/169640) — the repo is frozen and no updates are being made. This leaves a gap in the HF Spaces ecosystem for browser-based Python WASM frameworks. Panel-live can fill this gap with a ready-to-use template.

Include a sentiment analysis demo using [`transformers-js-py`](https://github.com/nicholasmckinney/transformers-js-py) to demonstrate in-browser ML inference — mirroring the gradio-lite template pattern. The goal is for panel-live to appear as a template option when users create new HF Spaces.

**Acceptance:** A `panel-extensions/panel-live-template` HF Space exists with `sdk: static`, loads panel-live from CDN, includes a working interactive demo, and can be duplicated by HF users as a starting point.

---

## P2 — Contribute panel-live Example to transformers.js.py

Submit a PR to [`whitphx/transformers.js.py`](https://github.com/whitphx/transformers.js.py) adding a panel-live HTML example to the Panel section of the README. The existing Panel section uses the `panel convert` workflow — add a panel-live `<panel-live>` web component example alongside it (not replacing the existing example).

The example should show the HTML pattern: load panel-live JS/CSS from CDN, use a `<panel-live>` element with a `<panel-requirements>` child containing `transformers_js_py`, and include Panel code that runs a transformer pipeline. Link to a live HF Space demo once the panel-live HF Spaces template exists.

**Acceptance:** A PR is submitted to `whitphx/transformers.js.py` adding a working panel-live HTML example to the Panel section of the README.

---

## P2 — Enable "render" Mode in MkDocs

Add a "render" mode (or "compile" / "save") that pre-renders Panel code to static HTML at build time, rather than running it live in the browser. This is the path to replacing the existing Panel/HoloViz pyodide integration in [nbsite](https://github.com/holoviz-dev/nbsite/tree/main/nbsite/pyodide).

Open questions: Should the output embed directly into the document or load in an iframe? Can previously rendered output be cached and loaded via `src`? Can multiple renders run in parallel during the build?

**Acceptance:** `mode="render"` produces static HTML output at build time. The output renders without requiring Pyodide at page load.

---

## P2 — Sharing Strategy

No cohesive strategy for sharing panel-live apps. Need to address:

- **Share via Gist:** Enable sharing via `?gist=GIST_ID` URL parameter that fetches gist content from the GitHub API (shinylive pattern).
- **Create / Export:** Enable users to create and export self-contained panel-live apps, including single HTML file export (stlite pattern).
- **Load from URL:** Support `#url=<raw-url>` in the hash to load code from an external URL, with optional `&req=package` for requirements (stlite pattern).
- **Separate view/edit URLs:** Same hash works on both app-only view and full editor.
- **Official URLs:** Decide where official app/editor/playground links should live (Panel website vs panel-live website).
- **Durability:** Plan for keeping shared links working as Pyodide, Panel, and Bokeh versions change.
- **LZString compression:** Better fit than gzip for URL-safe compression; available in both Python and JS (shinylive pattern).

**Acceptance:** A documented sharing strategy covering gist sharing, export, official URLs, and long-term link stability.

---

## P2 — Reproducibility and Version Pinning

No mechanism to pin specific versions of Pyodide, Panel, Bokeh, or other dependencies. When upstream versions change, previously working examples may break. Options to explore:

- Query parameters (e.g. `?pyodide=0.26.0&panel=1.4.0`)
- [PEP 723](https://peps.python.org/pep-0723/) inline script metadata for dependency declarations
- Versioned asset bundles

**Acceptance:** Users can specify dependency versions for reproducible execution. At least one mechanism (query args, PEP 723, or versioned bundles) is implemented and documented.

---

## P2 — Python API Namespace

`panel_live.fences` implies MkDocs/pymdownx.superfences specificity but doesn't generalize to Sphinx, Quarto, or other documentation systems. The module namespace should be planned to accommodate multiple documentation frameworks and updated accordingly.

**Acceptance:** A namespace plan covering MkDocs, Sphinx, and Quarto extensions. Module renamed if necessary, with documentation updated.

---

## P2 — Discourse Embedding

Test embedding panel-live in Discourse forums, specifically [discourse.holoviz.org](https://discourse.holoviz.org/). Determine whether the web component or iframe approach works, and document any site-level configuration requirements. If embedding is not safe or feasible, document why.

**Acceptance:** Discourse embedding is tested and either works with documentation, or is documented as infeasible with explanation.

---

## P2 — Browser Console Debugging Guide

Document how to use the browser developer console to debug panel-live issues. Cover inspecting worker messages, viewing Bokeh errors, checking network requests for CDN resources, and common troubleshooting patterns. This would help users self-diagnose issues before reporting bugs.

**Acceptance:** A how-to guide or reference page documents browser console debugging techniques for panel-live.

---

## P2 — Analyze mkdocs-jupyterlite

Review [mkdocs-jupyterlite](https://github.com/NickCrews/mkdocs-jupyterlite/) code, issues, and PRs for challenges relevant to panel-live. Look for shared patterns around WASM loading, asset management, MkDocs integration, and cross-origin issues that could inform panel-live's roadmap.

**Acceptance:** Analysis completed and relevant findings documented as new issues or notes on existing issues.

---

## P2 — Analyze jupyterlite-sphinx

Review [jupyterlite-sphinx](https://github.com/jupyterlite/jupyterlite-sphinx) code, issues, and PRs for challenges relevant to panel-live. Especially useful for the planned Sphinx extension — patterns for asset injection, configuration, and build-time integration.

**Acceptance:** Analysis completed and relevant findings documented as new issues or notes on existing issues.

---

## P2 — Panel Extension Examples

Add examples for known Panel extensions including [panel-graphic-walker](https://github.com/panel-extensions/panel-graphic-walker) and [panel-reactflow](https://github.com/panel-extensions/panel-reactflow). Should be in a separate "Panel Extensions" section or page to keep the main examples page focused.

**Acceptance:** A dedicated section or page with working examples for panel-graphic-walker, panel-reactflow, and other Panel extensions.

---

## P2 — SharedWorker Mode for Multi-Instance Pages

Share a single Pyodide runtime across multiple `<panel-live>` elements on the same page via `<panel-live shared-worker>` or `PanelLive.configure({ sharedWorker: true })`. Reduces memory from ~300MB per instance to ~300MB total on documentation pages with many examples.

**Key lessons from competitors:**
- SharedWorker is **not available on Chrome Android** — automatic fallback to DedicatedWorker is required (stlite had a full mobile regression without this).
- Playwright's WebKit does not support SharedWorker properly — real Safari testing via BrowserStack is needed.
- DedicatedWorker must remain the default.

**Acceptance:** SharedWorker mode shares a single Pyodide worker across all elements on the page. Automatic fallback on browsers without SharedWorker support.

---

## P2 — IndexedDB Caching for Pyodide and Packages

Cache Pyodide runtime and installed packages in IndexedDB. Second page load skips network download. Package installation accounts for ~70% of boot-up time according to stlite user reports. Note: stlite found that the bottleneck is loading packages into memory, not network transfer — but caching still eliminates the download phase entirely.

**Acceptance:** Pyodide runtime and installed packages are cached in IndexedDB. Cache is versioned and invalidated on version changes.

---

## P2 — Single HTML File Export

"Export HTML" action in playground mode that downloads a self-contained `.html` file with the current code, requirements, and configuration embedded. The file loads panel-live from CDN — no hosting needed. (Source: stlite's sharing editor.)

**Acceptance:** Playground mode has an "Export HTML" action that downloads a self-contained `.html` file. The file works when opened in any browser (with internet for CDN resources).

**Relates to:** P2 Sharing Strategy

---

## P2 — AST-Based Import Detection

Python utility using the `ast` module to analyze source files and extract import statements, mapping module names to package keys (handling mismatches like `cv2` -> `opencv-python`). Enables the export CLI and selective bundling. Uses Pyodide's `pyodide-lock.json` for resolving module names to package keys. (Source: shinylive's `_deps.py`.)

**Acceptance:** A Python utility can analyze Panel code and produce a list of required packages with their Pyodide availability status.

---

## P2 — Editor State Persistence (localStorage)

Auto-save editor content in playground mode to localStorage on changes (debounced). On playground load, offer to restore the last session if saved content exists and differs from the default. Prevents losing work when navigating away. (Source: shinylive feature request.)

**Acceptance:** Editor content survives page refreshes in playground mode. Users can restore their last session.

---

## P1 — Export CLI for Static Deployment

`panel-live export myapp/ site/` CLI that bundles Panel code with panel-live assets into a deployable static directory. Uses AST-based import detection for selective package inclusion — only required `.whl` files are copied, not the full Pyodide distribution. Produces a fully self-contained directory deployable to any static host (GitHub Pages, Netlify, S3). (Source: shinylive's `shinylive export` is their most distinctive feature.)

**Acceptance:** `panel-live export` produces a static directory that works when served by any HTTP server. Only required packages are included.

---

## P3 — URL Sharing with Compression `PARTIAL`

Basic URL sharing works (base64 encoding, no gzip yet). Share button exists in playground mode. **Remaining:** compression, URL length preview, better compression for large snippets.

**Note:** LZString may be a better fit than gzip for URL-safe compression — it's designed specifically for this purpose. Stlite found that for typical single-file code snippets, simple base64url encoding is competitive with compression. Gzip may only help for large multi-file apps. Consider Protobuf for structured sharing state (multi-file + requirements). (Sources: stlite, shinylive.)

---

## P3 — Offline Support

All resources loaded from CDN. No service worker caching for offline use.

---

## P3 — React / Framework Wrappers

No React/Vue/Svelte wrapper components.

---

## P3 — Desktop Version (Electron/Tauri)

No documented approach for wrapping in Electron or Tauri.

**Note:** Tauri is preferred over Electron since Pyodide only runs in the renderer process, making Electron's Node.js main process irrelevant. Tauri is lighter and also supports mobile apps. Consider a snapshot/dump pattern: pre-download all Pyodide resources and wheels at build time, bundle into the app for offline capability and faster startup. (Source: stlite.)

---

## P3 — Filesystem Support

No virtual filesystem access or IndexedDB persistence for user code.

---

## P3 — Media Access (Camera, Microphone)

No browser media device access from Python code.

---

## P3 — Notebook-like Experience

Only single-cell execution. No multi-cell notebook workflow.

---

## P3 — Private Package Feeds (Azure Artifacts, JFrog)

No support for installing packages from private feeds such as Azure Artifacts or JFrog Artifactory. Pyodide's `micropip.install()` only fetches from public PyPI by default. Supporting private feeds would require authenticated URL configuration and possibly custom index URLs.

**Acceptance:** Users can configure a private package index URL (with authentication) so that `micropip.install()` can fetch wheels from private feeds.

---

## P3 — Language Server Integration

Adding language server support to the editor would enable tooltips, tab-completion, and inline error messages — a significant developer experience improvement. CodeMirror 6 is now in place (previously P2 blocker resolved).

**Note:** Two viable approaches from competitors: (1) Jedi running in the Pyodide worker — lighter weight, completion requests bridged via postMessage from editor to worker (stlite pattern). (2) Pyright running in a separate Web Worker via Pyodide — full type checking and diagnostics, but heavier (shinylive pattern, with known LSP completion edge cases). Jedi is the simpler starting point.

**Acceptance:** The editor provides basic autocomplete and inline error highlighting.

---

## P3 — Autoformatting

Enable code autoformatting in the editor, for example via a WASM build of Black or Ruff. Could be triggered by a keyboard shortcut or toolbar button.

**Acceptance:** Users can auto-format their code in the editor with a single action.

---

## P3 — LLM-Assisted Editing

Add an AI chat interface to the editor or playground for LLM-assisted code editing, potentially using WebLLM for fully client-side inference.

**Acceptance:** Users can interact with an AI assistant to modify code in the editor.

---

## P3 — Review Playground API Extensibility

The playground may eventually expand into a more fully featured editor environment (like Shinylive or CodeSandbox) with a JS console, Python terminal, multi-file support, and CSS/JS editing. For now, review the playground API, documentation, and implementation to ensure it can be extended in the future without breaking changes.

**Acceptance:** API review completed and documented. No blocking architectural issues identified for future expansion.

---

## P3 — Lazy Initialization via IntersectionObserver

Defer Pyodide initialization for off-screen `<panel-live>` elements using `IntersectionObserver`. Only initialize when the element scrolls into view. Would significantly improve page load for the examples gallery and documentation pages with many examples. (Source: gradio-lite selective rendering pattern.)

**Acceptance:** Off-screen `<panel-live>` elements defer initialization until they become visible.

---

## P3 — Pre-Bundle Common HoloViz Packages

Pre-bundle hvPlot, HoloViews, Param alongside Panel/Bokeh in the panel-live distribution to reduce runtime download times. Currently each package is fetched from PyPI via micropip at runtime. (Source: shinylive pre-bundles common packages in their distribution archive.)

**Acceptance:** Common HoloViz packages load significantly faster due to pre-bundling, without unacceptable distribution size increase.

---

## P3 — Resizable Layout Panels

Draggable dividers between code editor and output area. Users can resize panels by dragging the dividers in editor and playground modes. Support saving the user's preferred split ratio. (Source: shinylive's `ResizableGrid` component.)

**Acceptance:** Users can drag to resize editor and output panels in editor and playground modes.

---

## P3 — Terminal / Console Panel

Dedicated panel for stdout/stderr with proper formatting. Panel-live currently shows stdout/stderr inline. Even a read-only terminal panel would improve the debugging experience for longer-running apps. Could use xterm.js or a simpler approach. (Source: shinylive uses xterm.js.)

**Acceptance:** Users can see formatted console output in a dedicated panel when running code.

---

## P3 — Expose URL Parameters to Running Apps

Make query parameters accessible to running Panel code via a Python-side mechanism (e.g., writing URL parameters to a file in the virtual filesystem). Enables use cases like `?dataset=iris` to pre-configure which dataset an example loads. (Source: shinylive saves URL query parameters as a `.urlParams` file.)

**Acceptance:** Panel apps running in panel-live can read URL query parameters passed to the host page.

---

## P3 — Auto-Run on Code Change (Debounced)

Optional `auto-run="debounce"` attribute on `<panel-live>` that re-executes code after a configurable delay (e.g. 1 second) of no typing. Improves the interactive development experience in editor/playground modes. (Source: stlite's sharing editor auto-saves and re-runs on code changes.)

**Acceptance:** `auto-run="debounce"` re-executes code after typing stops.

---
