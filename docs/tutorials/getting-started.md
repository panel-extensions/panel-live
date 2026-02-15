# Getting Started

This tutorial walks you through building your first interactive Python page with panel-live. By the end, you'll have a working HTML page that runs Python directly in the browser — no server required.

## What you'll build

A simple interactive page with a Panel slider widget that updates text in real time, all running in the browser via Pyodide.

## Prerequisites

- A text editor
- A web browser (Chrome, Firefox, Edge, or Safari)
- A local HTTP server (Python's built-in server works)

## Step 1: Create an HTML file

!!! warning "Pre-release"

    panel-live is not yet published to PyPI or CDN. The asset URLs below use GitHub Pages.
    Once released, these will change to `cdn.holoviz.org` URLs.

Create a new file called `index.html` with the basic HTML structure and panel-live loaded from GitHub Pages:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My First panel-live Page</title>
  <link rel="stylesheet" href="https://panel-extensions.github.io/panel-live/assets/css/panel-live.css">
  <script src="https://panel-extensions.github.io/panel-live/assets/js/panel-live.js"></script>
</head>
<body>
  <h1>My First panel-live Page</h1>
</body>
</html>
```

## Step 2: Add a `<panel-live>` element

Add a `<panel-live>` element with inline Python code. The code uses Panel to create a simple slider:

```html
<panel-live mode="app">
import panel as pn
pn.extension(sizing_mode="stretch_width")

slider = pn.widgets.FloatSlider(name="Value", start=0, end=10, step=0.1, value=5.0)

pn.Column(
    "# Hello panel-live!",
    slider,
    pn.bind(lambda v: f"**Current value:** {v:.1f}", slider),
).servable()
</panel-live>
```

Your full `index.html` should now look like:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My First panel-live Page</title>
  <link rel="stylesheet" href="https://panel-extensions.github.io/panel-live/assets/css/panel-live.css">
  <script src="https://panel-extensions.github.io/panel-live/assets/js/panel-live.js"></script>
</head>
<body>
  <h1>My First panel-live Page</h1>

  <panel-live mode="app">
import panel as pn
pn.extension(sizing_mode="stretch_width")

slider = pn.widgets.FloatSlider(name="Value", start=0, end=10, step=0.1, value=5.0)

pn.Column(
    "# Hello panel-live!",
    slider,
    pn.bind(lambda v: f"**Current value:** {v:.1f}", slider),
).servable()
  </panel-live>
</body>
</html>
```

## Step 3: Serve the page

Pyodide requires HTTP (not `file://`) and cross-origin isolation headers for best performance. Start a local server:

```bash
python -m http.server 8000
```

Open `http://localhost:8000` in your browser. You'll see a loading spinner while Pyodide initializes (5-15 seconds on first load), then your interactive slider app.

!!! note "Cross-origin isolation"
    For full performance, add `mini-coi.js` to enable SharedArrayBuffer support. Download it from [mini-coi](https://github.com/nicholasmckinney/nicholasmckinney.github.io/tree/main/nicholasmckinney.github.io-main/nicholasmckinney.github.io-main/nicholasmckinney.github.io) and place it in your project root. Alternatively, configure your server to send `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers.

## Step 4: Switch to editor mode

Change `mode="app"` to `mode="editor"` so users can edit the code and re-run it:

```html
<panel-live mode="editor">
...
</panel-live>
```

Now the code is visible and editable. Users can modify the Python code and press **Run** to see their changes.

## Step 5: Add requirements

If your code uses packages beyond Panel (which is included by default), declare them with `<panel-requirements>`:

```html
<panel-live mode="editor">
  <panel-requirements>
numpy
  </panel-requirements>
import numpy as np
import panel as pn
pn.extension(sizing_mode="stretch_width")

arr = np.random.randn(100)
pn.pane.Markdown(f"**Mean:** {arr.mean():.3f}, **Std:** {arr.std():.3f}").servable()
</panel-live>
```

## Step 6: Add a second file

For multi-file apps, use `<panel-file>` child elements:

```html
<panel-live mode="editor">
  <panel-file name="helpers.py">
def greet(name):
    return f"Hello, {name}!"
  </panel-file>
  <panel-file name="app.py" entrypoint>
import panel as pn
from helpers import greet
pn.extension(sizing_mode="stretch_width")

name = pn.widgets.TextInput(name="Name", value="World")
pn.Column(pn.bind(lambda n: greet(n), name)).servable()
  </panel-file>
</panel-live>
```

The `entrypoint` attribute marks which file is executed. Other files are written to Pyodide's virtual filesystem and can be imported normally.

## Next steps

- [Examples](../examples.md) — explore interactive examples across all categories
- [How-to Guides](../how-to/mode.md) — per-attribute guides with live examples
- [Reference](../reference/html-api.md) — complete HTML, JavaScript, CSS, and Events API
- [MkDocs Integration](../how-to/mkdocs-integration.md) — embed panel-live in your documentation site
