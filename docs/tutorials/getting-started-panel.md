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

# Spinning Python icon — evaluate() queue on hover
PanelLive(code="...", mode="progress")

# stdout/stderr visible — for development
PanelLive(code="...", mode="debug")

# Invisible (0px) — pure background compute
PanelLive(code="...", mode="headless")
```

## Sending Data to the Client

Set the `input` param to push data from the server to client-side code.
On the client side, the data is available as `server.input` (a reactive Param parameter):

```python
import panel as pn
from panel_live import PanelLive

pn.extension()

live = PanelLive(
    code="""\
import panel as pn

@pn.depends(server.param.input)
def show(value):
    return value or "Waiting for server data..."

pn.pane.JSON(show, depth=2).servable()
""",
    mode="editor",
    auto_run=True,
)

button = pn.widgets.Button(name="Send Data", button_type="primary")

def on_click(event):
    live.input = {"message": "Hello from the server!", "timestamp": 42}

button.on_click(on_click)

pn.Column(button, live).servable()
```

## Receiving Data from the Client

On the client side, set `server.output` to send data back.
On the server side, watch the `output` param:

```python
import panel as pn
from panel_live import PanelLive

pn.extension()

live = PanelLive(
    code="""\
import panel as pn

btn = pn.widgets.Button(name="Send to Server", button_type="primary")
count = 0

def on_click(event):
    global count
    count += 1
    server.output = {"count": count, "source": "browser"}

btn.on_click(on_click)
pn.Column(btn, "Click to send data to the server").servable()
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

Use `evaluate()` to execute arbitrary Python code in the browser and get results back:

```python
import panel as pn
from panel_live import PanelLive

pn.extension()

live = PanelLive(mode="progress", auto_run=True, code="pass")

async def compute():
    result = await live.evaluate(
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
    Once published to npm, the default CDN will change to `cdn.jsdelivr.net/npm/@panel-extensions/panel-live@latest/dist/`.
    Use `PanelLive.configure()` to override with local assets for offline development.

## Next Steps

- [How-to Guide](../how-to/panel-component.md) — common patterns and recipes
- [Design Explanation](../explanation/panel-component.md) — architecture and design decisions
- [API Reference](../reference/python-api.md) — full parameter documentation
