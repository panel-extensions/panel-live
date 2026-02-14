# Open Issues

Outstanding issues and planned improvements for panel-live.

**Priority levels:** P0 = Blocker, P1 = Critical, P2 = Important, P3 = Nice-to-have.

---

## ~~P0 — Web Worker Support~~ `DONE`

~~Pyodide runs on the main thread, blocking the page during load (5-15 seconds) and execution. Every competitor uses web workers.~~

**Done.** Pyodide now runs in a Dedicated Worker. See closed-issues.md for details.

---

## P0 — Browser Crash (STATUS_ACCESS_VIOLATION)

The browser crashes with `STATUS_ACCESS_VIOLATION` in Chrome/Edge on some machines. Firefox is more stable. `serve.py` adds COOP/COEP headers for SharedArrayBuffer, but crashes still occur.

**Update:** Scope appears narrow — only reproducible on one specific Windows laptop in Edge/Chrome. Testing on iOS tablet, iOS iPhone, and a second Windows laptop all work fine. ~~Crash warnings in README.md and index.md should be softened to reflect that this affects some Edge/Chrome users, with Firefox as a known workaround.~~ **Done:** Banner in `docs/overrides/main.html` softened, README.md updated.

**Likely causes:** Main thread memory pressure (~300-500MB), missing COOP/COEP headers behind proxies, version incompatibilities. Moving Pyodide to a Dedicated Worker (now done) isolates the ~300-500MB from the main thread, which may mitigate this.

**Acceptance:** No crashes on 8GB RAM machines with up to 3 concurrent apps.

---

## P1 — Run Button Causes Layout Flicker `PARTIAL`

Status bar is an absolute overlay (`.pl-output-wrapper` with `position: relative`, `.pl-status` with `position: absolute`). Output height is preserved during re-run via `minHeight` lock. **Still reported as visible** — needs further investigation. May be caused by the output being cleared and re-rendered (`cleanupContainer` + Panel render), or by Bokeh layout recalculation.

**Acceptance:** The loading indicator overlays the output area without shifting surrounding content.

---

## P1 — Automated Testing `PARTIAL`

Test infrastructure is in place. 69 Vitest JS unit tests cover config, utils, theme, url-sharing, error-renderer, and worker-bridge modules. Playwright E2E tests exist for browser testing. **Remaining:** expanded UI coverage, additional error handling scenarios, >80% critical path coverage.

Additional items informed by competitor research:

- Unify docs examples with E2E tests — source examples from files that double as test fixtures (stlite pattern)
- Mobile regression testing — always test on Chrome Android and Safari iOS
- Bundle size tracking — CI posts bundle size diff on every PR to catch unintentional bloat
- Performance regression benchmarks — establish baseline load/execution/memory metrics and track across releases

---

## P1 — Distribution `PARTIAL`

esbuild bundling is done. CDN hosting is live at `cdn.holoviz.org/panel-live/latest/`. **Remaining:** CI workflow that publishes versioned assets to `cdn.holoviz.org/panel-live/vX.Y.Z/` on git tag, npm package, minified builds, automated release workflow. Users should be able to load specific versioned assets (including `mini-coi.js` and other dependencies) instead of only `latest/`, to ensure reproducibility.

Additional items informed by competitor research:

- SRI hashes for CDN assets (Subresource Integrity) for security-conscious deployments
- Bundle size tracking in CI with sticky PR comments showing size diffs
- Changesets or equivalent for automated versioning and changelog generation

---

## P1 — Documentation `PARTIAL`

Docs site built with MkDocs/zensical. **Remaining:** getting started guide, comprehensive API reference, configuration guide, architecture overview.

---

## P1 — Examples Gallery `PARTIAL`

Review existing examples. Simplify, beautify, comment and use recommended APIs (`param.bind` or `@param.depends`, not `watch`). Those examples should represent Panel and the HoloViz ecosystem from its best side.

Specific improvements needed:

