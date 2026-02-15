# Programmatic Usage (JavaScript API)

Use the JavaScript API to create and control `<panel-live>` instances programmatically — useful for framework integration, dynamic content, and custom workflows.

## Configure global defaults

Call `PanelLive.configure()` before any elements are created to set version pins and CDN URLs:

```javascript
PanelLive.configure({
  pyodideVersion: 'v0.28.2',
  panelVersion: '1.8.7',
  bokehVersion: '3.8.2',
});
```

## Pre-warm the runtime

Call `PanelLive.init()` to start loading Pyodide early (e.g. on page load):

```javascript
PanelLive.init({
  onStatus: msg => document.getElementById('status').textContent = msg
});
```

This is optional — Pyodide will load automatically when the first `<panel-live>` element or `mount()` call needs it.

## Mount an instance programmatically

Use `PanelLive.mount()` to create a `<panel-live>` element and attach it to any DOM container:

```javascript
const ctrl = await PanelLive.mount({
  mode: 'editor',
  theme: 'dark',
  files: {
    'app.py': 'import panel as pn\npn.panel("Hello").servable()',
  },
}, '#my-container');
```

## Interact with the controller

`mount()` returns a `PanelLiveController` for runtime interaction:

```javascript
// Read current state
console.log(ctrl.status);    // 'ready'
console.log(ctrl.getCode()); // current code string

// Update and re-run
ctrl.setCode('import panel as pn\npn.panel("Updated!").servable()');
ctrl.run();

// Access the DOM element
ctrl.element.addEventListener('pl-ready', () => {
  console.log('App rendered');
});

// Clean up
ctrl.destroy();
```

## Static HTML configuration

For pages without JavaScript setup, use `window.PANEL_LIVE_CONFIG`:

```html
<script>
  window.PANEL_LIVE_CONFIG = {
    panelVersion: '1.9.0',
    bokehVersion: '3.9.0'
  };
</script>
<script src="https://cdn.jsdelivr.net/npm/@panel-extensions/panel-live@latest/dist/panel-live.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@panel-extensions/panel-live@latest/dist/panel-live.css">
```

## Full example

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@panel-extensions/panel-live@latest/dist/panel-live.css">
  <script src="https://cdn.jsdelivr.net/npm/@panel-extensions/panel-live@latest/dist/panel-live.js"></script>
</head>
<body>
  <div id="app"></div>
  <button id="run-btn">Run</button>

  <script>
    const ctrl = await PanelLive.mount({
      mode: 'editor',
      files: { 'app.py': 'import panel as pn\npn.panel("Hello").servable()' },
    }, '#app');

    document.getElementById('run-btn').addEventListener('click', () => {
      ctrl.run();
    });
  </script>
</body>
</html>
```

See the [JavaScript API Reference](../reference/javascript-api.md) for complete method signatures and parameter details.
