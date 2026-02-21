"""PanelLive Showcase — demonstrates all modes and communication patterns.

Run with::

    panel-live serve --port 5008

Or directly::

    pixi run panel serve src/panel_live/examples/showcase.py \
        --static-dirs pl=quarto/_extensions/panel-live docs=docs \
        --port 5008
"""

import panel as pn

from panel_live.component import PanelLive

# Always use local assets — the showcase is served via ``panel-live serve``
# which maps ./pl/ to the local JS/CSS via --static-dirs.
PanelLive.configure(js_url="./pl/panel-live.js")
pn.extension()

WIDTH = 800
SIZING = {"sizing_mode": "stretch_width"}

# ---------------------------------------------------------------------------
# Header — logos + title + links
# ---------------------------------------------------------------------------
DOCS_BASE = "https://panel-extensions.github.io/panel-live"

HEADER_MD = pn.pane.Markdown(
    f"""# PanelLive Showcase

Run **Python in the browser** with [Pyodide](https://pyodide.org) — no server required for execution.

<div style="display:flex; align-items:center; gap:18px; justify-content:center; padding:8px 0;">
    <a href="https://panel.holoviz.org" target="_blank" title="Panel">
        <img src="https://panel.holoviz.org/_static/logo_stacked.svg" alt="Panel" style="height:48px;">
    </a>
    <span style="font-size:28px; color:#aaa;">+</span>
    <a href="https://pyodide.org" target="_blank" title="Pyodide">
        <img src="https://raw.githubusercontent.com/pyodide/pyodide-artwork/refs/heads/main/logo-quadratic.svg" alt="Pyodide" style="height:48px;">
    </a>
</div>

This demo shows all six display modes, server-side RPC, and bidirectional data exchange
between a Panel server and client-side Pyodide code.

[Getting Started]({DOCS_BASE}/tutorials/getting-started-panel/) ·
[How-to Guide]({DOCS_BASE}/how-to/panel-component/) ·
[Architecture]({DOCS_BASE}/explanation/panel-component/) ·
[GitHub](https://github.com/panel-extensions/panel-live)
""",
    width=800,
)

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
# 3. Progress mode — spinning Python icon with evaluate() queue tracking
# ---------------------------------------------------------------------------
progress_target = PanelLive(
    code="pass",
    mode="progress",
    auto_run=True,
    **SIZING,
)

eval_results = pn.pane.Str("", sizing_mode="stretch_width")


async def _send_evaluations(event):
    import asyncio
    import datetime

    results = ["Pending\u2026"] * 5
    eval_results.object = "\n".join(f"#{i}: {r}" for i, r in enumerate(results))

    async def _eval(n):
        now = datetime.datetime.now().strftime("%H:%M:%S.%f")[:-3]
        result = await progress_target.evaluate(
            f"import time; time.sleep(1); '{now}' + ' \\u2192 ' + "
            f"__import__('datetime').datetime.now().strftime('%H:%M:%S.%f')[:-3]",
            timeout=120.0,
        )
        results[n] = result
        eval_results.object = "\n".join(f"#{i}: {r}" for i, r in enumerate(results))

    tasks = [asyncio.create_task(_eval(i)) for i in range(5)]
    await asyncio.gather(*tasks, return_exceptions=True)


btn_progress = pn.widgets.Button(name="Send 5 evaluations", button_type="primary")
btn_progress.on_click(_send_evaluations)

# ---------------------------------------------------------------------------
# 4. Progress mode — error handling
# ---------------------------------------------------------------------------
error_target = PanelLive(
    code="pass",
    mode="progress",
    auto_run=True,
    **SIZING,
)

EVAL_CASES = [
    ("10 / 2", "division"),
    ("def divide(a, b):\n    return a / b\ndivide(1, 0)", "ZeroDivisionError"),
    ("int('hello')", "ValueError"),
    ("sum(range(100))", "sum"),
    ("import nonexistent", "ModuleNotFoundError"),
]

error_results = pn.pane.Str("", sizing_mode="stretch_width")


