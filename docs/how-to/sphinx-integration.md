# Sphinx Integration Guide

Embed interactive Panel and Python examples in your Sphinx documentation using `panel-live`.

## Prerequisites

- Python 3.12+
- Sphinx >= 4.0
- A Sphinx theme (e.g., [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/))

## Installation

```bash
pip install "panel-live[sphinx]"
```

This installs `panel-live` with Sphinx dependencies (`sphinx`, `docutils`, `portalocker`).

## Configuration

Add `panel_live.sphinx` to your Sphinx `conf.py`:

```python
extensions = ["panel_live.sphinx"]

panel_live_conf = {
    # CDN assets (default — works in production)
    "panel_live_js": "https://cdn.jsdelivr.net/npm/panel-live@latest/dist/panel-live.js",
    "panel_live_css": "https://cdn.jsdelivr.net/npm/panel-live@latest/dist/panel-live.css",

    # mini-coi.js for COOP/COEP headers (Pyodide SharedArrayBuffer)
    "mini_coi": True,  # default: copies bundled mini-coi.js to build root

    # Runtime versions
    "pyodide_version": "v0.28.2",
    "panel_version": "1.8.7",
    "bokeh_version": "3.8.2",

    # Pre-rendering (builds static output at Sphinx build time)
    "pre_render": True,

    # Default mode for all directives
    "default_mode": "editor",
}
```

