# Open Issues

Outstanding issues and planned improvements for panel-live.

**Priority levels:** P0 = Blocker, P1 = Critical, P2 = Important, P3 = Nice-to-have.

---

## P0 — Web Worker Support

Pyodide runs on the main thread, blocking the page during load (5-15 seconds) and execution. Every competitor uses web workers. Panel already has a production-proven worker implementation (`pyodide_worker.js`) that can be adapted.

**Acceptance:** Pyodide loads and runs in a web worker. Main thread stays responsive. Loading spinner animates smoothly.

---

## P0 — Browser Crash (STATUS_ACCESS_VIOLATION)

The browser crashes with `STATUS_ACCESS_VIOLATION` in Chrome/Edge on some machines. Firefox is more stable. `serve.py` adds COOP/COEP headers for SharedArrayBuffer, but crashes still occur.

**Update:** Testing on iOS tablet, iOS iPhone, and a second Windows laptop all work fine. The crash only reproduces on one specific Windows laptop in Edge/Chrome. The scope may be narrower than originally assumed. ~~Crash warnings in README.md and index.md should be softened to reflect that this affects some Edge/Chrome users, with Firefox as a known workaround.~~ **Done:** Banner in `docs/overrides/main.html` softened.

**Likely causes:** Main thread memory pressure (~300-500MB), missing COOP/COEP headers behind proxies, version incompatibilities.

**Acceptance:** No crashes on 8GB RAM machines with up to 3 concurrent apps.

---

## P1 — Handle Python Errors Properly `PARTIAL`

Errors display inline with themed styling and a "Copy error" button. `sys.stderr` is captured. **Remaining:** structured traceback formatting with syntax highlighting, collapsible error panel, async/callback error capture.

Tracebacks currently expose Pyodide and Panel internals (`_pyodide/_base.py`, `panel/io/mime_render.py`) instead of showing only the user's code. For example, a simple `raise Exception(...)` produces a traceback rooted in `eval_code_async` and `exec_with_return` — none of which is relevant to the user. The traceback should be filtered to show only frames from the user's code (e.g. `<exec>` or `<ast>`) with the actual exception message.

**Acceptance:** All Python errors visible with file, line number, and error message. Tracebacks hide Pyodide/Panel internal frames and show only the user's code context.

---

## P1 — Warn on Invalid Source URLs

Fetching a missing `.py` file via `src` returns an HTML 404 page that Pyodide tries to parse as Python, producing a confusing `SyntaxError` on `<!doctype html>`. Need Content-Type validation or HTML detection in fetch calls.

**Acceptance:** Fetching a non-Python response shows a clear error message in the output panel instead of a cryptic traceback.

---

## P1 — Build System

No build step. Raw JS served directly. Need minification, source maps, and dependency bundling.

**Acceptance:** Build produces minified JS + CSS bundles with source maps, runs in CI.

---

## P1 — Automated Testing `PARTIAL`

Test infrastructure is in place. **Remaining:** expanded UI coverage, JS unit tests, error handling scenarios, >80% critical path coverage.

---

## P1 — Distribution `PARTIAL`

CDN hosting is live at `cdn.holoviz.org/panel-live/latest/`. **Remaining:** CI workflow that publishes versioned assets to `cdn.holoviz.org/panel-live/vX.Y.Z/` on git tag, npm package, minified builds, automated release workflow. Users should be able to load specific versioned assets (including `mini-coi.js` and other dependencies) instead of only `latest/`, to ensure reproducibility.

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

## P1 — Python Code as String Concatenation

All Python bootstrap code is built as concatenated strings in JavaScript. Fragile and error-prone.

**Acceptance:** Python bootstrap code maintained in `.py` files, not JS strings.

---

## P1 — Release v0.1.0

No formal release yet. Depends on: browser crash fix, documentation, distribution, testing, known limitations. (Sphinx extension is P2, not a blocker.)

---

## P1 — Display Print Statements

`print()` output is not displayed to the user. Users expect print output to be visible.

**Acceptance:** `print()` statements produce visible output in the output panel.

---

## P1 — Run Button Causes Layout Flicker `PARTIAL`

Clicking the Run button causes the page to visibly flicker. A spinner and "running" message are inserted at the top of the output panel, pushing content down. When execution finishes, the message disappears and content jumps back up. This layout shift is jarring, especially on pages with multiple editors.

