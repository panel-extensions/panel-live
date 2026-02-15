# mkdocs-jupyterlite Research: Findings Relevant to panel-live

Research from [NickCrews/mkdocs-jupyterlite](https://github.com/NickCrews/mkdocs-jupyterlite/) -- issues, PRs, codebase, and architecture. Also covers the [DerThorsten/mkdocs-jupyterlite](https://derthorsten.github.io/mkdocs-jupyterlite/) fork and upstream [jupyterlite/jupyterlite](https://github.com/jupyterlite/jupyterlite) issues.

**Sources reviewed:**

- Full source code of `_plugin.py`, `_build.py`, `__init__.py`, `toc-handler.js`, `iframe-scroll-handler.js`, and `test_pattern_matching.py`
- All GitHub issues: [#1](https://github.com/NickCrews/mkdocs-jupyterlite/issues/1), [#3](https://github.com/NickCrews/mkdocs-jupyterlite/issues/3), [#5](https://github.com/NickCrews/mkdocs-jupyterlite/issues/5)
- All GitHub PRs: [#2](https://github.com/NickCrews/mkdocs-jupyterlite/pull/2), [#4](https://github.com/NickCrews/mkdocs-jupyterlite/pull/4)
- [jupyterlite/jupyterlite#1409](https://github.com/jupyterlite/jupyterlite/issues/1409) -- SharedArrayBuffer on GitHub Pages
- [jupyterlite/pyodide-kernel#126](https://github.com/jupyterlite/pyodide-kernel/pull/126) -- coincident/comlink fallback
- [pyproject.toml](https://github.com/NickCrews/mkdocs-jupyterlite/blob/main/pyproject.toml), project README, mkdocs.yml configuration
- DerThorsten fork documentation and superfences REPL integration
- [mkdocs-material discussion #4461](https://github.com/squidfunk/mkdocs-material/discussions/4461) -- Jupyter Notebook integration
- JupyterLite storage configuration documentation
- [jupyterlite-sphinx](https://github.com/jupyterlite/jupyterlite-sphinx) architecture overview
- PyPI and community discussions

---

## Architecture Overview

mkdocs-jupyterlite (NickCrews, v0.4.1) is a standard MkDocs plugin that embeds interactive Jupyter notebooks via JupyterLite. The core architecture:

1. **MkDocs Plugin Class** (`JupyterlitePlugin` extending `BasePlugin`) hooks into MkDocs lifecycle events: `on_files`, `on_pre_page`, `on_post_build`, and `on_build_error`.

2. **Build-time JupyterLite compilation**: During `on_files`, the plugin runs `jupyter lite build` as a subprocess in a temporary directory. Notebooks matching glob patterns are copied into the build, and the resulting static JupyterLite site is stored in a temp dir.

3. **iframe embedding**: Each notebook page's `render()` method is monkey-patched to emit an `<iframe>` pointing to the JupyterLite build (`jupyterlite/notebooks/index.html?path=<notebook>`). The iframe dimensions are hardcoded at `width="100%"` and `height="800px"`.

4. **Asset copying**: On `on_post_build`, the entire JupyterLite build directory is copied into the MkDocs site output as `site_dir/jupyterlite/`.

5. **TOC navigation**: Two JavaScript files handle cross-iframe TOC navigation via `postMessage` -- `toc-handler.js` (parent page) and `iframe-scroll-handler.js` (injected into JupyterLite's `index.html` via regex).

**Key difference from panel-live:** mkdocs-jupyterlite delegates all WASM/Pyodide work to JupyterLite's own build system. It never directly loads Pyodide or manages WASM assets. panel-live manages Pyodide directly in a Dedicated Worker, giving it more control but more responsibility.

### DerThorsten Fork

A separate, older implementation by [DerThorsten](https://derthorsten.github.io/mkdocs-jupyterlite/) takes a different approach: it uses `pymdownx.superfences` custom fences (like panel-live does) with a `{.repl}` syntax to embed JupyterLite REPL blocks inline. This is architecturally closer to panel-live's `fences.py` approach, using `repl_formatter` and `repl_validator` from a `mkdocs_jupyterlite.superfences` module. The DerThorsten fork supports per-fence configuration like `kernel="xpython"` and `env="my_env"`.

---

## Key Findings for panel-live

### 1. iframe Embedding vs Inline: The Fundamental Tradeoff

**Source:** [NickCrews codebase](https://github.com/NickCrews/mkdocs-jupyterlite/blob/main/src/mkdocs_jupyterlite/_plugin.py), project README

mkdocs-jupyterlite uses iframes exclusively. The README itself notes an open question: "Instead of using an iframe, actually inline the contents of the generated HTML?" as a potential improvement.

**Challenges with iframe approach (from mkdocs-jupyterlite):**
- TOC links do not work without a complex postMessage bridge (required [PR #4](https://github.com/NickCrews/mkdocs-jupyterlite/pull/4) to fix)
- Navigation within the iframe is isolated from the parent page
- Height must be hardcoded (800px) or managed via JavaScript resize observers
- JupyterLite uses virtual rendering (cells outside viewport are not in the DOM), so simple DOM queries fail within the iframe

**Relevance to panel-live:** panel-live's decision to use Light DOM (no Shadow DOM, no iframe) avoids all of these problems. This is validated by mkdocs-jupyterlite's struggles. However, panel-live should document its Light DOM rationale more prominently, citing these specific problems as justification. If panel-live ever considers an iframe mode (e.g., for security isolation in Discourse embedding), these challenges serve as a cautionary reference.

### 2. postMessage Communication Pattern for iframe Navigation

**Source:** [PR #4](https://github.com/NickCrews/mkdocs-jupyterlite/pull/4), [toc-handler.js](https://github.com/NickCrews/mkdocs-jupyterlite/blob/main/src/mkdocs_jupyterlite/static/toc-handler.js), [iframe-scroll-handler.js](https://github.com/NickCrews/mkdocs-jupyterlite/blob/main/src/mkdocs_jupyterlite/static/iframe-scroll-handler.js)

The implementation reveals important patterns:

- **Origin validation**: Both scripts validate `event.origin` against `window.location.origin` before processing messages. This is the same-origin check pattern.
- **Text-based matching**: Because heading IDs differ between MkDocs markdown processing and JupyterLab's internal TOC, the solution matches headings by text content rather than ID. This is fragile but necessary.
- **MutationObserver fallback**: If the target heading is not yet in the DOM (due to JupyterLite's virtual rendering), a `MutationObserver` watches for it with a 10-second timeout.
- **Click simulation**: Instead of `scrollIntoView()`, the handler dispatches synthetic `mousedown`/`mouseup`/`click` events on JupyterLab's TOC entries. This is because JupyterLab's TOC has its own scroll-to-cell logic triggered by clicks.

**Relevance to panel-live:** panel-live's `worker-bridge.js` already uses `postMessage` for worker communication with structural message validation. If panel-live adds an iframe embedding mode (P2 -- Discourse Embedding), the mkdocs-jupyterlite pattern of origin-validated postMessage with MutationObserver fallback is a proven approach. The 10-second timeout for async content is a pragmatic choice worth noting.

### 3. Browser Storage Override to Prevent Stale State

**Source:** [_build.py `_write_jupyter_lite_json()`](https://github.com/NickCrews/mkdocs-jupyterlite/blob/main/src/mkdocs_jupyterlite/_build.py), [jupyterlite/jupyterlite#1706 comment](https://github.com/jupyterlite/jupyterlite/issues/1706#issuecomment-3187140714)

mkdocs-jupyterlite explicitly disables browser persistence in its generated `jupyter-lite.json`:

```json
{
  "enableMemoryStorage": true,
  "settingsStorageDrivers": ["memoryStorageDriver"],
  "contentsStorageDrivers": ["memoryStorageDriver"]
}
```

The code comment explains the problem: "By default, jupyterlite saves the state of the notebook to the client's browser, and on reload of the page, the notebook will be restored to that state. The problem is that this local state overrides the contents sent from the server. So, if you edit a notebook, rebuild your docs, and refresh the page, you still see the old version."

The author notes this is "Not ideal: it would be great if the user's state persisted until the data on the server actually *changed*", but JupyterLite does not yet support content-hash-based cache invalidation.

**Relevance to panel-live:** This is directly relevant to panel-live's P2 -- Editor State Persistence (localStorage) issue. panel-live should learn from this: if editor state is persisted to localStorage, there must be a mechanism to detect when the underlying example code has changed (e.g., after a docs rebuild) and invalidate the cached state. A content hash stored alongside the editor state would solve this. Without it, users will see stale code after documentation updates -- exactly the problem mkdocs-jupyterlite chose to avoid by disabling persistence entirely.

### 4. Subprocess-Based Build with Fragile Error Handling

**Source:** [Issue #5](https://github.com/NickCrews/mkdocs-jupyterlite/issues/5), [_build.py](https://github.com/NickCrews/mkdocs-jupyterlite/blob/main/src/mkdocs_jupyterlite/_build.py)

Issue #5 reports a `subprocess.CalledProcessError` when building a simple project on macOS. The `jupyter lite build` command returned non-zero exit status 2, with a secondary `FileNotFoundError` about a missing `files/` directory. The error occurs in `_build.py` at line 97 (the subprocess.run call).

The build approach is fragile because:
- It shells out to `jupyter lite build` as a subprocess, inheriting all of JupyterLite's CLI complexities and failure modes
- Error messages from the subprocess are captured but not always actionable for users
- Temporary directory management adds another failure surface
- The `files/` directory must be created before notebooks are copied, but the sequencing depends on the temp directory lifecycle

**Relevance to panel-live:** panel-live's approach of bundling everything with esbuild and managing Pyodide directly (rather than delegating to an external build tool) avoids this class of problems. For panel-live's planned Sphinx extension and export CLI, this is a cautionary example: avoid subprocess-based builds when possible. If subprocess calls are necessary (e.g., for the export CLI), provide detailed error messages and validate preconditions before running external commands.

### 5. Wheel/Package Management Pattern

**Source:** [_build.py `_get_wheel_urls()`](https://github.com/NickCrews/mkdocs-jupyterlite/blob/main/src/mkdocs_jupyterlite/_build.py), [mkdocs.yml configuration](https://github.com/NickCrews/mkdocs-jupyterlite/blob/main/mkdocs.yml)

mkdocs-jupyterlite supports two wheel sources: direct URLs and shell commands. The shell command approach uses a `{wheels_dir}` placeholder:

```yaml
wheels:
  - url: https://example.com/package-1.0.whl
  - command: uv build --wheel --out-dir {wheels_dir} src/my_package/
```

This is clever for development workflows where you need to include local packages that are not on PyPI. The command approach runs arbitrary shell commands to produce `.whl` files in a temporary directory, which are then included in the JupyterLite build.

**Relevance to panel-live:** panel-live's `<panel-requirements>` element handles package names that are resolved at runtime via micropip. For the planned export CLI (P1) and render mode (P2), panel-live may need build-time wheel management similar to mkdocs-jupyterlite's approach. The `{wheels_dir}` placeholder pattern is worth considering for cases where users need to include private or local packages. This also relates to the P3 -- Private Package Feeds issue.

### 6. MkDocs Plugin Lifecycle Hooks and Asset Management

**Source:** [_plugin.py](https://github.com/NickCrews/mkdocs-jupyterlite/blob/main/src/mkdocs_jupyterlite/_plugin.py)

mkdocs-jupyterlite uses four MkDocs hooks:

| Hook | Purpose |
|------|---------|
| `on_files` | Scan for notebooks, run `jupyter lite build`, add static JS to site files |
| `on_pre_page` | Monkey-patch `page.render()` to emit iframe HTML + TOC handler script |
| `on_post_build` | Copy JupyterLite build output to `site_dir/jupyterlite/` |
| `on_build_error` | Clean up temporary build directory |

Key patterns:

- **File registration**: Static JS files (`toc-handler.js`) are added to the site files list in `on_files` by creating `File` objects with `src_dir` pointing to the package's `static/` directory. This makes them available at known URLs in the built site.
- **Render monkey-patching**: `page.render` is replaced at the instance level using `__get__()` to bind a new method. This avoids modifying the class and allows per-page customization.
- **Temp directory lifecycle**: A `TemporaryDirectory` is created in `__init__` and cleaned up in both `on_post_build` (success) and `on_build_error` (failure). This dual-cleanup pattern prevents temp directory leaks.

**Relevance to panel-live:** panel-live's fences.py takes a different approach -- it uses `pymdownx.superfences` custom fences (validator + formatter) rather than MkDocs plugin hooks. This is lighter-weight and does not require registering as an MkDocs plugin. However, if panel-live ever needs to inject JS/CSS assets at build time (e.g., for the render mode), the `on_files` + `File` object pattern from mkdocs-jupyterlite shows how to register assets with MkDocs's file system. The `on_post_build` hook for copying built assets into `site_dir` is also relevant for the export CLI.

### 7. mkdocs-material CSS Width Constraint Problem

**Source:** [Project README](https://github.com/NickCrews/mkdocs-jupyterlite), community discussions

mkdocs-material limits content area max-width to 61rem. This is narrow enough that JupyterLite's responsive breakpoints trigger mobile mode, hiding important UI elements like the "add cell below" hover menu.

**Relevance to panel-live:** panel-live elements embedded in mkdocs-material pages face similar width constraints. The `.pl-*` CSS class prefix and CSS custom properties (`--pl-*`) already provide styling control, but panel-live should test and document how its elements behave at constrained widths (e.g., within mkdocs-material's 61rem limit). If editor/playground mode elements become too cramped, specific CSS guidance or a responsive breakpoint adjustment may be needed. panel-live's horizontal/vertical layout option already helps, but this should be explicitly tested with mkdocs-material.

### 8. SharedArrayBuffer Fallback Strategy (Upstream JupyterLite)

**Source:** [jupyterlite/jupyterlite#1409](https://github.com/jupyterlite/jupyterlite/issues/1409), [jupyterlite/pyodide-kernel#126](https://github.com/jupyterlite/pyodide-kernel/pull/126)

JupyterLite's pyodide-kernel implements a conditional worker communication strategy:

- If `crossOriginIsolated` is true (COOP/COEP headers present): use `coincident` library (SharedArrayBuffer, synchronous communication)
- Otherwise: use `comlink` library (async postMessage-only communication)

The key lesson from [pyodide-kernel#126](https://github.com/jupyterlite/pyodide-kernel/pull/126): `coincident` does NOT gracefully degrade when SharedArrayBuffer is unavailable -- it throws `TypeError: [object Int32Array] is not a shared typed array`. The solution was separate entry points for each mode, with runtime detection of `crossOriginIsolated`.

For GitHub Pages specifically, [issue #1409](https://github.com/jupyterlite/jupyterlite/issues/1409) documents that since GitHub Pages does not allow custom HTTP headers, the only option is `coi-serviceworker` (a service worker that injects COOP/COEP headers at runtime). JupyterLite has discussed integrating this into its own service worker behind an opt-in flag in `jupyter-lite.json`, but this is not yet implemented.

**Relevance to panel-live:** panel-live already has COOP/COEP headers via `serve.py` and documents this requirement. However, for deployments on GitHub Pages (a common scenario for documentation sites), panel-live needs a `coi-serviceworker` or `mini-coi.js` integration strategy. The pyodide-kernel#126 pattern of separate entry points based on `crossOriginIsolated` detection is a robust approach. panel-live's existing `index.js` service worker cleanup code should be reviewed in light of this -- if a `coi-serviceworker` is used for GitHub Pages, panel-live's cleanup must not interfere with it.

### 9. TOC Generation from Notebooks (Build-Time Markdown Conversion)

**Source:** [_plugin.py `get_nb_toc_and_title()`](https://github.com/NickCrews/mkdocs-jupyterlite/blob/main/src/mkdocs_jupyterlite/_plugin.py)

mkdocs-jupyterlite generates a table of contents for each notebook at build time by:

1. Reading the `.ipynb` file with `nbformat`
2. Converting to Markdown with `nbconvert.MarkdownExporter`
3. Parsing the Markdown with Python's `markdown` library (with many extensions enabled)
4. Extracting `toc_tokens` and converting to MkDocs's `TableOfContents`

This means the TOC is generated from the notebook's headings, not from the rendered output. The first level-1 heading becomes the page title.

**Relevance to panel-live:** If panel-live implements a render mode (P2) that pre-renders Panel code at build time, a similar pattern of extracting metadata (title, TOC entries) from the Python source or rendered output may be useful. For the Sphinx extension (P2, partial), this is less relevant since Sphinx has its own TOC mechanisms.

### 10. Minimal Test Coverage

**Source:** [tests/test_pattern_matching.py](https://github.com/NickCrews/mkdocs-jupyterlite/blob/main/tests/test_pattern_matching.py)

The entire test suite consists of a single test file with one test function testing glob pattern matching. There are no integration tests for the MkDocs plugin lifecycle, no tests for the JavaScript TOC handlers, and no end-to-end tests.

**Relevance to panel-live:** panel-live already has significantly better test coverage (pytest, Vitest, Playwright E2E). This confirms that panel-live's investment in testing infrastructure is valuable. For the planned Sphinx and Quarto extensions, maintaining the same testing discipline (unit tests + integration tests + E2E where feasible) will be a competitive advantage.

### 11. Two Competing Approaches: Plugin vs Custom Fence

**Source:** NickCrews (MkDocs plugin + iframe) vs DerThorsten (pymdownx.superfences custom fence + REPL)

The two mkdocs-jupyterlite implementations represent the two fundamental approaches to MkDocs integration:

| Aspect | NickCrews (Plugin) | DerThorsten (Custom Fence) |
|--------|-------------------|---------------------------|
| Integration point | MkDocs plugin hooks | pymdownx.superfences validator/formatter |
| Embedding | iframe | Inline HTML element |
| Content source | .ipynb files | Fenced code blocks in Markdown |
| Configuration | mkdocs.yml plugin config | Per-fence attributes |
| Build dependency | `jupyter lite build` subprocess | JupyterLite JS loaded at runtime |

**Relevance to panel-live:** panel-live chose the custom fence approach (like DerThorsten), which is the right choice for embedding interactive code snippets in documentation. The NickCrews approach is better suited for embedding full notebooks. panel-live's architecture validates this: custom fences are simpler, more compositional, and avoid the iframe isolation problems that required complex postMessage bridges in NickCrews' version.

### 12. Debug Environment Variable for Build Directory

**Source:** [_build.py `_get_src_dir()`](https://github.com/NickCrews/mkdocs-jupyterlite/blob/main/src/mkdocs_jupyterlite/_build.py)

```python
if (src_dir_str := os.environ.get("MKDOCS_JUPYTERLITE_SRC_DIR")) is not None:
    p = Path(src_dir_str)
    shutil.rmtree(p, ignore_errors=True)
    p.mkdir(parents=True, exist_ok=True)
    yield p
else:
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)
```

An environment variable (`MKDOCS_JUPYTERLITE_SRC_DIR`) allows developers to specify a persistent build directory for debugging, instead of using a temporary directory that is cleaned up automatically.

**Relevance to panel-live:** If panel-live's render mode or export CLI uses temporary directories for intermediate build artifacts, a similar debug environment variable would help developers inspect intermediate state. This is a small but valuable developer experience improvement.

---

## New Issues / Enhancements Inspired by mkdocs-jupyterlite

### N1. Content-Hash Cache Invalidation for Editor State Persistence (P2)

When implementing editor state persistence (P2 -- Editor State Persistence), include a content hash of the original code alongside the persisted state. On page load, compare the stored hash against the current example code. If they differ (documentation was updated), discard the cached state and show the new code. This prevents the stale-state problem that mkdocs-jupyterlite chose to solve by disabling persistence entirely.

### N2. GitHub Pages COOP/COEP Strategy (P2)

Document and implement a strategy for panel-live on GitHub Pages, where custom HTTP headers cannot be set. Options:
- Bundle `mini-coi.js` or `coi-serviceworker` with panel-live assets
- Auto-detect `crossOriginIsolated === false` and inject coi-serviceworker if needed
- Ensure panel-live's service worker cleanup in `index.js` does not interfere with coi-serviceworker
- Test and document the GitHub Pages deployment path end-to-end

This is partially covered by "P2 -- Zero-Install Deployment / Link Sharing" (graceful COOP/COEP fallback) but deserves explicit attention as a deployment scenario.

### N3. mkdocs-material Width Constraint Testing (P2)

Add explicit testing and documentation for panel-live elements within mkdocs-material's 61rem content width constraint. Verify that editor, playground, and app modes remain functional at narrow widths. If breakpoints need adjustment, provide CSS custom property overrides. Add this to the documentation and potentially to the UI tests.

### N4. Build-Time Wheel Resolution for Export CLI (P1)

For the planned export CLI, adopt a wheel resolution pattern similar to mkdocs-jupyterlite's `_get_wheel_urls()` that supports both direct URLs and shell commands. This enables users to include local/private packages in exported panel-live apps:

```yaml
# Hypothetical panel-live export config
packages:
  - name: my-internal-package
    command: uv build --wheel --out-dir {wheels_dir} ./my_package/
```

---

## Adjustments to Existing Issues

### P2 -- Analyze mkdocs-jupyterlite

**Status:** This research document completes this issue. Mark as **Done**.

### P2 -- Editor State Persistence (localStorage)

**Enrichment:** Add content-hash-based cache invalidation to the acceptance criteria. When the underlying example code changes (e.g., after a documentation rebuild), persisted editor state must be invalidated. Without this, users see stale code -- the exact problem mkdocs-jupyterlite encountered and chose to solve by disabling persistence entirely. (Source: mkdocs-jupyterlite `_build.py` comment referencing [jupyterlite/jupyterlite#1706](https://github.com/jupyterlite/jupyterlite/issues/1706).)

### P2 -- Zero-Install Deployment / Link Sharing

**Enrichment:** Add GitHub Pages as an explicit deployment scenario. Document the coi-serviceworker / mini-coi.js pattern for injecting COOP/COEP headers on static hosts that do not allow custom headers. Reference JupyterLite's approach: [jupyterlite/jupyterlite#1409](https://github.com/jupyterlite/jupyterlite/issues/1409) (opt-in coi-serviceworker integration) and [jupyterlite/pyodide-kernel#126](https://github.com/jupyterlite/pyodide-kernel/pull/126) (separate entry points based on `crossOriginIsolated` detection, because `coincident` does not gracefully degrade).

### P2 -- Discourse Embedding

**Enrichment:** If iframe embedding is used for Discourse, the mkdocs-jupyterlite postMessage pattern (origin-validated messages with MutationObserver fallback and 10-second timeout) provides a tested reference implementation. Document the specific challenges: cross-origin messaging restrictions, height management, and navigation isolation.

### P1 -- Export CLI for Static Deployment

**Enrichment:** Consider supporting shell command-based wheel resolution (the `{wheels_dir}` placeholder pattern from mkdocs-jupyterlite) for including private or locally-built packages in exported apps. Also add a debug environment variable for persistent intermediate build directories (mkdocs-jupyterlite's `MKDOCS_JUPYTERLITE_SRC_DIR` pattern).

### P2 -- Enable "render" Mode in MkDocs

**Enrichment:** mkdocs-jupyterlite's `on_post_build` hook for copying build artifacts into `site_dir` is the standard pattern for MkDocs build-time asset injection. If render mode produces static HTML at build time, the output should be copied into the site directory during `on_post_build`. The `on_build_error` cleanup pattern (dual cleanup in both success and error paths) prevents temp directory leaks.

### P2 -- Sphinx Extension

**Enrichment:** mkdocs-jupyterlite's `get_nb_toc_and_title()` demonstrates build-time metadata extraction from notebook content. If the Sphinx extension needs to generate section titles or TOC entries from Panel code output, a similar approach (run code, extract headings from output) could work. The nbconvert-based approach may be overkill for panel-live, but the pattern of extracting structure from rendered content is applicable.

### P0 -- Browser Crash (STATUS_ACCESS_VIOLATION)

**Enrichment:** JupyterLite's approach from [pyodide-kernel#126](https://github.com/jupyterlite/pyodide-kernel/pull/126) shows that failing to detect the absence of SharedArrayBuffer causes hard crashes (TypeError, not graceful degradation). panel-live should verify it does not attempt to use SharedArrayBuffer when `crossOriginIsolated` is false. If panel-live does use SharedArrayBuffer anywhere, implement the dual-entry-point pattern (coincident-style for isolated contexts, comlink-style for non-isolated).

---

## Summary

| # | Finding | Priority | Affected panel-live Issues | Action |
|---|---------|----------|---------------------------|--------|
| 1 | iframe embedding causes TOC navigation, height, and DOM isolation problems; validates panel-live's Light DOM choice | Informational | Design decisions doc | Document as validation of Light DOM architecture |
| 2 | postMessage + MutationObserver pattern for cross-iframe communication | P2 | Discourse Embedding | Reference pattern if iframe mode is needed |
| 3 | Browser storage persistence causes stale state on docs rebuild; content-hash invalidation needed | P2 | Editor State Persistence | Add content-hash cache invalidation to acceptance criteria |
| 4 | Subprocess-based builds are fragile; direct bundling is more reliable | Informational | Export CLI | Avoid subprocess calls where possible; provide detailed errors where necessary |
| 5 | Shell command wheel resolution with `{wheels_dir}` placeholder | P1 | Export CLI | Adopt pattern for private/local package inclusion |
| 6 | MkDocs `on_files` + `File` object for static asset registration | P2 | Render Mode | Use for build-time asset injection |
| 7 | mkdocs-material 61rem width constraint affects embedded WASM elements | P2 | Documentation | Test and document panel-live behavior at constrained widths |
| 8 | SharedArrayBuffer requires explicit fallback; `coincident` crashes without it; coi-serviceworker needed for GitHub Pages | P2 | Zero-Install Deployment, Browser Crash | Implement coi-serviceworker strategy; verify no SAB usage without isolation |
| 9 | Build-time TOC extraction from notebook content via markdown parsing | P3 | Render Mode, Sphinx Extension | Consider for metadata extraction in render mode |
| 10 | Single test file in mkdocs-jupyterlite; panel-live's test investment is validated | Informational | Testing | Maintain current testing discipline |
| 11 | Custom fence approach (DerThorsten) vs plugin+iframe (NickCrews); custom fence is better for code snippets | Informational | Architecture | Validates panel-live's custom fence architecture |
| 12 | Debug environment variable for persistent build directory | P3 | Export CLI, Render Mode | Add `PANEL_LIVE_BUILD_DIR` env var for debugging intermediate artifacts |

---

Sources:
- [NickCrews/mkdocs-jupyterlite](https://github.com/NickCrews/mkdocs-jupyterlite)
- [DerThorsten/mkdocs-jupyterlite](https://derthorsten.github.io/mkdocs-jupyterlite/)
- [jupyterlite/jupyterlite#1409 - SharedArrayBuffer on GitHub Pages](https://github.com/jupyterlite/jupyterlite/issues/1409)
- [jupyterlite/pyodide-kernel#126 - coincident/comlink fallback](https://github.com/jupyterlite/pyodide-kernel/pull/126)
- [jupyterlite-sphinx](https://github.com/jupyterlite/jupyterlite-sphinx)
- [mkdocs-material discussion #4461](https://github.com/squidfunk/mkdocs-material/discussions/4461)
- [JupyterLite storage configuration](https://jupyterlite.readthedocs.io/en/stable/howto/configure/storage.html)
- [JupyterLite iframe communication](https://jupyterlite.readthedocs.io/en/latest/howto/configure/advanced/iframe.html)
- [MkDocs plugin development guide](https://www.mkdocs.org/dev-guide/plugins/)
- [web.dev COOP/COEP guide](https://web.dev/articles/coop-coep)
