# Events

Listen for `<panel-live>` lifecycle events to integrate with your application logic.

## Available events

| Event | When it fires |
|-------|---------------|
| `pl-status` | Each lifecycle stage (loading, running, ready) |
| `pl-ready` | App fully rendered and interactive |
| `pl-error` | Python execution error |
| `pl-run-start` | Code execution begins (including re-runs) |
| `pl-run-end` | Code execution finishes |

## Listening for events

### Track loading progress

```javascript
const el = document.querySelector('panel-live');
el.addEventListener('pl-status', (e) => {
  document.getElementById('status').textContent = e.detail.message;
});
```

### React when ready

```javascript
el.addEventListener('pl-ready', () => {
  console.log('App is interactive');
  // Safe to interact with output or hide a loading overlay
});
```

### Handle errors

```javascript
el.addEventListener('pl-error', (e) => {
  console.error('Error:', e.detail.error);
  // e.detail.traceback contains the full Python traceback
});
```

### Track execution cycles

```javascript
el.addEventListener('pl-run-start', () => {
  document.getElementById('spinner').style.display = 'block';
});

el.addEventListener('pl-run-end', () => {
  document.getElementById('spinner').style.display = 'none';
});
```

## With `PanelLiveController`

Events are dispatched on the underlying DOM element, accessible via `ctrl.element`:

```javascript
const ctrl = await PanelLive.mount({ mode: 'editor', ... }, '#container');
ctrl.element.addEventListener('pl-ready', () => {
  console.log('Mounted app is ready');
});
```

See the [Events Reference](../reference/events.md) for complete `detail` payload schemas.