**Update:** Status bar is now an absolute overlay (`.pl-output-wrapper` with `position: relative`, `.pl-status` with `position: absolute`). Output height is preserved during re-run via `minHeight` lock. **Remaining:** Verify fix across all modes and layouts.

**Acceptance:** The loading indicator overlays the output area (e.g. as an overlay or inline replacement) without shifting surrounding content.

---

## P1 — Systematically Test Documentation

Every documentation page should be reviewed and tested for quality:

- Ensure content is understandable for both human readers and LLMs
- Replace indicative/placeholder code examples with minimum reproducible examples
- Where examples are only illustrative, ensure they can easily be extended to working examples
- Create `.html` test pages and use Playwright to verify examples work end-to-end

**Acceptance:** Every docs page has been audited. All code examples either work as-is or are clearly marked as illustrative with easy paths to working versions.

---

## P2 — Tracking Prevention Blocks CDN Resources

Browser tracking prevention blocks `cdnjs.cloudflare.com` (CodeMirror CSS). Upgrading to CodeMirror 6 or bundling would resolve this.

---

## P2 — CodeMirror 5 is Legacy

CodeMirror 5 is in maintenance mode. Upgrading to CM6 resolves tracking prevention and improves accessibility/mobile support.

---

## P2 — Choose and Configure Editor Theme `PARTIAL`

Light/dark themes work. **Remaining:** additional built-in themes, high-contrast theme, configurable editor theme independent of UI theme.

---

## P2 — Prescript / Setup Code

No mechanism for setup code before user code (e.g. `pn.extension(design="material")`). Needs `<panel-prescript>` element and MkDocs-level configuration.

---

## P2 — Improve UX (Buttons, Tooltips, Layout) `PARTIAL`

- ~~Add tooltips (`title` attributes) to Run, Share, Reset, and Code toggle buttons (Copy/Error/Maximize already have them)~~ **Done**
- Redesign the "<> Code" toggle button (icon or better visual)
- Review button design for consistency (keep compact style)
- Review button placement (copy/run on top vs code toggle below)

**Inspiration from MUI docs editor:** MUI uses "Expand Code" / "Collapse Code" instead of "<> Code" — clearer for users. Their toggle button stays in place when clicked (ours shifts up/down). They also have a clean "Copy the source" tooltip, a "Reset demo" button, and a menu with "View source on GitHub" and copy-link actions. Analyze the MUI editor pattern and adopt the best ideas.

---

## P2 — Auto Layout Based on Window Size

The `layout` attribute supports `horizontal` and `vertical`, but there is no responsive `auto` option. The default should adapt based on window size — on mobile / narrow viewports the editor and playground should stack vertically, while on wider screens they sit side by side. Currently users on phones get a horizontal layout that is cramped and hard to use.

**Acceptance:** A new `auto` layout option (ideally the default) switches between horizontal and vertical based on viewport width. Editor and playground modes are usable on mobile screens.

---

## P2 — Simplify Index Page Examples for Mobile

The interactive examples on `index.md` contain too much code to comfortably edit on a mobile device. For example, the editor demo includes a color picker that adds complexity without being essential to the demo. Simpler examples would make the landing page more approachable, especially on small screens.

**Acceptance:** The editor example on `index.md` is simplified (e.g. remove the color picker) so the code fits comfortably on a mobile screen while still demonstrating core functionality.

---

## P2 — Memory Leak on Re-run (Hypothesis)

Pyodide proxy functions may accumulate across runs. Needs browser profiling to confirm or close.

---

## P2 — postMessage Security

No `postMessage` validation currently needed (no iframe/worker mode). Will become relevant when web worker support is added. **Blocked by:** P0 Web Worker Support.

---

## P2 — Sphinx Extension

No Sphinx extension. Required for Panel's own Sphinx-based documentation.

---

## P2 — Document MkDocs Integration for Third-Party Users

The MkDocs fence extension works but lacks user-facing documentation for third-party adoption.

---

## P2 — Document Browser Sandbox Security Model

panel-live runs all Python code client-side via Pyodide in the browser's sandbox. This means user code cannot access the server, filesystem, or other users' data — it is inherently safe and secure. This is a key advantage over server-side execution but is not documented anywhere. A clear explanation would build trust with documentation authors and site operators considering adoption.

