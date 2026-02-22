"""panel-live in HTML/Markdown panes — demonstrates embedding <panel-live> inside
pn.pane.HTML, pn.pane.Markdown, and pn.chat.ChatInterface.

Run with::

    panel-live serve --port 5008
    # then open http://localhost:5008/panes

Or directly::

    pixi run panel serve src/panel_live/examples/panes.py \\
        --static-dirs pl=dist docs=docs \\
        --port 5008
"""

import panel as pn

# Load panel-live web component via CDN.
# The panes demo does not use the PanelLive JSComponent — it embeds the
# <panel-live> custom element directly inside pn.pane.HTML / pn.pane.Markdown.
# Once published to npm, replace with:
#   cdn.jsdelivr.net/npm/@panel-extensions/panel-live@latest/dist/
CDN = "https://panel-extensions.github.io/panel-live/assets"
pn.extension(
    js_files={"panel_live": f"{CDN}/js/panel-live.js"},
    css_files=[f"{CDN}/css/panel-live.css"],
)

WIDTH = 800
SIZING = {"sizing_mode": "stretch_width"}

# ---------------------------------------------------------------------------
# Header — logos + title + links
# ---------------------------------------------------------------------------
DOCS_BASE = "https://panel-extensions.github.io/panel-live"

HEADER_MD = pn.pane.Markdown(
    f"""# panel-live in HTML & Markdown Panes

Embed `<panel-live>` directly inside `pn.pane.HTML`, `pn.pane.Markdown`, and
`pn.chat.ChatInterface` — no `PanelLive` JSComponent required.

<div style="display:flex; align-items:center; gap:18px; justify-content:center; padding:8px 0;">
    <a href="https://panel.holoviz.org" target="_blank" title="Panel">
        <img src="https://panel.holoviz.org/_static/logo_stacked.svg" alt="Panel" style="height:48px;">
    </a>
    <span style="font-size:28px; color:#aaa;">+</span>
    <a href="https://pyodide.org" target="_blank" title="Pyodide">
        <img src="https://raw.githubusercontent.com/pyodide/pyodide-artwork/refs/heads/main/logo-quadratic.svg" alt="Pyodide" style="height:48px;">
    </a>
</div>

Bokeh renders Panel panes inside a Shadow DOM — `<panel-live>` detects this
automatically and patches `document.getElementById` so Bokeh's rendering
pipeline can find the output container.

[How-to Guide]({DOCS_BASE}/how-to/panel-panes/) ·
[PanelLive Component]({DOCS_BASE}/how-to/panel-component/) ·
[GitHub](https://github.com/panel-extensions/panel-live)
""",
    width=WIDTH,
)

# ---------------------------------------------------------------------------
# 1. HTML Pane
# ---------------------------------------------------------------------------
_HTML_CODE = """\
import panel as pn

slider = pn.widgets.IntSlider(name="Pick a number", start=1, end=100, value=42)

pn.Column(
    slider,
    pn.bind(lambda v: f"### You picked **{v}**", slider),
).servable()
"""

html_pane = pn.pane.HTML(
    f'<panel-live mode="editor" style="width:100%">{_HTML_CODE}</panel-live>',
    **SIZING,
)

# ---------------------------------------------------------------------------
# 2. Markdown Pane
# ---------------------------------------------------------------------------
_MD_CODE = """\
import panel as pn
import numpy as np
import pandas as pd

x = np.linspace(0, 2 * np.pi, 100)
df = pd.DataFrame({"x": x, "sin": np.sin(x), "cos": np.cos(x)})
df.hvplot.line(x="x", y=["sin", "cos"], title="Sine & Cosine").servable()
"""

md_pane = pn.pane.Markdown(
    f'<panel-live mode="app" auto-run="true" style="width:100%">{_MD_CODE}</panel-live>',
    **SIZING,
)

# ---------------------------------------------------------------------------
# 3. ChatInterface — keyword-driven live apps (no LLM required)
# ---------------------------------------------------------------------------
_CHAT_EXAMPLES = {
    "slider": """\
import panel as pn
slider = pn.widgets.IntSlider(name="Value", start=0, end=100, value=50)
display = pn.bind(lambda v: f"## {v}", slider)
pn.Column(slider, display).servable()
""",
    "plot": """\
import panel as pn
import numpy as np
import pandas as pd

x = np.linspace(0, 10, 200)
df = pd.DataFrame({"x": x, "y": np.sin(x)})
df.hvplot.line(x="x", y="y", title="Sine Wave").servable()
""",
    "table": """\
import panel as pn
import pandas as pd

df = pd.DataFrame({"Name": ["Alice", "Bob", "Carol"], "Score": [92, 85, 78]})
pn.pane.DataFrame(df, width=300).servable()
""",
}

_KEYWORDS = ", ".join(f"**{k}**" for k in _CHAT_EXAMPLES)


def _chat_respond(contents, user, instance):
    keyword = contents.strip().lower()
    code = _CHAT_EXAMPLES.get(keyword)
    if code is None:
        return f"Type one of: {', '.join(_CHAT_EXAMPLES)}"
    return pn.pane.HTML(
        f'<panel-live mode="app" auto-run="true" style="width:100%">{code}</panel-live>',
        **SIZING,
    )


chat_interface = pn.chat.ChatInterface(
    callback=_chat_respond,
    show_send=True,
    placeholder_text="Type: slider, plot, or table",
)

# ---------------------------------------------------------------------------
# Layout — centered Accordion with fixed width
# ---------------------------------------------------------------------------
accordion = pn.Accordion(
    ("1. HTML Pane", pn.Column(
        "Bokeh renders Panel panes inside Shadow DOM — `<panel-live>` detects this automatically.",
        html_pane,
    )),
    ("2. Markdown Pane", pn.Column(
        "`pn.pane.Markdown` passes raw HTML blocks through unchanged. "
        "Shadow DOM detection is automatic.",
        md_pane,
    )),
    ("3. ChatInterface", pn.Column(
        f"Type {_KEYWORDS} — the callback returns a `pn.pane.HTML` wrapping `<panel-live>`. "
        "Shadow DOM detection is automatic.",
        pn.pane.Markdown("Type **slider**, **plot**, or **table** to see a live app."),
        chat_interface,
    )),
    width=WIDTH,
    active=[0],
)

pn.Column(
    HEADER_MD,
    accordion,
    align="center",
    max_width=1200,
    sizing_mode="stretch_width",
    styles={"margin-right": "auto", "margin-left": "auto"},
).servable()
