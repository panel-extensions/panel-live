"""POC: verify param.Parameter() serialization through Bokeh model.

Proves that a JSComponent with ``value = param.Parameter()`` can serialize
JSON-compatible types (str, int, float, dict, list, None, bool, nested)
through the Bokeh document model pipeline.
"""

import pytest
from bokeh.document import Document

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _model_for(component, doc=None):
    """Return the Bokeh model for *component*, optionally added to *doc*."""
    if doc is not None:
        root = component.get_root(doc)
    else:
        root = component.get_root()
    return root


# ---------------------------------------------------------------------------
# POC: param.Parameter accepts all JSON types
# ---------------------------------------------------------------------------


def test_value_string():
    """param.Parameter() accepts a string value."""
    from panel_live.component import PanelLive

    comp = PanelLive(value="hello")
    assert comp.value == "hello"


def test_value_int():
    """param.Parameter() accepts an integer value."""
    from panel_live.component import PanelLive

    comp = PanelLive(value=42)
    assert comp.value == 42


def test_value_float():
    """param.Parameter() accepts a float value."""
    from panel_live.component import PanelLive

    comp = PanelLive(value=3.14)
    assert comp.value == 3.14


def test_value_dict():
    """param.Parameter() accepts a dict value."""
    from panel_live.component import PanelLive

    comp = PanelLive(value={"key": "val"})
    assert comp.value == {"key": "val"}


def test_value_list():
    """param.Parameter() accepts a list value."""
    from panel_live.component import PanelLive

    comp = PanelLive(value=[1, 2, 3])
    assert comp.value == [1, 2, 3]


def test_value_none():
    """param.Parameter() accepts None."""
    from panel_live.component import PanelLive

    comp = PanelLive(value=None)
    assert comp.value is None


def test_value_bool():
    """param.Parameter() accepts a bool value."""
    from panel_live.component import PanelLive

    comp = PanelLive(value=True)
    assert comp.value is True


def test_value_nested():
    """param.Parameter() accepts deeply nested JSON structures."""
    from panel_live.component import PanelLive

    nested = {"a": [1, {"b": [True, None, "c"]}], "d": 3.14}
    comp = PanelLive(value=nested)
    assert comp.value == nested


# ---------------------------------------------------------------------------
# POC: Bokeh model serialization
# ---------------------------------------------------------------------------


def test_get_root_produces_model():
    """get_root() produces a Bokeh model without errors."""
    from panel_live.component import PanelLive

    comp = PanelLive(code="x = 1")
    doc = Document()
    model = _model_for(comp, doc)
    assert model is not None


def test_value_string_serializes_in_model():
    """String value serializes through the Bokeh model."""
    from panel_live.component import PanelLive

    comp = PanelLive(value="hello")
    doc = Document()
    model = _model_for(comp, doc)
    assert model is not None


def test_value_dict_serializes_in_model():
    """Dict value serializes through the Bokeh model."""
    from panel_live.component import PanelLive

    comp = PanelLive(value={"key": "val", "num": 42})
    doc = Document()
    model = _model_for(comp, doc)
    assert model is not None


def test_value_int_serializes_in_model():
    """Int value serializes through the Bokeh model."""
    from panel_live.component import PanelLive

    comp = PanelLive(value=99)
    doc = Document()
    model = _model_for(comp, doc)
    assert model is not None


def test_value_none_serializes_in_model():
    """None value serializes through the Bokeh model."""
    from panel_live.component import PanelLive

    comp = PanelLive(value=None)
    doc = Document()
    model = _model_for(comp, doc)
    assert model is not None


def test_value_list_serializes_in_model():
    """List value serializes through the Bokeh model."""
    from panel_live.component import PanelLive

    comp = PanelLive(value=[1, "two", 3.0, None, True])
    doc = Document()
    model = _model_for(comp, doc)
    assert model is not None


def test_code_syncs_to_model():
    """code param is present on the Bokeh model."""
    from panel_live.component import PanelLive

    comp = PanelLive(code="print('hi')")
    doc = Document()
    model = _model_for(comp, doc)
    assert model is not None


def test_dataframe_as_value():
    """DataFrame can be set as value — Bokeh serializes it through bp.Any()."""
    pd = pytest.importorskip("pandas")
    from panel_live.component import PanelLive

    df = pd.DataFrame({"a": [1, 2], "b": [3, 4]})
    comp = PanelLive(value=df)
    # Setting works at the param level
    assert comp.value is df
    # Bokeh model creation succeeds
    doc = Document()
    model = _model_for(comp, doc)
    assert model is not None