**Acceptance:** A documentation page (or section) explains that panel-live executes code in the browser sandbox, what that means for security, and why it is safe to embed user-editable code in public-facing sites.

---

## P2 — Quarto Extension

No Quarto extension. Shinylive's Quarto extension provides prior art.

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

---

## P2 — Error Boundaries Between Apps

One crashing app may prevent subsequent apps from running on the same page.

---

## P2 — Document Claude.ai Usage

Document how to use panel-live in the Claude.ai web page. Covers embedding `<panel-live>` in Claude artifacts and any sandbox-specific constraints.

---

## P2 — Migrate HoloViz Projects to panel-live

Getting HoloViz ecosystem projects to adopt panel-live for their documentation could be transformative for Panel and the wider HoloViz ecosystem. Start with panel-reactflow as an experiment.

**Acceptance:** At least one HoloViz project (e.g. panel-reactflow) uses panel-live in its documentation.

---

## P2 — Enable "render" Mode in MkDocs

Add a "render" mode (or "compile" / "save") that pre-renders Panel code to static HTML at build time, rather than running it live in the browser. This is the path to replacing the existing Panel/HoloViz pyodide integration in [nbsite](https://github.com/holoviz-dev/nbsite/tree/main/nbsite/pyodide).

Open questions: Should the output embed directly into the document or load in an iframe? Can previously rendered output be cached and loaded via `src`? Can multiple renders run in parallel during the build?

**Acceptance:** `mode="render"` produces static HTML output at build time. The output renders without requiring Pyodide at page load.

---

## P2 — VS Code Keyboard Shortcuts

The editor and playground lack standard keyboard shortcuts. Adding VS Code-style keybindings (e.g. Ctrl+D for duplicate line, Ctrl+/ for toggle comment, Ctrl+Shift+K for delete line) would significantly improve the editing experience.

**Acceptance:** Common VS Code keyboard shortcuts work in the CodeMirror editor.

---

## P2 — Playground Default Example

The playground's default example is not engaging enough. Replace it with a welcoming example that greets the user, links to the panel-live documentation, and displays something interactive, useful, and visually appealing.

**Acceptance:** The playground loads with an example that is immediately impressive, easy to understand, and links to panel-live docs.

---

## P2 — Support GitHub URLs in `src` Attribute

A GitHub blob URL like `https://github.com/panel-extensions/panel-live/blob/main/docs/assets/examples/bokeh-scatter.py` returns an HTML page, not raw Python. The `src` attribute should detect GitHub URLs and automatically convert them to the corresponding `raw.githubusercontent.com` URL.

**Acceptance:** GitHub blob URLs in the `src` attribute resolve to raw file content and execute correctly.

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

- **Share via Gist:** Enable sharing via a link to a GitHub Gist, similar to [Shinylive](https://shiny.posit.co/py/get-started/shinylive.html).
- **Create / Export:** Enable users to create and export self-contained panel-live apps.
- **Official URLs:** Decide where official app/editor/playground links should live (Panel website vs panel-live website).
- **Durability:** Plan for keeping shared links working as Pyodide, Panel, and Bokeh versions change.

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

Basic URL sharing works (base64 encoding, no gzip yet). Share button exists in playground mode. **Remaining:** gzip compression, URL length preview, better compression for large snippets.

---

## P3 — Offline Support

All resources loaded from CDN. No service worker caching for offline use.

---

## P3 — React / Framework Wrappers

No React/Vue/Svelte wrapper components.

---

## P3 — Desktop Version (Electron/Tauri)

No documented approach for wrapping in Electron or Tauri.

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

Adding language server support to the editor would enable tooltips, tab-completion, and inline error messages — a significant developer experience improvement. This is a complex feature that depends on the CodeMirror upgrade (P2).

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

## P3 — Link to panel-live Docs from Editor / Playground

Add a help link in the editor and playground UI that points to the panel-live documentation site, making it easy for users to find reference material.

**Acceptance:** A visible link or help button in editor/playground modes opens the panel-live docs.

---

## P3 — Review Playground API Extensibility

The playground may eventually expand into a more fully featured editor environment (like Shinylive or CodeSandbox) with a JS console, Python terminal, multi-file support, and CSS/JS editing. For now, review the playground API, documentation, and implementation to ensure it can be extended in the future without breaking changes.

**Acceptance:** API review completed and documented. No blocking architectural issues identified for future expansion.

---
