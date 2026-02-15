# Getting Started with Quarto

This tutorial walks you through creating a Quarto site with interactive panel-live examples. By the end, you'll have a working Quarto site where readers can view and edit live Python code in the browser.

## What you'll build

A Quarto website with interactive Panel examples that run directly in the browser via Pyodide — no backend server required.

## Prerequisites

- [Quarto](https://quarto.org/) >= 1.3.0

## Step 1: Create a project

```bash
mkdir my-quarto-docs && cd my-quarto-docs
```

## Step 2: Install the extension

```bash
quarto add panel-extensions/panel-live --subdir quarto
```

This copies the Lua filter, JS/CSS assets, and extension metadata into `_extensions/panel-live/`.

## Step 3: Configure Quarto

Create `_quarto.yml`:

```yaml
project:
  type: website
  output-dir: _site

website:
  title: "My Docs"

format:
  html:
    theme: cosmo

filters:
  - panel-live

panel-live:
  pyodide-version: "v0.28.2"
  panel-version: "1.8.7"
  bokeh-version: "3.8.2"
```

!!! note "SharedArrayBuffer support"

    The panel-live Quarto extension bundles `mini-coi.js` and injects it automatically. This service worker adds `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers at runtime, enabling `SharedArrayBuffer` for Panel features that require it. No additional configuration is needed.

!!! note "Local assets"

    The extension bundles all JS/CSS assets — no CDN is needed by default. The Lua filter loads them from the `_extensions/panel-live/` directory. If you build panel-live from source and want to use a custom build, replace the JS/CSS files in `_extensions/panel-live/` with your own.

## Step 4: Create a page with a live example

Create `index.qmd`:

````markdown
---
title: "Welcome"
---

This page has interactive Python examples that run in your browser.

## Interactive Slider

```{.panel-live}
#| mode: editor
import panel as pn

slider = pn.widgets.IntSlider(name="Value", start=0, end=100, value=50)
output = pn.pane.Markdown(pn.bind(lambda v: f"## Value: {v}", slider))
pn.Column(slider, output).servable()
```
````

## Step 5: Preview the site

```bash
quarto preview
```

Open the URL shown in the terminal. You'll see your documentation page with an interactive slider app that runs entirely in the browser.

## Step 6: Add more examples

Add different modes to `index.qmd`:

````markdown
## App Mode (Output Only)

```{.panel-live}
#| mode: app
import panel as pn

name = pn.widgets.TextInput(name="Name", value="World")
pn.Column(name, pn.bind(lambda n: f"# Hello, {n}!", name)).servable()
```

## Playground Mode (Side-by-Side)

```{.panel-live}
#| mode: playground
import panel as pn

slider = pn.widgets.FloatSlider(name="Temperature", start=0, end=100, step=0.1, value=37.0)
pn.Column(slider, pn.bind(lambda v: f"## {v:.1f} C", slider)).servable()
```
````

## Step 7: Add requirements

If your code uses packages beyond Panel, declare them with the `requirements` directive:

````markdown
## With Extra Packages

```{.panel-live}
#| mode: editor
#| requirements: numpy
import numpy as np
import panel as pn

arr = np.random.randn(100)
pn.pane.Markdown(f"**Mean:** {arr.mean():.3f}, **Std:** {arr.std():.3f}").servable()
```
````

## Step 8: Build for deployment

```bash
quarto render
```

The `_site/` directory contains a static site ready to deploy to any hosting provider.

## Next steps

- [Quarto Integration Guide](../how-to/quarto-integration.md) — full configuration reference
- [Migration from holoviz-quarto](../how-to/quarto-integration.md#migration-from-holoviz-quarto) — drop-in replacement guide
- [Examples](../examples.md) — explore interactive examples
