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
