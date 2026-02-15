# Claude Artifacts

Use panel-live inside Claude.ai HTML artifacts to create interactive Python visualizations in conversations.

## How it works

Claude can generate HTML artifacts that include `<panel-live>` elements. The artifact loads panel-live from CDN and runs Python code directly in the browser — no server needed.

## Example artifact

Ask Claude to create a panel-live artifact with a prompt like:

> Create an HTML artifact with a panel-live element that shows an interactive slider controlling a matplotlib plot.

Claude will generate an artifact like:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@panel-extensions/panel-live@latest/dist/panel-live.css">
  <script src="https://cdn.jsdelivr.net/npm/@panel-extensions/panel-live@latest/dist/panel-live.js"></script>
</head>
<body>
  <panel-live mode="app">
import panel as pn
import matplotlib
matplotlib.use("agg")
import matplotlib.pyplot as plt
import numpy as np

pn.extension(sizing_mode="stretch_width")

freq = pn.widgets.FloatSlider(name="Frequency", start=0.5, end=5, step=0.1, value=1.0)

def make_plot(f):
    x = np.linspace(0, 2 * np.pi, 200)
    fig, ax = plt.subplots(figsize=(8, 3))
    ax.plot(x, np.sin(f * x))
    ax.set_title(f"sin({f:.1f}x)")
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    return fig

pn.Column(freq, pn.bind(make_plot, freq)).servable()
  </panel-live>
</body>
</html>
```

## Sandbox constraints

Claude artifacts run in a sandboxed iframe. Key considerations:

- **No `mini-coi.js`** — service workers are not available in the artifact sandbox, so SharedArrayBuffer may not be enabled. panel-live still works, but Pyodide may load slightly slower.
- **CDN access required** — the artifact iframe must be able to reach `cdn.holoviz.org`, `cdn.jsdelivr.net`, and `cdn.bokeh.org`.
- **Memory limits** — the artifact sandbox may have lower memory limits than a full browser tab.

## Tips for prompting

- Ask Claude to use `mode="app"` for clean output, or `mode="editor"` if you want editable code
- Specify `theme="dark"` or `theme="light"` to match your preference
- For matplotlib, always include `matplotlib.use("agg")` before importing `pyplot`
- Use `.servable()` for Panel apps, or return the last expression for simple visualizations
- List required packages in `<panel-requirements>` if using packages beyond Panel
