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
# 5. Playground mode — editor + examples selector
# ---------------------------------------------------------------------------
playground = PanelLive(
    code="""\
import panel as pn

name = pn.widgets.TextInput(name="Your name", value="World")

pn.Column(
    name,
    pn.bind(lambda n: f"### Hello, **{n}**!", name),
).servable()
""",
    mode="playground",
    auto_run=True,
)

# ---------------------------------------------------------------------------
# 6. Headless mode — invisible (0px), pure background compute
# ---------------------------------------------------------------------------
headless = PanelLive(
    code='print("headless: invisible execution")',
    mode="headless",
    auto_run=True,
)

# ---------------------------------------------------------------------------
# 7. Server RPC — evaluate() and run() from server side
# ---------------------------------------------------------------------------
rpc_target = PanelLive(
    code='import panel as pn\npn.pane.Markdown("Waiting for server command...").servable()',
    mode="editor",
    auto_run=True,
)

rpc_status = pn.widgets.TextInput(name="Status", value="Ready", disabled=True)
eval_counter = 0
run_counter = 0


async def _test_evaluate(event):
    global eval_counter
    eval_counter += 1
    n = eval_counter
    rpc_status.value = f"[eval #{n}] Calling evaluate('{n} * {n}')..."
    try:
        result = await rpc_target.evaluate(f"{n} * {n}")
        rpc_status.value = f"[eval #{n}] evaluate returned: {result}"
    except Exception as e:
        rpc_status.value = f"[eval #{n}] Error: {e}"


async def _test_run(event):
    global run_counter
    run_counter += 1
    n = run_counter
    rpc_status.value = f"[run #{n}] Calling run()..."
    try:
        await rpc_target.run(
            code=f'import panel as pn\npn.pane.Markdown("## Run **#{n}** completed").servable()'
        )
        rpc_status.value = f"[run #{n}] run() completed — output updated above"
    except Exception as e:
        rpc_status.value = f"[run #{n}] Error: {e}"


btn_evaluate = pn.widgets.Button(name="Test evaluate()", button_type="primary")
btn_run = pn.widgets.Button(name="Test run()", button_type="success")
btn_evaluate.on_click(_test_evaluate)
btn_run.on_click(_test_run)

# ---------------------------------------------------------------------------
# Layout
# ---------------------------------------------------------------------------
pn.Column(
    pn.pane.Markdown(
        "# PanelLive Showcase\n\n"
        "Demonstrates all six display modes and server-side RPC.\n\n"
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
    "## 5. Playground Mode",
    "Editor with examples selector — ideal for interactive exploration.",
    playground,
    "---",
    "## 6. Headless Mode",
    "Invisible (0px) — pure background compute. The element below is present but hidden:",
    headless,
    "---",
    "## 7. Server RPC",
    "Test `evaluate()` and `run()` — server-side methods that execute code in the client Pyodide worker.",
    pn.Row(btn_evaluate, btn_run),
    rpc_status,
    rpc_target,
    sizing_mode="stretch_width",
).servable()
