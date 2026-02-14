# Auth Proxy Setup

Configure cross-origin isolation when `mini-coi.js` fails behind authentication proxies.

## Problem

`mini-coi.js` works by registering a service worker that intercepts all requests and adds `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers. Behind authentication proxies (corporate SSO, Posit Connect, OAuth gateways), the browser's fetch for the service worker script may be redirected to a login page, causing registration to fail silently.

## Symptoms

- SharedArrayBuffer is unavailable (check `crossOriginIsolated` in the browser console)
- Pyodide loads more slowly than expected
- Console warnings about cross-origin isolation

## Solution: server-side headers

Instead of relying on `mini-coi.js`, configure your server or reverse proxy to send the required headers directly.

### Nginx

```nginx
server {
    add_header Cross-Origin-Opener-Policy same-origin always;
    add_header Cross-Origin-Embedder-Policy require-corp always;
}
```

### Apache

```apache
Header always set Cross-Origin-Opener-Policy "same-origin"
Header always set Cross-Origin-Embedder-Policy "require-corp"
```

### Caddy

```
header {
    Cross-Origin-Opener-Policy same-origin
    Cross-Origin-Embedder-Policy require-corp
}
```

### Cloudflare

Add a Transform Rule in the Cloudflare dashboard:

1. Go to **Rules > Transform Rules > Modify Response Header**
2. Add rules to set `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`

### Netlify

Add to `netlify.toml`:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    Cross-Origin-Opener-Policy = "same-origin"
    Cross-Origin-Embedder-Policy = "require-corp"
```

### Vercel

Add to `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
      ]
    }
  ]
}
```

## When mini-coi.js suffices

`mini-coi.js` works well when:

- The page is served directly (no authentication proxy)
- The hosting platform allows service worker registration
- There is no corporate proxy that intercepts service worker requests

Use server-side headers when:

- Behind an authentication proxy (SSO, OAuth)
- Hosting on a platform that blocks service workers
- You need guaranteed cross-origin isolation regardless of client configuration
