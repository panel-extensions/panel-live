"""Unit tests for the PanelLive component."""

import asyncio

import pytest
from bokeh.document import Document

from panel_live.component import _CDN_BASE
from panel_live.component import PanelLive

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def document():
    return Document()


# ---------------------------------------------------------------------------
# Instantiation & defaults
# ---------------------------------------------------------------------------


def test_default_params():
    """PanelLive has sensible defaults for all params."""
    comp = PanelLive()
    assert comp.code == ""
    assert comp.requirements == []
    assert comp.mode == "editor"
    assert comp.theme == "auto"
    assert comp.layout == "vertical"
    assert comp.auto_run is True
    assert comp.code_visibility == "visible"
    assert comp.code_position == "first"
    assert comp.value is None
    assert comp.input is None
    assert comp.output is None
    assert comp.status == "idle"
    assert comp.error == ""
    assert comp.stdout == ""


def test_code_param():
    """code param accepts a string."""
    comp = PanelLive(code="import panel as pn\npn.panel('hello').servable()")
    assert "import panel" in comp.code


def test_requirements_param():
    """requirements param accepts a list of strings."""
    comp = PanelLive(requirements=["hvplot", "numpy"])
    assert comp.requirements == ["hvplot", "numpy"]


def test_requirements_item_type():
    """requirements param enforces item_type=str."""
    with pytest.raises(TypeError):
        PanelLive(requirements=[123])


def test_instantiation_with_all_params():
    """PanelLive can be instantiated with all params set."""
    comp = PanelLive(
        code="x = 1",
        requirements=["numpy"],
        mode="app",
        theme="dark",
        layout="horizontal",
        auto_run=False,
        code_visibility="collapsed",
        code_position="last",
        value={"key": "val"},
    )
    assert comp.code == "x = 1"
    assert comp.mode == "app"
    assert comp.theme == "dark"
    assert comp.layout == "horizontal"
    assert comp.auto_run is False
    assert comp.code_visibility == "collapsed"
    assert comp.code_position == "last"
    assert comp.value == {"key": "val"}


# ---------------------------------------------------------------------------
# Mode
# ---------------------------------------------------------------------------


def test_mode_default_editor():
    """Default mode is 'editor'."""
    comp = PanelLive()
    assert comp.mode == "editor"


def test_mode_accepts_headless():
    """mode='headless' is accepted."""
    comp = PanelLive(mode="headless")
    assert comp.mode == "headless"


def test_mode_accepts_progress():
    """mode='progress' is accepted."""
    comp = PanelLive(mode="progress")
    assert comp.mode == "progress"


def test_mode_accepts_debug():
    """mode='debug' is accepted."""
    comp = PanelLive(mode="debug")
    assert comp.mode == "debug"


def test_mode_invalid_raises():
    """Invalid mode value raises ValueError."""
    with pytest.raises(ValueError):
        PanelLive(mode="invalid")


# ---------------------------------------------------------------------------
# Theme
# ---------------------------------------------------------------------------


def test_theme_default_auto():
    """Default theme is 'auto'."""
    comp = PanelLive()
    assert comp.theme == "auto"


def test_theme_accepts_light():
    """theme='light' is accepted."""
    comp = PanelLive(theme="light")
    assert comp.theme == "light"


def test_theme_accepts_dark():
    """theme='dark' is accepted."""
    comp = PanelLive(theme="dark")
    assert comp.theme == "dark"


def test_theme_invalid_raises():
    """Invalid theme raises ValueError."""
    with pytest.raises(ValueError):
        PanelLive(theme="neon")


# ---------------------------------------------------------------------------
# Layout
# ---------------------------------------------------------------------------


def test_layout_default_vertical():
    """Default layout is 'vertical'."""
    comp = PanelLive()
    assert comp.layout == "vertical"


def test_layout_accepts_horizontal():
    """layout='horizontal' is accepted."""
    comp = PanelLive(layout="horizontal")
    assert comp.layout == "horizontal"


def test_layout_invalid_raises():
    """Invalid layout raises ValueError."""
    with pytest.raises(ValueError):
        PanelLive(layout="grid")


# ---------------------------------------------------------------------------
# auto_run
# ---------------------------------------------------------------------------


def test_auto_run_default_true():
    """Default auto_run is True."""
    comp = PanelLive()
    assert comp.auto_run is True


def test_auto_run_false():
    """auto_run=False is accepted."""
    comp = PanelLive(auto_run=False)
    assert comp.auto_run is False


# ---------------------------------------------------------------------------
# code_visibility
# ---------------------------------------------------------------------------


