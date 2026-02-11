# panel-live

**Write, edit, and run Python interactively in the browser — no server required.**

Turn any web page into an interactive Python playground with the `<panel-live>` web component. Plots, widgets, dashboards, and tools are fully interactive — users can view, explore, edit code, and re-run, all directly in the browser via [Pyodide](https://pyodide.org/) — no backend, no deployment, no infrastructure.

## Try it

### App Mode

The default mode renders your Panel app directly — no editor, just the output.

```panel
import panel as pn
pn.extension(sizing_mode="stretch_width")

slider = pn.widgets.FloatSlider(name="Value", start=0, end=10, step=0.1, value=5.0)

pn.Column(
    "# Slider Demo",
    slider,
    pn.bind(lambda v: pn.pane.Markdown(f"**Current value:** {v:.1f}"), slider),
).servable()
```

### Works with any Python

Not just Panel — run **any** Python code directly in the browser. Here's a matplotlib visualization with no Panel imports at all:

```{.panel mode="editor" label="Python" code-visibility="collapsed" code-position="last"}
import matplotlib
matplotlib.use("agg")
import matplotlib.pyplot as plt
import numpy as np

x = np.linspace(0, 2 * np.pi, 200)
fig, ax = plt.subplots(figsize=(8, 3))
for n in range(1, 5):
    ax.plot(x, np.sin(n * x) / n, label=f"sin({n}x)/{n}")
ax.set_title("Harmonic Series")
ax.legend(loc="upper right")
ax.grid(True, alpha=0.3)
fig
```

Click the *Code* button to edit the code and rerun it live in your browser!

Try changing the code to:

```python
ax.set_title("Very Harmonic Series")
ax.legend(loc="upper left")
```

Perfect for library developers and educators who want to make it easy to explore, learn, and have fun.

### Editor Mode

Edit the code below and press **Run** to see your changes.

```{.panel mode="editor"}
import panel as pn

pn.extension(sizing_mode="stretch_width")

picker = pn.widgets.ColorPicker(name="Base Color", value="#0072b5")
steps = pn.widgets.RadioButtonGroup(
    name="Shades", options=["5", "7", "9"], value="7",
    button_style="outline", button_type="primary",
    margin=(23, 5, 10, 5)
)

def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def generate_palette(color, n):
    r, g, b = hex_to_rgb(color)
    n = int(n)
    swatches = ""
    for i in range(n):
        f = i / (n - 1) if n > 1 else 0.5
        cr = int(255 + (r - 255) * f)
        cg = int(255 + (g - 255) * f)
        cb = int(255 + (b - 255) * f)
        hx = f"#{cr:02x}{cg:02x}{cb:02x}"
        text_col = "#fff" if (cr * 0.299 + cg * 0.587 + cb * 0.114) < 150 else "#000"
        swatches += (
            f'<div style="background:{hx};color:{text_col};padding:12px 16px;'
            f'border-radius:6px;text-align:center;font-size:13px;font-family:monospace;">'
            f'{hx}</div>'
        )
    return pn.pane.HTML(
        f'<div style="display:grid;grid-template-columns:repeat({n},1fr);gap:6px;">{swatches}</div>'
    )

pn.Column(
    pn.Row(steps, picker),
    pn.bind(generate_palette, picker, steps),
).servable()
```

### Playground Mode

A side-by-side editor and live preview. Edit the code on the left and press **Run**.

```{.panel mode="playground" layout="horizontal" code-position="first"}
import panel as pn
pn.extension(sizing_mode="stretch_width")

a = pn.widgets.FloatInput(name="A", value=10, step=1)
b = pn.widgets.FloatInput(name="B", value=3, step=1)
op = pn.widgets.Select(name="Operator", options=["+", "-", "*", "/"], value="+")

def compute(a, op, b):
    ops = {"+": a + b, "-": a - b, "*": a * b, "/": a / b if b != 0 else float("inf")}
    result = ops[op]
    return pn.pane.Markdown(f"## {a} {op} {b} = **{result:.4g}**")

pn.Column(
    pn.Card(
        pn.Row(a, op, b),
        pn.bind(compute, a, op, b),
        title="Mini Calculator",
    ),
).servable()
```

### Playground

Explore the full-screen [Playground](playground.html) — a curated collection of interactive examples you can edit and run instantly.

### API Editor

Explore and configure every `<panel-live>` attribute interactively with the [API Explorer](api-explorer.html).

## Features

- **3 modes:** app (output only), editor (code + output), playground (side-by-side)
- **Light / dark / auto theming** that follows the host page
- **CSS custom properties** for full branding control
- **Multi-file support** via `<panel-file>` child elements
- **Explicit requirements** via `<panel-requirements>`
- **MkDocs integration** via fenced code blocks and `pymdownx.superfences`
- **No server needed** — runs entirely in the browser via Pyodide

## Known Limitations

Because panel-live runs entirely in the browser via Pyodide (WASM), some features that require a live server are not available:

- **No `.plot()` calls** — matplotlib's `plt.show()`, plotly's `fig.show()`, and similar display methods do not work. Instead, return the figure object as the last expression (e.g. `fig`) and panel-live will render it.
- **No `.show()` calls** — Bokeh's `show()`, Panel's `.show()`, and similar server-dependent methods are not supported.

## Get Started

- [Examples](examples.md) — interactive examples across all categories
- [API Explorer](api-explorer.html) — configure every attribute interactively
- [Playground](playground.html) — full-screen editing environment
- [How-to Guides](how-to/mode.md) — per-attribute guides with live examples
- [Reference](reference/html-api.md) — complete HTML, JavaScript, CSS, and Events API
- [Design Decisions](explanation/design.md) — why panel-live is built the way it is

```bash
pip install panel-live
```
