# panel-live

**Run interactive Panel apps directly in the browser — no server required.**

Embed live, editable Python visualizations in any web page using the `<panel-live>` web component.
Code executes client-side via Pyodide — no backend, no deployment, no infrastructure.

## Try it — App Mode

The default mode renders your Panel app directly — no editor, no chrome, just the output.

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

## Try it — Editor Mode

Edit the code below and press **Run** to see your changes.

```{.panel mode="editor"}
import panel as pn
pn.extension(sizing_mode="stretch_width")

picker = pn.widgets.ColorPicker(name="Base Color", value="#3b82f6")
steps = pn.widgets.RadioButtonGroup(name="Shades", options=["5", "7", "9"], value="7")

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
    "# Color Palette Generator",
    pn.Row(picker, steps),
    pn.bind(generate_palette, picker, steps),
).servable()
```

## Try it — Playground Mode

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

## Features

- **3 modes:** app (output only), editor (code + output), playground (side-by-side)
- **Light / dark / auto theming** that follows the host page
- **CSS custom properties** for full branding control
- **Multi-file support** via `<panel-file>` child elements
- **Explicit requirements** via `<panel-requirements>`
- **MkDocs integration** via fenced code blocks and `pymdownx.superfences`
- **No server needed** — runs entirely in the browser via Pyodide

## Get Started

- [Demo](demo.md) — all 3 modes explained in detail
- [Examples](examples.md) — more interactive examples
- [API Explorer](api-explorer.html) — configure every attribute interactively
- [Playground](playground.html) — full-screen editing environment

```bash
pip install panel-live
```
