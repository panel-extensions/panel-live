# PanelLive Component How-to Guide

Common patterns and recipes for using the `PanelLive` component in Panel server applications.

## Choosing a Mode

| Mode | Use when... | Visible UI |
|------|------------|------------|
| `editor` | You want users to see and edit the code | Code editor + output |
| `app` | You want output only, no code editing | Output only |
| `playground` | You want a full playground with example selector | Editor + examples |
| `compact` | You need background compute with minimal status feedback | Status line only |
| `debug` | You're developing and need to see stdout/stderr | stdout/stderr |
| `headless` | You need invisible background compute | Nothing (0px) |

```python
from panel_live import PanelLive

# Switch modes dynamically
live = PanelLive(code="...", mode="editor")
live.mode = "app"  # hide the editor
live.mode = "compact"  # minimal status line
```

## Sending Data Server → Client

Use `send()` to push JSON-serializable data to the client:

```python
live = PanelLive(code="...", mode="compact")

# Send any JSON-serializable data
live.send({"action": "update", "data": [1, 2, 3]})
live.send("simple string")
live.send(42)
```

For DataFrames, convert to dict first:

```python
import pandas as pd

df = pd.DataFrame({"x": [1, 2, 3], "y": [4, 5, 6]})
live.send(df.to_dict(orient="records"))
```

For bytes, use base64:

```python
import base64

raw_bytes = b"binary data"
live.send({"data": base64.b64encode(raw_bytes).decode()})
```

## Receiving Data Client → Server

Watch the `output` param:

```python
live = PanelLive(code="...", mode="compact")

def on_output(event):
    print(f"Received from client: {live.output}")

live.param.watch(on_output, "output")
```

## Remote Code Execution

Execute code in the browser and get results back:

```python
# Simple execution
result = await live.run_python("sum(range(100))")

# With keyword arguments injected as globals
result = await live.run_python(
    "result = x * y",
    x=10,
    y=20,
)

# With timeout
try:
    result = await live.run_python("import time; time.sleep(60)", timeout=5.0)
except TimeoutError:
    print("Execution timed out")
```

## Error Handling

Monitor the `status` and `error` params:

```python
live = PanelLive(code="...", mode="editor")

def on_status(event):
    if live.status == "error":
        print(f"Error: {live.error}")

live.param.watch(on_status, "status")
```

For `run_python()`, errors raise `RuntimeError`:

```python
try:
    result = await live.run_python("1/0")
except RuntimeError as e:
    print(f"Execution error: {e}")
```

## Using Local Assets

For development without CDN access:

```python
from panel_live import PanelLive

# HTTPS URLs
PanelLive.configure(
    js_url="https://my-cdn.com/panel-live.js",
    css_url="https://my-cdn.com/panel-live.css",
)

# Local files via --static-dirs
PanelLive.configure(
    js_url="./pl/panel-live.js",
    css_url="./pl/panel-live.css",
)
```

Serve with:

```bash
panel serve app.py --static-dirs pl=path/to/panel-live/dist
```

## Installing Requirements

Specify packages to install via micropip before code execution:

```python
live = PanelLive(
    code="""\
import numpy as np
import panel as pn
arr = np.random.rand(10)
pn.pane.Str(f"Random array: {arr}").servable()
""",
    requirements=["numpy"],
    mode="editor",
)
```
