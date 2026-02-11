# Multi-File Apps

Create apps with multiple Python files using `<panel-file>` child elements, and declare dependencies with `<panel-requirements>`.

## Defining multiple files

Use `<panel-file>` children to declare separate Python files. Mark one as `entrypoint` (or the first file is used by default):

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
</panel-live>
```

At runtime, non-entrypoint files are written to Pyodide's virtual filesystem before the entrypoint executes.

## `<panel-file>` attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `name` | `"app.py"` | Filename in the virtual filesystem |
| `entrypoint` | — | Boolean attribute; marks the file to execute |
| `src` | — | URL to fetch file content from |

## Loading files from URLs

Use the `src` attribute to load file content from external URLs:

```html
<panel-live mode="editor">
  <panel-file name="app.py" src="https://example.com/app.py" entrypoint></panel-file>
  <panel-file name="utils.py" src="https://example.com/utils.py"></panel-file>
</panel-live>
```

## Declaring requirements

Use `<panel-requirements>` to declare pip packages. One package per line, pip specifier format. Comments and blank lines are stripped.

```html
<panel-live mode="editor">
  <panel-file name="app.py" entrypoint>
import panel as pn
import pandas as pd
df = pd.DataFrame({"x": [1, 2, 3], "y": [4, 5, 6]})
pn.panel(df).servable()
  </panel-file>
  <panel-requirements>
pandas>=2.0
# hvplot for interactive plots
hvplot
  </panel-requirements>
</panel-live>
```

Requirements are installed via micropip before code execution, with progress shown in the status bar.

## JavaScript API equivalent

```javascript
const ctrl = await PanelLive.mount({
  mode: 'editor',
  files: {
    'app.py': 'import panel as pn\nfrom utils import greet\npn.panel(greet("World")).servable()',
    'utils.py': 'def greet(name): return f"Hello, {name}!"',
  },
  entrypoint: 'app.py',
  requirements: ['pandas', 'hvplot'],
}, '#container');
```
