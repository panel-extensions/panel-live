# Getting Started with the PanelLive Component

This tutorial shows you how to use the `PanelLive` component in a Panel server application. `PanelLive` wraps the `<panel-live>` web component as a Panel `JSComponent`, letting you run Python code client-side via Pyodide with bidirectional data exchange.

## Installation

```bash
pip install git+https://github.com/panel-extensions/panel-live.git
```

!!! warning "Pre-release"
    panel-live has not been published to npm or PyPI yet. The install command above uses a GitHub source install, which works now. Once released, it will change to:

    - **Python:** `pip install panel-live`

Or with pixi (for development):

```bash
pixi install
pixi run postinstall
```

## Quick Start

Create a file `app.py`:

```python
import panel as pn
from panel_live import PanelLive

pn.extension()

editor = PanelLive(
    code='import panel as pn\npn.panel("Hello from Pyodide!").servable()',
    mode="editor",
    auto_run=True,
)

pn.Column("## My First PanelLive App", editor).servable()
```

Serve it:

```bash
panel serve app.py
```

Open `http://localhost:5006/app` in your browser. You'll see a code editor with live Pyodide output.

## Display Modes

`PanelLive` supports six display modes:

```python
# Code editor + output (default)
PanelLive(code="...", mode="editor")

# Output only — no editor visible
PanelLive(code="...", mode="app")

# Editor + examples selector
PanelLive(code="...", mode="playground")

# Status line only — minimal footprint
PanelLive(code="...", mode="compact")

# stdout/stderr visible — for development
PanelLive(code="...", mode="debug")

# Invisible (0px) — pure background compute
PanelLive(code="...", mode="headless")
```

## Sending Data to the Client

Use `send()` to push data from the server to client-side code:

```python
import panel as pn
from panel_live import PanelLive

pn.extension()

live = PanelLive(
    code="""\
import panel as pn
pn.panel("Waiting for server data...").servable()
""",
    mode="editor",
    auto_run=True,
)

button = pn.widgets.Button(name="Send Data", button_type="primary")

def on_click(event):
    live.send({"message": "Hello from the server!", "timestamp": 42})

button.on_click(on_click)

pn.Column(button, live).servable()
```

## Receiving Data from the Client

Watch the `output` parameter to receive data sent back from client-side code:

```python
import panel as pn
from panel_live import PanelLive

pn.extension()

live = PanelLive(
    code="""\
import panel as pn
# Client-side code can dispatch output events
# (integration with the worker bridge is in progress)
pn.panel("Running in the browser").servable()
""",
    mode="editor",
    auto_run=True,
)

result = pn.pane.JSON(name="Client Output")

def on_output(event):
    result.object = live.output

live.param.watch(on_output, "output")

pn.Column(live, result).servable()
```

## Remote Code Execution

Use `run_python()` to execute arbitrary Python code in the browser and get results back:

```python
import panel as pn
from panel_live import PanelLive

pn.extension()

live = PanelLive(mode="compact", auto_run=True, code="pass")

async def compute():
    result = await live.run_python(
        "result = sum(range(n))",
        n=100,
    )
    return result

pn.Column(
    live,
    pn.pane.Str(pn.bind(compute)),
).servable()
```

## Showcase App

Run the built-in showcase that demonstrates all modes:

```bash
panel-live serve --port 5008
```

Or with uvx (no installation needed):

```bash
uvx panel-live serve --port 5009
```

## Local Assets

For local development without CDN, serve the panel-live JS/CSS as static files:

```python
from panel_live import PanelLive

# Point to locally served assets
PanelLive.configure(
    js_url="./pl/panel-live.js",
    css_url="./pl/panel-live.css",
)
```

Then serve with `--static-dirs`:

```bash
panel serve app.py --static-dirs pl=quarto/_extensions/panel-live
```

!!! note "CDN assets"

    By default, `PanelLive` loads JS/CSS from GitHub Pages (`panel-extensions.github.io/panel-live/assets/`).
    Once published to npm, this will change to `cdn.jsdelivr.net/npm/@panel-extensions/panel-live@latest/dist/`.
    Use `PanelLive.configure()` to override with local assets for offline development.

## Next Steps

- [How-to Guide](../how-to/panel-component.md) — common patterns and recipes
- [Design Explanation](../explanation/panel-component.md) — architecture and design decisions
- [API Reference](../reference/python-api.md) — full parameter documentation
