# Iframe Embedding

Embed panel-live apps, editors, or playgrounds in any page using `<iframe>`.

## Basic pattern

Create a standalone HTML page with your panel-live element, then embed it via iframe:

```html
<!-- host page -->
<iframe
  src="https://your-site.com/panel-live-app.html"
  width="100%"
  height="600"
  style="border: none;"
></iframe>
```

## COOP/COEP requirements

Cross-origin isolation headers must be set on the **framed page** (the page containing `<panel-live>`), not the parent page. The parent page does not need any special headers.

If the framed page uses `mini-coi.js`, the service worker must be registered on the framed page's origin.

## Recommended iframe attributes

```html
<iframe
  src="https://your-site.com/app.html"
  width="100%"
  height="600"
  style="border: none;"
  allow="cross-origin-isolated"
  loading="lazy"
></iframe>
```

- `allow="cross-origin-isolated"` — enables SharedArrayBuffer in the framed page
- `loading="lazy"` — defers loading until the iframe is near the viewport
- Avoid `sandbox` restrictions that block scripts or same-origin access

## Same-origin vs cross-origin

| Scenario | Works? | Notes |
|----------|--------|-------|
| Same-origin iframe | Yes | Full functionality |
| Cross-origin iframe | Yes | Requires CORP headers on CDN resources |
| `sandbox` attribute | Partial | `allow-scripts allow-same-origin` minimum |

## Sizing

panel-live elements fill their container. For fixed-height iframes, set the `height` attribute on the iframe. For responsive sizing, use CSS:

```css
iframe {
  width: 100%;
  height: 80vh;
  border: none;
}
```

Or use `height` on the `<panel-live>` element inside the framed page:

```html
<panel-live mode="app" height="500px">
...
</panel-live>
```

## Known limitations

- **URL hash sharing** — the Share button in playground mode writes to the framed page's URL hash, which may not be visible to users
- **Resize communication** — the iframe cannot automatically resize to fit the panel-live content. Use a fixed height or implement a `postMessage`-based resize protocol
- **Fullscreen** — the `fullscreen` attribute may not work inside iframes due to browser fullscreen API restrictions. Add `allow="fullscreen"` to the iframe if needed
