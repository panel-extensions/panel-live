# Self-Hosting

Host all panel-live assets on your own server for air-gapped, enterprise, or privacy-sensitive deployments.

## What to download

panel-live requires these resources at runtime:

1. **panel-live JS/CSS** — `panel-live.js`, `panel-live-worker.js`, `panel-live.css`
2. **Pyodide** — the full Pyodide distribution (~20MB compressed)
3. **Panel and Bokeh wheels** — Python `.whl` files matching the JS versions
4. **Bokeh and Panel JS** — client-side rendering libraries

## Directory structure

Organize downloaded assets on your server:

```
/static/
├── panel-live/
│   ├── panel-live.js
│   ├── panel-live-worker.js
│   └── panel-live.css
├── pyodide/
│   └── v0.28.2/
│       └── full/
│           ├── pyodide.js
│           ├── pyodide.asm.wasm
│           ├── pyodide.asm.js
│           └── ... (full distribution)
├── panel/
│   └── 1.8.7/
│       └── dist/
│           ├── panel.min.js
│           └── wheels/
│               ├── bokeh-3.8.2-py3-none-any.whl
│               └── panel-1.8.7-py3-none-any.whl
└── bokeh/
    └── release/
        ├── bokeh-3.8.2.js
        ├── bokeh-widgets-3.8.2.min.js
        └── bokeh-tables-3.8.2.min.js
```

## Configure panel-live

Point panel-live to your local assets using `PanelLive.configure()` or `window.PANEL_LIVE_CONFIG`:

```html
<script>
window.PANEL_LIVE_CONFIG = {
  pyodideCdn: '/static/pyodide/',
  panelCdn: '/static/panel/',
  bokehCdn: '/static/bokeh/release/',
  workerUrl: '/static/panel-live/panel-live-worker.js',
};
</script>
<link rel="stylesheet" href="/static/panel-live/panel-live.css">
<script src="/static/panel-live/panel-live.js"></script>
```

Or equivalently after the script loads:

```html
<script>
PanelLive.configure({
  pyodideCdn: '/static/pyodide/',
  panelCdn: '/static/panel/',
  bokehCdn: '/static/bokeh/release/',
  workerUrl: '/static/panel-live/panel-live-worker.js',
});
</script>
```

## Server headers

Your server must send cross-origin isolation headers for SharedArrayBuffer support:

### Nginx

```nginx
location /static/ {
    add_header Cross-Origin-Opener-Policy same-origin;
    add_header Cross-Origin-Embedder-Policy require-corp;
}
```

### Apache

```apache
<Directory "/var/www/static">
    Header set Cross-Origin-Opener-Policy "same-origin"
    Header set Cross-Origin-Embedder-Policy "require-corp"
</Directory>
```

### Caddy

```
header /static/* {
    Cross-Origin-Opener-Policy same-origin
    Cross-Origin-Embedder-Policy require-corp
}
```

## Verification checklist

After setting up self-hosting, verify:

- [ ] `panel-live.js` loads without network errors (check browser console)
- [ ] The Web Worker starts (look for "Panel X.Y.Z ready (worker)" in console)
- [ ] Pyodide initializes (loading spinner completes)
- [ ] A simple `<panel-live>` element renders correctly
- [ ] No requests are made to external CDNs (check Network tab)
- [ ] `crossOriginIsolated` is `true` in the browser console (for SharedArrayBuffer)
