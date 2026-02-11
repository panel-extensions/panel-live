# MkDocs Integration Guide

Embed interactive Panel and Python examples in your MkDocs documentation using `panel-live`.

## Prerequisites

- Python 3.10+
- MkDocs with [Material for MkDocs](https://squidfundamentals.com/mkdocs-material/) theme (recommended)
- [`pymdownx.superfences`](https://facelessuser.github.io/pymdown-extensions/extensions/superfences/) extension

## Installation

```bash
pip install panel-live
```

## Configuration

For a working reference example checkout [panel-extensions/panel-live/zensical.toml](https://github.com/panel-extensions/panel-live/blob/main/zensical.toml).

### Configure a Custom Fence

Add the custom fence to your `mkdocs.yml`:

```yaml
markdown_extensions:
  - pymdownx.superfences:
      custom_fences:
        - name: panel
          class: panel-live
          validator: !!python/name:panel_live.fences.validator
          format: !!python/name:panel_live.fences.formatter
```

Or if using [zensical](https://github.com/zensical/zensical) (TOML-based MkDocs config):

```toml
[project.markdown_extensions.pymdownx.superfences]
custom_fences = [
  { name = "panel", class = "panel-live", validator = "panel_live.fences.validator", format = "panel_live.fences.formatter" }
]
```

### Loading the Web Component

Add the panel-live JavaScript and CSS to your site. You can use the CDN:

```yaml
extra_javascript:
  - https://cdn.holoviz.org/panel-live/latest/panel-live.js
extra_css:
  - https://cdn.holoviz.org/panel-live/latest/panel-live.css
```

Or copy the files locally (recommended for reproducibility):

```yaml
extra_javascript:
  - assets/js/panel-live.js
extra_css:
  - assets/css/panel-live.css
```

## Fence Syntax

### Basic

Use a fenced code block with the `panel` language identifier:

````markdown
```panel
import panel as pn
pn.panel("Hello").servable()
```
````

### With Attributes

Use the `{.panel ...}` syntax to pass attributes:

````markdown
```{.panel mode="editor" theme="dark" height="500px"}
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

## Expression Mode (No `.servable()`)

Code without `.servable()` uses the expression branch — the last expression is rendered as output. This works with any displayable Python object:

````markdown
```{.panel mode="editor" label="Python"}
import matplotlib
matplotlib.use("agg")
import matplotlib.pyplot as plt
import numpy as np

fig, ax = plt.subplots()
ax.plot([1, 2, 3], [1, 4, 9])
fig
```
````

## Cross-Origin Headers (COOP/COEP)

Pyodide requires `SharedArrayBuffer`, which needs these HTTP headers:

```bash
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

### Local Development

The panel-live dev server (`pixi run serve` or `python serve.py`) adds these headers automatically.

### GitHub Pages

GitHub Pages does **not** support custom headers. Workarounds:

1. **Service Worker approach** — Use [coi-serviceworker](https://github.com/nicolo-ribaudo/coi-serviceworker) to enable COOP/COEP via a service worker
2. **Cloudflare Pages** — Supports custom headers via `_headers` file

### Netlify

Add a `_headers` file to your docs directory:

```bash
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
```

### Other Hosts

Most hosting providers support custom headers via configuration files or server settings. Consult your provider's documentation.

### mini-coi (No Server Configuration Required)

If you cannot configure COOP/COEP headers on your hosting provider (e.g., GitHub Pages), [mini-coi](https://github.com/WebReflection/mini-coi) provides `SharedArrayBuffer` support via a lightweight service worker:

1. Download `mini-coi.js` to your docs directory
2. Add it to `mkdocs.yml` **before** panel-live.js:

   ```yaml
   extra_javascript:
     - mini-coi.js
     - https://cdn.holoviz.org/panel-live/latest/panel-live.js
   ```

mini-coi registers a service worker that adds COOP/COEP headers transparently. This avoids the need for server-side configuration and works on any static hosting provider.

**When to use mini-coi:**

- GitHub Pages (no custom header support)
- Static hosting without server configuration access
- Quick local testing without `serve.py`

**Note:** If you control the server, native HTTP headers (see above) are preferred as they are more robust and don't require JavaScript.

## Troubleshooting

### "SharedArrayBuffer is not defined"

Missing COOP/COEP headers. See the [Cross-Origin Headers](#cross-origin-headers-coopcoep) section.

### Code blocks render as plain text

Ensure `pymdownx.superfences` is configured with the custom fence and that `panel-live.js` is loaded on the page.

### Pyodide fails to load

Check browser console for errors. Common causes:

- Ad blockers or tracking prevention blocking CDN resources
- Corporate proxy blocking WebAssembly downloads
- Outdated browser without WebAssembly support

### Multiple panel-live blocks on one page

All blocks share a single Pyodide runtime. The first block to initialize loads Pyodide; subsequent blocks reuse it. Execution is serialized (one at a time) to avoid conflicts.
