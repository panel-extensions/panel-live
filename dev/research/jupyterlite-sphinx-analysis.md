# jupyterlite-sphinx Research: Findings Relevant to panel-live

Research from [jupyterlite/jupyterlite-sphinx](https://github.com/jupyterlite/jupyterlite-sphinx) -- issues, PRs, codebase, and architecture. Especially useful for the planned panel-live Sphinx extension.

**Sources reviewed:**

- GitHub issues (open and closed): [#27](https://github.com/jupyterlite/jupyterlite-sphinx/issues/27), [#36](https://github.com/jupyterlite/jupyterlite-sphinx/issues/36), [#37](https://github.com/jupyterlite/jupyterlite-sphinx/issues/37), [#38](https://github.com/jupyterlite/jupyterlite-sphinx/issues/38), [#50](https://github.com/jupyterlite/jupyterlite-sphinx/issues/50), [#69](https://github.com/jupyterlite/jupyterlite-sphinx/issues/69), [#117](https://github.com/jupyterlite/jupyterlite-sphinx/issues/117), [#120](https://github.com/jupyterlite/jupyterlite-sphinx/issues/120), [#140](https://github.com/jupyterlite/jupyterlite-sphinx/issues/140), [#142](https://github.com/jupyterlite/jupyterlite-sphinx/issues/142), [#146](https://github.com/jupyterlite/jupyterlite-sphinx/issues/146), [#149](https://github.com/jupyterlite/jupyterlite-sphinx/issues/149), [#177](https://github.com/jupyterlite/jupyterlite-sphinx/issues/177), [#256](https://github.com/jupyterlite/jupyterlite-sphinx/issues/256), [#261](https://github.com/jupyterlite/jupyterlite-sphinx/issues/261), [#287](https://github.com/jupyterlite/jupyterlite-sphinx/issues/287), [#288](https://github.com/jupyterlite/jupyterlite-sphinx/issues/288), [#291](https://github.com/jupyterlite/jupyterlite-sphinx/issues/291), [#295](https://github.com/jupyterlite/jupyterlite-sphinx/issues/295), [#319](https://github.com/jupyterlite/jupyterlite-sphinx/issues/319), [#327](https://github.com/jupyterlite/jupyterlite-sphinx/issues/327)
- GitHub PRs: [#28](https://github.com/jupyterlite/jupyterlite-sphinx/pull/28)
- Codebase: `jupyterlite_sphinx.py`, `_try_examples.py`, `jupyterlite_sphinx.js`, `jupyterlite_sphinx.css`
- [jupyterlite-sphinx documentation](https://jupyterlite-sphinx.readthedocs.io/en/latest/)
- [jupyterlite-sphinx releases](https://github.com/jupyterlite/jupyterlite-sphinx/releases)
- Upstream: [jupyterlite/jupyterlite#794](https://github.com/jupyterlite/jupyterlite/issues/794) (web components), [jupyterlite/jupyterlite#1409](https://github.com/jupyterlite/jupyterlite/issues/1409) (SharedArrayBuffer), [jupyterlite/pyodide-kernel#126](https://github.com/jupyterlite/pyodide-kernel/pull/126) (coincident/comlink fallback)
- Adopters: [SciPy #19729](https://github.com/scipy/scipy/issues/19729), [NumPy #26745](https://github.com/numpy/numpy/pull/26745)
- [nbsite pyodide extension](https://github.com/holoviz-dev/nbsite/tree/main/nbsite/pyodide)
- [Panel Sphinx docs](https://panel.holoviz.org/how_to/wasm/sphinx.html)
- [Panel issue #5766](https://github.com/holoviz/panel/issues/5766)
- [Scientific Python forum discussion](https://discuss.scientific-python.org/t/making-docstring-examples-interactive/812)

---

## Architecture Overview

jupyterlite-sphinx (v0.22.0, Sep 2025) is a mature Sphinx extension that embeds JupyterLite instances in Sphinx documentation. It has been adopted by major scientific Python projects including NumPy and SciPy.

### Core Architecture

1. **Sphinx Extension** (`jupyterlite_sphinx.py`): Registers 5 Sphinx directives, custom docutils nodes, event handlers, config values, and static assets via `setup()`.

2. **Iframe-Based Embedding**: All directives render to `<iframe>` elements pointing to a JupyterLite static site built during `build-finished`. The iframe is wrapped in a container div with optional prompt buttons and loading spinners.

3. **Build-Time JupyterLite Compilation**: On `build-finished`, the extension runs `jupyter lite build` as a subprocess in the Sphinx output directory, producing a complete JupyterLite static site.

4. **TryExamples Docstring Hook** (`_try_examples.py`): Hooks into `autodoc-process-docstring` to auto-convert doctest-format examples into interactive notebooks, generating `.ipynb` files at build time.

### Directives

| Directive | Purpose |
|-----------|---------|
| `JupyterLite` | Embed full JupyterLab interface |
| `NotebookLite` | Embed JupyterLab Notebook interface |
| `Replite` | Embed REPL console |
| `Voici` | Embed Voici dashboard |
| `TryExamples` | Convert docstring examples to interactive notebooks |

### Configuration Values

| Config | Type | Description |
|--------|------|-------------|
| `jupyterlite_dir` | str | Source directory for JupyterLite build |
| `jupyterlite_contents` | list | Glob patterns for notebook files to include |
| `jupyterlite_build_command_options` | str | Extra CLI args for `jupyter lite build` |
| `jupyterlite_silence` | bool | Suppress build output (default True) |
| `strip_tagged_cells` | bool | Strip cells tagged `jupyterlite_sphinx_strip` |
| `global_enable_try_examples` | bool | Auto-insert `try_examples` in all docstrings |
| `replite_auto_execute` | bool | Auto-execute REPL code (default True) |

### Module Structure

```
jupyterlite_sphinx/
    __init__.py              # Exports setup() and __version__
    jupyterlite_sphinx.py    # Core extension: directives, nodes, build hooks, setup()
    _try_examples.py         # Docstring-to-notebook conversion
    jupyterlite_sphinx.js    # Client-side iframe management, mobile detection, config loader
    jupyterlite_sphinx.css   # Iframe containers, buttons, spinners
```

### Release History (Relevant Milestones)

| Version | Date | Key Changes |
|---------|------|-------------|
| v0.22.0 | Sep 2025 | `:showBanner: 0` support, jupyterlite-core 0.8 compat |
| v0.21.0 | Sep 2025 | `jupyterlite_ignore_contents` config |
| v0.20.1 | May 2025 | Fix IndexError when Examples section is last |
| v0.20.0 | Apr 2025 | Contents from outside Sphinx srcdir, dark theme button styling |
| v0.19.0 | Feb 2025 | Mobile detection, ConfigLoader, docstring section pattern fixes |
| v0.18.0 | Jan 2025 | REPL code execution toggling, Python 3.8 dropped |
| v0.17.0 | Dec 2024 | Markdown notebook support, `overrides.json`, new-tab variants |

---

## Key Findings for panel-live

### 1. Iframe-Based Embedding is Both the Strength and Weakness

**Source:** [#36](https://github.com/jupyterlite/jupyterlite-sphinx/issues/36), [#69](https://github.com/jupyterlite/jupyterlite-sphinx/issues/69), [jupyterlite #794](https://github.com/jupyterlite/jupyterlite/issues/794)

jupyterlite-sphinx uses iframes exclusively for embedding. This creates isolation (no CSS/JS conflicts, separate execution context) but causes significant problems:

- **URL path resolution:** iframe `src` URLs break in subdirectories ([#36](https://github.com/jupyterlite/jupyterlite-sphinx/issues/36)). Absolute paths like `/lite/replite/...` fail when docs are in subdirectories, resulting in 404 errors. This issue remains open after 3+ years.
- **Theme synchronization:** The host page cannot easily communicate theme changes to the iframe ([#69](https://github.com/jupyterlite/jupyterlite-sphinx/issues/69)). Solutions require `postMessage`, `exposeAppInBrowser`, or URL parameters -- all fragile. Multiple JupyterLite instances on the same page share browser storage, causing theme conflicts.
- **Storage conflicts:** Multiple JupyterLite iframes on the same domain share browser storage (IndexedDB, localStorage), causing cross-contamination ([jupyterlite #440](https://github.com/jupyterlite/jupyterlite/issues/440)).
- **Inflexibility:** The JupyterLite project itself has an open request for web component alternatives ([jupyterlite #794](https://github.com/jupyterlite/jupyterlite/issues/794)) because "iframes are by design pretty inflexible."

**Relevance for panel-live:** panel-live's Light DOM approach using a custom element (`<panel-live>`) avoids all of these problems. This is a significant architectural advantage. panel-live's `theme="auto"` with `prefers-color-scheme` detection is simpler and more reliable than iframe-based theme synchronization. This should be emphasized when positioning panel-live as a Sphinx extension alternative.

### 2. Build-Time `jupyter lite build` Subprocess is a Major Pain Point

**Source:** [#149](https://github.com/jupyterlite/jupyterlite-sphinx/issues/149), [#177](https://github.com/jupyterlite/jupyterlite-sphinx/issues/177), [#117](https://github.com/jupyterlite/jupyterlite-sphinx/issues/117), SciPy [#20289](https://github.com/scipy/scipy/pull/20289)

The extension runs `jupyter lite build` as a subprocess during `build-finished`. This approach has caused:

- **Excessive build noise:** The `--debug` flag was hardcoded, and `doit` verbosity was set to 2, flooding build logs ([#149](https://github.com/jupyterlite/jupyterlite-sphinx/issues/149)). SciPy had to pin jupyterlite-sphinx versions to avoid noisy builds.
- **Cryptic build failures:** Exit status 3 with no clear error messages ([#177](https://github.com/jupyterlite/jupyterlite-sphinx/issues/177)). Root causes include kernel compatibility issues (e.g., `'emscripten' is not a valid Platform`).
- **Large build artifacts:** JupyterLite produces a full static site (63+ MiB before optimization, reduced to 22 MiB with recent work). This inflates documentation builds significantly.
- **Slow builds:** The subprocess adds significant time to every Sphinx build, even when no notebooks changed.

**Relevance for panel-live:** panel-live's Sphinx extension should NOT follow this pattern. Instead of building a full runtime at Sphinx build time, panel-live should inject a `<script>` tag pointing to CDN-hosted JS/CSS assets plus `<panel-live>` elements with inline code. This produces near-zero build overhead -- the runtime loads client-side from CDN. The only build-time work should be transforming directives into HTML elements.

### 3. Lazy Loading via "Prompt" Button is Essential for Documentation Pages

**Source:** [#50](https://github.com/jupyterlite/jupyterlite-sphinx/issues/50), [#140](https://github.com/jupyterlite/jupyterlite-sphinx/issues/140), [#287](https://github.com/jupyterlite/jupyterlite-sphinx/issues/287), [#295](https://github.com/jupyterlite/jupyterlite-sphinx/issues/295)

jupyterlite-sphinx added a `:prompt:` option that shows a "Try It Live" button instead of immediately loading the iframe. This was critical because:

- Each JupyterLite instance downloads 100s of MB of assets
- Mobile users on cellular connections face bandwidth constraints
- Multiple instances on one page would overwhelm the browser

The `:prompt:` feature was requested early ([#50](https://github.com/jupyterlite/jupyterlite-sphinx/issues/50)) and is now the recommended pattern for documentation with many examples. Mobile detection hides buttons by default on small screens ([#140](https://github.com/jupyterlite/jupyterlite-sphinx/issues/140)), though there is ongoing debate about who should control this -- library authors or website authors ([#295](https://github.com/jupyterlite/jupyterlite-sphinx/issues/295)).

**Relevance for panel-live:** panel-live already has `auto-run` attribute control, but the Sphinx extension should default to NOT auto-running on documentation pages. A click-to-run pattern (like panel-live's existing prompt button or the "Play" button in nbsite's pyodide extension) should be the default for Sphinx docs, with an option to enable auto-run per directive.

### 4. TryExamples: Docstring-to-Interactive-Notebook is a Killer Feature

**Source:** [#142](https://github.com/jupyterlite/jupyterlite-sphinx/issues/142), [#291](https://github.com/jupyterlite/jupyterlite-sphinx/issues/291), [#256](https://github.com/jupyterlite/jupyterlite-sphinx/issues/256), [SciPy #19729](https://github.com/scipy/scipy/issues/19729), [NumPy #26745](https://github.com/numpy/numpy/pull/26745)

The `try_examples` directive automatically converts doctest-format examples in docstrings into interactive notebooks. It hooks into `autodoc-process-docstring` to auto-insert directives, so existing documentation becomes interactive without modifying source files.

Key implementation details from `_try_examples.py`:
- Lines starting with `>>>` or `...` become code cells
- Text blocks become markdown cells
- Contiguous code lines are merged into single cells
- RST cross-references are converted to Markdown format
- Math directives (`:math:`) become LaTeX notation
- The `insert_try_examples_directive()` function identifies "Examples" sections in docstrings processed by numpydoc or napoleon

This is used in production by NumPy and SciPy.

**Relevance for panel-live:** While panel-live's primary use case differs (Panel apps vs. doctest examples), the `autodoc-process-docstring` hook pattern is valuable. A panel-live Sphinx extension could hook into autodoc to automatically make Panel-related code examples interactive. More importantly, panel-live's Sphinx extension should support a similar "swap static content for interactive" pattern -- showing rendered code blocks by default, with a button to activate the live `<panel-live>` element.

### 5. Mixed Static/Dynamic Mode is the Next Frontier

**Source:** [#319](https://github.com/jupyterlite/jupyterlite-sphinx/issues/319)

Issue #319 proposes combining build-time rendering (like jupyter-sphinx) with runtime interactivity (like jupyterlite-sphinx). The argument:

1. Static pre-rendered output is accessible, searchable, and loads instantly
2. Interactive mode has "JavaScript ailments (hard to access in search, slow to load esp. on mobile)"
3. The ideal is static-by-default with a toggle to "switch to interactive"

Two approaches were proposed:
- **Simple:** Static code block + button that replaces it with a REPL iframe on demand
- **Advanced:** Input cells are always editable; JS activates only when the user modifies or runs code

**Relevance for panel-live:** This directly maps to panel-live's planned `mode="render"` (P2 issue). panel-live should implement a Sphinx directive that pre-renders Panel output at build time (static HTML/images) and includes a "Make Interactive" button that loads panel-live and activates the live element. This would be a significant differentiator -- jupyterlite-sphinx has discussed it for 6+ months without implementation.

### 6. COOP/COEP and Service Worker Challenges on Static Hosting

**Source:** [jupyterlite #1409](https://github.com/jupyterlite/jupyterlite/issues/1409), [coi-serviceworker](https://github.com/gzuidhof/coi-serviceworker), [JupyterLite migration guide](https://jupyterlite.readthedocs.io/en/stable/migration.html)

JupyterLite needs SharedArrayBuffer for file system access, which requires COOP/COEP headers. On static hosting (GitHub Pages, ReadTheDocs) where headers cannot be set directly, JupyterLite uses:

1. **Service Worker fallback:** If COOP/COEP headers are missing, a service worker provides file access (less robust)
2. **`coi-serviceworker`:** A third-party service worker that sets COOP/COEP headers at runtime by intercepting requests. The first page load triggers a reload.

JupyterLite 0.4.0+ defaults to SharedArrayBuffer when available and falls back to service worker when not.

**Relevance for panel-live:** panel-live already uses `mini-coi.js` for this purpose (the same pattern). The Sphinx extension should document this requirement clearly and provide configuration for the service worker path. For ReadTheDocs deployments, the extension should automatically include `mini-coi.js` in the build output.

### 7. Extension Conflicts and `source_suffix` Registration

**Source:** [#27](https://github.com/jupyterlite/jupyterlite-sphinx/issues/27), [#28](https://github.com/jupyterlite/jupyterlite-sphinx/pull/28)

jupyterlite-sphinx registers `.ipynb` as a `source_suffix`, which conflicts with Jupyter Book (which does the same). The fix was a defensive check:

```python
if '.ipynb' not in self.app.registry.source_suffix:
    app.add_source_suffix(".ipynb", "jupyterlite_notebook")
```

**Relevance for panel-live:** panel-live's Sphinx extension should avoid registering any source suffixes unless absolutely necessary. If it needs to handle `.py` or other files, it should check for existing registrations first.

### 8. Path Resolution is a Recurring Source of Bugs

**Source:** [#36](https://github.com/jupyterlite/jupyterlite-sphinx/issues/36), [#261](https://github.com/jupyterlite/jupyterlite-sphinx/issues/261), [#38](https://github.com/jupyterlite/jupyterlite-sphinx/issues/38)

Multiple issues stem from path resolution:
- iframe `src` URLs not working in subdirectories ([#36](https://github.com/jupyterlite/jupyterlite-sphinx/issues/36))
- `jupyterlite_contents` paths not resolved relative to `srcdir` ([#261](https://github.com/jupyterlite/jupyterlite-sphinx/issues/261)) -- glob was running with cwd instead of `app.srcdir`
- Notebook files not copied when running from outside the docs directory ([#38](https://github.com/jupyterlite/jupyterlite-sphinx/issues/38))

**Relevance for panel-live:** panel-live's Sphinx extension should use CDN URLs for assets (avoiding path resolution entirely for JS/CSS) and use `app.srcdir`-relative paths for any local content. All path resolution should happen relative to `app.srcdir`, not `os.getcwd()`.

### 9. Parallel Build Support Requires Explicit Declaration

**Source:** [#146](https://github.com/jupyterlite/jupyterlite-sphinx/issues/146)

Issue #146 requested adding `parallel_read_safe` metadata to the extension's `setup()` return value. Sphinx extensions must explicitly declare parallel build safety:

```python
def setup(app):
    # ... register directives, config values, events
    return {
        "version": __version__,
        "parallel_read_safe": True,
        "parallel_write_safe": True,
    }
```

Without this, Sphinx assumes `parallel_read_safe=False`, which disables parallel builds.

**Relevance for panel-live:** panel-live's Sphinx extension should declare `parallel_read_safe=True` and `parallel_write_safe=True` from the start. Since panel-live's directive processing is pure transformation (code to HTML), there is no shared mutable state that would make it unsafe.

### 10. Cache Busting and Configuration Loading at Runtime

**Source:** [#327](https://github.com/jupyterlite/jupyterlite-sphinx/issues/327)

SciPy reported that `try_examples.json` (a runtime configuration file) was the 4th most requested URL on their documentation site because jupyterlite-sphinx's JS adds a `?cb=` cache-busting parameter to every request. The discussion reveals tension between:
- Fresh configuration for nightly/dev docs that change frequently
- Unnecessary bandwidth for stable releases that rarely change

**Relevance for panel-live:** panel-live's Sphinx extension should use versioned CDN URLs (e.g., `cdn.holoviz.org/panel-live/v0.1.0/panel-live.js`) instead of cache-busting query parameters. Versioned URLs are inherently cacheable and change only on releases.

### 11. Mobile Device Handling

**Source:** [#140](https://github.com/jupyterlite/jupyterlite-sphinx/issues/140), [#295](https://github.com/jupyterlite/jupyterlite-sphinx/issues/295)

jupyterlite-sphinx hides interactive buttons on mobile devices (viewport <= 480px) by default. The `jupyterlite_sphinx.js` includes a cached `isMobileDevice()` detection that checks user agent and viewport dimensions.

There is ongoing debate about who controls this:
- Library-level hiding (current default) prevents bandwidth waste
- Website-author configuration ([#295](https://github.com/jupyterlite/jupyterlite-sphinx/issues/295)) gives more control
- User-level override is difficult on mobile (no easy access to dev console)

**Relevance for panel-live:** panel-live should NOT hide on mobile by default (Panel apps are designed to be responsive). However, the Sphinx extension should provide a `panel_live_mobile_mode` config option with values like `"enabled"`, `"warn"`, `"disabled"` for documentation authors to control.

### 12. Two-Phase Loading: Content vs. Runtime

**Source:** [#287](https://github.com/jupyterlite/jupyterlite-sphinx/issues/287), [#120](https://github.com/jupyterlite/jupyterlite-sphinx/issues/120)

Contributors identified two distinct loading phases:
1. **Iframe/container loading** -- the HTML structure appears (fast)
2. **Application loading** -- Pyodide, kernel, and packages download (slow, 100s of MB)

Both phases need separate loading indicators. jupyterlite-sphinx uses a custom CSS spinner for phase 1 and JupyterLite's internal loading for phase 2.

**Relevance for panel-live:** panel-live already handles this with its status indicators (`pl-status` events and loading overlay). The Sphinx extension should ensure the loading UX is smooth -- showing a static code preview immediately, then a loading indicator when the user clicks "Run", then the live output.

### 13. Directive Consolidation: From Many to One

**Source:** [#288](https://github.com/jupyterlite/jupyterlite-sphinx/issues/288)

Issue #288 proposes retiring `NotebookLite` and consolidating with `JupyterLite` using an `:app:` parameter. The rationale: "There is a bunch of shared code between both directives, for no good reason" -- the only difference is URL paths (`/lab/` vs `/notebook/`).

**Relevance for panel-live:** panel-live's `mode` attribute (`app`, `editor`, `playground`) is already the right approach -- a single element with a mode parameter. The Sphinx directive should follow the same pattern: a single `.. panel-live::` directive with `:mode:` and other options.

### 14. Local Development Requires HTTP Server, Not `file://`

**Source:** [#37](https://github.com/jupyterlite/jupyterlite-sphinx/issues/37)

WASM-based tools cannot work when opening HTML files directly via `file://` protocol. A local HTTP server is required. Users frequently report that local Sphinx builds "don't work" because they open `_build/html/index.html` directly.

**Relevance for panel-live:** panel-live's Sphinx extension documentation should prominently state that a local HTTP server with COOP/COEP headers is required for previewing. The extension could provide a convenience command (e.g., `panel-live serve-docs`) that serves the Sphinx output with correct headers, similar to panel-live's existing `serve.py`.

### 15. Version Coupling Between Python Packages and WASM Runtime

**Source:** [SciPy #19729](https://github.com/scipy/scipy/issues/19729), [#177](https://github.com/jupyterlite/jupyterlite-sphinx/issues/177)

SciPy's adoption revealed that the documented version must match the version available in Pyodide's package registry. This creates a coupling problem:
- Pyodide bundles specific versions of packages
- Documentation authors want to document their latest release
- If the latest release is not yet in Pyodide, examples break or show wrong behavior

Solutions discussed:
- Restrict interactive examples to the latest release available in Pyodide
- Build custom WASM wheels in CI and serve them alongside documentation

**Relevance for panel-live:** This is directly relevant to panel-live's version coupling design (Bokeh JS must match Bokeh Python, Panel JS must match Panel Python). The Sphinx extension should expose `panel_live_panel_version` and `panel_live_bokeh_version` config values in `conf.py`, with smart defaults that match the installed Panel version. For alpha/beta/rc releases, the extension should support pointing to custom wheel URLs.

---

## Relevance for panel-live Sphinx Extension

Based on this research, here are key architectural recommendations for panel-live's Sphinx extension:

### Recommended Architecture

```
panel_live/sphinx/
    __init__.py          # setup() function, extension registration
    directive.py         # PanelLiveDirective (single directive, multi-mode)
    config.py            # Configuration validation and defaults
    nodes.py             # Custom docutils nodes for HTML rendering
    assets.py            # Static asset injection (JS/CSS from CDN)
```

### `setup()` Function Pattern

```python
def setup(app):
    # Config values
    app.add_config_value("panel_live_version", "latest", "html")
    app.add_config_value("panel_live_panel_version", None, "html")  # auto-detect
    app.add_config_value("panel_live_bokeh_version", None, "html")  # auto-detect
    app.add_config_value("panel_live_pyodide_version", None, "html")
    app.add_config_value("panel_live_cdn_base", "https://cdn.holoviz.org/panel-live", "html")
    app.add_config_value("panel_live_auto_run", False, "html")
    app.add_config_value("panel_live_default_mode", "editor", "html")
    app.add_config_value("panel_live_theme", "auto", "html")
    app.add_config_value("panel_live_mobile_mode", "enabled", "html")

    # Directive
    app.add_directive("panel-live", PanelLiveDirective)

    # Events
    app.connect("config-inited", validate_config)
    app.connect("build-finished", inject_assets)  # copy mini-coi.js if needed

    # Static files
    app.add_css_file("panel-live.css")  # from CDN or local
    app.add_js_file("panel-live.js")    # from CDN or local

    return {
        "version": __version__,
        "parallel_read_safe": True,
        "parallel_write_safe": True,
    }
```

### Key Design Decisions Informed by jupyterlite-sphinx

1. **No subprocess at build time.** Unlike jupyterlite-sphinx's `jupyter lite build`, panel-live should inject CDN-hosted assets. Zero build overhead.

2. **Single directive, multiple modes.** `.. panel-live::` with `:mode: app|editor|playground` follows panel-live's existing HTML API pattern and avoids the directive proliferation problem.

3. **CDN-first asset loading.** Use versioned CDN URLs instead of copying assets to `_static/`. This avoids path resolution bugs and build bloat.

4. **Default to click-to-run.** On documentation pages, default `auto-run` to `false` with a "Run" button, similar to jupyterlite-sphinx's `:prompt:` pattern.

5. **Version auto-detection.** Auto-detect installed Panel/Bokeh versions and set CDN URLs accordingly. Allow explicit override for alpha/beta/rc releases.

6. **Defensive extension registration.** Check for conflicts before registering source suffixes. Declare parallel build safety.

### Comparison: panel-live vs jupyterlite-sphinx vs nbsite pyodide

| Aspect | panel-live (planned) | jupyterlite-sphinx | nbsite pyodide |
|--------|---------------------|-------------------|----------------|
| **Embedding** | Custom element (Light DOM) | iframe | inline (Light DOM) |
| **Build overhead** | None (CDN assets) | `jupyter lite build` subprocess (22-63 MiB) | Moderate (copies JS assets) |
| **Runtime** | Dedicated Worker + Pyodide | Full JupyterLite (Lab/Notebook/REPL) | Web Worker + Pyodide |
| **WASM size** | ~300-500 MB (shared worker planned) | ~300-500 MB per iframe (isolated) | ~300-500 MB |
| **Theme sync** | Native (`theme="auto"`, `prefers-color-scheme`) | iframe postMessage (fragile, [#69](https://github.com/jupyterlite/jupyterlite-sphinx/issues/69)) | Manual |
| **Modes** | `app`, `editor`, `playground` | JupyterLab, Notebook, REPL, Voici | Single mode |
| **Lazy loading** | `auto-run` attribute | `:prompt:` option | "Play" button |
| **Multi-file** | `<panel-file>` element | Full notebook support | No |
| **Directive count** | 1 planned | 5 (JupyterLite, NotebookLite, Replite, Voici, TryExamples) | 1 (`pyodide`) |
| **Parallel safe** | Yes (planned) | Added in [#146](https://github.com/jupyterlite/jupyterlite-sphinx/issues/146) | Unknown |
| **CDN support** | Yes (cdn.holoviz.org) | No (build-local) | CDN for JS |
| **Production users** | None yet | NumPy, SciPy, ipycanvas, ipyleaflet | Panel, HoloViews |

---

## New Issues / Enhancements Inspired by jupyterlite-sphinx

### N1. Sphinx Extension Should Support `autodoc` Integration

Inspired by jupyterlite-sphinx's `global_enable_try_examples` and `autodoc-process-docstring` hook. Panel-related code examples in docstrings could be automatically wrapped in `<panel-live>` elements.

### N2. Static-Then-Interactive "Render" Mode for Sphinx

Directly inspired by [#319](https://github.com/jupyterlite/jupyterlite-sphinx/issues/319). Pre-render Panel output at build time, display static HTML by default, and offer a "Make Interactive" toggle. This is the most requested pattern in the scientific Python community.

### N3. Sphinx Extension Configuration for Custom Wheel URLs

Inspired by SciPy's version coupling challenges. The Sphinx extension should support `panel_live_extra_wheels` config for serving custom or pre-release Panel/Bokeh wheels alongside documentation.

### N4. Mobile Mode Configuration for Sphinx Extension

Inspired by jupyterlite-sphinx [#295](https://github.com/jupyterlite/jupyterlite-sphinx/issues/295). Provide `panel_live_mobile_mode` configuration with `"enabled"` (default), `"warn"` (show bandwidth warning), or `"disabled"` options.

### N5. `mini-coi.js` Auto-Injection for Static Hosting

Inspired by JupyterLite's `coi-serviceworker` integration pattern ([jupyterlite #1409](https://github.com/jupyterlite/jupyterlite/issues/1409)). The Sphinx extension should optionally copy `mini-coi.js` to the build output and inject it as a `<script>` tag for deployments on GitHub Pages, ReadTheDocs, or other static hosts without COOP/COEP header control.

### N6. Convenience Serve Command for Local Preview

Inspired by jupyterlite-sphinx [#37](https://github.com/jupyterlite/jupyterlite-sphinx/issues/37). Provide a `panel-live serve-docs [build-dir]` CLI command that serves Sphinx output with COOP/COEP headers, avoiding the common "it doesn't work locally" confusion.

---

## Adjustments to Existing Issues

### P2 -- Sphinx Extension (existing)

Enrich with the following findings:

- **Architecture:** Use CDN-hosted assets instead of subprocess builds. This is the primary lesson from jupyterlite-sphinx -- their build-time approach causes noise, slowness, and large artifacts.
- **Directive design:** Single `.. panel-live::` directive with `:mode:`, `:theme:`, `:height:`, `:auto-run:`, `:code-position:` options. Avoid creating multiple directives.
- **Parallel build safety:** Declare `parallel_read_safe=True` and `parallel_write_safe=True` in `setup()` return value.
- **Extension conflicts:** Check for existing source suffix registrations before adding new ones.
- **Version configuration:** Support `panel_live_panel_version`, `panel_live_bokeh_version`, `panel_live_pyodide_version` in `conf.py` for pinning specific versions including alpha/beta/rc.
- **Testing:** Must test with both pydata-sphinx-theme and default alabaster theme. jupyterlite-sphinx's theme issues ([#69](https://github.com/jupyterlite/jupyterlite-sphinx/issues/69)) show this is a common pain point.
- **Success criterion addition:** "Produces zero additional build artifacts beyond HTML output. No subprocess invocations during build."

### P2 -- Enable "render" Mode in MkDocs (existing)

Enrich with:

- jupyterlite-sphinx [#319](https://github.com/jupyterlite/jupyterlite-sphinx/issues/319) describes the same need: "A REPL with mixed static/dynamic mode." The community wants pre-rendered content with an interactive toggle.
- jupyter-sphinx already provides build-time rendering. The gap is combining build-time rendering with runtime interactivity.
- This is the most impactful feature for adoption by scientific Python projects (NumPy, SciPy, scikit-learn all want this pattern).

### P2 -- Reproducibility and Version Pinning (existing)

Enrich with:

- SciPy's experience shows version coupling is a real production issue, not theoretical. The SciPy version being documented must match what Pyodide provides.
- jupyterlite-sphinx exposes `jupyterlite_build_command_options` for passing version-related flags. panel-live should expose equivalent `conf.py` config values.
- Support for custom wheel URLs is essential for projects documenting pre-release versions.

### P1 -- Distribution (existing)

Enrich with:

- jupyterlite-sphinx [#327](https://github.com/jupyterlite/jupyterlite-sphinx/issues/327) shows that cache-busting query parameters cause bandwidth problems at scale (SciPy's `try_examples.json` is their 4th most requested URL). Versioned CDN URLs are the correct approach.

### P3 -- Lazy Initialization via IntersectionObserver (existing)

Enrich with:

- jupyterlite-sphinx's `:prompt:` button pattern is the proven approach for documentation sites. IntersectionObserver could supplement this, but click-to-activate is the baseline expectation.
- jupyterlite-sphinx [#287](https://github.com/jupyterlite/jupyterlite-sphinx/issues/287) identifies two distinct loading phases that need separate UX treatment.

---

## Summary

| # | Finding | Priority | Action |
|---|---------|----------|--------|
| 1 | iframe embedding causes URL, theme, and storage problems | High | panel-live's Light DOM approach avoids these -- emphasize as differentiator |
| 2 | Build-time subprocess is a pain point | High | Use CDN assets, zero build overhead |
| 3 | Click-to-run is essential for doc pages | High | Default `auto-run=false` in Sphinx extension |
| 4 | TryExamples autodoc integration is a killer feature | Medium | Consider `autodoc-process-docstring` hook for Panel examples |
| 5 | Static-then-interactive mode is the most requested pattern | High | Implement `mode="render"` as priority for Sphinx adoption |
| 6 | COOP/COEP needs `mini-coi.js` on static hosting | High | Auto-inject in Sphinx build output |
| 7 | Extension conflicts happen with source_suffix registration | Medium | Defensive checks in `setup()` |
| 8 | Path resolution is a recurring bug source | Medium | Use CDN URLs, avoid local path resolution |
| 9 | Parallel build safety must be declared | Medium | Return metadata in `setup()` |
| 10 | Cache busting causes bandwidth waste at scale | Medium | Use versioned CDN URLs |
| 11 | Mobile handling needs author-level control | Low | Add `panel_live_mobile_mode` config |
| 12 | Two-phase loading needs two loading indicators | Medium | Leverage existing `pl-status` events |
| 13 | Single directive is better than many | High | Single `.. panel-live::` directive |
| 14 | Local preview requires HTTP server | Medium | Document requirement, provide convenience command |
| 15 | Version coupling is a production issue | High | Auto-detect + explicit override in `conf.py` |

---

Sources:
- [jupyterlite/jupyterlite-sphinx](https://github.com/jupyterlite/jupyterlite-sphinx)
- [jupyterlite-sphinx ReadTheDocs](https://jupyterlite-sphinx.readthedocs.io/en/latest/)
- [jupyterlite-sphinx Configuration](https://jupyterlite-sphinx.readthedocs.io/en/latest/configuration.html)
- [jupyterlite-sphinx TryExamples directive](https://jupyterlite-sphinx.readthedocs.io/en/stable/directives/try_examples.html)
- [jupyterlite-sphinx Releases](https://github.com/jupyterlite/jupyterlite-sphinx/releases)
- [SciPy interactive examples issue #19729](https://github.com/scipy/scipy/issues/19729)
- [NumPy interactive examples PR #26745](https://github.com/numpy/numpy/pull/26745)
- [Scientific Python forum: Making docstring examples interactive](https://discuss.scientific-python.org/t/making-docstring-examples-interactive/812)
- [JupyterLite SharedArrayBuffer issue #1409](https://github.com/jupyterlite/jupyterlite/issues/1409)
- [JupyterLite web components issue #794](https://github.com/jupyterlite/jupyterlite/issues/794)
- [coi-serviceworker](https://github.com/gzuidhof/coi-serviceworker)
- [nbsite pyodide extension](https://github.com/holoviz-dev/nbsite/tree/main/nbsite/pyodide)
- [Panel Sphinx docs](https://panel.holoviz.org/how_to/wasm/sphinx.html)
- [Panel issue #5766: Make it as easy as Gradiolite](https://github.com/holoviz/panel/issues/5766)
