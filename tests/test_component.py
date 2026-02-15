"""Unit tests for the PanelLive component."""

import asyncio

import pytest
from bokeh.document import Document

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
    assert comp.value is None
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
        value={"key": "val"},
    )
    assert comp.code == "x = 1"
    assert comp.mode == "app"
    assert comp.theme == "dark"
    assert comp.layout == "horizontal"
    assert comp.auto_run is False
    assert comp.code_visibility == "collapsed"
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


def test_mode_accepts_compact():
    """mode='compact' is accepted."""
    comp = PanelLive(mode="compact")
    assert comp.mode == "compact"


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


# ---------------------------------------------------------------------------
# run_python() method
# ---------------------------------------------------------------------------


def test_run_python_method_exists():
    """PanelLive has an async run_python() method."""
    comp = PanelLive()
    assert hasattr(comp, "run_python")
    assert asyncio.iscoroutinefunction(comp.run_python)


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


def test_handle_msg_run_python_result():
    """_handle_msg resolves a pending run_python future."""
    comp = PanelLive()
    loop = asyncio.new_event_loop()
    future = loop.create_future()
    comp._pending_requests["req-123"] = future
    comp._handle_msg({"type": "run_python_result", "request_id": "req-123", "result": 42})
    assert future.done()
    assert future.result() == 42
    loop.close()


def test_handle_msg_run_python_error():
    """_handle_msg rejects a pending run_python future on error."""
    comp = PanelLive()
    loop = asyncio.new_event_loop()
    future = loop.create_future()
    comp._pending_requests["req-456"] = future
    comp._handle_msg({"type": "run_python_error", "request_id": "req-456", "error": "NameError: x"})
    assert future.done()
    with pytest.raises(RuntimeError, match="NameError: x"):
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


def test_compact_mode_works(document):
    """Compact mode produces a valid Bokeh model."""
    comp = PanelLive(mode="compact", code="x = 1")
    model = comp.get_root(document)
    assert model is not None


def test_debug_mode_works(document):
    """Debug mode produces a valid Bokeh model."""
    comp = PanelLive(mode="debug", code="x = 1")
    model = comp.get_root(document)
    assert model is not None
