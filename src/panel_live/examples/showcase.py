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

SIZING = {"sizing_mode": "stretch_width"}

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
    **SIZING,
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
    **SIZING,
)

# ---------------------------------------------------------------------------
# 3. Compact mode — status line only
# ---------------------------------------------------------------------------
compact = PanelLive(
    code='print("compact mode: execution complete")',
    mode="compact",
    auto_run=True,
    **SIZING,
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
    **SIZING,
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
    **SIZING,
)

# ---------------------------------------------------------------------------
# 6. Headless mode — invisible (0px), pure background compute
# ---------------------------------------------------------------------------
headless = PanelLive(
    code='print("headless: invisible execution")',
    mode="headless",
    auto_run=True,
    **SIZING,
)

# ---------------------------------------------------------------------------
# 7. Server RPC — evaluate() and run() from server side
# ---------------------------------------------------------------------------
rpc_target = PanelLive(
    code='import panel as pn\npn.pane.Markdown("Waiting for server command...").servable()',
    mode="editor",
    auto_run=True,
    **SIZING,
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
# 8. Server→Client reactive data push (input param + @pn.depends)
# ---------------------------------------------------------------------------
reactive_target = PanelLive(
    code="""\
import panel as pn

@pn.depends(server.param.input)
def message(value):
    return value or {"message": "No data received yet"}

pn.pane.JSON(message, name="Server Data", depth=2).servable()
""",
    mode="editor",
    auto_run=True,
    **SIZING,
)

reactive_counter = 0


def _test_reactive_send(event):
    global reactive_counter
    reactive_counter += 1
    reactive_status.value = f"[send #{reactive_counter}] Sending data..."
    reactive_target.input = {"count": reactive_counter, "message": f"Hello from server #{reactive_counter}"}
    reactive_status.value = f"[send #{reactive_counter}] Done — client updates reactively"


btn_reactive_send = pn.widgets.Button(name="Send Data to Client", button_type="primary")
reactive_status = pn.widgets.TextInput(name="Status", value="Ready", disabled=True)
btn_reactive_send.on_click(_test_reactive_send)

# ---------------------------------------------------------------------------
# 9. Server→Client periodic push (input param + periodic callback)
# ---------------------------------------------------------------------------
periodic_target = PanelLive(
    code="""\
import panel as pn
import datetime

time_pane = pn.pane.Str("Waiting...")
data_pane = pn.pane.Str("No server data yet")

def update():
    time_pane.object = f"Time: {datetime.datetime.now().strftime('%H:%M:%S.%f')[:-3]}"
    data_pane.object = f"Server data: {server.input}"

pn.state.add_periodic_callback(update, period=200)
pn.Column(time_pane, data_pane).servable()
""",
    mode="editor",
    auto_run=True,
    **SIZING,
)

slider = pn.widgets.IntSlider(name="Server value", start=0, end=100, value=42)


def _on_slider(event):
    periodic_target.input = {"slider": event.new}


slider.param.watch(_on_slider, "value")

# ---------------------------------------------------------------------------
# 10. Client→Server data (server.output → output param)
# ---------------------------------------------------------------------------
output_target = PanelLive(
    code="""\
import panel as pn

btn = pn.widgets.Button(name="Send to Server", button_type="primary")
count = 0

def on_click(event):
    global count
    count += 1
    server.output = {"count": count, "source": "browser"}

btn.on_click(on_click)
pn.Column(btn, "Click to send data to the server's `output` param").servable()
""",
    mode="editor",
    auto_run=True,
    **SIZING,
)

output_display = pn.pane.JSON({}, name="Received Output", depth=2)


def _on_output(event):
    output_display.object = output_target.output


output_target.param.watch(_on_output, "output")

# ---------------------------------------------------------------------------
# Layout — centered Accordion with fixed width
# ---------------------------------------------------------------------------
WIDTH = 800

accordion = pn.Accordion(
    ("1. Editor Mode", pn.Column(
        "Interactive code editor with live Pyodide output.",
        editor,
    )),
    ("2. App Mode", pn.Column(
        "Output only — no code editor visible.",
        app_mode,
    )),
    ("3. Compact Mode", pn.Column(
        "Status line only — minimal footprint for background tasks.",
        compact,
    )),
    ("4. Debug Mode", pn.Column(
        "Shows stdout/stderr — useful during development.",
        debug,
    )),
    ("5. Playground Mode", pn.Column(
        "Editor with examples selector — ideal for interactive exploration.",
        playground,
    )),
    ("6. Headless Mode", pn.Column(
        "Invisible (0px) — pure background compute. The element below is present but hidden:",
        headless,
    )),
    ("7. Server RPC", pn.Column(
        "Test `evaluate()` and `run()` — server-side methods that execute code in the client Pyodide worker.",
        pn.Row(btn_evaluate, btn_run),
        rpc_status,
        rpc_target,
    )),
    ("8. Server→Client Reactive Push", pn.Column(
        "Server sets `input` param — client reacts via `@pn.depends(server.param.input)`, no re-run needed.",
        pn.Row(btn_reactive_send),
        reactive_status,
        reactive_target,
    )),
    ("9. Server→Client Periodic Push", pn.Column(
        "Server pushes slider value via `input` param. Client displays datetime + `server.input` every 200ms.",
        slider,
        periodic_target,
    )),
    ("10. Client→Server Data", pn.Column(
        "Client sets `server.output` to push data back to the server's `output` param.",
        output_target,
        output_display,
    )),
    width=WIDTH,
    active=[0],
)

pn.Column(
    pn.pane.Markdown(
        "# PanelLive Showcase\n\n"
        "Demonstrates all six display modes, server-side RPC, and bidirectional data exchange."
    ),
    accordion,
    align="center",
    sizing_mode="stretch_width",
).servable()
