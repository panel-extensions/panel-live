# Use panel-live in HTML and Markdown panes

Embed the `<panel-live>` web component directly in a `HTML`, `Markdown` or `ChatInterface` — no `PanelLive` component needed. This is the lightest integration: load the JS/CSS once, then write raw HTML.

## When to use this approach

| Approach | Use when... |
|----------|------------|
| Raw `<panel-live>` in panes | Simple embedding, no server↔client data exchange needed |
| `PanelLive` component | Bidirectional data, `evaluate()`, `run()`, or programmatic control |

## Loading assets

Load `panel-live.js` and `panel-live.css` once per app via `pn.extension()`.

### Option 1 — GitHub Pages CDN (available now, pre-release)

```python
CDN = "https://panel-extensions.github.io/panel-live/assets"
pn.extension(
    js_files={"panel_live": f"{CDN}/js/panel-live.js"},
    css_files=[f"{CDN}/css/panel-live.css"],
)
```

### Option 2 — npm CDN via jsDelivr (recommended once published)

```python
# Switch to this once panel-live is published to npm
pn.extension(
    js_files={"panel_live": "https://cdn.jsdelivr.net/npm/@panel-extensions/panel-live@latest/dist/panel-live.js"},
    css_files=["https://cdn.jsdelivr.net/npm/@panel-extensions/panel-live@latest/dist/panel-live.css"],
)
```

### Option 3 — local `--static-dirs` (development / offline)

```python
pn.extension(
    js_files={"panel_live": "./pl/panel-live.js"},
    css_files=["./pl/panel-live.css"],
)
```

Serve with:

```bash
panel serve app.py --static-dirs pl=path/to/panel-live/dist
```

## Recipe: `pn.pane.HTML`

Bokeh renders Panel panes inside a Shadow DOM — `<panel-live>` detects this automatically and patches `document.getElementById` so Bokeh's rendering pipeline can find the output container.

```python
import panel as pn

CDN = "https://panel-extensions.github.io/panel-live/assets"
pn.extension(
    js_files={"panel_live": f"{CDN}/js/panel-live.js"},
    css_files=[f"{CDN}/css/panel-live.css"],
)

CODE = """
import panel as pn

slider = pn.widgets.IntSlider(name="Pick a number", start=1, end=100, value=42)
pn.Column(
    slider,
    pn.bind(lambda v: f"### You picked **{v}**", slider),
).servable()
"""

html_pane = pn.pane.HTML(
    f'<panel-live mode="editor" style="width:100%">{CODE}</panel-live>',
    sizing_mode="stretch_width",
)

pn.Column("## panel-live in HTML Pane", html_pane).servable()
```

## Recipe: `pn.pane.Markdown`

`pn.pane.Markdown` passes raw HTML blocks through unchanged. The `<panel-live>` element receives the same Shadow DOM treatment automatically.

```python
import panel as pn

CDN = "https://panel-extensions.github.io/panel-live/assets"
pn.extension(
    js_files={"panel_live": f"{CDN}/js/panel-live.js"},
    css_files=[f"{CDN}/css/panel-live.css"],
)

CODE = """
import panel as pn
import numpy as np

x = np.linspace(0, 10, 100)
y = np.sin(x)
df = __import__("pandas").DataFrame({"x": x, "y": y})
df.hvplot.line(x="x", y="y", title="Sine Wave").servable()
"""

md_pane = pn.pane.Markdown(
    f'<panel-live mode="app" auto-run="true" style="width:100%">{CODE}</panel-live>',
    sizing_mode="stretch_width",
)

pn.Column("## panel-live in Markdown Pane", md_pane).servable()
```

## Recipe: `ChatInterface`

Use `<panel-live>` inside a `pn.chat.ChatInterface` to respond with live, interactive apps. The callback returns a `pn.pane.HTML` wrapping a `<panel-live>` element. Shadow DOM detection is automatic.

```python
import panel as pn

CDN = "https://panel-extensions.github.io/panel-live/assets"
pn.extension(
    js_files={"panel_live": f"{CDN}/js/panel-live.js"},
    css_files=[f"{CDN}/css/panel-live.css"],
)

EXAMPLES = {
    "slider": """
import panel as pn
slider = pn.widgets.IntSlider(name="Value", start=0, end=100, value=50)
pn.Column(slider, pn.bind(lambda v: f"## {v}", slider)).servable()
""",
    "plot": """
import panel as pn
import numpy as np
x = np.linspace(0, 10, 200)
import pandas as pd
df = pd.DataFrame({"x": x, "y": np.sin(x)})
df.hvplot.line(x="x", y="y", title="Sine Wave").servable()
""",
    "table": """
import panel as pn
import pandas as pd
df = pd.DataFrame({"A": range(5), "B": [x**2 for x in range(5)]})
pn.pane.DataFrame(df).servable()
""",
}

def respond(contents, user, instance):
    keyword = contents.strip().lower()
    code = EXAMPLES.get(keyword)
    if code is None:
        return f"Type one of: {', '.join(EXAMPLES)}"
    return pn.pane.HTML(
        f'<panel-live mode="app" auto-run="true" style="width:100%">{code}</panel-live>',
        sizing_mode="stretch_width",
    )

chat = pn.chat.ChatInterface(
    callback=respond,
    show_send=True,
    placeholder_text="Type: slider, plot, or table",
)

pn.Column(
    pn.pane.Markdown("Type **slider**, **plot**, or **table** to see a live app."),
    chat,
).servable()
```

## See also

- [PanelLive Component](panel-component.md) — full JSComponent with bidirectional data exchange
- [Getting Started with Panel](../tutorials/getting-started-panel.md) — step-by-step introduction
