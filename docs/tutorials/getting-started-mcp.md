# Getting Started with MCP

!!! warning "Experimental"

    MCP support in panel-live is **highly experimental** and not yet robust.
    We are actively looking for feedback — please
    [open an issue](https://github.com/panel-extensions/panel-live/issues) if
    you run into problems or have suggestions.

This tutorial shows how to use panel-live as an MCP server so that LLM clients
(VS Code Copilot Chat, Claude Desktop) can render interactive Panel apps
directly in the chat.

MCP (Model Context Protocol) Apps let tools return rich, interactive UI.
The `show_panel_live` tool sends Python code to a browser-based Pyodide
runtime that renders Panel dashboards — no server needed.

## Install

panel-live is not yet published to PyPI. Install directly from GitHub:

```bash
pip install "panel-live[mcp] @ git+https://github.com/panel-extensions/panel-live.git"
```

This installs `panel-live` plus the [FastMCP](https://gofastmcp.com/) dependency
required for the MCP server.

## VS Code Copilot Chat

Create `.vscode/mcp.json` in your project root:

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

Alternatively, if you already installed panel-live in your environment:

```json
{
  "servers": {
    "panel-live": {
      "command": "panel-live",
      "args": ["mcp"]
    }
  }
}
```

Restart VS Code. In Copilot Chat, ask:

> Create an interactive sine wave with a frequency slider

Copilot will call the `show_panel_live` tool and render the app inline.

![VS Code Copilot Chat demo](../assets/gifs/panel-live-vs-code.gif)

## Claude Desktop

Add to your `claude_desktop_config.json`:

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

Alternatively, if panel-live is already installed:

```json
{
  "mcpServers": {
    "panel-live": {
      "command": "panel-live",
      "args": ["mcp"]
    }
  }
}
```

Restart Claude Desktop and ask for an interactive visualization.

<!-- TODO: replace with actual GIF recording
![Claude Desktop demo](../assets/gifs/mcp-claude-desktop.gif)
-->

## Claude.ai (remote connector)

!!! warning "Extremely slow loading"

    Claude.ai's MCP App webview does not provide cross-origin isolation headers
    (COOP/COEP), so Pyodide falls back to a much slower initialization path.
    **First load takes 2+ minutes.** We have reported it [here](https://github.com/modelcontextprotocol/ext-apps/issues/513) and at claude.ai.

Claude.ai supports remote MCP servers via Streamable HTTP. This requires
a publicly accessible MCP server. We hope to host a public panel-live MCP
server in the future — for now, you can test with a local tunnel.

!!! note "ngrok is for testing only"

    The [ngrok](https://ngrok.com/) example below exposes your local MCP server to the internet.
    This is **not recommended for production use** — it is included here
    only to demonstrate that panel-live can work with Claude.ai.

```bash
panel-live mcp --transport streamable-http --port 5002
# In another terminal:
ngrok http 5002
```

Then in Claude.ai: **Settings > Connectors > Add custom connector**, paste
the ngrok URL (e.g., `https://abc123.ngrok-free.app/mcp/`).

See the [MCP Integration guide](../how-to/mcp-integration.md) for details.

![Claude.ai](../assets/gifs/panel-live-claude-ai.gif)

## Your first app

Ask the LLM to create any interactive Panel app. You can use Panel code
(with `.servable()`) or regular Python where the last expression is rendered.
For example:

```python
import panel as pn
import numpy as np

freq = pn.widgets.FloatSlider(name="Frequency", start=0.1, end=10, value=2)
x = np.linspace(0, 2 * np.pi, 200)

def plot(f):
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots()
    ax.plot(x, np.sin(f * x))
    ax.set_ylim(-1.2, 1.2)
    plt.close(fig)
    return fig

pn.Column(freq, pn.bind(plot, freq)).servable()
```

Available libraries include Panel, Bokeh, HoloViews, hvPlot, Plotly,
Matplotlib, Altair, NumPy, Pandas, SciPy, and most pure-Python packages.

## Known limitations

- **Claude.ai**: Loading takes +2 mins without COOP/COEP headers.
  VS Code Copilot Chat is faster because it provides these headers.
- **Server-side resources**: Code runs in the browser. Databases, filesystem,
  and network APIs are not available.
- **Heavy packages**: Libraries like scikit-learn, xarray, and seaborn work
  but add 10–30 seconds to the first load.

## Next steps

- [MCP Integration](../how-to/mcp-integration.md) — transport options,
  troubleshooting, and security model.
- [Display Modes](../how-to/mode.md) — app, editor, and playground modes.
- [Examples](../examples.md) — browse interactive examples.
