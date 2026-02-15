# PanelLive Server Components

## Motivation

Panel server applications can leverage client-side Pyodide execution for:

- **Offloading computation**: Heavy workloads (video processing, ML inference, data transforms) run in the browser's Pyodide sandbox, freeing the server.
- **Reduced latency**: Operations needing fast feedback (image manipulation, real-time filtering) avoid server round-trips.
- **Secure sandboxing**: LLM-generated code executes safely in the browser, with results sent back to the server.
- **Scalability**: Client-side computation distributes load across users' browsers.

Two Panel components built on `JSComponent` wrap the `<panel-live>` web component:

| Component | Purpose | Has UI? |
|-----------|---------|---------|
| `PanelLive` | Display interactive editor/app with bidirectional state | Yes |
| `PanelLiveExecutor` | Headless code execution with bidirectional state | Minimal |

## Architecture

```
Server Python                  Browser JS                     Pyodide Worker
┌──────────────────┐    ┌────────────────────┐    ┌────────────────────┐
│                  │    │                    │    │                    │
│  PanelLive /     │    │  JSComponent _esm  │    │  User code runs    │
│  PanelLiveExecutor│   │                    │    │  here              │
│                  │    │  Creates & manages │    │                    │
│  state:          │    │  <panel-live>      │    │  state:            │
│  PanelLiveState  │    │  web component     │    │  PanelLiveState    │
│  (server copy)   │    │                    │    │  (client copy)     │
│                  │    │                    │    │                    │
└────────┬─────────┘    └─────────┬──────────┘    └──────────┬─────────┘
         │                        │                          │
         │◄──────────────────────►│◄────────────────────────►│
         │   Bokeh websocket      │      postMessage         │
         │   (param sync +        │      (state updates +    │
         │    send_msg/recv_msg)  │       code execution)    │
```

**Server → Client**: `state` param changes → Bokeh sync to JS → `postMessage` to Worker → updates `state` in Pyodide.

**Client → Server**: Pyodide `state` changes → `postMessage` to JS → Bokeh sync → updates `state` on server.

## PanelLiveState

Base class for bidirectional state shared between server and client. Provides typed parameters for common data exchange patterns:

```python
import param

class PanelLiveState(param.Parameterized):
    """State object accessible on both server and client sides.

    Subclass to add domain-specific parameters.
    """

    value = param.Parameter(doc="General-purpose value (JSON-serializable)")
    value_str = param.String(default="", doc="String value")
    value_dict = param.Dict(default={}, doc="Dictionary / JSON value")
    value_df = param.DataFrame(doc="DataFrame value")
    value_bytes = param.Bytes(doc="Binary data")
```

Users subclass to add domain-specific parameters:

```python
class VideoState(PanelLiveState):
    frame_index = param.Integer(default=0, bounds=(0, None))
    brightness = param.Number(default=1.0, bounds=(0.0, 3.0))
    processed_frame = param.Bytes(doc="Processed frame as PNG bytes")
```

All `param.Parameter` types that are JSON-serializable or have Panel serialization support (DataFrame via Arrow, Bytes via base64) work across the bridge.

## PanelLive

Displays a `<panel-live>` editor/app with bidirectional state:

```python
from panel.custom import JSComponent

class PanelLive(JSComponent):

    # --- Code ---
    code = param.String(doc="Python code to execute in Pyodide")
    requirements = param.List(default=[], item_type=str, doc="Packages to install via micropip")

    # --- State ---
    state = param.ClassSelector(class_=PanelLiveState, doc="Shared state object")

    # --- Display ---
    mode = param.Selector(default="editor", objects=["app", "editor", "playground"])
    theme = param.Selector(default="auto", objects=["auto", "light", "dark"])
    layout = param.Selector(default="vertical", objects=["vertical", "horizontal"])
    auto_run = param.Boolean(default=True)
    code_visibility = param.Selector(
        default="visible", objects=["visible", "collapsed", "hidden"]
    )

    # --- Status (read-only from user perspective) ---
    status = param.Selector(
        default="idle", objects=["idle", "loading", "running", "ready", "error"]
    )

    _esm = "panel_live_esm.js"
```

### Usage

```python
import panel as pn

state = PanelLiveState()

code = """
import panel as pn

# `state` is injected into the namespace — a PanelLiveState mirrored from the server
slider = pn.widgets.FloatSlider(name="Multiplier", start=0.1, end=10, value=1.0)

def compute(multiplier):
    result = float(state.value or 0) * multiplier
    state.value_str = f"Browser computed: {result:.2f}"
    return f"Result: {result:.2f}"

pn.Column(
    pn.pane.Markdown(pn.bind(lambda: f"Server sent: **{state.value}**", state.param.value)),
    slider,
    pn.pane.Str(pn.bind(compute, slider)),
).servable()
"""

editor = PanelLive(code=code, state=state, mode="editor", height=400)

# Server can update state at any time
state.value = 42

pn.Column(editor, pn.pane.Str(state.param.value_str)).servable()
```

## PanelLiveExecutor

