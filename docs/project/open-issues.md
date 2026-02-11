# Open Issues

Outstanding issues and planned improvements for panel-live.

**Priority levels:** P0 = Blocker, P1 = Critical, P2 = Important, P3 = Nice-to-have.

---

## P0 — Web Worker Support

Pyodide runs on the main thread, blocking the page during load (5-15 seconds) and execution. Every competitor uses web workers. Panel already has a production-proven worker implementation (`pyodide_worker.js`) that can be adapted.

**Acceptance:** Pyodide loads and runs in a web worker. Main thread stays responsive. Loading spinner animates smoothly.

---

## P0 — Browser Crash (STATUS_ACCESS_VIOLATION)

The browser crashes with `STATUS_ACCESS_VIOLATION` in Chrome/Edge. Firefox is more stable. `serve.py` adds COOP/COEP headers for SharedArrayBuffer, but crashes still occur.

**Likely causes:** Main thread memory pressure (~300-500MB), missing COOP/COEP headers behind proxies, version incompatibilities.

**Acceptance:** No crashes on 8GB RAM machines with up to 3 concurrent apps.

---

## P1 — Handle Python Errors Properly `PARTIAL`

Errors display inline with themed styling and a "Copy error" button. `sys.stderr` is captured. **Remaining:** structured traceback formatting with syntax highlighting, collapsible error panel, async/callback error capture.

**Acceptance:** All Python errors visible with file, line number, and error message.

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

CDN hosting is live at `cdn.holoviz.org/panel-live/latest/`. **Remaining:** CI workflow that publishes versioned assets to `cdn.holoviz.org/panel-live/vX.Y.Z/` on git tag, npm package, minified builds, automated release workflow.

---

## P1 — Documentation `PARTIAL`

Docs site built with MkDocs/zensical. **Remaining:** getting started guide, comprehensive API reference, configuration guide, architecture overview.

---

## P1 — Examples Gallery `PARTIAL`

Review existing examples. Simplify, beautify, comment and use recommended apis (param.bind or @param.depends. not watch). Those examples should represent Panel and the HoloViz ecosystem from its best side. Add a plotly example.

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

## P2 — Improve UX (Buttons, Tooltips, Layout)

- Add tooltips (`title` attributes) to Run, Share, Reset, and Code toggle buttons (Copy/Error/Maximize already have them)
- Redesign the "<> Code" toggle button (icon or better visual)
- Review button design for consistency (keep compact style)
- Review button placement (copy/run on top vs code toggle below)

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

No links from the Panel website or GitHub README to the playground.

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
