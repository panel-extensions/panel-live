# Panel Live — Web Component Demo

This page demonstrates the `<panel-live>` web component in 3 modes:
**app**, **editor**, and **playground**.
Pyodide is loaded once and shared across all instances. Apps execute sequentially.

## 1. App Mode

Renders the Panel app with no editor. Usage: `<panel-live>...code...</panel-live>`

```{.panel mode="app"}
import panel as pn
pn.extension(sizing_mode="stretch_width")

slider = pn.widgets.FloatSlider(name="Value", start=0, end=10, step=0.1, value=5)
text = pn.pane.Markdown(f"## Value: {slider.value:.1f}")

def update(event):
    text.object = f"## Value: {event.new:.1f}"

slider.param.watch(update, "value")

pn.Column(
    "# App Mode Demo",
    "Move the slider — reactive updates with no editor visible:",
    slider,
    text,
).servable()
```

## 2. Editor Mode

Editable code above the output. Usage: `<panel-live mode="editor">`

```{.panel theme="dark"}
import panel as pn
pn.extension(sizing_mode="stretch_width")

items = [f"Item {i}" for i in range(1, 6)]
select = pn.widgets.Select(name="Choose", options=items, value=items[0])
output = pn.pane.Markdown(f"Selected: **{select.value}**")

def on_select(event):
    output.object = f"Selected: **{event.new}**"

select.param.watch(on_select, "value")

pn.Column(
    "# Editor Mode Demo",
    "Try editing this code and pressing Run:",
    select,
    output,
).servable()
```

## 3. Playground Mode

Side-by-side editor and preview. Usage: `<panel-live mode="playground" layout="horizontal">`

```{.panel mode="playground" layout="horizontal" theme="dark"}
import panel as pn
pn.extension(sizing_mode="stretch_width")

name_input = pn.widgets.TextInput(name="Your Name", value="World")
size = pn.widgets.IntSlider(name="Font Size", start=12, end=72, value=24)

def greeting(name, size):
    return f'<h1 style="font-size:{size}px">Hello, {name}!</h1>'

output = pn.pane.HTML(
    greeting(name_input.value, size.value),
    sizing_mode="stretch_width",
)

def update(event):
    output.object = greeting(name_input.value, size.value)

name_input.param.watch(update, "value")
size.param.watch(update, "value")

pn.Column(
    "# Playground Demo",
    name_input,
    size,
    output,
).servable()
```
