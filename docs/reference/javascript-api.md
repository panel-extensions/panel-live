# JavaScript API Reference

Complete reference for the `PanelLive` JavaScript imperative API. Use this API for programmatic control, framework integration, and advanced configuration.

## `PanelLive.configure(options)`

Set global defaults for version pinning and CDN configuration. Must be called **before** the first `init()`, `mount()`, or `<panel-live>` element connects to the DOM.

**Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `pyodideVersion` | `string` | `'v0.28.2'` | Pyodide release version |
| `panelVersion` | `string` | `'1.8.7'` | Panel Python/JS version |
| `bokehVersion` | `string` | `'3.8.2'` | Bokeh Python/JS version |
| `pyodideCdn` | `string` | `'https://cdn.jsdelivr.net/pyodide/'` | Pyodide CDN base URL |
| `panelCdn` | `string` | `'https://cdn.holoviz.org/panel/'` | Panel CDN base URL |
| `bokehCdn` | `string` | `'https://cdn.bokeh.org/bokeh/release/'` | Bokeh CDN base URL |

**Returns:** `void`

**Example:**

```javascript
PanelLive.configure({
  pyodideVersion: 'v0.28.2',
  panelVersion: '1.8.7',
  bokehVersion: '3.8.2',
});
```

Advanced: custom CDN base URLs for airgapped deployments:

```javascript
PanelLive.configure({
  pyodideCdn: 'https://internal-cdn.example.com/pyodide/',
  panelCdn: 'https://internal-cdn.example.com/panel/',
  bokehCdn: 'https://internal-cdn.example.com/bokeh/',
});
```

## `PanelLive.init(options?) -> Promise<void>`

Pre-warm the Pyodide singleton. Idempotent — calling multiple times returns the same promise.

**Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `onStatus` | `function(string)` | — | Callback invoked with status messages during initialization |

**Returns:** `Promise<void>`

**Example:**

```javascript
await PanelLive.init({
  onStatus: msg => console.log('Status:', msg)
});
```

## `PanelLive.mount(options, target) -> Promise<PanelLiveController>`

Programmatically create a `<panel-live>` instance and mount it into a DOM container. Returns a controller for runtime interaction.

**Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `mode` | `string` | `'app'` | Display mode: `'app'`, `'editor'`, or `'playground'` |
| `theme` | `string` | `'auto'` | Color theme: `'auto'`, `'light'`, or `'dark'` |
| `layout` | `string` | mode-aware | Split direction: `'horizontal'` or `'vertical'` |
| `files` | `object` | — | Map of filename to code string (e.g. `{'app.py': '...'}`) |
| `entrypoint` | `string` | — | Filename to execute (defaults to first file) |
| `requirements` | `string[]` | `[]` | pip packages to install before execution |
| `examples` | `object[]` | `[]` | Example definitions: `{name, code}` or `{name, src}` |

The `target` parameter accepts a CSS selector string or a DOM element.

**Returns:** `Promise<PanelLiveController>`

**Example:**

```javascript
const ctrl = await PanelLive.mount({
  mode: 'playground',
  theme: 'dark',
  layout: 'horizontal',
  files: {
    'app.py': 'import panel as pn\npn.panel("Hello").servable()',
    'utils.py': 'def greet(name): return f"Hi {name}"',
  },
  entrypoint: 'app.py',
  requirements: ['pandas', 'hvplot'],
  examples: [
    { name: 'Hello', code: 'import panel as pn\npn.panel("Hello").servable()' },
    { name: 'Advanced', src: 'https://example.com/advanced.py' },
  ],
}, '#my-container');
```

## `PanelLiveController`

Returned by `PanelLive.mount()`. Provides runtime interaction with a mounted instance.

### Properties

| Name | Type | Description |
|------|------|-------------|
| `element` | `HTMLElement` | The underlying `<panel-live>` DOM element |
| `status` | `string` | Current status: `'idle'`, `'loading'`, `'running'`, `'ready'`, or `'error'` |

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `run()` | `void` | Execute the current code (editor/playground modes) |
| `getCode()` | `string` | Get the current code string |
| `setCode(code)` | `void` | Set new code (updates the editor) |
| `destroy()` | `void` | Remove the element and clean up resources |

**Example:**

```javascript
const ctrl = await PanelLive.mount({
  mode: 'editor',
  files: { 'app.py': 'import panel as pn\npn.panel("Hello").servable()' },
}, '#container');

// Interact with the instance
console.log(ctrl.status);       // 'ready'
console.log(ctrl.getCode());    // current code

ctrl.setCode('import panel as pn\npn.panel("Updated!").servable()');
ctrl.run();

// Clean up
ctrl.destroy();
```

## `window.PANEL_LIVE_CONFIG`

Alternative to `PanelLive.configure()` for static HTML pages. Set this global object **before** loading the `panel-live.js` script.

**Example:**

```html
<script>
  window.PANEL_LIVE_CONFIG = {
    panelVersion: '1.9.0',
    bokehVersion: '3.9.0'
  };
</script>
<script src="panel-live.min.js"></script>
```

## Configuration Resolution Order

When multiple configuration sources are present, values are resolved in this order (highest priority first):

1. `PanelLive.configure()` call
2. `window.PANEL_LIVE_CONFIG` global object
3. Built-in defaults embedded in the release

!!! note "Version coupling"
    Bokeh JS version **must** match the Bokeh Python wheel version. Panel JS version **must** match the Panel Python wheel version. This is why they are managed together in a single configuration object.
