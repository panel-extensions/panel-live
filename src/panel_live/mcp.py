"""MCP server for panel-live.

Provides the ``show_panel_live`` tool for rendering interactive Panel apps
in MCP Apps-capable clients (VS Code Copilot Chat, Claude.ai, etc.).

Start the server via CLI::

    panel-live mcp                       # stdio (default)
    panel-live mcp --transport http      # SSE for testing

Or run directly with FastMCP::

    fastmcp run panel_live.mcp:mcp

.. note::

   This module intentionally avoids importing ``panel``, ``bokeh``, or
   ``panel_live.__init__`` to keep MCP server startup fast (~0.5 s instead
   of 5-10 s).
"""

from __future__ import annotations

import importlib.metadata
import json
from pathlib import Path

from fastmcp import Context
from fastmcp import FastMCP
from fastmcp.server.apps import AppConfig
from fastmcp.server.apps import ResourceCSP

RESOURCE_URI = "ui://panel-live/show.html"
TEMPLATE_PATH = Path(__file__).parent / "templates" / "show.html"


def create_mcp_server() -> FastMCP:
    """Create and return the panel-live MCP server.

    Returns
    -------
    FastMCP
        A configured FastMCP server instance with the ``show_panel_live``
        tool and the ``ui://panel-live/show.html`` MCP App resource.
    """
    version = importlib.metadata.version("panel-live")

    mcp = FastMCP(
        name="panel-live",
        instructions=(
            "Render interactive Python data apps in chat using Panel + Pyodide. "
            "Use the show_panel_live tool when the user asks for dashboards, "
            "interactive visualizations, or widget-driven apps. "
            "Code runs in the browser via WebAssembly — no server needed."
        ),
        version=version,
    )

    csp = ResourceCSP(
        resource_domains=[
            "'unsafe-inline'",  # panel-live injects inline styles
            "'unsafe-eval'",  # Pyodide uses eval() for Python→JS interop
            "'wasm-unsafe-eval'",  # Pyodide loads WebAssembly modules
            "blob:",  # Pyodide creates blob URLs for workers
            "data:",  # Bokeh uses data: URIs for images
            "https://unpkg.com",  # @modelcontextprotocol/ext-apps SDK
            "https://panel-extensions.github.io",  # panel-live JS/CSS
            "https://cdn.holoviz.org",
            "https://cdn.jsdelivr.net",
            "https://cdn.plot.ly",
            "https://pyodide-cdn2.iodide.io",
            "https://pypi.org",
            "https://files.pythonhosted.org",
            "https://cdn.bokeh.org",
            "https://raw.githubusercontent.com",
        ],
        connect_domains=[
            "https://unpkg.com",  # ext-apps SDK module fetch
            "https://panel-extensions.github.io",
            "https://cdn.holoviz.org",
            "https://cdn.jsdelivr.net",
            "https://cdn.plot.ly",
            "https://pyodide-cdn2.iodide.io",
            "https://pypi.org",
            "https://files.pythonhosted.org",
            "https://cdn.bokeh.org",
            "https://raw.githubusercontent.com",
        ],
    )

    @mcp.resource(RESOURCE_URI, app=AppConfig(csp=csp))
    def show_view() -> str:
        """Return the MCP App HTML."""
        return TEMPLATE_PATH.read_text(encoding="utf-8")

    @mcp.tool(name="show_panel_live", app=AppConfig(resource_uri=RESOURCE_URI))
    async def show_panel_live(code: str, ctx: Context | None = None) -> str:
        """Render interactive Python data apps in the chat using Panel + Pyodide (browser WASM).

        ## Use when
        - User asks for an interactive visualization, dashboard, or data app
        - User wants widgets (sliders, dropdowns, buttons) that control a plot
        - User asks for Panel, hvPlot, HoloViews, Bokeh, Plotly, Matplotlib, or Altair
        - User wants to explore data interactively

        ## Don't use when
        - User asks for a simple text/table answer with no interactivity
        - Code needs server-side resources (databases, filesystem, network APIs)

        ## Code requirements
        - Code runs in Pyodide (browser Python). Available: panel, bokeh, holoviews,
          hvplot, plotly, matplotlib, altair, numpy, pandas, scipy, plus pure-Python pkgs.
        - Two code styles are supported:
          1. **Panel code**: build a layout and call `.servable()` on the final object.
          2. **Regular Python**: the last expression is rendered automatically
             (e.g., a matplotlib figure on the last line).
        - Do NOT use `.show()`, `.plot()`, or Panel template classes (e.g., `FastListTemplate`).
        - Use `pn.extension(...)` if loading JS extensions (e.g., `pn.extension("plotly")`).
        - Heavy libs (scikit-learn, xarray, seaborn) work but add extra time to first load.

        ## Examples
        Panel with widgets:
        ```python
        import panel as pn
        import numpy as np
        freq = pn.widgets.FloatSlider(name="Frequency", start=0.1, end=10, value=2)
        pn.Column(freq, pn.bind(lambda f: f"Value: {f}", freq)).servable()
        ```

        Plain matplotlib (no Panel needed):
        ```python
        import matplotlib.pyplot as plt
        import numpy as np
        x = np.linspace(0, 10, 100)
        fig, ax = plt.subplots()
        ax.plot(x, np.sin(x))
        fig  # last expression is rendered
        ```

        Parameters
        ----------
        code : str
            Python code to run inside the panel-live Pyodide runtime.
        ctx : Context | None, optional
            FastMCP execution context (injected automatically).

        Returns
        -------
        str
            JSON payload consumed by the MCP App resource.
        """
        if not code or not code.strip():
            return json.dumps({"error": "Code is required."})

        payload = {
            "tool": "show_panel_live",
            "code": code,
            "runtime": "panel-live-pyodide",
        }

        if ctx:
            await ctx.info("Prepared show_panel_live payload for MCP App rendering.")

        return json.dumps(payload)

    return mcp


# Module-level server instance for ``fastmcp run panel_live.mcp:mcp``
mcp = create_mcp_server()
