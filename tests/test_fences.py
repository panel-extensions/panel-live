"""Tests for the panel-live MkDocs fence extension."""

import pytest

pytest.importorskip("pymdownx")

from panel_live.fences import formatter  # noqa: E402
from panel_live.fences import validator  # noqa: E402


def test_formatter_produces_panel_live_element():
    """Test that the formatter produces a <panel-live> element."""
    options = {}
    inputs = {"mode": "editor", "theme": "dark"}
    validator("panel", inputs, options, {}, None)

    result = formatter("import panel as pn", "panel", "panel-live", options, None)
    assert "<panel-live" in result
    assert 'mode="editor"' in result
    assert 'theme="dark"' in result
    assert "import panel as pn" in result


def test_formatter_org_mode_produces_code_block():
    """Test that mode='org' produces a standard code block, not a <panel-live> element."""
    options = {}
    inputs = {"mode": "org"}
    validator("panel", inputs, options, {}, None)

    result = formatter("import panel as pn\npn.panel('Hello').servable()", "panel", "panel-live", options, None)
    assert "<panel-live" not in result
    assert "import panel as pn" in result


def test_formatter_empty_source():
    """Test that an empty source produces a self-closing panel-live element."""
    options = {}
    inputs = {}
    validator("panel", inputs, options, {}, None)

    result = formatter("", "panel", "panel-live", options, None)
    assert "<panel-live" in result
    assert "</panel-live>" in result


def test_formatter_promotes_panel_requirements_to_attribute():
    """Test that <panel-requirements> is promoted to data-requirements attribute."""
    options = {}
    inputs = {}
    validator("panel", inputs, options, {}, None)

    source = 'import plotly\nprint("<hello>")\n<panel-requirements>plotly</panel-requirements>'
    result = formatter(source, "panel", "panel-live", options, None)
    assert 'data-requirements="plotly"' in result
    assert "<panel-requirements>" not in result
    assert "&lt;hello&gt;" in result
    assert "import plotly" in result


def test_formatter_strips_panel_file():
    """Test that <panel-file> is stripped from code (not output as child)."""
    options = {}
    inputs = {}
    validator("panel", inputs, options, {}, None)

    source = 'import panel as pn\n<panel-file name="data.csv">a,b\n1,2</panel-file>'
    result = formatter(source, "panel", "panel-live", options, None)
    assert "<panel-file" not in result
    assert "import panel as pn" in result


def test_formatter_only_requirements():
    """Test that source containing only <panel-requirements> produces attribute."""
    options = {}
    inputs = {}
    validator("panel", inputs, options, {}, None)

    source = "<panel-requirements>numpy</panel-requirements>"
    result = formatter(source, "panel", "panel-live", options, None)
    assert 'data-requirements="numpy"' in result
    assert "<panel-requirements>" not in result
    assert "<panel-live" in result
