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

### Streamable HTTP (for Claude.ai and remote access)

```bash
panel-live mcp --transport streamable-http --port 5002
```

Starts a Streamable HTTP server. This is the transport Claude.ai uses for
remote MCP connectors. Expose it via ngrok or a public server to use from
Claude.ai. The server listens on `http://localhost:5002` by default.

### HTTP / SSE

```bash
panel-live mcp --transport http --port 5002
panel-live mcp --transport sse --port 5002
```

Legacy SSE-based transports. Useful for testing and tools that don't yet
support Streamable HTTP. Note: SSE may be deprecated by MCP clients in the
future.

## Configuration examples

### Claude.ai (remote connector)

!!! warning "Extremely slow loading"

    Claude.ai's MCP App webview does not provide cross-origin isolation headers
    (COOP/COEP), so Pyodide falls back to a much slower initialization path.
    **First load takes 2+ minutes.** We have reported it [here](https://github.com/modelcontextprotocol/ext-apps/issues/513) and at claude.ai.

Claude.ai requires a publicly accessible MCP server. We hope to host a public
panel-live MCP server in the future — for now, you can test with a local tunnel.

!!! note "ngrok is for testing only"

    The [ngrok](https://ngrok.com/) example below exposes your local MCP server to the internet.
    This is **not recommended for production use** — it is included here
    only to demonstrate that panel-live can work with Claude.ai.

1. Start the server and expose it via ngrok:

    ```bash
    panel-live mcp --transport streamable-http --port 5002
    # In another terminal:
    ngrok http 5002
    ```

2. In Claude.ai, go to **Settings > Connectors > Add custom connector**.
3. Paste the ngrok URL (e.g., `https://abc123.ngrok-free.app/mcp/`).

Available on free plans (1 connector) and Pro/Max/Team/Enterprise.

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
much slower initialization path (2+ minutes). VS Code Copilot Chat provides
these headers and loads in ~5 seconds. This is a known limitation of the
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
