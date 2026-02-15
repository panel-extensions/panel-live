# Getting Started with Sphinx

This tutorial walks you through creating a Sphinx documentation site with interactive panel-live examples. By the end, you'll have a working Sphinx site where readers can view and edit live Python code in the browser.

## What you'll build

A Sphinx documentation site with interactive Panel examples that run directly in the browser via Pyodide — no backend server required.

## Prerequisites

- Python 3.12+
- [uv](https://docs.astral.sh/uv/) (recommended) or pip

## Step 1: Create a project

!!! warning "Pre-release"

    panel-live is not yet published to PyPI or CDN. The install command and asset URLs below
    use the GitHub repository and GitHub Pages. Once released, these will change to
    `pip install panel-live` and `cdn.holoviz.org` URLs respectively.

```bash
mkdir my-sphinx-docs && cd my-sphinx-docs
uv init
uv add sphinx pydata-sphinx-theme
uv pip install git+https://github.com/panel-extensions/panel-live.git
```

## Step 2: Scaffold the Sphinx site

```bash
uv run sphinx-quickstart --project "My Docs" --author "Me" -q .
```

This creates the standard Sphinx layout: `conf.py`, `index.rst`, a `Makefile`, and `_build/`/`_static/`/`_templates/` directories.

## Step 3: Configure panel-live

Edit `conf.py` to add the panel-live extension and switch to the pydata theme:

```python
project = "My Docs"
extensions = ["panel_live.sphinx"]

html_theme = "pydata_sphinx_theme"

exclude_patterns = ["_build", ".venv"]

panel_live_conf = {
    # CDN assets
    "panel_live_js": "https://panel-extensions.github.io/panel-live/assets/js/panel-live.js",
    "panel_live_css": "https://panel-extensions.github.io/panel-live/assets/css/panel-live.css",

    # mini-coi.js for SharedArrayBuffer support (see note below)
    "mini_coi": True,

    # Runtime versions
    "pyodide_version": "v0.28.2",
    "panel_version": "1.8.7",
    "bokeh_version": "3.8.2",

    # Default mode for all directives
    "default_mode": "editor",
}
```

!!! note "What is mini-coi.js?"

    `"mini_coi": True` injects a small service worker that adds `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` HTTP headers at runtime. These headers enable `SharedArrayBuffer`, which some Panel features require. This is especially useful when deploying to static hosts (GitHub Pages, Read the Docs) where you cannot set server headers directly.

!!! note "Local assets"

    The config above loads panel-live JS/CSS from CDN. To serve assets locally instead, copy them to `_static/` and use relative paths:

    ```python
    panel_live_conf = {
        "panel_live_js": "_static/panel-live.js",
        "panel_live_css": "_static/panel-live.css",
        ...
    }
    ```

## Step 4: Create a page with a live example

Replace `index.rst` with:

```rst
Welcome
=======

This page has interactive Python examples that run in your browser.

Interactive Slider
------------------

.. panel-live::

   import panel as pn

   slider = pn.widgets.IntSlider(name="Value", start=0, end=100, value=50)
   output = pn.pane.Markdown(pn.bind(lambda v: f"## Value: {v}", slider))
   pn.Column(slider, output).servable()
```

## Step 5: Build and serve

```bash
uv run sphinx-build -b html . _build
uv run python -m http.server -d _build 8001
```

Open `http://localhost:8001`. You'll see your documentation page with an interactive slider app.

## Step 6: Add more examples

Add different modes to your `index.rst`:

```rst
App Mode (Output Only)
----------------------

.. panel-live::
   :mode: app

   import panel as pn

   name = pn.widgets.TextInput(name="Name", value="World")
   pn.Column(name, pn.bind(lambda n: f"# Hello, {n}!", name)).servable()


Playground Mode (Side-by-Side)
------------------------------

.. panel-live::
   :mode: playground

   import panel as pn

   slider = pn.widgets.FloatSlider(name="Temperature", start=0, end=100, step=0.1, value=37.0)
   pn.Column(slider, pn.bind(lambda v: f"## {v:.1f} C", slider)).servable()
```

## Step 7: Enable pre-rendering

Pre-rendering executes code at build time and embeds static output, so readers see content immediately before Pyodide loads. It's enabled by default when `pre_render: True` is set in `panel_live_conf`.

To disable for a specific directive:

```rst
.. panel-live::
   :pre-render: false

   import panel as pn
   pn.panel("This won't be pre-rendered").servable()
```

## Next steps

- [Sphinx Integration Guide](../how-to/sphinx-integration.md) — full configuration reference
- [Migration from nbsite.pyodide](../how-to/sphinx-integration.md#migration-from-nbsitepyodide) — drop-in replacement guide
- [Pre-Rendering](../explanation/pre-rendering.md) — how build-time rendering works
- [Examples](../examples.md) — explore interactive examples