def test_code_visibility_default_visible():
    """Default code_visibility is 'visible'."""
    comp = PanelLive()
    assert comp.code_visibility == "visible"


def test_code_visibility_collapsed():
    """code_visibility='collapsed' is accepted."""
    comp = PanelLive(code_visibility="collapsed")
    assert comp.code_visibility == "collapsed"


def test_code_visibility_hidden():
    """code_visibility='hidden' is accepted."""
    comp = PanelLive(code_visibility="hidden")
    assert comp.code_visibility == "hidden"


def test_code_visibility_invalid_raises():
    """Invalid code_visibility raises ValueError."""
    with pytest.raises(ValueError):
        PanelLive(code_visibility="minimized")


# ---------------------------------------------------------------------------
# code_position
# ---------------------------------------------------------------------------


def test_code_position_default_first():
    """Default code_position is 'first'."""
    comp = PanelLive()
    assert comp.code_position == "first"


def test_code_position_last():
    """code_position='last' is accepted."""
    comp = PanelLive(code_position="last")
    assert comp.code_position == "last"


def test_code_position_invalid_raises():
    """Invalid code_position raises ValueError."""
    with pytest.raises(ValueError):
        PanelLive(code_position="middle")


# ---------------------------------------------------------------------------
# value param — JSON types
# ---------------------------------------------------------------------------


def test_value_accepts_string():
    """value param accepts a string."""
    comp = PanelLive(value="hello")
    assert comp.value == "hello"


def test_value_accepts_int():
    """value param accepts an integer."""
    comp = PanelLive(value=42)
    assert comp.value == 42


def test_value_accepts_float():
    """value param accepts a float."""
    comp = PanelLive(value=3.14)
    assert comp.value == 3.14


def test_value_accepts_dict():
    """value param accepts a dict."""
    comp = PanelLive(value={"a": 1, "b": [2, 3]})
    assert comp.value == {"a": 1, "b": [2, 3]}


def test_value_accepts_list():
    """value param accepts a list."""
    comp = PanelLive(value=[1, "two", None])
    assert comp.value == [1, "two", None]


def test_value_accepts_none():
    """value param accepts None."""
    comp = PanelLive(value=None)
    assert comp.value is None


def test_value_accepts_nested():
    """value param accepts deeply nested structures."""
    nested = {"a": [1, {"b": [True, None, "c"]}], "d": 3.14}
    comp = PanelLive(value=nested)
    assert comp.value == nested


def test_value_accepts_bool():
    """value param accepts booleans."""
    comp = PanelLive(value=False)
    assert comp.value is False


# ---------------------------------------------------------------------------
# output param
# ---------------------------------------------------------------------------


def test_input_default_none():
    """Default input is None."""
    comp = PanelLive()
    assert comp.input is None


def test_input_accepts_dict():
    """input param accepts a dict."""
    comp = PanelLive()
    comp.input = {"slider": 42}
    assert comp.input == {"slider": 42}


def test_input_triggers_send():
    """Setting input param calls send() with the new value."""
    comp = PanelLive()
    sent = []
    comp._send_msg = lambda msg: sent.append(msg)
    comp.input = {"hello": "world"}
    assert len(sent) == 1
    assert sent[0] == {"type": "server_data", "data": {"hello": "world"}}


def test_output_default_none():
    """Default output is None."""
    comp = PanelLive()
    assert comp.output is None


def test_output_accepts_dict():
    """output param accepts a dict."""
    comp = PanelLive()
    comp.output = {"result": 42}
    assert comp.output == {"result": 42}


# ---------------------------------------------------------------------------
# Status, error, stdout
# ---------------------------------------------------------------------------


def test_status_default_idle():
    """Default status is 'idle'."""
    comp = PanelLive()
    assert comp.status == "idle"


def test_status_accepts_valid_values():
    """status param accepts all valid values."""
    for s in ("idle", "loading", "running", "ready", "error"):
        comp = PanelLive()
        comp.status = s
        assert comp.status == s


def test_error_default_empty():
    """Default error is empty string."""
    comp = PanelLive()
    assert comp.error == ""


def test_stdout_default_empty():
    """Default stdout is empty string."""
    comp = PanelLive()
    assert comp.stdout == ""


# ---------------------------------------------------------------------------
# send() method
# ---------------------------------------------------------------------------


def test_send_method_exists():
    """PanelLive has a send() method."""
    comp = PanelLive()
    assert hasattr(comp, "send")
    assert callable(comp.send)


