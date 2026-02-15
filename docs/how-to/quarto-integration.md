# Quarto Integration Guide

Embed interactive Panel and Python examples in your Quarto documents using `panel-live`.

## Prerequisites

- [Quarto](https://quarto.org/) >= 1.3.0
- A web browser with WebAssembly support

## Installation

Install the extension from the panel-live repository:

```bash
quarto add panel-extensions/panel-live --subdir quarto
```

This copies the Lua filter, JS/CSS assets, and extension metadata into your project's `_extensions/` directory.

### Manual Installation

Alternatively, copy the extension files manually:

```
your-project/
  _extensions/
    panel-live/
      _extension.yml
      panel-live.lua
      panel-live.js
      panel-live-worker.js
      panel-live.css
      mini-coi.js
```

## Configuration

### Project-Level (`_quarto.yml`)

```yaml
filters:
  - panel-live

panel-live:
  pyodide-version: "v0.28.2"
  panel-version: "1.8.7"
  bokeh-version: "3.8.2"
```

JS and CSS assets are bundled with the extension — no CDN configuration is needed.

### Per-Document (YAML Front Matter)

Override versions for a specific document:

```yaml
---
title: "My Document"
panel-live:
  panel-version: "1.9.0a1"
---
```

For a working reference example, see [docs-quarto/_quarto.yml](https://github.com/panel-extensions/panel-live/blob/main/docs-quarto/_quarto.yml).

## Code Block Syntax

### Basic

Use a fenced code block with the `.panel-live` class (the dot prefix is required):

````markdown
```{.panel-live}
import panel as pn
pn.panel("Hello").servable()
```
````

The `.panel` class also works as an alias:

````markdown
```{.panel}
import panel as pn
pn.panel("Hello").servable()
```
````

### With `#|` Directives

Configure attributes using Quarto's `#|` directive syntax:

````markdown
```{.panel-live}
#| mode: editor
#| theme: dark
#| height: 500px
import panel as pn
pn.panel("Hello").servable()
```
````

### Available Attributes

| Attribute | Values | Default | Description |
|-----------|--------|---------|-------------|
| `mode` | `app`, `editor`, `playground` | `app` | Display mode |
| `theme` | `light`, `dark`, `auto` | `auto` | Color theme |
| `height` | CSS value (e.g. `500px`) | — | Fixed height |
| `layout` | `vertical`, `horizontal` | mode-dependent | Editor/preview layout |
| `auto-run` | `true`, `false` | `true` | Run code on page load |
| `label` | any string | `Python` | Language pill label |
| `code-visibility` | `visible`, `hidden`, `collapsed` | `visible` | Editor visibility |
| `code-position` | `first`, `last` | `first` | Code panel position |
| `requirements` | package names | — | Python packages to install |

## Expression Mode (No `.servable()`)

Code without `.servable()` uses the expression branch — the last expression is rendered as output:

````markdown
```{.panel-live}
#| mode: editor
#| label: Python
import matplotlib
matplotlib.use("agg")
import matplotlib.pyplot as plt

fig, ax = plt.subplots()
ax.plot([1, 2, 3], [1, 4, 9])
fig
```
````

## Version Configuration

Versions can be configured at the project level in `_quarto.yml` or per-document in YAML front matter:

```yaml
panel-live:
  pyodide-version: "v0.28.2"
  panel-version: "1.8.7"
  bokeh-version: "3.8.2"
  panel-cdn: "https://cdn.holoviz.org/panel/"
  bokeh-cdn: "https://cdn.bokeh.org/bokeh/release/"
```

## Cross-Origin Headers (COOP/COEP)

Pyodide requires `SharedArrayBuffer`, which needs these HTTP headers:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

See the [MkDocs Integration Guide](mkdocs-integration.md#cross-origin-headers-coopcoep) for details on configuring headers for various hosting providers, including the mini-coi service worker approach.

## Migration from holoviz-quarto

If you're migrating from [holoviz-quarto](https://github.com/awesome-panel/holoviz-quarto):

### Step 1: Install panel-live Extension

```bash
quarto add panel-extensions/panel-live --subdir quarto
```

### Step 2: Update `_quarto.yml`

```yaml
# Before (holoviz-quarto)
filters:
  - holoviz-quarto

# After (panel-live)
filters:
  - panel-live

panel-live:
  pyodide-version: "v0.28.2"
  panel-version: "1.8.7"
  bokeh-version: "3.8.2"
```

### Step 3: Update Code Blocks

```markdown
<!-- Before -->
```{.holoviz}
import panel as pn
pn.panel("Hello").servable()
```

<!-- After -->
```{.panel-live}
import panel as pn
pn.panel("Hello").servable()
```
```

## Non-HTML Output

For non-HTML output formats (PDF, DOCX, etc.), the filter passes through the original code block without transformation.

## Troubleshooting

### "SharedArrayBuffer is not defined"

Missing COOP/COEP headers. See the [Cross-Origin Headers](#cross-origin-headers-coopcoep) section.

### Code blocks render as plain code

Ensure the filter is listed in `_quarto.yml` and the extension is properly installed in `_extensions/panel-live/`. Use the dot-prefix syntax `{.panel-live}` — without the dot, Quarto treats the code block as a computational cell for an unknown engine instead of passing it to the Lua filter.

### Extension not found

Check that `_extensions/panel-live/panel-live.lua` and `_extensions/panel-live/_extension.yml` exist in your project directory.