- Add a LaTeX example — attempted but rendering broken (KaTeX/MathJax JS resources not loading in Pyodide). Needs investigation into how `pn.extension("katex")` loads JS in the panel-live runtime. Reported as general issue here https://github.com/holoviz/panel/issues/8421
- Add a Plotly example
- Add Seaborn and plotnine examples
- Add xarray, Polars, DuckDB, and SQLite examples (consider separate subpages for non-HoloViz examples to reduce page load time)
- ~~**KPI Dashboard:** Change "Quarterly target" to "Target" — current text takes up too much space~~ **Done**
- ~~**Streaming Random Walk:** The "follow" checkbox has no visible effect. Investigate and fix if buggy. Add a tooltip explaining the expected behavior.~~ **Done:** Rollover increased to 50 so table scrollbar appears and follow has a visible effect.
- ~~**Matplotlib:** Still takes up too much vertical space. Reduce layout height.~~ **Done:** Responsive image CSS rule added (`.pl-output img { max-width: 100%; height: auto; }`)
- **DeckGL:** Current example is not realistic or visually appealing. Replace with a more interesting, interactive example while keeping it short enough to learn from.
- ~~**Mini Calculator / Unit Converter:** Replace dropdown widgets with RadioButton or ButtonRadioGroup where there are only a few options. Optimize layout for a natural, compact flow.~~ **Done**

---

## P1 — Release v0.1.0

No formal release yet. Depends on: browser crash fix, documentation, distribution, testing, known limitations. (Sphinx extension is P2, not a blocker.)

---

## P1 — Systematically Test Documentation

Every documentation page should be reviewed and tested for quality:

- Ensure content is understandable for both human readers and LLMs
- Replace indicative/placeholder code examples with minimum reproducible examples
- Where examples are only illustrative, ensure they can easily be extended to working examples
- Create `.html` test pages and use Playwright to verify examples work end-to-end

**Acceptance:** Every docs page has been audited. All code examples either work as-is or are clearly marked as illustrative with easy paths to working versions.

---

## P2 — Choose and Configure Editor Theme `PARTIAL`

Light/dark switching works via CM6 Compartment with oneDark theme. **Remaining:** additional built-in themes, high-contrast theme, configurable editor theme independent of UI theme.

---

## P2 — Prescript / Setup Code

No mechanism for setup code before user code (e.g. `pn.extension(design="material")`). Needs `<panel-prescript>` element and MkDocs-level configuration.

---

## P2 — Improve UX (Buttons, Tooltips, Layout) `PARTIAL`

- ~~Add tooltips (`title` attributes) to Run, Share, Reset, and Code toggle buttons (Copy/Error/Maximize already have them)~~ **Done**
- ~~Redesign the "<> Code" toggle button (icon or better visual)~~ **Done:** Toggle button now shows "Expand Code" / "Collapse Code" (MUI-inspired)
- Review button design for consistency (keep compact style)
- Review button placement (copy/run on top vs code toggle below)

---

## P2 — Simplify Index Page Examples for Mobile

The interactive examples on `index.md` contain too much code to comfortably edit on a mobile device. For example, the editor demo includes a color picker that adds complexity without being essential to the demo. Simpler examples would make the landing page more approachable, especially on small screens.

**Acceptance:** The editor example on `index.md` is simplified (e.g. remove the color picker) so the code fits comfortably on a mobile screen while still demonstrating core functionality.

---

## P2 — Memory Leak on Re-run (Hypothesis)

Pyodide proxy functions may accumulate across runs. Needs browser profiling to confirm or close.

**Update:** Worker ref counting (`registerElement()`/`cleanupElement()`) is now implemented — when all `<panel-live>` elements disconnect, the worker terminates after a 5s grace period, freeing ~300-500MB. Proxy function cleanup on re-run still needs profiling. (Source: gradio-lite confirmed sessions accumulate without explicit cleanup.)

---

## P2 — postMessage Security

Web Worker communication uses `postMessage` for all worker↔main thread messages. Currently no origin validation is performed. Consider adding message type validation and origin checks to prevent injection if panel-live is embedded in iframes or untrusted contexts.