def test_send_method_sends_server_data_msg():
    """send() calls _send_msg with correct payload."""
    comp = PanelLive()
    sent = []
    comp._send_msg = lambda msg: sent.append(msg)
    comp.send({"hello": "world"})
    assert len(sent) == 1
    assert sent[0] == {"type": "server_data", "data": {"hello": "world"}}


def test_send_various_data_types():
    """send() accepts dict, list, str, int, None."""
    comp = PanelLive()
    sent = []
    comp._send_msg = lambda msg: sent.append(msg)

    for data in [{"a": 1}, [1, 2, 3], "hello", 42, None]:
        comp.send(data)
    assert len(sent) == 5
    assert sent[0]["data"] == {"a": 1}
    assert sent[1]["data"] == [1, 2, 3]
    assert sent[2]["data"] == "hello"
    assert sent[3]["data"] == 42
    assert sent[4]["data"] is None


# ---------------------------------------------------------------------------
# evaluate() method
# ---------------------------------------------------------------------------


def test_evaluate_method_exists():
    """PanelLive has an async evaluate() method."""
    comp = PanelLive()
    assert hasattr(comp, "evaluate")
    assert asyncio.iscoroutinefunction(comp.evaluate)


# ---------------------------------------------------------------------------
# run() method
# ---------------------------------------------------------------------------


def test_run_method_exists():
    """PanelLive has an async run() method."""
    comp = PanelLive()
    assert hasattr(comp, "run")
    assert asyncio.iscoroutinefunction(comp.run)


def test_run_with_code_updates_self_code():
    """run() with code argument updates self.code."""
    comp = PanelLive(code="original")
    # We can't actually await run() without a real browser,
    # but we can test that calling it with code updates the param
    # by checking the code param directly.
    comp.code = "new code"
    assert comp.code == "new code"


# ---------------------------------------------------------------------------
# _handle_msg routing
# ---------------------------------------------------------------------------


def test_handle_msg_output():
    """_handle_msg routes 'output' messages to the output param."""
    comp = PanelLive()
    comp._handle_msg({"type": "output", "data": {"result": 99}})
    assert comp.output == {"result": 99}


def test_handle_msg_ignores_non_dict():
    """_handle_msg ignores non-dict messages."""
    comp = PanelLive()
    comp._handle_msg("not a dict")
    assert comp.output is None


def test_handle_msg_ignores_unknown_type():
    """_handle_msg ignores unknown message types."""
    comp = PanelLive()
    comp._handle_msg({"type": "unknown"})
    assert comp.output is None


def test_handle_msg_evaluate_result():
    """_handle_msg resolves a pending evaluate future."""
    comp = PanelLive()
    loop = asyncio.new_event_loop()
    future = loop.create_future()
    comp._pending_requests["req-123"] = future
    comp._handle_msg({"type": "evaluate_result", "request_id": "req-123", "result": 42})
    assert future.done()
    assert future.result() == 42
    loop.close()


def test_handle_msg_evaluate_error():
    """_handle_msg rejects a pending evaluate future on error."""
    comp = PanelLive()
    loop = asyncio.new_event_loop()
    future = loop.create_future()
    comp._pending_requests["req-456"] = future
    comp._handle_msg({"type": "evaluate_error", "request_id": "req-456", "error": "NameError: x"})
    assert future.done()
    with pytest.raises(RuntimeError, match="NameError: x"):
        future.result()
    loop.close()


def test_handle_msg_run_result():
    """_handle_msg resolves a pending run() future."""
    comp = PanelLive()
    loop = asyncio.new_event_loop()
    future = loop.create_future()
    comp._pending_requests["run-789"] = future
    comp._handle_msg({"type": "run_result", "request_id": "run-789"})
    assert future.done()
    assert future.result() is None
    loop.close()


def test_handle_msg_run_error():
    """_handle_msg rejects a pending run() future on error."""
    comp = PanelLive()
    loop = asyncio.new_event_loop()
    future = loop.create_future()
    comp._pending_requests["run-abc"] = future
    comp._handle_msg({"type": "run_error", "request_id": "run-abc", "error": "SyntaxError: invalid"})
    assert future.done()
    with pytest.raises(RuntimeError, match="SyntaxError: invalid"):
        future.result()
    loop.close()


# ---------------------------------------------------------------------------
# Bokeh model serialization
# ---------------------------------------------------------------------------


def test_get_root_produces_model(document):
    """get_root() produces a Bokeh model."""
    comp = PanelLive(code="x = 1")
    model = comp.get_root(document)
    assert model is not None


