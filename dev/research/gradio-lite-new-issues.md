# Gradio-Lite Research: Lessons and Opportunities for panel-live

## Context

Gradio-lite (`@gradio/lite`) was Gradio's browser-based WASM execution environment, directly comparable to panel-live. **It was discontinued and removed in September 2025** (PR #11858). This creates both a strategic opportunity (panel-live fills the vacuum) and a learning opportunity (avoid the mistakes that led to its demise). This document distills actionable findings from gradio-lite's open issues, closed issues, and codebase that are relevant for panel-live.

---

## Key Strategic Insight: Why Gradio-Lite Failed

Gradio-lite was removed due to compounding technical debt:

1. **Build fragmentation** — Maintaining 3 separate frontend builds (SSR, SPA, Lite) tripled build times and complicated tooling (#10300)
2. **Dependency hell** — Pyodide dependency conflicts (huggingface-hub, pydantic v2, multipart) were persistent and hard to resolve
3. **Framework migration breakage** — Svelte 5 migration broke custom components, app lifecycle, and SSR compatibility
4. **Insufficient testing** — Lite-specific tests were flaky; no systematic validation of WASM compatibility
5. **Operational burden** — Separate CI workflows, version management, and documentation for Lite

**Panel-live advantage:** Panel-live is a standalone project, not a bolt-on to an existing framework. This avoids the build fragmentation and framework migration problems that killed gradio-lite.

---

## Issues to Review on GitHub

The following gradio-lite GitHub issues contain valuable context, solutions, or cautionary tales for panel-live. Organized by relevance.

### Tier 1 — High-Value Issues (directly actionable for panel-live)

| # | Issue | Why It Matters for panel-live |
|---|-------|-------------------------------|
| [#10300](https://github.com/gradio-app/gradio/issues/10300) | Unify frontend build (3 builds problem) | **Anti-pattern to avoid.** Panel-live already has a single build (`build.mjs`). Keep it that way. Never let the JS build fragment. |
| [#10705](https://github.com/gradio-app/gradio/issues/10705) | iOS stack overflow crash | **Directly relevant to P0 Browser Crash.** Gradio fixed this by bumping Pyodide 0.27.1 → 0.27.3. Panel-live should test on iOS and track Pyodide version-specific platform bugs. |
| [#12262](https://github.com/gradio-app/gradio/issues/12262) | huggingface-hub dependency breaks Lite | **Cautionary tale for dependency management.** Pure-Python wheel availability is fragile. Panel-live's `<panel-requirements>` should warn users when a package has no pure-Python wheel. |
| [#9839](https://github.com/gradio-app/gradio/issues/9839) | Missing `multipart` module in CDN bundle | **Lesson:** Pinning dependencies creates downstream security issues. Gradio pinned python-multipart, then had to unpin it (#10110) because users couldn't apply security updates. |
| [#12159](https://github.com/gradio-app/gradio/issues/12159) | `unload()` event never fires (memory leak) | **Relevant to P2 Memory Leak.** Session cleanup not triggering means memory accumulates. **Partial:** `worker-bridge.js` now has ref counting (`registerElement()`/`cleanupElement()`) — when all `<panel-live>` elements disconnect, the worker terminates after a 5s grace period, freeing ~300-500MB. Proxy function cleanup on re-run still needs profiling. |
| [#11427](https://github.com/gradio-app/gradio/pull/11427) | Selective component rendering (lazy tabs) | **Performance pattern.** Only render visible components; defer hidden ones. Relevant when panel-live has multiple instances on a page — could defer initialization of off-screen elements. |
| [#12853](https://github.com/gradio-app/gradio/issues/12853) | Cached examples broken in SPA mode | **Relevant to P2 Enable "render" mode.** Pre-rendered/cached output needs correct URL routing. Panel-live should design the `src` attribute and caching with URL resolution in mind. |
| [#7854](https://github.com/gradio-app/gradio/issues/7854) | No wheel artifact for `@gradio/lite` | **Relevant to P1 Distribution.** Gradio never created consistent Lite artifacts. Panel-live must have versioned CDN assets from day one (already planned at `cdn.holoviz.org/panel-live/vX.Y.Z/`). |

### Tier 2 — Informative Issues (useful context, lower urgency)

| # | Issue | Why It Matters for panel-live |
|---|-------|-------------------------------|
| [#12802](https://github.com/gradio-app/gradio/issues/12802) | Custom component assets 404 at subpath | **Relevant to P2 Iframe Embedding.** When panel-live is embedded at a non-root path, all asset URLs must resolve correctly. Test subpath scenarios. |
| [#11926](https://github.com/gradio-app/gradio/issues/11926) | `await` outside function in Lite examples | **Relevant to P1 Examples Gallery.** Top-level `await` doesn't work in Pyodide module scope. Panel-live examples must avoid this pattern or handle it explicitly. |
| [#12822](https://github.com/gradio-app/gradio/issues/12822) | 2s UI freeze on tab switching | **Performance regression pattern.** Gradio v6.1.0 introduced a severe regression. Panel-live should have performance benchmarks to catch regressions across releases. |
| [#8597](https://github.com/gradio-app/gradio/issues/8597) | Components lack Lite demos "due to Lite issues" | **Relevant to P1 Documentation.** Some components simply don't work in WASM. Panel-live should maintain a known-incompatible components list. |
| [#12091](https://github.com/gradio-app/gradio/issues/12091) | Reduce install size | **Browser memory constraint.** Every MB matters in WASM. Panel-live should monitor and document the total download size (Pyodide + Panel + Bokeh + user packages). |
| [#11019](https://github.com/gradio-app/gradio/issues/11019) | Fix flaky Lite tests | **Relevant to P1 Automated Testing.** Gradio's Lite tests were notoriously flaky. Panel-live's Playwright tests should be designed for stability from the start. |

### Tier 3 — Strategic Context (worth reading, not directly actionable)

| # | Issue | Context |
|---|-------|---------|
| [#2257](https://github.com/gradio-app/gradio/issues/2257) | Build desktop apps | Long-standing request, never shipped. Validates P3 Desktop Version as low priority. |
| [#12500](https://github.com/gradio-app/gradio/issues/12500) | Custom components broken on Gradio 6+ | Svelte 5 migration broke `window.__gradio__svelte__internal`. Framework coupling risk. |
| [#12487](https://github.com/gradio-app/gradio/issues/12487) | UV package manager support | Emerging tooling. Not relevant yet for panel-live. |
| [#11858](https://github.com/gradio-app/gradio/pull/11858) | **PR: Remove Lite entirely** | The PR that killed gradio-lite. Essential reading for understanding what went wrong. |

---

## New Issues / Enhancements Inspired by Gradio-Lite

These are patterns or features from gradio-lite that panel-live doesn't currently track but should consider:

### 1. SharedWorker Mode for Multiple Instances (P2)

Gradio-lite offered a `shared-worker` attribute that shares a single Pyodide runtime across multiple `<panel-live>` elements on the same page. This reduces memory from ~300MB per instance to ~300MB total.

**Relevance:** Documentation pages often have 3-5+ panel-live elements. A shared Pyodide runtime would drastically reduce memory usage and load time.

**Note:** Blocked by P0 Web Worker Support. Should be planned as a follow-on.

### 2. Auto-Detection of Imports for Package Installation (P2)

Gradio-lite used Pyodide's `loadPackagesFromImports()` to automatically detect and install packages from `import` statements, reducing the need for explicit `<panel-requirements>`.

**Relevance:** Panel-live already has `detectAndInstallRequirements()` in `package-manager.js`. Verify it uses `loadPackagesFromImports()` and document the auto-detection behavior.

### 3. Known-Incompatible Packages List (P2)

Gradio-lite discovered the hard way that packages like huggingface-hub, packages with C extensions, and certain pydantic versions don't work in Pyodide.

**Relevance:** Panel-live should maintain and document a list of known-incompatible packages (part of P2 Document Known Limitations).

### 4. Performance Regression Monitoring (P2)

Gradio experienced 5-10x performance regressions between major versions (#12831) with no automated detection.

**Relevance:** Panel-live should establish baseline performance metrics (load time, execution time, memory) and track them across releases. Could be part of P1 Automated Testing.

### 5. Lazy Initialization of Off-Screen Instances (P3)

Gradio's selective rendering pattern (#11427) — only initialize visible components — could apply to panel-live documentation pages with many examples.

**Relevance:** Use `IntersectionObserver` to defer Pyodide initialization for `<panel-live>` elements that are below the fold. This would significantly improve page load for the examples gallery.

### 6. Graceful Degradation When Pyodide Fails (P3) `PARTIAL`

Gradio-lite had no fallback when Pyodide couldn't load (browser too old, memory exhaustion, network failure). Users saw blank elements.

**Relevance:** Panel-live should show a meaningful fallback (static code block with a "Run in Playground" link) when Pyodide initialization fails.

**Partial:** panel-live now shows clear, actionable error messages for `file://` protocol, network failures, CDN timeouts (120s default), and worker crashes via `renderError()` with a dedicated `.pl-system-error` rendering path. **Remaining:** Static code block fallback with "Run in Playground" link not yet implemented.

---

## Cross-Reference with Existing panel-live Issues

| Gradio-Lite Finding | Existing panel-live Issue | Status | Action |
|---------------------|--------------------------|--------|--------|
| Web workers are essential | P0 Web Worker Support | Open | Validates priority. Gradio used Dedicated + SharedWorker. |
| iOS/platform crashes | P0 Browser Crash | Open | Test Pyodide version bumps as fix (worked for Gradio). |
| Memory leaks on re-run | P2 Memory Leak on Re-run | Partial | Gradio confirmed sessions accumulate. Ref counting + worker termination on disconnect now implemented. Proxy function profiling still needed. |
| Dependency version conflicts | P2 Reproducibility and Version Pinning | Open | Gradio's lack of pinning caused breakage. Critical for stability. |
| No versioned CDN assets | P1 Distribution | Partial | Gradio never shipped this. Panel-live must. |
| Flaky WASM tests | P1 Automated Testing | Partial | Gradio fixed flakiness as explicit sub-task. Plan for stability. |
| postMessage security | P2 postMessage Security | Open | Gradio had no validation either. Important when workers land. |
| Documentation drift | P1 Documentation | Partial | Gradio's docs had broken examples. Systematic testing needed. |
| Example code with syntax errors | P1 Examples Gallery | Partial | Validate all examples work in Pyodide before shipping. |

---

## Recommended Additions to open-issues.md

Based on this research, consider adding these items:

1. **P2 — SharedWorker Mode** (new, blocked by P0 Web Worker)
2. **P2 — Known-Incompatible Packages Documentation** (fold into P2 Document Known Limitations)
3. **P2 — Performance Regression Benchmarks** (fold into P1 Automated Testing)
4. **P3 — Lazy Initialization via IntersectionObserver** (new)
5. **P3 — Graceful Degradation Fallback** (new)
6. **P2 — iOS/Mobile Platform Testing** (fold into P0 Browser Crash or P1 Automated Testing)

---

## Verification

- [ ] Review each linked GitHub issue to confirm details
- [ ] Cross-check that no existing panel-live issues are duplicated
- [ ] Validate the "new issues" don't overlap with existing tracking
