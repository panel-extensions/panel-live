# HTML API Reference

Complete reference for the `<panel-live>` custom element's declarative HTML API.

## `<panel-live>` Attributes

| Attribute | Default | Values | Description |
|-----------|---------|--------|-------------|
| `mode` | `"app"` | `app`, `editor`, `playground`, `org` | Display mode (`org` renders a static code block in MkDocs) |
| `theme` | `"auto"` | `auto`, `light`, `dark` | Color scheme (`auto` = follows `prefers-color-scheme`) |
| `layout` | mode-aware | `auto`, `horizontal`, `vertical` | Editor/preview split direction. Defaults to `"vertical"` for editor, `"auto"` for playground. `auto` switches to vertical on viewports narrower than 768px. |
| `src` | — | URL | External Python file URL |
| `fullscreen` | — | boolean attribute | Toggle fullscreen (playground) |
| `height` | — | CSS length | Explicit height (e.g. `"500px"`) |
| `auto-run` | `true` | boolean attribute | Execute code on load |
| `label` | `"Python"` | string | Language pill text in header |
| `examples-src` | — | URL | JSON file defining examples for playground |
| `code-visibility` | `"visible"` | `visible`, `hidden`, `collapsed` | Editor pane state (editor mode) |
| `code-position` | `"first"` | `first`, `last` | Whether code appears before or after output (editor/playground) |

### Reserved Attributes (future)

These attributes are reserved for future use:

| Attribute | Planned Values | Description |
|-----------|---------------|-------------|
| `worker` | `true`, `false`, `"shared"` | Web worker execution backend |
| `loading` | `eager`, `lazy` | Loading strategy |
| `env` | string | Named shared environment |
| `auto-detect` | boolean | Requirements auto-detection toggle |

## Code Provision

Code can be provided to `<panel-live>` in three ways, listed in priority order:

### 1. External source (`src` attribute)

```html
<panel-live src="https://example.com/app.py"></panel-live>
```

### 2. Inline text content

```html
<panel-live>
import panel as pn
pn.panel("Hello World").servable()
</panel-live>
```

### 3. Multi-file with child elements

```html
<panel-live mode="editor">
  <panel-file name="app.py" entrypoint>
import panel as pn
from utils import greet
pn.panel(greet("World")).servable()
  </panel-file>
  <panel-file name="utils.py">
def greet(name):
    return f"Hello, {name}!"
  </panel-file>
  <panel-requirements>
pandas
hvplot
  </panel-requirements>
</panel-live>
```

## Child Elements

### `<panel-file>`

Declares a Python source file within a multi-file `<panel-live>` app.

| Attribute | Default | Description |
|-----------|---------|-------------|
| `name` | `"app.py"` | Filename in Pyodide virtual filesystem |
| `entrypoint` | — | Boolean attribute; marks the file to execute (first file if none marked) |
| `src` | — | URL to fetch content from (alternative to inline text) |

### `<panel-requirements>`

Declares pip package requirements. One package per line or space-separated. Pip specifier format. Comments (`#`) and blank lines are stripped.

```html
<panel-requirements>
pandas>=2.0
hvplot
# comment lines are stripped
</panel-requirements>
```

### `<panel-example>`

Declares a code example for the playground dropdown.

| Attribute | Default | Description |
|-----------|---------|-------------|
| `name` | `"Example"` | Display name in dropdown |
| `src` | — | URL to fetch example code from |

## Usage Examples

### App mode (output only)

```html
<panel-live>
import panel as pn
pn.panel("# Hello World").servable()
</panel-live>
```

### Editor mode with dark theme

```html
<panel-live mode="editor" theme="dark">
import panel as pn
pn.widgets.FloatSlider(name="Amplitude", start=0, end=10).servable()
</panel-live>
```

### Playground with examples

```html
<panel-live mode="playground" layout="horizontal" theme="dark" fullscreen>
  <panel-example name="Slider">
import panel as pn
slider = pn.widgets.FloatSlider(name="Value", start=0, end=10, value=5)
pn.Row(slider, pn.bind(lambda v: f"Value: {v:.1f}", slider)).servable()
  </panel-example>
  <panel-example name="DataFrame">
import panel as pn
import pandas as pd
df = pd.DataFrame({"x": [1,2,3], "y": [4,5,6]})
pn.panel(df).servable()
  </panel-example>
</panel-live>
```

### External source with collapsed code

```html
<panel-live mode="editor" src="examples/slider.py" code-visibility="collapsed" label="Panel">
</panel-live>
```

### Multi-file app with requirements

```html
<panel-live mode="editor">
  <panel-file name="app.py" entrypoint>
import panel as pn
from utils import greet
pn.panel(greet("World")).servable()
  </panel-file>
  <panel-file name="utils.py">
def greet(name):
    return f"Hello, {name}!"
  </panel-file>
  <panel-requirements>
pandas
hvplot
  </panel-requirements>
</panel-live>
```

### Examples loaded from external sources

```html
<panel-live mode="playground">
  <panel-example name="Hello" src="examples/hello.py"></panel-example>
  <panel-example name="Slider" src="examples/slider.py"></panel-example>
</panel-live>
```

## Page-Level Elements

### `<panel-live-config>`

Invisible configuration element that sets page-level defaults for all `<panel-live>` elements. Place it **before** any `<panel-live>` elements in the HTML so its `connectedCallback` fires first.

| Attribute | Default | Description |
|-----------|---------|-------------|
| `playground-url` | — | URL for playground links (overrides automatic script-URL detection) |

The element also reads `localStorage('panel-live:auto-run')` on connect. If the key is present, it overrides the `auto-run` attribute on all `<panel-live>` elements on the page.

```html
<panel-live-config playground-url="/playground.html"></panel-live-config>
```

### `<panel-live-controls>`

Visible toolbar with a "Run All" button and an auto-run toggle. Designed for documentation pages where you want users to opt-in to running examples rather than auto-executing on page load.

The toolbar provides:

- **Run All** button: runs all `<panel-live>` elements on the page serially in document order (calls `PanelLive.runAll()`). Shows "Running..." while active.
- **Auto-run** toggle: persists to `localStorage('panel-live:auto-run')`. When toggled ON, immediately runs all elements. When toggled OFF, prevents auto-execution on next page load.

```html
<panel-live-controls></panel-live-controls>
```

#### Usage with `<panel-live-config>`

The two elements work independently or together:

```html
<!-- Config reads localStorage and sets auto-run override before elements render -->
<panel-live-config playground-url="/playground.html"></panel-live-config>

<!-- Controls provides the UI for users to toggle auto-run and run all -->
<panel-live-controls></panel-live-controls>

<!-- These elements respect the auto-run override -->
<panel-live mode="editor">
import panel as pn
pn.panel("Example 1").servable()
</panel-live>
```

#### Clearing auto-run preference

To reset the auto-run preference (e.g. for debugging), clear the localStorage key:

```javascript
localStorage.removeItem('panel-live:auto-run');
```