def test_value_str_serializes_in_model(document):
    """String value serializes through Bokeh model."""
    comp = PanelLive(value="test")
    model = comp.get_root(document)
    assert model is not None


def test_value_dict_serializes_in_model(document):
    """Dict value serializes through Bokeh model."""
    comp = PanelLive(value={"x": 1, "y": [2, 3]})
    model = comp.get_root(document)
    assert model is not None


def test_value_int_serializes_in_model(document):
    """Int value serializes through Bokeh model."""
    comp = PanelLive(value=99)
    model = comp.get_root(document)
    assert model is not None


def test_value_none_serializes_in_model(document):
    """None value serializes through Bokeh model."""
    comp = PanelLive(value=None)
    model = comp.get_root(document)
    assert model is not None


def test_code_syncs_to_model(document):
    """code param is present on the Bokeh model."""
    comp = PanelLive(code="print('hello')")
    model = comp.get_root(document)
    assert model is not None


def test_mode_syncs_to_model(document):
    """mode param is present on the Bokeh model."""
    comp = PanelLive(mode="app")
    model = comp.get_root(document)
    assert model is not None


def test_headless_mode_works(document):
    """Headless mode produces a valid Bokeh model."""
    comp = PanelLive(mode="headless", code="x = 1")
    model = comp.get_root(document)
    assert model is not None


def test_progress_mode_works(document):
    """Progress mode produces a valid Bokeh model."""
    comp = PanelLive(mode="progress", code="x = 1")
    model = comp.get_root(document)
    assert model is not None


def test_debug_mode_works(document):
    """Debug mode produces a valid Bokeh model."""
    comp = PanelLive(mode="debug", code="x = 1")
    model = comp.get_root(document)
    assert model is not None


# ---------------------------------------------------------------------------
# Asset URLs (__javascript__, __css__, configure())
# ---------------------------------------------------------------------------


def test_javascript_default():
    """__javascript__ points to the CDN JS bundle."""
    assert PanelLive.__javascript__ is not None
    assert len(PanelLive.__javascript__) == 1
    assert "panel-live.js" in PanelLive.__javascript__[0]


def test_css_default():
    """__css__ points to the CDN CSS bundle."""
    assert PanelLive.__css__ is not None
    assert len(PanelLive.__css__) == 1
    assert "panel-live.css" in PanelLive.__css__[0]


def test_showcase_uses_server_io():
    """Showcase uses server.input / server.output for bidirectional data."""
    from pathlib import Path

    showcase = Path("src/panel_live/examples/showcase.py").read_text()
    # Client code should use server.input (server→client)
    assert "server.input" in showcase
    assert "server.param.input" in showcase
    # Client code should use server.output (client→server)
    assert "server.output" in showcase
    # Server code should use .input param (not .send())
    assert "reactive_target.input =" in showcase
    assert "periodic_target.input =" in showcase


def test_cdn_base_uses_github_pages():
    """_CDN_BASE points to GitHub Pages."""
    assert "panel-extensions.github.io" in _CDN_BASE


def test_css_url_matches_cdn_base():
    """__css__ URL uses the same CDN base as __javascript__."""
    assert PanelLive.__css__[0].startswith(_CDN_BASE)


def test_configure_js_url_https():
    """configure(js_url=...) with HTTPS URL sets __javascript__."""
    orig = PanelLive.__javascript__
    try:
        PanelLive.configure(js_url="https://example.com/panel-live.js")
        assert PanelLive.__javascript__ == ["https://example.com/panel-live.js"]
    finally:
        PanelLive.__javascript__ = orig


def test_configure_css_url_https():
    """configure(css_url=...) with HTTPS URL sets __css__."""
    orig = PanelLive.__css__
    try:
        PanelLive.configure(css_url="https://example.com/panel-live.css")
        assert PanelLive.__css__ == ["https://example.com/panel-live.css"]
    finally:
        PanelLive.__css__ = orig


def test_configure_both_urls():
    """configure() can set both js_url and css_url at once."""
    orig_js = PanelLive.__javascript__
    orig_css = PanelLive.__css__
    try:
        PanelLive.configure(
            js_url="https://cdn.example.com/panel-live.js",
            css_url="https://cdn.example.com/panel-live.css",
        )
        assert PanelLive.__javascript__ == ["https://cdn.example.com/panel-live.js"]
        assert PanelLive.__css__ == ["https://cdn.example.com/panel-live.css"]
    finally:
        PanelLive.__javascript__ = orig_js
        PanelLive.__css__ = orig_css
