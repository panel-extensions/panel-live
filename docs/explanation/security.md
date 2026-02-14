# Security Model

panel-live executes all Python code **client-side** in the user's browser. This page explains what that means for security and why it is safe to embed user-editable code in public-facing sites.

## Client-side execution

Unlike traditional Panel deployments where Python runs on a server, panel-live uses [Pyodide](https://pyodide.org/) to run Python inside a WebAssembly sandbox in the browser. The code never leaves the user's machine — there is no server to attack, no backend to compromise, no other users' data to access.

## What the browser sandbox prevents

The browser's security sandbox enforces strict isolation:

- **No filesystem access** — Python code cannot read or write files on the user's computer. Pyodide provides an in-memory virtual filesystem that is destroyed when the page closes.
- **No network access to origin** — code cannot make requests to the hosting server's internal APIs or databases. Outbound HTTP requests are subject to browser CORS policies.
- **No access to other users' data** — each browser tab runs its own isolated Pyodide instance. There is no shared state between users.
- **No OS-level access** — system calls, subprocesses, and hardware access (except via browser APIs) are blocked by WebAssembly.
- **No cross-origin data** — the same-origin policy prevents access to data from other domains.

## Why it's safe for public sites

Documentation authors and site operators can safely embed `<panel-live>` elements with editable code because:

1. **Users can only affect their own browser** — malicious code in the editor can at worst freeze the tab or consume memory. It cannot affect other visitors, the server, or the host site.
2. **No server resources at risk** — there is no backend process to overload, no database to query, no secrets to exfiltrate.
3. **Web Worker isolation** — Pyodide runs in a Dedicated Worker, further isolating it from the main page. A crash in the worker does not crash the page.

## Source code visibility

Code embedded in `<panel-live>` elements is visible in the page source, browser developer tools, and the DOM. The base64 encoding used for URL sharing is obfuscation, not encryption. **Do not embed secrets, API keys, or proprietary code** in panel-live elements.

This is inherent to all browser-based Python runtimes (Pyodide, PyScript, stlite, shinylive) — any code that runs in the browser is visible to the user.

## Cross-origin isolation (COOP/COEP)

panel-live benefits from cross-origin isolation headers for SharedArrayBuffer support:

- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

These headers restrict which resources the page can load (only same-origin or explicitly opted-in cross-origin resources). This is an additional security layer, not a requirement — panel-live works without these headers, but with reduced performance.

The `mini-coi.js` service worker provides these headers when server configuration is not possible.

## Comparison: client-side vs server-side execution

| Aspect | panel-live (client-side) | Traditional Panel (server-side) |
|--------|--------------------------|--------------------------------|
| Code execution | User's browser | Your server |
| Attack surface | Browser sandbox only | Server OS, network, database |
| User data isolation | Inherent (separate tabs) | Requires authentication |
| Resource cost | User's CPU/RAM | Your server's CPU/RAM |
| Secrets | Cannot be protected | Can be protected server-side |
| Scalability | Unlimited (no server load) | Limited by server capacity |