---

## P2 — Sphinx Extension

No Sphinx extension. Required for Panel's own Sphinx-based documentation.

---

## P2 — Document MkDocs Integration for Third-Party Users

The MkDocs fence extension works but lacks user-facing documentation for third-party adoption.

---

## P2 — Document Browser Sandbox Security Model

panel-live runs all Python code client-side via Pyodide in the browser's sandbox. This means user code cannot access the server, filesystem, or other users' data — it is inherently safe and secure. This is a key advantage over server-side execution but is not documented anywhere. A clear explanation would build trust with documentation authors and site operators considering adoption.

**Note:** Source code embedded in `<panel-live>` elements is visible to the browser and cannot be protected — encoding is obfuscation, not encryption. This should be documented to set correct expectations. (Source: stlite confirmed this is inherent to all browser-based Python runtimes.)

**Acceptance:** A documentation page (or section) explains that panel-live executes code in the browser sandbox, what that means for security, and why it is safe to embed user-editable code in public-facing sites.

---

## P2 — Quarto Extension

No Quarto extension. Shinylive's Quarto extension provides prior art.

**Architecture note:** Shinylive's Quarto extension uses a thin Lua filter that calls back into a Python CLI (`shinylive extension info/base-htmldeps/...`) for dependency resolution. This keeps the extension thin while the Python package handles complex logic. Panel-live should follow the same Lua filter + CLI callback pattern. (Source: quarto-ext/shinylive codebase.)

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

## P2 — Document Known Limitations

Known limitations are scattered across issues. Need a single page covering runtime, browser, package, editor, and performance constraints.

Specific limitations to document (informed by stlite/shinylive experience):

- **No threads:** `RuntimeError: can't start new thread` when Panel/Bokeh features try to create threads
- **No subprocess:** `OSError: [Errno 138] emscripten does not support processes` — unfixable
- **2GB memory limit:** WebAssembly hard limit; large file uploads will hit this
- **`time.sleep` busy-wait:** CPU-intensive, no progress bar animation during sleep
- **C extension packages:** Only packages compiled for wasm32/emscripten by Pyodide work (NumPy yes, TensorFlow no)
- **Pyodide version coupling:** Upstream Pyodide releases can silently break behavior
- **Source code exposure:** Code is visible to the browser and cannot be protected

---

## P2 — Document Claude.ai Usage

Document how to use panel-live in the Claude.ai web page. Covers embedding `<panel-live>` in Claude artifacts and any sandbox-specific constraints.

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

## P2 — Playground Default Example

The playground's default example is not engaging enough. Replace it with a welcoming example that greets the user, links to the panel-live documentation, and displays something interactive, useful, and visually appealing.

**Acceptance:** The playground loads with an example that is immediately impressive, easy to understand, and links to panel-live docs.

---

## P2 — Update Mini-Coi Documentation

The MkDocs integration guide describes an older approach to using mini-coi.js. The documentation should be updated to reflect the current usage pattern. If a bug fix was applied to the local copy of mini-coi.js, report it upstream.

**Acceptance:** The MkDocs integration guide accurately describes the current mini-coi setup. Any local bug fixes are reported to the mini-coi.js project.

---

## P2 — Show Web Component Syntax in Docs

The how-to guides (e.g. the mode page) only show the MkDocs fence syntax, not the `<panel-live>` HTML web component syntax. Both syntaxes should be shown systematically across the HTML Attributes reference and how-to guides so users understand both approaches. This also serves as a quick manual test for developers.

**Acceptance:** Every how-to guide and attribute reference page shows both fence and web component syntax examples.

---

## P2 — Working Examples Across How-To Guides

Several how-to pages (e.g. `examples-src`, `multi-file-apps`, `CSS Custom Properties`) contain only indicative examples — non-functional code with placeholder URLs and no rendered `<panel-live>` elements. This makes it hard for users to verify that features actually work.

**Acceptance:** How-to guides render live `<panel-live>` elements wherever possible. Indicative examples are replaced with or supplemented by working demonstrations.

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

