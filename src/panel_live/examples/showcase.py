"""PanelLive Showcase — demonstrates all modes and communication patterns.

Run with::

    panel-live serve --port 5008

Or directly::

    pixi run panel serve src/panel_live/examples/showcase.py \
        --static-dirs pl=quarto/_extensions/panel-live \
        --port 5008
"""

import panel as pn

from panel_live.component import PanelLive

PanelLive.configure(js_url="./pl/panel-live.js")
pn.extension()

# ---------------------------------------------------------------------------
# 1. Editor mode — interactive code editing + Pyodide execution
# ---------------------------------------------------------------------------
editor = PanelLive(
    code="""\
import panel as pn

slider = pn.widgets.IntSlider(name="Pick a number", start=1, end=100, value=42)

pn.Column(
    slider,
    pn.bind(lambda v: f"### You picked **{v}**", slider),
).servable()
""",
    mode="editor",
    auto_run=True,
)

# ---------------------------------------------------------------------------
# 2. App mode — output only, no editor visible
# ---------------------------------------------------------------------------
app_mode = PanelLive(
    code="""\
import panel as pn
pn.pane.Markdown("## App Mode\\n\\nNo editor visible — output only.").servable()
""",
    mode="app",
    auto_run=True,
)

# ---------------------------------------------------------------------------
# 3. Compact mode — status line only
# ---------------------------------------------------------------------------
compact = PanelLive(
    code='print("compact mode: execution complete")',
    mode="compact",
    auto_run=True,
)

# ---------------------------------------------------------------------------
# 4. Debug mode — stdout/stderr visible
# ---------------------------------------------------------------------------
debug = PanelLive(
    code="""\
print("stdout: debug mode active")
result = sum(range(100))
print(f"Computed sum(range(100)) = {result}")
print(f"Python version: {__import__('sys').version}")
""",
    mode="debug",
    auto_run=True,
)

# ---------------------------------------------------------------------------
# 5. Headless mode — invisible (0px), pure background compute
# ---------------------------------------------------------------------------
headless = PanelLive(
    code='print("headless: invisible execution")',
    mode="headless",
    auto_run=True,
)

# ---------------------------------------------------------------------------
# Layout
# ---------------------------------------------------------------------------
pn.Column(
    pn.pane.Markdown(
        "# PanelLive Showcase\n\n"
        "Demonstrates all six display modes of the `PanelLive` component.\n\n"
        "---"
    ),
    "## 1. Editor Mode",
    "Interactive code editor with live Pyodide output.",
    editor,
    "---",
    "## 2. App Mode",
    "Output only — no code editor visible.",
    app_mode,
    "---",
    "## 3. Compact Mode",
    "Status line only — minimal footprint for background tasks.",
    compact,
    "---",
    "## 4. Debug Mode",
    "Shows stdout/stderr — useful during development.",
    debug,
    "---",
    "## 5. Headless Mode",
    "Invisible (0px) — pure background compute. The element below is present but hidden:",
    headless,
    sizing_mode="stretch_width",
).servable()
