# MCP Integration

!!! warning "Experimental"

    MCP support in panel-live is **highly experimental** and not yet robust.
    We are actively looking for feedback — please
    [open an issue](https://github.com/panel-extensions/panel-live/issues) if
    you run into problems or have suggestions.

This guide covers advanced configuration for the panel-live MCP server.

## Transport options

### stdio (default)

```bash
panel-live mcp
```

Used by VS Code Copilot Chat and Claude Desktop. The MCP client starts the
server as a subprocess and communicates via stdin/stdout.

### HTTP (SSE)

```bash
panel-live mcp --transport http --port 5002
```

Starts an HTTP server with Server-Sent Events transport. Useful for testing
and remote setups. The server listens on `http://localhost:5002` by default.

## Configuration examples

### VS Code Copilot Chat

Create `.vscode/mcp.json` in your project:

```json
{
  "servers": {
    "panel-live": {
      "command": "uvx",
      "args": ["--from", "panel-live[mcp] @ git+https://github.com/panel-extensions/panel-live.git", "panel-live", "mcp"]
    }
  }
}
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "panel-live": {
      "command": "uvx",
      "args": ["--from", "panel-live[mcp] @ git+https://github.com/panel-extensions/panel-live.git", "panel-live", "mcp"]
    }
  }
}
```

### Claude Code

Add to `.mcp.json` or your settings:

```json
{
  "mcpServers": {
    "panel-live": {
      "command": "uvx",
      "args": ["--from", "panel-live[mcp] @ git+https://github.com/panel-extensions/panel-live.git", "panel-live", "mcp"]
    }
  }
}
```

## Troubleshooting

### Missing dependency

If you see:

```
Error: fastmcp is not installed. Install it with:

    pip install panel-live[mcp]

Then restart your MCP client.
```

Install the MCP extra and restart your client (VS Code, Claude Desktop, etc.):

```bash
pip install "panel-live[mcp] @ git+https://github.com/panel-extensions/panel-live.git"
```

### Server not starting

Verify the CLI works:

```bash
panel-live mcp --help
panel-live --version
```

If `panel-live` is not found, ensure it is installed in the active Python
environment and the `Scripts`/`bin` directory is on your PATH.

### Slow loading in Claude.ai

Claude.ai does not provide COOP/COEP headers, so Pyodide falls back to a
slower initialization path (30–60 seconds). VS Code Copilot Chat provides
these headers and loads in 5–15 seconds. This is a known limitation of the
MCP Apps runtime environment.

### Network errors

The MCP App loads assets from:

- `panel-extensions.github.io` — panel-live JS/CSS
- `cdn.jsdelivr.net` — Pyodide, Panel, Bokeh
- `pypi.org` / `files.pythonhosted.org` — Python packages
- `unpkg.com` — MCP Apps SDK

Ensure these domains are accessible from the client's network.

## Security model

The MCP App runs in a sandboxed webview with a Content Security Policy (CSP)
that restricts which domains can load scripts, styles, and make network
requests. The CSP allows:

- `'unsafe-eval'` and `'wasm-unsafe-eval'` — required by Pyodide for
  Python-to-JS interop and WebAssembly loading
- `'unsafe-inline'` — required by panel-live for inline styles
- CDN domains for Pyodide, Panel, Bokeh, and plotting libraries
- `blob:` and `data:` URIs for Pyodide workers and Bokeh images

All code execution happens in the browser via Pyodide (WebAssembly). No code
is sent to any external server. The Python runtime is completely client-side.

## FastMCP direct usage

The server can also be run directly with FastMCP:

```bash
fastmcp run panel_live.mcp:mcp
```

Or used programmatically:

```python
from panel_live.mcp import create_mcp_server

server = create_mcp_server()
server.run(transport="stdio")
```
