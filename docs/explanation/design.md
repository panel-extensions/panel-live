# Design Decisions

This page explains *why* `panel-live` is designed the way it is. For *how* to use the API, see the [How-to Guides](../how-to/mode.md) and [Reference](../reference/html-api.md) pages.

## Custom element (`<panel-live>`)

Three of four alternatives (gradio-lite, stlite, PyScript) use custom HTML elements. Attributes are the natural way to configure HTML, and child elements compose naturally. A custom element also means zero framework dependencies — it works in any HTML page, any static site generator, any CMS.

## Light DOM (no Shadow DOM)

Bokeh's `embed_items()` uses `document.getElementById()` on the main document. Shadow DOM encapsulates its internal DOM tree, making elements invisible to this lookup. Since Panel's rendering pipeline depends on Bokeh, `<panel-live>` must use Light DOM.

All styling is scoped via the `panel-live` element selector and `.pl-*` class prefix to avoid leaking into the host page.

## Single element, mode as attribute

`mode="app|editor|playground"` on a single `<panel-live>` tag is simpler than three separate element types. It reduces the API surface, makes switching modes a one-attribute change, and keeps documentation focused.

## Dual API (declarative + imperative)

The declarative HTML API (`<panel-live mode="editor">`) covers the common case: embedding in static pages, Markdown docs, and CMS content.

The imperative JavaScript API (`PanelLive.mount()`) covers framework integration (React, Vue, Svelte), dynamic content, and advanced workflows where programmatic control is needed.

Both APIs produce the same `<panel-live>` element under the hood.

## `theme="auto"` default

The default `theme="auto"` detects the user's OS preference via `window.matchMedia('(prefers-color-scheme: dark)')` and updates automatically when the preference changes. A `data-resolved-theme` attribute stores the resolved value for CSS targeting.

This means `<panel-live>` elements match the host page without any configuration in most cases.

## Dedicated Worker

Pyodide loads 300-500MB of data and runs computationally intensive Python code. Running this on the main thread blocks the page — spinners freeze, buttons don't respond, and the user sees a hung page for 5-15 seconds during initialization.

Moving Pyodide to a Dedicated Worker (`panel-live-worker.js`) keeps the main thread free. Spinners animate smoothly, the page remains interactive during load and execution, and the ~300-500MB memory footprint is isolated from the main thread. The singleton worker bridge (`worker-bridge.js`) manages all communication: Pyodide initialization, code execution, Bokeh `embed_items()` calls back to the main thread, bidirectional document sync via JSON patches, and real-time `print()` streaming.

A SharedWorker mode (sharing a single Pyodide runtime across multiple elements) is planned as a follow-on for documentation pages with many examples.

## Execution in Worker

All three execution branches (servable, servable-target, expression) are unified into two Python scripts loaded as text strings via esbuild's `.py` text loader:

- `worker-setup.py` — sets up the execution environment for all branches, including `StreamingWriter` for real-time `print()` output via JS callbacks
- `worker-render.py` — serializes the Bokeh Document to JSON via `_doc_json()` for transfer to the main thread

The worker has an internal execution queue. Pyodide is single-threaded, and the global `state.curdoc` means concurrent app executions would corrupt each other's document state. All executions are serialized through a promise-based queue. This is transparent — multiple `<panel-live>` elements on a page initialize Pyodide once and run sequentially.

## Modular ES modules

The original monolithic `panel-live.js` was decomposed into 13 focused ES modules in `lib/`, each with a single responsibility and named exports. This makes the codebase navigable, testable, and maintainable:

- Configuration is separate from rendering (`config.js` vs `panel-live-element.js`)
- The worker bridge is isolated from the custom element (`worker-bridge.js`)
- Error rendering is reusable across contexts (`error-renderer.js`)
- URL sharing logic is independent of the UI (`url-sharing.js`)

esbuild bundles these into `dist/panel-live.js` (main IIFE) + `dist/panel-live-worker.js` (worker IIFE) + `dist/panel-live.css` with source maps. The `.py` text loader pattern allows Python bootstrap scripts to live as `.py` files in `lib/python/` while being imported as strings in JavaScript — keeping Python code readable and lintable.

## postMessage validation

Worker↔main thread communication uses `postMessage` for all messages. Although Web Workers use `MessagePort` (not cross-origin `postMessage`), which means `event.origin` is not available, structural validation is still valuable as defense-in-depth.

Both sides validate incoming messages:

