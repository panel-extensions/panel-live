# Open Issues

Outstanding issues and planned improvements for panel-live.

**Priority levels:** P0 = Blocker, P1 = Critical, P2 = Important, P3 = Nice-to-have.

---

## P1 — Distribution `PARTIAL`

esbuild bundling is done. **Primary distribution: npm** — publishing to npm enables loading via `https://cdn.jsdelivr.net/npm/@panel-extensions/panel-live@latest/dist/panel-live.js`, which works everywhere including Claude.ai artifacts (jsDelivr's `cdn.jsdelivr.net/npm/` is widely allowlisted). CI workflow (`build.yml`) has `cdn_build`, `waiting_room`, `cdn_publish`, and `github_release` jobs triggered on git tags. S3 upload (`scripts/cdn_upload.py`) remains as a secondary/backup channel. **Remaining:** actual npm publish, SRI hashes, bundle size tracking.

Additional items informed by competitor research:

- SRI hashes for CDN assets (Subresource Integrity) for security-conscious deployments
- Bundle size tracking in CI with sticky PR comments showing size diffs
- Changesets or equivalent for automated versioning and changelog generation

---

## P1 — Documentation `PARTIAL`

Docs site built with MkDocs/zensical. Getting Started tutorial created (`docs/tutorials/getting-started.md`). Security model documented (`docs/explanation/security.md`). Known limitations, browser compatibility reference pages added. How-to guides for self-hosting, auth proxy setup, Claude artifacts, and iframe embedding created. Sphinx integration guide (`docs/how-to/sphinx-integration.md`), Quarto integration guide (`docs/how-to/quarto-integration.md`), and framework-specific getting-started tutorials (MkDocs, Sphinx, Quarto) added. **Remaining:** comprehensive API reference, configuration guide, architecture overview.

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

## P1 — Release v0.1.0 `PARTIAL`

~~No formal release yet.~~ **Update:** Alpha release infrastructure is in place. `build.yml` supports tag-triggered publishing to PyPI (OIDC), npm (jsDelivr CDN), and GitHub Releases. `pyproject.toml` classifier updated to Alpha. **Remaining:** actual tag push (`v0.1.0a1`), npm publish configuration. Depends on: browser crash fix, documentation, distribution, testing, known limitations.

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

## P2 — Sphinx Extension `PARTIAL`

~~No Sphinx extension.~~ **Done (Phase 1):** `src/panel_live/sphinx.py` implements a Sphinx extension with:

- Configurable directive name (`panel-live`, `pyodide`, or `python`) for backward compat
- All `<panel-live>` HTML attributes as directive options
- Pre-rendering at build time (aligned with nbsite.pyodide pattern)
- Content-hash caching in `.panel-live/` directory
- Version configuration via `panel_live_conf` dict in conf.py
- mini-coi.js support for COOP/COEP headers
- `docs-sphinx/` test project with examples and attributes pages, pixi tasks (`pixi run -e sphinx build`, `pixi run -e sphinx serve`)
- CI: Sphinx build runs on `code` path changes (including `docs-sphinx/**`)
- pytest test suite (`tests/test_sphinx.py`)
- Documentation: integration guide (`docs/how-to/sphinx-integration.md`) and getting-started tutorial (`docs/tutorials/getting-started-sphinx.md`)

**Remaining:**

- Sequential cell execution (shared state across directives on a page)
- Line-range display (show only selected lines in editor)
- Adoption testing with Panel's own documentation

**Lessons from jupyterlite-sphinx analysis** (see `dev/research/jupyterlite-sphinx-analysis.md`):

- jupyterlite-sphinx's build-time `jupyter lite build` subprocess causes noise ([#149](https://github.com/jupyterlite/jupyterlite-sphinx/issues/149)), cryptic failures ([#177](https://github.com/jupyterlite/jupyterlite-sphinx/issues/177)), and 22-63 MiB bloat — panel-live's CDN-first approach avoids this entirely
- Declare `parallel_read_safe=True` and `parallel_write_safe=True` in `setup()` return value ([#146](https://github.com/jupyterlite/jupyterlite-sphinx/issues/146))
- Use versioned CDN URLs, not cache-busting query params — SciPy's `try_examples.json` became their 4th most requested URL ([#327](https://github.com/jupyterlite/jupyterlite-sphinx/issues/327))
- Default `auto-run=false` on doc pages (jupyterlite-sphinx's `:prompt:` pattern, [#50](https://github.com/jupyterlite/jupyterlite-sphinx/issues/50))
- Single directive with `:mode:` option, not multiple directives ([#288](https://github.com/jupyterlite/jupyterlite-sphinx/issues/288) proposes consolidation)
- Check for existing `source_suffix` registrations before adding new ones ([#27](https://github.com/jupyterlite/jupyterlite-sphinx/issues/27))
- Test with both pydata-sphinx-theme and alabaster — theme issues are common ([#69](https://github.com/jupyterlite/jupyterlite-sphinx/issues/69))
- Version coupling is a production issue — SciPy needs documented version to match Pyodide's bundled version ([SciPy #19729](https://github.com/scipy/scipy/issues/19729))
- Consider `autodoc-process-docstring` hook for auto-converting Panel docstring examples (inspired by TryExamples directive, [#142](https://github.com/jupyterlite/jupyterlite-sphinx/issues/142))

Success Criteria:

- Automated tests. Relevant pytests. Also in Github actions
- Manual testing easy via sphinx docs in docs-sphinx folder. Relevant pixi commands.
- Can technically replace current panel pyodide sphinx extension in https://github.com/holoviz-dev/nbsite/tree/main/nbsite/pyodide and https://github.com/holoviz/panel/blob/main/doc/conf.py.
- Easy to understand for Panel maintainers that this will be an easy, working and beneficial change.

---

## P2 — Quarto Extension `PARTIAL`

~~No Quarto extension.~~ **Done (Phase 1):** `quarto/_extensions/panel-live/` implements a Quarto Lua filter extension with:

- `{panel-live}` and `{panel}` code block classes
- `#|` directive parsing for all HTML attributes
- `quarto.doc.add_html_dependency()` for JS/CSS injection (once per document)
- Version configuration via YAML document metadata
- mini-coi.js bundled with the extension for COOP/COEP support
- Pre-rendering support via `#| pre-render:` directive
- Non-HTML format passthrough
- Built JS/CSS/worker assets tracked in git (enables `quarto add panel-extensions/panel-live --subdir quarto`)
- `docs-quarto/` test site with examples, versions, and pre-rendering pages; pixi tasks (`pixi run -e quarto build`, `pixi run -e quarto serve`)
- CI: Quarto build runs on `quarto/**` and `docs-quarto/**` path changes
- pytest test suite (`tests/test_quarto.py`)
- Documentation: integration guide (`docs/how-to/quarto-integration.md`) and getting-started tutorial (`docs/tutorials/getting-started-quarto.md`)

**Remaining:**

- Adoption testing with holoviz-quarto replacement

Success Criteria:

- Automated tests. Relevant pytests. Also in Github actions
- Manual testing easy via quarto docs in docs-quarto folder. Relevant pixi commands to install, run, build and test.
- Can technically replace https://github.com/awesome-panel/holoviz-quarto.

---

## P2 — Version Info Display & Version Switching

No way to see runtime versions or switch versions in playground mode.

---

## P2 — Zero-Install Deployment / Link Sharing `PARTIAL`

URL sharing via base64-encoded hash is working (playground mode). **Remaining:** graceful COOP/COEP fallback, hosted reference deployment.

**Update from research:** GitHub Pages is a key deployment scenario where custom HTTP headers cannot be set. JupyterLite's approach ([jupyterlite#1409](https://github.com/jupyterlite/jupyterlite/issues/1409)): opt-in `coi-serviceworker` integration that injects COOP/COEP headers at runtime. Critical lesson from [pyodide-kernel#126](https://github.com/jupyterlite/pyodide-kernel/pull/126): `coincident` (SharedArrayBuffer-based) does NOT gracefully degrade — it crashes with `TypeError`. The solution is separate entry points based on `crossOriginIsolated` detection. panel-live's service worker cleanup in `index.js` must not interfere with `coi-serviceworker`/`mini-coi.js`.

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

**Update from research:** jupyterlite-sphinx [#319](https://github.com/jupyterlite/jupyterlite-sphinx/issues/319) describes the same need: "A REPL with mixed static/dynamic mode." This is the most requested pattern in the scientific Python community (NumPy, SciPy, scikit-learn all want static-by-default with a "Make Interactive" toggle). jupyter-sphinx already provides build-time rendering; the gap is combining build-time rendering with runtime interactivity. mkdocs-jupyterlite's `on_post_build` hook for copying build artifacts into `site_dir` is the standard pattern for MkDocs build-time asset injection.

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

**Update:** Research completed. Three approaches evaluated:

**Option A: Theme Component (Mermaid pattern) — Recommended.** Discourse's [Mermaid theme component](https://github.com/discourse/discourse-mermaid-theme-component) is the direct precedent. Users write standard `` ```panel-live `` code fences. Discourse preserves these as `<pre data-code-wrap="panel-live"><code>...</code></pre>` through sanitization without any plugin. A theme component's JS uses `api.decorateCookedElement()` to detect these blocks and replaces them with a "Run" button + iframe containing panel-live. Requires only admin panel access to install (no server rebuild), works on hosted Discourse. The iframe provides security isolation and naturally solves the COOP/COEP requirement (the iframe loads from a separate origin with proper headers, or uses `mini-coi.js` internally).

**Option B: Iframe embedding — Simpler but worse UX.** Admin adds the panel-live hosting domain to Discourse's `allowed_iframes` site setting (one-time change). Users manually write `<iframe src="...">` HTML in posts. Works but poor UX — no syntax highlighting, users must construct iframe HTML manually.

**Option C: Plugin — Not practical.** A full Discourse plugin could allowlist `<panel-live>` as a custom HTML element, but requires self-hosted Discourse or Business-tier managed hosting, plus Docker container rebuild. Discourse aggressively sanitizes custom elements (any element with a hyphen) — only a plugin calling `helper.allowList()` can override this. Also runs in-page (no iframe isolation), which is a security concern.

**Key constraint — COOP/COEP:** Pyodide needs `SharedArrayBuffer`, which requires cross-origin isolation headers that the Discourse page won't have. The iframe approach (used by Options A and B) solves this naturally since the iframe content loads from a host with COOP/COEP headers.

**Implementation plan (Option A):** Create a `discourse-panel-live` theme component that: (1) detects `data-code-wrap="panel-live"` code blocks, (2) shows the code with syntax highlighting + a "Run" button (click-to-run, no auto-execution), (3) on click, creates an iframe loading panel-live JS/CSS from `cdn.jsdelivr.net/npm/@panel-extensions/panel-live@latest/dist/`. Panel-live.js can be bundled as a theme asset (Mermaid bundles ~11MB, so size is not unprecedented) or loaded from CDN via `csp_extensions` theme modifier.

**Acceptance:** Discourse embedding is tested and either works with documentation, or is documented as infeasible with explanation.

---

## P2 — Browser Console Debugging Guide

Document how to use the browser developer console to debug panel-live issues. Cover inspecting worker messages, viewing Bokeh errors, checking network requests for CDN resources, and common troubleshooting patterns. This would help users self-diagnose issues before reporting bugs.

**Acceptance:** A how-to guide or reference page documents browser console debugging techniques for panel-live.

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

**Update from research:** mkdocs-jupyterlite discovered that browser-persisted state overrides server content after docs rebuilds, causing users to see stale code ([jupyterlite#1706](https://github.com/jupyterlite/jupyterlite/issues/1706)). They solved this by disabling persistence entirely. panel-live should instead store a content hash alongside the editor state and invalidate when the underlying example code changes.

**Acceptance:** Editor content survives page refreshes in playground mode. Users can restore their last session. Persisted state is invalidated when the underlying example code changes (content-hash comparison).

---

## P1 — PanelLive Server Component `PARTIAL`

A `PanelLive` JSComponent wraps the `<panel-live>` web component for use in Panel server applications. Enables bidirectional data exchange between server Python and client-side Pyodide.

**Done:**

- `PanelLive` class with `code`, `requirements`, `mode`, `theme`, `layout`, `auto_run`, `code_visibility`, `value`, `run`, `status`, `error`, `stdout` params
- ESM module with Shadow DOM workarounds (getElementById patch, CSS mirroring)
- `configure()` classmethod for local asset overriding (JS and CSS)
- Modes: `app`, `editor`, `playground`, `headless`, `compact`, `debug`
- `output` param for client-to-server data
- `send()` method for server-to-client push
- `evaluate()` async method for remote code execution
- `run()` async method for programmatic render pipeline triggering
- Unit tests and POC test app
- CLI `serve` command for showcase example
- `__css__` class variable for explicit CSS loading (fixes missing CSS in CDN mode)

**CSS loading workaround:** The default asset URLs point to GitHub Pages (`panel-extensions.github.io/panel-live/assets/`) because the npm package is not yet published. The ESM previously relied on deriving the CSS URL from the `<script>` tag at runtime (`_injectBundleCSS`), which failed in CDN/default mode because Panel may not preserve the script tag in the DOM. Fixed by adding `__css__` to explicitly load the stylesheet via Panel's standard mechanism. Once published to npm, update `_CDN_BASE` in `component.py` to `https://cdn.jsdelivr.net/npm/@panel-extensions/panel-live@latest/dist`.

**Investigate**

- Shadow root. For example many anywidgets use methods that don't work with shadow root. Can we disable or enable users to disable shadow root?

**Remaining:**

- Switch `_CDN_BASE` from GitHub Pages to `cdn.jsdelivr.net/npm/@panel-extensions/panel-live@latest/dist` once published to npm
- Full bidirectional sync (live param updates without re-run)
- DataFrame/bytes serialization via Arrow IPC
- Worker bridge API for state injection
- Adoption testing with real-world use cases

**Acceptance:** PanelLive component works end-to-end with bidirectional data exchange, all modes functional, documented with tutorials and how-to guides.

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

## P2 — Claude Artifacts CSP Blocks panel-live

panel-live does not work in Claude.ai artifacts (canvas) due to Content Security Policy restrictions. The artifact `srcdoc` iframe has a strict `script-src` allowlist that does not include `panel-extensions.github.io`. However, `https://cdn.jsdelivr.net/npm/` is allowlisted.

**Resolution:** The npm-first distribution strategy (P1 Distribution) resolves this. Once panel-live is published to npm, artifacts can load it via `https://cdn.jsdelivr.net/npm/@panel-extensions/panel-live@latest/dist/panel-live.js`, which is within the CSP allowlist. No workarounds needed.

**Acceptance:** panel-live loads and runs inside Claude.ai artifacts without CSP violations.

---
