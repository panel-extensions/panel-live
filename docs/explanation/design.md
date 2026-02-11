# Design Decisions

This page explains *why* `panel-live` is designed the way it is. For *how* to use the API, see the [How-to Guides](../how-to/mode.md) and [Reference](../reference/html-api.md) pages.

## Custom element (`<panel-live>`)

Three of four competitors (gradio-lite, stlite, PyScript) use custom HTML elements. Attributes are the natural way to configure HTML, and child elements compose naturally. A custom element also means zero framework dependencies — it works in any HTML page, any static site generator, any CMS.

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

## Execution queue

Pyodide is single-threaded. The global `state.curdoc` means concurrent app executions would corrupt each other's document state. All executions are serialized through a promise-based queue. This is transparent — multiple `<panel-live>` elements on a page initialize Pyodide once and run sequentially.

## Version coupling

Bokeh JS version **must** match the Bokeh Python wheel version. Panel JS version **must** match the Panel Python wheel version. This is why versions are managed together in `PanelLive.configure()` — a single configuration point prevents version mismatches that produce cryptic runtime errors.

## CDN distribution

Each release of `panel-live.js` embeds matching defaults for Panel, Bokeh, and Pyodide versions. Users can override via `PanelLive.configure()` or `window.PANEL_LIVE_CONFIG`.

```
cdn.holoviz.org/panel-live/{version}/panel-live.min.js
cdn.holoviz.org/panel-live/latest/panel-live.min.js
```

## Competitor comparison

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
| **Worker** | Future (v1.x) | Dedicated/Shared | Dedicated/Shared | Optional | Dedicated |

### Differentiators

1. **Three display modes in one element** — no other competitor offers app, editor, and playground from a single tag.
2. **Full CSS custom property system** — no competitor exposes comprehensive `--pl-*` theming.
3. **`<panel-example>` child elements** — built-in example selector for playground mode.
4. **`PanelLiveController`** — richer runtime interaction than any competitor's JS API.
5. **`theme="auto"`** — automatic light/dark detection via `prefers-color-scheme`.
6. **Panel/HoloViz ecosystem** — hvPlot, HoloViews, Param, panel-material-ui provide a richer widget/visualization toolkit.