- **`worker-bridge.js`** (`_validateWorkerMessage`) — whitelists valid message types (`ready`, `status`, `render`, `no-output`, `stdout`, `stderr`, `patch`, `idle`, `error`, `done`) and checks type-specific required fields (e.g., `render` must have `runId`, `targetId`, `docs_json`).
- **`panel-live-worker.js`** (`_validateMainMessage`) — whitelists valid message types (`init`, `run`, `install`, `write-file`, `rendered`, `patch`, `reset`) and checks type-specific required fields (e.g., `run` must have `code`, `targetId`, `runId`).

Invalid messages are rejected with a `console.warn` and not processed. This prevents malformed messages from causing unexpected behavior if panel-live is embedded in iframes or other contexts where message integrity matters.

## CSP nonce support

Sites with strict Content Security Policy headers block inline styles and dynamically created `<script>` or `<link>` elements unless they carry a nonce. `PanelLive.configure({ styleNonce: "abc123" })` passes the nonce to all dynamically injected `<script>` and `<link>` elements via the `nonce` attribute.

The nonce is stored in `_config.styleNonce` (default: empty string) and applied in `loadScript()` and `loadCSS()` when truthy. This enables panel-live on sites that require `script-src 'nonce-...'` or `style-src 'nonce-...'` CSP directives.

## Version coupling

Bokeh JS version **must** match the Bokeh Python wheel version. Panel JS version **must** match the Panel Python wheel version. This is why versions are managed together in `PanelLive.configure()` — a single configuration point prevents version mismatches that produce cryptic runtime errors.

## CDN distribution

Each release of `panel-live.js` embeds matching defaults for Panel, Bokeh, and Pyodide versions. Users can override via `PanelLive.configure()` or `window.PANEL_LIVE_CONFIG`.

The JS/CSS bundle is published to npm and served via jsDelivr:

```
cdn.jsdelivr.net/npm/panel-live@{version}/dist/panel-live.js
cdn.jsdelivr.net/npm/panel-live@latest/dist/panel-live.js
```

jsDelivr's `cdn.jsdelivr.net/npm/` origin is widely allowlisted (including in Claude.ai artifacts), making npm the natural distribution channel for a web component.

## Comparison with alternatives

| Feature | panel-live | gradio-lite | stlite | PyScript | shinylive |
|---------|-----------|-------------|--------|----------|-----------|
| **HTML Element** | `<panel-live>` | `<gradio-lite>` | `<streamlit-app>` | `<script type="py">` | N/A (Quarto) |
| **Modes** | `app`, `editor`, `playground` | `playground` (bool) | N/A | `py-editor` | `editor`, `viewer` |
| **Theme** | `auto`, `light`, `dark` | `dark`, `light` | Via config | N/A | N/A |
| **Layout** | `horizontal`, `vertical` | `horizontal`, `vertical` | N/A | N/A | `vertical` |
| **Multi-file** | `<panel-file>` | `<gradio-file>` | `<app-file>` | `files` config | `## file:` |
| **Requirements** | `<panel-requirements>` | `<gradio-requirements>` | `<app-requirements>` | `packages` | `requirements.txt` |
| **Examples** | `<panel-example>` | N/A | N/A | N/A | N/A |
| **JS API** | `PanelLive.mount()` | N/A | `mount()` | Programmatic | CLI export |
| **CSS variables** | `--pl-*` | N/A | N/A | N/A | N/A |
| **Events** | `pl-status`, `pl-ready`, etc. | N/A | N/A | N/A | N/A |
| **Worker** | Dedicated | Dedicated/Shared | Dedicated/Shared | Optional | Dedicated |

### Differentiators

1. **Three display modes in one element** — no other alternative offers app, editor, and playground from a single tag.
2. **Full CSS custom property system** — no alternative exposes comprehensive `--pl-*` theming.
3. **`<panel-example>` child elements** — built-in example selector for playground mode.
4. **`PanelLiveController`** — richer runtime interaction than any alternative's JS API.
5. **`theme="auto"`** — automatic light/dark detection via `prefers-color-scheme`.
6. **Panel/HoloViz ecosystem** — hvPlot, HoloViews, Param, panel-material-ui provide a richer widget/visualization toolkit.
7. **Lightweight, zero-framework architecture** — CodeMirror 6 + esbuild is lighter than Monaco + Vite (stlite) or React + webpack (shinylive). No framework dependency — works in any HTML page.
