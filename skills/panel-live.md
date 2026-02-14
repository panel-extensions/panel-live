# panel-live

panel-live is a web component (`<panel-live>`) that runs Panel/Python code live in the browser via Pyodide (WASM). No server required.

## Quick start

### Standalone HTML

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://cdn.holoviz.org/panel-live/latest/panel-live.css">
  <script src="https://cdn.holoviz.org/panel-live/latest/panel-live.js"></script>
</head>
<body>
  <panel-live mode="editor">
import panel as pn
pn.extension(sizing_mode="stretch_width")

slider = pn.widgets.FloatSlider(name="Value", start=0, end=10, value=5)
pn.Column(slider, pn.bind(lambda v: f"Value: {v:.1f}", slider)).servable()
  </panel-live>
</body>
</html>
```

### MkDocs fence syntax

````markdown
```panel
import panel as pn
pn.panel("Hello").servable()
```
````

With attributes:
````markdown
```{.panel mode="editor" theme="dark" height="500px"}
import panel as pn
pn.panel("Hello").servable()
```
````

## Three modes

### `mode="app"` (default)
Output only. No editor visible.

### `mode="editor"`
Code editor + output. Users can edit and re-run.

### `mode="playground"`
Side-by-side editor and preview. Supports example selector via `<panel-example>`.

## HTML attributes

| Attribute | Values | Default | Description |
|-----------|--------|---------|-------------|
| `mode` | `app`, `editor`, `playground` | `app` | Display mode |
| `theme` | `auto`, `light`, `dark` | `auto` | Color theme |
| `layout` | `horizontal`, `vertical`, `auto` | `auto` | Editor/output arrangement |
| `height` | CSS value (e.g. `500px`) | auto | Fixed height |
| `label` | string | `Python` | Language pill text |
| `code-visibility` | `visible`, `collapsed` | `visible` | Initial code panel state |
| `code-position` | `first`, `last` | `first` | Code panel position relative to output |
| `auto-run` | `true`, `false` | `true` | Auto-execute on load |
| `src` | URL | — | Fetch code from external URL |
| `fullscreen` | boolean attribute | — | Enable fullscreen mode |

## Child elements

### `<panel-file>`
Multi-file support. Attributes: `name` (filename), `entrypoint` (boolean), `src` (URL).

```html
<panel-live mode="editor">
  <panel-file name="helpers.py">
def greet(name):
    return f"Hello, {name}!"
  </panel-file>
  <panel-file name="app.py" entrypoint>
from helpers import greet
import panel as pn
pn.panel(greet("World")).servable()
  </panel-file>
</panel-live>
```

### `<panel-requirements>`
Explicit pip package requirements.

```html
<panel-live>
  <panel-requirements>
numpy
pandas
  </panel-requirements>
import numpy as np
import pandas as pd
...
</panel-live>
```

### `<panel-example>`
Example selector for playground mode. Attributes: `name`, `src`.

```html
<panel-live mode="playground">
  <panel-example name="Slider">
import panel as pn
pn.widgets.FloatSlider(name="Value").servable()
  </panel-example>
  <panel-example name="Button">
import panel as pn
pn.widgets.Button(name="Click").servable()
  </panel-example>
</panel-live>
```

## JavaScript API

### `PanelLive.configure(options)`
Set global defaults. Call before any `<panel-live>` elements load.

```javascript
PanelLive.configure({
  panelVersion: '1.8.7',
  bokehVersion: '3.8.2',
  pyodideVersion: 'v0.28.2',
  styleNonce: 'abc123',  // CSP nonce for dynamic styles
  packageAliases: { 'duckdb': 'https://example.com/duckdb.whl' },  // map package names to wheel URLs
});
```

### `PanelLive.mount(options, target)`
Programmatically create a panel-live element.

```javascript
const ctrl = await PanelLive.mount({
  mode: 'editor',
  code: 'import panel as pn\npn.panel("Hello").servable()',
  requirements: ['numpy'],
}, '#container');
```

### `PanelLiveController`
Returned by `mount()`. Methods: `run()`, `getCode()`, `setCode(code)`, `destroy()`. Property: `status`.

## Constraints

- **No `.show()`** — use `.servable()` instead
- **No `plt.show()`** — return `fig` as the last expression
- **Expression mode** — if no `.servable()`, the last expression is rendered
- **matplotlib** — always use `matplotlib.use("agg")` before importing pyplot
- **COOP/COEP** — add `mini-coi.js` or server headers for SharedArrayBuffer
- **2GB memory limit** — WebAssembly hard ceiling
- **No threads/subprocesses** — WebAssembly limitation

## Architecture

- **Dedicated Worker** — Pyodide runs in a Web Worker, keeping the main thread responsive
- **Singleton bridge** — `worker-bridge.js` manages worker communication
- **Three execution branches** — servable (Panel apps), servable-target, expression (last expr)
- **Bidirectional sync** — JSON patches between main thread Bokeh doc and worker Python doc
- **esbuild** — bundles `lib/` ES modules into `dist/panel-live.js` + `dist/panel-live-worker.js` + `dist/panel-live.css`
