# Getting Started with MkDocs

This tutorial walks you through creating an MkDocs documentation site with interactive panel-live examples. By the end, you'll have a working docs site where readers can view and edit live Python code in the browser.

## What you'll build

A documentation site with interactive Panel examples that run directly in the browser via Pyodide — no backend server required.

## Prerequisites

- Python 3.10+
- [uv](https://docs.astral.sh/uv/) (recommended) or pip

## Step 1: Create a project

```bash
mkdir my-docs && cd my-docs
uv init
uv add mkdocs-material panel-live
```

## Step 2: Scaffold the MkDocs site

```bash
uv run mkdocs new .
```

This creates the standard MkDocs layout: `mkdocs.yml` and a `docs/` directory with an `index.md` page.

## Step 3: Configure panel-live

Edit `mkdocs.yml` to add the panel-live custom fence and CDN assets:

```yaml
site_name: My Docs
theme:
  name: material

markdown_extensions:
  - pymdownx.superfences:
      custom_fences:
        - name: panel
          class: panel-live
          validator: !!python/name:panel_live.fences.validator
          format: !!python/name:panel_live.fences.formatter

extra_javascript:
  - https://cdn.holoviz.org/panel-live/latest/panel-live.js
extra_css:
  - https://cdn.holoviz.org/panel-live/latest/panel-live.css
```

!!! tip "Alternative fence names"

    The `name` field in the custom fence config determines which Markdown fence identifier triggers panel-live. You can use any name you prefer:

    - `name: panel` — use `` ```panel `` fences (default, recommended)
    - `name: python` — use `` ```python `` fences (replaces standard Python syntax highlighting)
    - `name: panel-live` — use `` ```panel-live `` fences

    Just change the `name` value in the config above.

!!! note "Local assets and SharedArrayBuffer"

    The config above loads panel-live JS/CSS from CDN. To serve assets locally instead, download them to `docs/assets/` and reference them as relative paths in `mkdocs.yml`:

    ```yaml
    extra_javascript:
      - assets/js/panel-live.js
    extra_css:
      - assets/css/panel-live.css
    ```

    Some Panel features require `SharedArrayBuffer`, which needs `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` HTTP headers. For local development, panel-live includes a `mini-coi.js` service worker that injects these headers at runtime. Add it as the **first** entry in `extra_javascript`:

    ```yaml
    extra_javascript:
      - assets/js/mini-coi.js
      - assets/js/panel-live.js
    ```

    See the [MkDocs Integration Guide](../how-to/mkdocs-integration.md) for the full configuration reference.

## Step 4: Create a page with a live example

Replace `docs/index.md` with:

````markdown
# Welcome

This page has an interactive Python example that runs in your browser.

## Interactive Slider

```panel
import panel as pn

slider = pn.widgets.IntSlider(name="Value", start=0, end=100, value=50)
output = pn.pane.Markdown(pn.bind(lambda v: f"## Value: {v}", slider))
pn.Column(slider, output).servable()
```
````

## Step 5: Serve the site

```bash
uv run mkdocs serve
```

Open `http://localhost:8000`. You'll see your documentation page with an interactive slider app that runs entirely in the browser.

## Step 6: Add an editor example

Users can also edit and re-run code. Add an editor-mode example to `docs/index.md`:

````markdown
## Editable Example

```{.panel mode="editor"}
import panel as pn

name = pn.widgets.TextInput(name="Name", value="World")
pn.Column(name, pn.bind(lambda n: f"# Hello, {n}!", name)).servable()
```
````

Now readers can modify the Python code and press **Run** to see their changes.

## Step 7: Add an expression example

For quick visualizations without `.servable()`, the last expression is displayed:

````markdown
## Matplotlib Plot

```{.panel mode="editor" label="Python"}
import matplotlib
matplotlib.use("agg")
import matplotlib.pyplot as plt

fig, ax = plt.subplots()
ax.plot([1, 2, 3, 4], [1, 4, 2, 3])
ax.set_title("My Plot")
fig
```
````

## Step 8: Build for deployment

```bash
uv run mkdocs build
```

The `site/` directory contains a static site ready to deploy to any hosting provider.

## Next steps

- [MkDocs Integration Guide](../how-to/mkdocs-integration.md) — full configuration reference
- [Display Modes](../how-to/mode.md) — app, editor, and playground modes
- [Examples](../examples.md) — explore interactive examples