async def _send_mixed(event):
    import asyncio

    lines = ["Pending\u2026"] * len(EVAL_CASES)
    error_results.object = "\n".join(lines)

    async def _eval(n, code, label):
        try:
            result = await error_target.evaluate(code, timeout=120.0)
            lines[n] = f"\u2713 #{n} ({label}): {result}"
        except RuntimeError as exc:
            lines[n] = f"\u2717 #{n} ({label}): {exc}"
        error_results.object = "\n".join(lines)

    tasks = [asyncio.create_task(_eval(i, code, label)) for i, (code, label) in enumerate(EVAL_CASES)]
    await asyncio.gather(*tasks, return_exceptions=True)


btn_mixed = pn.widgets.Button(name="Send 5 mixed evaluations", button_type="primary")
btn_mixed.on_click(_send_mixed)

# ---------------------------------------------------------------------------
# 5. Debug mode — stdout/stderr visible (renumbered from 4)
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
# 6. Playground mode — editor + examples selector
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
# 7. Headless mode — invisible (0px), pure background compute
# ---------------------------------------------------------------------------
headless = PanelLive(
    code='print("headless: invisible execution")',
    mode="headless",
    auto_run=True,
    **SIZING,
)

# ---------------------------------------------------------------------------
# 8. Server RPC — evaluate() and run() from server side
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
# 9. Server→Client reactive data push (input param + @pn.depends)
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
# 10. Server→Client periodic push (input param + periodic callback)
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
# 11. Client→Server data (server.output → output param)
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
accordion = pn.Accordion(
    ("1. Editor Mode", pn.Column(
        "Interactive code editor with live Pyodide output.",
        editor,
    )),
    ("2. App Mode", pn.Column(
        "Output only — no code editor visible.",
        app_mode,
    )),
    ("3. Progress Mode", pn.Column(
        "Sends 5 concurrent `evaluate()` calls (each sleeps 1s in the browser). "
        "The Python icon spins while active \u2014 **hover over it** to see the queue depth. "
        "Results arrive one by one as each completes.",
        pn.Row(btn_progress, progress_target),
        eval_results,
    )),
    ("4. Progress Mode \u2014 Error Handling", pn.Column(
        "Sends 5 evaluations \u2014 2 succeed, 3 raise exceptions. "
        "Errors propagate as `RuntimeError` on the server without crashing the batch.",
        pn.Row(btn_mixed, error_target),
        error_results,
    )),
    ("5. Debug Mode", pn.Column(
        "Shows stdout/stderr — useful during development.",
        debug,
    )),
    ("6. Playground Mode", pn.Column(
        "Editor with examples selector — ideal for interactive exploration.",
        playground,
    )),
    ("7. Headless Mode", pn.Column(
        "Invisible (0px) — pure background compute. The element below is present but hidden:",
        headless,
    )),
    ("8. Server RPC", pn.Column(
        "Test `evaluate()` and `run()` — server-side methods that execute code in the client Pyodide worker.",
        pn.Row(btn_evaluate, btn_run),
        rpc_status,
        rpc_target,
    )),
    ("9. Server\u2192Client Reactive Push", pn.Column(
        "Server sets `input` param — client reacts via `@pn.depends(server.param.input)`, no re-run needed.",
        pn.Row(btn_reactive_send),
        reactive_status,
        reactive_target,
    )),
    ("10. Server\u2192Client Periodic Push", pn.Column(
        "Server pushes slider value via `input` param. Client displays datetime + `server.input` every 200ms.",
        slider,
        periodic_target,
    )),
    ("11. Client\u2192Server Data", pn.Column(
        "Client sets `server.output` to push data back to the server's `output` param.",
        output_target,
        output_display,
    )),
    width=WIDTH,
    active=[0, 2, 9],
)

pn.Column(
    HEADER_MD,
    accordion,
    align="center",
    max_width=1200,
    sizing_mode="stretch_width",
    styles={"margin-right": "auto", "margin-left": "auto"},
).servable()
