# Browser Compatibility

panel-live requires modern browser features including WebAssembly, ES2020+, and optionally SharedArrayBuffer.

## Supported browsers

| Browser | Minimum Version | Status |
|---------|----------------|--------|
| Chrome | 90+ | Fully supported |
| Firefox | 90+ | Fully supported |
| Edge | 90+ | Fully supported |
| Safari | 16.4+ | Supported |
| Chrome Android | 90+ | Supported |
| Safari iOS | 16.4+ | Supported |

## Required features

- **WebAssembly** — required for Pyodide
- **ES2020+** — required for dynamic `import()`, optional chaining, nullish coalescing
- **Web Workers** — required for non-blocking Pyodide execution
- **Custom Elements v1** — required for `<panel-live>` registration

## Optional features

- **SharedArrayBuffer** — improves Pyodide performance. Requires cross-origin isolation (COOP/COEP headers or `mini-coi.js`).
- **`prefers-color-scheme` media query** — used by `theme="auto"` for automatic dark mode detection.

## Performance expectations

| Phase | Desktop | Mobile |
|-------|---------|--------|
| Initial Pyodide load | 5-10 seconds | 10-20 seconds |
| Panel + Bokeh install | 2-5 seconds | 3-8 seconds |
| Subsequent code runs | < 1 second | 1-2 seconds |
| Memory usage | ~300-500MB | ~300-500MB |

## Known platform-specific issues

### SharedArrayBuffer behind proxies

Corporate proxies, CDNs, and authentication gateways may strip or block the `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers required for SharedArrayBuffer. panel-live works without SharedArrayBuffer but with reduced performance. See [Auth Proxy Setup](../how-to/auth-proxy-setup.md).

### STATUS_ACCESS_VIOLATION (Chrome/Edge on some Windows machines)

Chrome 137+ ships JSPI (JavaScript Promise Integration) enabled by default, which can conflict with Pyodide's async scheduler on some hardware/driver combinations, causing `STATUS_ACCESS_VIOLATION` crashes. This is hardware-dependent — most machines are unaffected. Firefox is not affected.

**Mitigation (built-in):** panel-live disables JSPI by default (`disableJSPI: true`), removing the crash trigger. A stall detection timer (45s) and automatic crash recovery provide defense-in-depth for any remaining edge cases. No user action required.

**Note:** Enterprise antivirus software (e.g. Sophos StackPivot detection) may separately flag WASM memory operations. This requires endpoint configuration and cannot be mitigated in JavaScript.

### Chrome Android — no SharedWorker

Chrome on Android does not support SharedWorker. The planned SharedWorker mode will automatically fall back to DedicatedWorker on these devices.

## Minimum hardware recommendations

- **RAM:** 8GB minimum for comfortable usage with up to 3 concurrent panel-live elements
- **CPU:** Any modern processor (2015+)
- **Network:** Broadband connection for initial CDN resource loading (~10-20MB)