Headless Pyodide execution — no visible editor. Runs code in the browser sandbox and syncs results back via state:

```python
class PanelLiveExecutor(JSComponent):

    # --- Code ---
    code = param.String(doc="Python code to execute")
    requirements = param.List(default=[], item_type=str)

    # --- State ---
    state = param.ClassSelector(class_=PanelLiveState)

    # --- Display ---
    display = param.Selector(default="compact", objects=["hidden", "compact", "debug"])

    # --- Execution control ---
    run = param.Event(doc="Trigger execution")
    queue = param.Boolean(default=True, doc="Queue multiple submissions (vs. replace)")

    # --- Status (read-only from user perspective) ---
    status = param.Selector(
        default="idle", objects=["idle", "loading", "running", "ready", "error"]
    )
    error = param.String(default="", doc="Last error message")
    stdout = param.String(default="", doc="Captured stdout from last run")

    _esm = "panel_live_executor_esm.js"
```

### Display Modes

| Mode | Behavior |
|------|----------|
| `hidden` | Invisible (0x0 pixels). Pure background compute. |
| `compact` | Single-line status indicator ("Running..." / "Ready"). |
| `debug` | Status + stdout/stderr output for development. |

### Execution Queue

Multiple `code` submissions are queued by default and run sequentially. Set `queue=False` to replace any pending submission with the latest one. The Pyodide worker is single-threaded, so true parallelism requires multiple `PanelLiveExecutor` instances (each creates its own `<panel-live>` element sharing the singleton Pyodide worker's execution queue).

### Usage

```python
import panel as pn

state = PanelLiveState()

executor = PanelLiveExecutor(
    code='state.value_dict = {"result": sum(range(100)), "status": "ok"}',
    state=state,
    display="compact",
)

# Trigger execution
executor.param.trigger("run")

pn.Column(executor, pn.pane.JSON(state.param.value_dict)).servable()
```

## Examples

### 1. Echo: Server to Client to Server

Round-trip: server sends a value, client transforms it, sends it back.

```python
import panel as pn

state = PanelLiveState()

code = """
import param

@param.depends(state.param.value, watch=True)
def on_value_change(*events):
    if state.value is not None:
        state.value_str = f"Echo from browser: {state.value!r} (type: {type(state.value).__name__})"
"""

executor = PanelLiveExecutor(code=code, state=state, display="compact")

input_widget = pn.widgets.TextInput(name="Send to browser", value="Hello!")
send_btn = pn.widgets.Button(name="Send", button_type="primary")

def send(event):
    state.value = input_widget.value

send_btn.on_click(send)

pn.Column(
    input_widget,
    send_btn,
    executor,
    "### Response from browser:",
    pn.pane.Str(state.param.value_str),
).servable()
```

### 2. Client-Side Timer

Client sends timestamps back to the server on a schedule, demonstrating str, dict, and bytes transfer:

```python
import panel as pn

state = PanelLiveState()

code = """
import asyncio
from datetime import datetime

async def tick():
    while True:
        now = datetime.now()
        state.value_str = now.isoformat()
        state.value_dict = {"hour": now.hour, "minute": now.minute, "second": now.second}
        state.value_bytes = now.isoformat().encode("utf-8")
        await asyncio.sleep(1)

asyncio.ensure_future(tick())
"""

executor = PanelLiveExecutor(code=code, state=state, display="compact")

pn.Column(
    executor,
    "### Browser Clock",
    pn.indicators.Number(name="Time (str)", value=state.param.value_str, format="{value}"),
    pn.pane.JSON(state.param.value_dict),
).servable()
```

### 3. Secure LLM Code Execution

Execute LLM-generated Python safely in the browser sandbox:

```python
import panel as pn

state = PanelLiveState()
executor = PanelLiveExecutor(state=state, display="debug")

code_input = pn.widgets.CodeEditor(
    name="Code",
    language="python",
    value='state.value_dict = {"result": sum(range(100)), "status": "ok"}',
    height=150,
)
run_btn = pn.widgets.Button(name="Execute in sandbox", button_type="primary")

def execute(event):
    executor.code = code_input.value
    executor.param.trigger("run")

run_btn.on_click(execute)

pn.Column(
    "### Sandbox Executor",
    code_input,
    run_btn,
    executor,
    "### Result from browser:",
    pn.pane.JSON(state.param.value_dict),
    pn.pane.Str(state.param.error, styles={"color": "red"}),
).servable()
```

### 4. Interactive Editor with Server Data

Server provides data, client-side code visualizes it with a full editor:

```python
import numpy as np
import pandas as pd
import panel as pn

state = PanelLiveState()

# Server provides the data
state.value_df = pd.DataFrame({
    "x": np.linspace(0, 10, 100),
    "y": np.sin(np.linspace(0, 10, 100)),
})

code = """
import hvplot.pandas

# state.value_df is a DataFrame provided by the server
plot = state.value_df.hvplot.line(
    x="x", y="y",
    title="Server Data, Client Plot",
    responsive=True,
)
plot.servable()
"""

PanelLive(
    code=code,
    state=state,
    requirements=["hvplot"],
    mode="editor",
    height=500,
).servable()
```

## Implementation Approach

### Phase 1: Core

1. **`PanelLiveState`** base class in `src/panel_live/state.py`. A `param.Parameterized` subclass with the predefined value parameters.

2. **`PanelLive` JSComponent** in `src/panel_live/components.py`. The `_esm` module:
   - Creates a `<panel-live>` element with attributes mapped from component params (`mode`, `theme`, `layout`, etc.)
   - Loads panel-live JS/CSS from CDN (via `_importmap`)
   - Listens for `pl-status`, `pl-ready`, `pl-error` events and updates `status` param
   - Bridges state via `model.send_msg()` / `model.on('msg:custom', ...)` between Bokeh and the `<panel-live>` worker

3. **State sync bridge**: Server-side watcher on `state` param changes → serializes to JSON → `_send_event(ESMEvent, data=msg)` to JS → JS forwards via `workerBridge.postMessage()` to Pyodide. Reverse path uses `model.send_msg()` from JS → `_handle_msg()` on Python server.

4. **Pyodide `state` injection**: Extend `worker-setup.py` to create a `PanelLiveState` instance in the Pyodide namespace when state data is provided, and wire param changes to `postMessage` callbacks.

### Phase 2: PanelLiveExecutor

5. **Headless mode**: `_esm` creates a `<panel-live>` with `code-visibility="hidden"` and manages display mode rendering (hidden/compact/debug).

6. **`run` event**: Triggers re-execution via the worker bridge. Multiple submissions are queued.

7. **Error/stdout forwarding**: Captures `pl-error` events and stdout streaming, updates `error` and `stdout` params.

### Phase 3: Advanced

8. **DataFrame serialization**: Use Apache Arrow IPC (via Panel's existing Bokeh binary transport) for efficient DataFrame transfer across the bridge.

9. **Custom state subclasses**: Transmit class schema (param names, types, defaults) as JSON metadata so Pyodide can reconstruct the user's `PanelLiveState` subclass. Alternative: `inspect.getsource()` + `exec()` in Pyodide.

10. **Worker pool**: Optional multiple Pyodide workers for parallel execution (future, depends on SharedWorker support in panel-live).

### Key Implementation Detail: _esm Structure

The `_esm` for `PanelLive` wraps the `<panel-live>` web component:

```javascript
export function render({ model, el }) {
  // Create <panel-live> element
  const plEl = document.createElement('panel-live');
  plEl.setAttribute('mode', model.mode);
  plEl.setAttribute('theme', model.theme);
  plEl.setAttribute('auto-run', model.auto_run ? 'true' : 'false');
  plEl.textContent = model.code;
  el.appendChild(plEl);

  // Forward attribute changes
  model.on(['mode', 'theme', 'layout', 'auto_run', 'code_visibility'], () => {
    plEl.setAttribute('mode', model.mode);
    plEl.setAttribute('theme', model.theme);
    // ...
  });

  // State sync: server → client (Python → JS → Worker)
  model.on('msg:custom', (event) => {
    // Forward state update to the <panel-live> worker
    // Implementation depends on exposing worker bridge API
  });

  // State sync: client → server (Worker → JS → Python)
  plEl.addEventListener('pl-state-update', (event) => {
    model.send_msg(event.detail);
  });

  // Status sync
  plEl.addEventListener('pl-status', (event) => {
    model.status = event.detail.status;
  });
}
```

## Open Questions

1. **Custom PanelLiveState subclasses**: How to transmit the class definition from server to Pyodide?
   - Option A: `inspect.getsource()` + `exec()` in Pyodide (simple but fragile with closures/imports)
   - Option B: Serialize param schema as JSON and reconstruct (robust but loses custom methods)
   - Option C: Require users to define the class in both `code` and server-side (explicit but redundant)

2. **Worker bridge API for state**: The current `<panel-live>` worker bridge doesn't expose a public API for injecting state updates. Options:
   - Extend `WorkerBridge` with `setState(data)` / `onStateChange(callback)` methods
   - Use the existing `writeFile` mechanism to write state as a JSON file, and poll from Pyodide
   - Add a new `state-update` message type to the worker protocol

3. **State conflict resolution**: When server and client update the same param simultaneously, who wins?
   - Last-write-wins (simplest)
   - Server-priority (server is authoritative)
   - Versioned updates with conflict detection

4. **DataFrame transport**: Should DataFrames use Arrow IPC (efficient binary, requires pyarrow in Pyodide) or JSON (universal but slow for large data)? Panel's JSComponent already handles DataFrame serialization via Bokeh — can we reuse that across the postMessage bridge?

5. **Single class vs. two**: Should `PanelLive` and `PanelLiveExecutor` be one class with a `headless=True` flag? Separate classes have clearer APIs but share ~80% implementation. A mixin or shared base class could reduce duplication.

6. **State change events in Pyodide**: Should `state` in Pyodide support `param.depends` and `param.watch`? This requires Pyodide to have `param` installed. Since Panel already depends on param, this is likely available, but it adds to install time.
