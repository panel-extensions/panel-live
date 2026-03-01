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

## Your first app

Ask the LLM to create any interactive Panel app. The code must call
`.servable()` on the final Panel object. For example:

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

- **Claude.ai**: Loading takes 30–60 seconds without COOP/COEP headers.
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
