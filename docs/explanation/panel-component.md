# PanelLive Server Component

The `PanelLive` component is a Panel `JSComponent` that wraps the `<panel-live>` web component, enabling Panel server applications to run Python code client-side via Pyodide with bidirectional data exchange.

## Motivation

Panel server applications can leverage client-side Pyodide execution for:

- **Offloading computation** — heavy workloads (video processing, ML inference, data transforms) run in the browser's Pyodide sandbox, freeing the server.
- **Reduced latency** — operations needing fast feedback (image manipulation, real-time filtering) avoid server round-trips.
- **Secure sandboxing** — LLM-generated code executes safely in the browser, with results sent back to the server.
- **Scalability** — client-side computation distributes load across users' browsers.

## Architecture

```
Server Python                  Browser JS                     Pyodide Worker
┌──────────────────┐    ┌────────────────────┐    ┌────────────────────┐
│                  │    │                    │    │                    │
│  PanelLive       │    │  JSComponent _esm  │    │  User code runs    │
│  (JSComponent)   │    │                    │    │  here              │
│                  │    │  Creates & manages │    │                    │
│  code, value,    │    │  <panel-live>      │    │                    │
│  mode, status    │    │  web component     │    │                    │
│                  │    │                    │    │                    │
└────────┬─────────┘    └─────────┬──────────┘    └──────────┬─────────┘
         │                        │                          │
         │◄──────────────────────►│◄────────────────────────►│
         │   Bokeh websocket      │      postMessage         │
         │   (param sync +        │      (code execution)    │
         │    send_msg)           │                          │
```

**Server → Client:** Setting `widget.input = data` calls `send()` → `_send_msg()` → Bokeh websocket → ESM `msg:custom` handler → dispatches `pl-server-data` event on `<panel-live>` → updates `server.input` in Pyodide.

**Client → Server:** Client code sets `server.output = data` → param watcher calls `__send_output_raw__` → dispatches `pl-output` event → ESM listener → `model.send_msg()` → Bokeh websocket → `_handle_msg()` → updates `output` param.

**Remote execution:** `evaluate(code)` → `_send_msg()` → ESM forwards to worker → worker executes → result/error sent back via `model.send_msg()` → `_handle_msg()` resolves the asyncio Future.

## Design Decisions

### ONE component, not two

The original design proposed three classes (`PanelLiveState`, `PanelLive`, `PanelLiveExecutor`) with ~25 parameters. The simplified design uses a single `PanelLive` class with ~15 parameters.

`PanelLiveExecutor` is eliminated — `PanelLive(mode="headless")` (or `"compact"` / `"debug"`) provides the same functionality via mode selection.

### Six modes in one parameter

| Mode | Visible UI | Maps to `<panel-live>` |
|------|-----------|----------------------|
| `editor` | Code editor + output | `mode="editor"` |
| `app` | Output only | `mode="app"` |
| `playground` | Editor + examples | `mode="playground"` |
| `headless` | Nothing (0px) | `mode="app"` + `code-visibility="hidden"` + 0px container |
| `compact` | Status line only | `mode="app"` + `code-visibility="hidden"` |
| `debug` | stdout/stderr | `mode="app"` + `code-visibility="hidden"` |

The `headless`, `compact`, and `debug` modes all map to `<panel-live mode="app" code-visibility="hidden">` at the HTML level. The distinction is in the container styling applied by the ESM:

- **headless**: Container is 0px (invisible). Pure background compute.
- **compact**: Container is visible but minimal. Shows only a status line.
- **debug**: Container shows stdout/stderr output. Useful during development.

### ONE `value` param (for JSON types)

When `param.Parameter()` is not in Panel's `PARAM_MAPPING`, it falls back to Bokeh's `bp.Any()` — a generic JSON property. This means:

- **Works:** `str`, `int`, `float`, `bool`, `None`, `list`, `dict` (JSON-serializable)
- **Fails:** `DataFrame`, `bytes`, `numpy.ndarray` (not JSON-serializable through `bp.Any()`)

A single `value = param.Parameter()` covers 90%+ of use cases. For DataFrames, serialize to dict before sending; for bytes, use base64 encoding. Dedicated `value_df` / `value_bytes` params can be added later if needed.

### Separate `output` param for client→server data

Rather than overloading `value` for both directions, a separate `output` param receives data from the client. This makes data flow explicit and avoids race conditions when server and client update simultaneously.

### `send()` method for server→client push

`send(data)` pushes JSON-serializable data to the client via Bokeh's custom message channel. This is more explicit than watching `value` changes and avoids triggering unnecessary re-renders.

### `evaluate()` for remote execution

`await evaluate(code, **kwargs)` provides a clean async API for executing arbitrary Python in the browser sandbox and getting results back. Keyword arguments are injected as globals in the Pyodide namespace. The implementation uses request IDs to match responses to pending futures.

## Shadow DOM Workarounds

Panel's `JSComponent` renders into a Shadow DOM. The `<panel-live>` web component (and Bokeh's `embed_items()`) rely on `document.getElementById()` which cannot see inside Shadow DOM. Styles loaded into `<head>` also don't penetrate the shadow boundary.

The ESM fixes both issues:

1. **getElementById patch** — `document.getElementById` is monkey-patched to also search registered shadow roots. All shadow roots from PanelLive instances are tracked in a `Set`.

2. **CSS mirroring** — The panel-live CSS bundle is injected directly into the shadow root. A `MutationObserver` watches `<head>` for new stylesheets (added dynamically by CodeMirror, Bokeh, etc.) and clones them into the shadow root.

These are necessary workarounds — until Panel supports Light DOM rendering or Bokeh uses `getRootNode().getElementById()`, they cannot be avoided.

## Messaging Architecture

Communication uses Bokeh's built-in websocket transport via `_send_msg()` (server→client) and `model.send_msg()` (client→server). Messages are JSON objects with a `type` field:

**Server → Client:**
- `{"type": "server_data", "data": ...}` — arbitrary data push via `send()`
- `{"type": "evaluate", "code": "...", "kwargs": {...}, "request_id": "..."}` — headless code evaluation
- `{"type": "run", "request_id": "...", "code": ...}` — trigger full render pipeline

**Client → Server:**
- `{"type": "output", "data": ...}` — client sends data back (updates `output` param)
- `{"type": "evaluate_result", "request_id": "...", "result": ...}` — evaluation result
- `{"type": "evaluate_error", "request_id": "...", "error": "..."}` — evaluation error
- `{"type": "run_result", "request_id": "..."}` — render completed
- `{"type": "run_error", "request_id": "...", "error": "..."}` — render error

## Future Work

- **Full bidirectional sync** — live param updates between server and Pyodide without re-running code
- **DataFrame/bytes serialization** — Apache Arrow IPC for efficient DataFrame transfer
- **Worker bridge API** — expose `setState()`/`onStateChange()` methods for live state injection
- **Custom state subclasses** — transmit class schema so Pyodide can reconstruct user-defined param classes