For a working reference example, see [docs-sphinx/conf.py](https://github.com/panel-extensions/panel-live/blob/main/docs-sphinx/conf.py).

### Local Assets

By default, JS and CSS are loaded from the CDN. For local development or self-hosting, copy the built assets into your project's `_static/` directory and use relative paths:

```python
html_static_path = ["_static"]

panel_live_conf = {
    "panel_live_js": "_static/panel-live.js",
    "panel_live_css": "_static/panel-live.css",
}
```

Relative `_static/` paths are automatically resolved by Sphinx — nested pages get correct `../` prefixes.

### Directive Name Configuration

The `directive_name` setting controls which RST directive is registered. This enables backward compatibility with other documentation systems:

```python
# Default: registers .. panel-live:: directive
panel_live_conf = {"directive_name": "panel-live"}

# For Panel docs: registers .. pyodide:: directive (drop-in for nbsite)
panel_live_conf = {"directive_name": "pyodide"}

# Generic: registers .. python:: directive
panel_live_conf = {"directive_name": "python"}
```

Only one directive name is registered per build.

## Directive Syntax

### Basic

```rst
.. panel-live::

   import panel as pn
   pn.panel("Hello").servable()
```

### With Options

```rst
.. panel-live::
   :mode: editor
   :theme: dark
   :height: 500px

   import panel as pn
   pn.panel("Hello").servable()
```

### Available Attributes

| Attribute | Values | Default | Description |
|-----------|--------|---------|-------------|
| `mode` | `app`, `editor`, `playground` | `editor` | Display mode |
| `theme` | `light`, `dark`, `auto` | `auto` | Color theme |
| `height` | CSS value (e.g. `500px`) | — | Fixed height |
| `layout` | `vertical`, `horizontal` | mode-dependent | Editor/preview layout |
| `auto-run` | `true`, `false` | `true` | Run code on page load |
| `label` | any string | `Python` | Language pill label |
| `code-visibility` | `visible`, `hidden`, `collapsed` | `visible` | Editor visibility |
| `code-position` | `first`, `last` | `first` | Code panel position |
| `requirements` | package names | — | Python packages to install |
| `pre-render` | `true`, `false` | from conf | Per-directive pre-render override |

## Expression Mode (No `.servable()`)

Code without `.servable()` uses the expression branch — the last expression is rendered as output:

```rst
.. panel-live::
   :mode: editor
   :label: Python

   import matplotlib
   matplotlib.use("agg")
   import matplotlib.pyplot as plt

   fig, ax = plt.subplots()
   ax.plot([1, 2, 3], [1, 4, 9])
   fig
```

## Pre-Rendering

When `pre_render` is enabled (default), panel-live executes code at Sphinx build time and embeds the output as static HTML. This provides instant output before Pyodide loads, SEO-friendly content, and a fallback for browsers without WebAssembly.

For a detailed explanation of the pipeline, caching, and limitations, see [Pre-Rendering](../explanation/pre-rendering.md).

### Cache Directory

Pre-rendered output is cached in `.panel-live/` inside your source directory. Add this to `.gitignore`:

```
.panel-live/
```

### Skipping Pre-Render

Use the `:pre-render: false` option to skip pre-rendering for a specific directive:

```rst
.. panel-live::
   :pre-render: false

   import panel as pn
   pn.panel("This won't be pre-rendered").servable()
```

## Cross-Origin Headers (COOP/COEP)

Pyodide requires `SharedArrayBuffer`, which needs COOP/COEP headers.

### mini-coi.js (default)

The extension bundles `mini-coi.js` — a service worker that intercepts fetch requests and injects COOP/COEP headers. This is enabled by default (`"mini_coi": True`). No server configuration needed.

The service worker is automatically:
- Copied to the build root at build time
- Injected into pages that use `panel-live` directives

To disable (e.g., if your server already provides COOP/COEP headers):

```python
panel_live_conf = {
    "mini_coi": False,
}
```

### Server-level headers

For production, server-level headers are preferred over the service worker approach:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
```

See the [MkDocs Integration Guide](mkdocs-integration.md#cross-origin-headers-coopcoep) for details on configuring headers for various hosting providers.

## Version Configuration

### Specifying Versions

All versions are configurable in `panel_live_conf`:

```python
panel_live_conf = {
    "pyodide_version": "v0.28.2",
    "panel_version": "1.8.7",
    "bokeh_version": "3.8.2",
}
```

### Pre-Release Versions

For alpha, beta, or RC versions of Panel and Bokeh, override the CDN URLs:

```python
panel_live_conf = {
    "panel_version": "1.9.0a1",
    "bokeh_version": "3.9.0rc1",
    "panel_cdn": "https://cdn.holoviz.org/panel/",
    "bokeh_cdn": "https://cdn.bokeh.org/bokeh/release/",
}
```

## Migration from nbsite.pyodide

If you're migrating from `nbsite.pyodide`, the process is straightforward:

### Step 1: Change the Extension

```python
# Before (nbsite)
extensions = ["nbsite.pyodide"]

# After (panel-live)
extensions = ["panel_live.sphinx"]
```

### Step 2: Update Configuration

```python
# Before (nbsite)
nbsite_pyodide_conf = {
    "PYODIDE_URL": "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js",
    "requirements": ["panel", "pandas"],
    "setup_code": "",
}

# After (panel-live)
panel_live_conf = {
    "directive_name": "pyodide",  # Keep using .. pyodide:: directive
    "pyodide_version": "v0.28.2",
    "panel_version": "1.8.7",
    "bokeh_version": "3.8.2",
    "requirements": ["panel", "pandas"],
    "setup_code": "",
    "pre_render": True,
}
```

### Step 3: No RST Changes Needed

By setting `directive_name` to `"pyodide"`, your existing `.. pyodide::` directives work without any changes.

## Troubleshooting

### "SharedArrayBuffer is not defined"

Missing COOP/COEP headers. See the [Cross-Origin Headers](#cross-origin-headers-coopcoep) section.

### Pre-render fails

Ensure `panel` and `bokeh` are installed in the build environment. Pre-rendering requires the same packages your code imports.

### Directive not found

Check that `panel_live.sphinx` is in your `extensions` list and that `panel-live` is installed.

### Slow builds

Pre-rendering executes code in subprocesses. For faster builds:
- Disable with `"pre_render": False`
- Use `:pre-render: false` on individual directives
- The cache in `.panel-live/` speeds up rebuilds when code hasn't changed
