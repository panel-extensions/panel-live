# panel-live

**Write, edit, and run Python interactively in the browser — no server required.**

Turn any web page into an interactive Python playground with the `<panel-live>` web component. Works with matplotlib, pandas, scikit-learn, Panel, and 200+ packages from the Python ecosystem. Visualizations, analyses, dashboards, and interactive tools are fully interactive — users can view, explore, edit code, and re-run, all directly in the browser via [Pyodide](https://pyodide.org/) — no backend, no deployment, no infrastructure.

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
fig, ax = plt.subplots(figsize=(6, 3))
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

name = pn.widgets.TextInput(name="Your Name", value="World")
count = pn.widgets.IntSlider(name="Repeat", start=1, end=5, value=1)

def greet(name, n):
    msg = f"Hello, {name}! " * n
    return pn.pane.Markdown(f"## {msg.strip()}")

pn.Column(name, count, pn.bind(greet, name, count)).servable()
```

### Playground Mode

A side-by-side editor and live preview. Edit the code on the left and press **Run**.

```{.panel mode="playground" layout="horizontal" code-position="first"}
import panel as pn
pn.extension(sizing_mode="stretch_width")

a = pn.widgets.FloatInput(name="A", value=10, step=1)
b = pn.widgets.FloatInput(name="B", value=3, step=1)

def compute(a, b):
    return pn.pane.Markdown(f"## {a} + {b} = **{a + b:.4g}**")

pn.Column(
    pn.Card(
        pn.Row(a, b),
        pn.bind(compute, a, b),
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
- **Web Worker execution** — Pyodide runs in a Dedicated Worker, keeping the page responsive
- **Light / dark / auto theming** that follows the host page
- **CSS custom properties** for full branding control
- **Real-time print output** — `print()` streams incrementally as code executes
- **Multi-file support** via `<panel-file>` child elements
- **Explicit requirements** via `<panel-requirements>`
- **MkDocs integration** via fenced code blocks and `pymdownx.superfences`
- **No server needed** — runs entirely in the browser via Pyodide

## Known Limitations

Because panel-live runs entirely in the browser via Pyodide (WASM), some features that require a live server are not available:

- **No `.plot()` calls** — matplotlib's `plt.show()`, plotly's `fig.show()`, and similar display methods do not work. Instead, return the figure object as the last expression (e.g. `fig`) and panel-live will render it.
- **No `.show()` calls** — Bokeh's `show()`, Panel's `.show()`, and similar server-dependent methods are not supported.

For a full list, see [Known Limitations](reference/known-limitations.md).

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
