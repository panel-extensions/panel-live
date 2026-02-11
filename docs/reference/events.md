# Events Reference

`<panel-live>` dispatches custom events on the element during its lifecycle. Listen for these events to integrate with your application logic.

## Event Summary

| Event | `detail` | Description |
|-------|----------|-------------|
| `pl-status` | `{status: string, message: string}` | Status change during lifecycle |
| `pl-ready` | — | App fully rendered and interactive |
| `pl-error` | `{error: string, traceback: string}` | Python execution error |
| `pl-run-start` | — | Code execution started (including re-runs) |
| `pl-run-end` | — | Code execution finished |

## Event Details

### `pl-status`

Fired whenever the component transitions between lifecycle stages.

**`detail` payload:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | `string` | Current status: `'loading'`, `'running'`, `'ready'`, `'error'`, `'idle'` |
| `message` | `string` | Human-readable description of the current stage |

**Example:**

```javascript
const el = document.querySelector('panel-live');
el.addEventListener('pl-status', (e) => {
  console.log(`[${e.detail.status}] ${e.detail.message}`);
});
// Output:
// [loading] Loading Pyodide...
// [loading] Installing packages...
// [running] Running app...
// [ready] App rendered
```

### `pl-ready`

Fired once the app has fully rendered and is interactive. No `detail` payload.

**Example:**

```javascript
el.addEventListener('pl-ready', () => {
  console.log('App is ready');
  // Safe to interact with the rendered output
});
```

### `pl-error`

Fired when Python code execution produces an error.

**`detail` payload:**

| Field | Type | Description |
|-------|------|-------------|
| `error` | `string` | Error message |
| `traceback` | `string` | Full Python traceback |

**Example:**

```javascript
el.addEventListener('pl-error', (e) => {
  console.error('Python error:', e.detail.error);
  console.error('Traceback:', e.detail.traceback);
});
```

### `pl-run-start`

Fired when code execution begins, including re-runs from the editor/playground Run button. No `detail` payload.

**Example:**

```javascript
el.addEventListener('pl-run-start', () => {
  console.log('Execution started');
});
```

### `pl-run-end`

Fired when code execution completes (whether successful or not). No `detail` payload.

**Example:**

```javascript
el.addEventListener('pl-run-end', () => {
  console.log('Execution finished');
});
```

## Listening for Events

### On a specific element

```javascript
const el = document.querySelector('#my-app');
el.addEventListener('pl-ready', () => {
  // this specific app is ready
});
```

### On all elements

```javascript
document.querySelectorAll('panel-live').forEach(el => {
  el.addEventListener('pl-ready', () => {
    console.log('Ready:', el.id || el);
  });
});
```

### With `PanelLiveController`

```javascript
const ctrl = await PanelLive.mount({ mode: 'editor', ... }, '#container');
ctrl.element.addEventListener('pl-ready', () => {
  console.log('Mounted app is ready');
});
```