## P2 — LLM Page Accessibility

Verify that documentation pages (e.g. the examples page) are understandable by LLMs, including the ability to discover and parse code examples. Identify and fix any structural issues that make pages harder for LLMs to consume.

**Acceptance:** Key documentation pages are verified to be parseable by LLMs. Any identified issues are fixed.

---

## P2 — Review `label` Attribute Naming

Evaluate whether "label" is the right name for the pill text shown on panel-live elements. Consider:

- Is the name intuitive for users?
- Is it future-proof if we later want to add a supplementary name or description?

**Acceptance:** Decision documented. Rename the attribute if a better name is identified.

---

## P2 — Panel Live Skill for Claude Code

Develop and publish a panel-live skill following [Anthropic skill best practices](https://github.com/anthropics/skills/tree/main/skills/skill-creator). This would make it easier for LLM users to work with panel-live.

**Acceptance:** A published panel-live skill that helps LLMs generate correct panel-live code.

---

## P2 — Iframe Embedding

Ensure it is easy to embed a running app, editor, or playground via `<iframe>`. Document the embedding approach, required attributes, and any COOP/COEP considerations.

**Acceptance:** Iframe embedding is documented and works for app, editor, and playground modes.

---

## P2 — Discourse Embedding

Test embedding panel-live in Discourse forums, specifically [discourse.holoviz.org](https://discourse.holoviz.org/). Determine whether the web component or iframe approach works, and document any site-level configuration requirements. If embedding is not safe or feasible, document why.

**Acceptance:** Discourse embedding is tested and either works with documentation, or is documented as infeasible with explanation.

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

## P1 — Export CLI for Static Deployment

`panel-live export myapp/ site/` CLI that bundles Panel code with panel-live assets into a deployable static directory. Uses AST-based import detection for selective package inclusion — only required `.whl` files are copied, not the full Pyodide distribution. Produces a fully self-contained directory deployable to any static host (GitHub Pages, Netlify, S3). (Source: shinylive's `shinylive export` is their most distinctive feature.)

**Acceptance:** `panel-live export` produces a static directory that works when served by any HTTP server. Only required packages are included.

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

## P2 — Browser Compatibility Matrix

Document browser support (Chrome, Firefox, Safari, Edge, mobile variants), performance expectations ("Expect 5-15 second initial load"), and known platform-specific issues. Specific issues found by competitors: Chrome Android lacks SharedWorker, cross-domain iframes fail due to localStorage access, Chrome/Edge vs Firefox performance differences for Canvas/WebGL rendering.

**Acceptance:** Documentation includes a browser compatibility matrix, performance expectations, and known platform-specific issues.

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

## P2 — Self-Hosting Documentation

Guide for hosting all panel-live assets (JS bundle, Pyodide, Panel/Bokeh wheels, CSS) on a private server for air-gapped/enterprise deployments. `PanelLive.configure()` supports custom CDN URLs, but there's no documentation for self-hosting. (Source: shinylive enterprise requests.)

**Acceptance:** A documented guide enables running panel-live on an air-gapped network with all assets served locally.

---

## P2 — Service Worker Fragility Behind Auth Proxies

`mini-coi.js` (service worker for cross-origin isolation) may fail behind authentication proxies (corporate SSO, Posit Connect) because the browser's fetch for the service worker JS file gets redirected to a login page. Document this limitation and provide server-side COOP/COEP header configuration as a fallback. (Source: shinylive had persistent issues with service workers behind auth proxies.)

**Acceptance:** Documentation covers auth proxy limitations. A fallback strategy is documented for enterprise deployments.

---

## P2 — CSP Nonce Support

`PanelLive.configure({ styleNonce: "abc123" })` for Content Security Policy compliance. Passes a nonce to all dynamically created `<style>` elements, required on sites with strict CSP headers that block inline styles. (Source: stlite.)

**Acceptance:** `PanelLive.configure({ styleNonce })` passes the nonce to all dynamically injected style elements.

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
