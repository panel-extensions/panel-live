"""Tests for the panel-live MkDocs fence extension."""

import pytest

pytest.importorskip("pymdownx")

from panel_live.fences import _PRERENDER_CONF  # noqa: E402
from panel_live.fences import configure  # noqa: E402
from panel_live.fences import formatter  # noqa: E402
from panel_live.fences import prerender_formatter  # noqa: E402
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


# ---------------------------------------------------------------------------
# Tests: configure()
# ---------------------------------------------------------------------------


def test_configure_sets_prerender_conf():
    """configure() updates _PRERENDER_CONF."""
    old = dict(_PRERENDER_CONF)
    try:
        configure(pre_render=True, cache_dir="/tmp/test", setup_code="s()", timeout=30)
        assert _PRERENDER_CONF["pre_render"] is True
        assert _PRERENDER_CONF["cache_dir"] == "/tmp/test"
        assert _PRERENDER_CONF["setup_code"] == "s()"
        assert _PRERENDER_CONF["timeout"] == 30
    finally:
        _PRERENDER_CONF.update(old)


# ---------------------------------------------------------------------------
# Tests: pre-render in formatter
# ---------------------------------------------------------------------------


def test_formatter_prerender_embeds_script_tag(tmp_path):
    """With pre-render enabled and cache hit, formatter embeds script tag."""
    from panel_live.prerender import content_hash

    cache_dir = tmp_path / ".panel-live"
    cache_dir.mkdir()

    code = "import panel as pn"
    h = content_hash(code)
    (cache_dir / f"{h}.json").write_text('{"docs_json": "{}"}')

    old = dict(_PRERENDER_CONF)
    try:
        configure(pre_render=True, cache_dir=str(cache_dir))

        options = {}
        inputs = {}
        validator("panel", inputs, options, {}, None)

        result = formatter(code, "panel", "panel-live", options, None)
        assert 'class="panel-live-prerender"' in result
        assert '{"docs_json": "{}"}' in result
    finally:
        _PRERENDER_CONF.update(old)


def test_formatter_prerender_false_prevents_prerender(tmp_path):
    """pre-render='false' attribute prevents pre-rendering."""
    from panel_live.prerender import content_hash

    cache_dir = tmp_path / ".panel-live"
    cache_dir.mkdir()

    code = "import panel as pn"
    h = content_hash(code)
    (cache_dir / f"{h}.json").write_text('{"docs_json": "{}"}')

    old = dict(_PRERENDER_CONF)
    try:
        configure(pre_render=True, cache_dir=str(cache_dir))

        options = {}
        inputs = {"pre-render": "false"}
        validator("panel", inputs, options, {}, None)

        result = formatter(code, "panel", "panel-live", options, None)
        assert "panel-live-prerender" not in result
    finally:
        _PRERENDER_CONF.update(old)


# ---------------------------------------------------------------------------
# Tests: per-fence pre-render attribute
# ---------------------------------------------------------------------------


def test_formatter_per_fence_prerender(tmp_path):
    """pre-render='true' on a fence triggers pre-rendering without global enable."""
    from panel_live.prerender import content_hash

    cache_dir = tmp_path / ".panel-live"
    cache_dir.mkdir()

    code = "import panel as pn"
    h = content_hash(code)
    (cache_dir / f"{h}.json").write_text('{"docs_json": "{}"}')

    old = dict(_PRERENDER_CONF)
    try:
        # Global pre-render is OFF, but per-fence is ON
        configure(pre_render=False, cache_dir=str(cache_dir))

        options = {}
        inputs = {"pre-render": "true"}
        validator("panel", inputs, options, {}, None)

        result = formatter(code, "panel", "panel-live", options, None)
        assert 'class="panel-live-prerender"' in result
    finally:
        _PRERENDER_CONF.update(old)


def test_formatter_prerender_attr_not_in_html():
    """pre-render attribute must NOT appear on the <panel-live> HTML element."""
    options = {}
    inputs = {"pre-render": "true"}
    validator("panel", inputs, options, {}, None)

    result = formatter("import panel as pn", "panel", "panel-live", options, None)
    assert "pre-render=" not in result


def test_preview_attribute_passes_through():
    """Test that preview attribute passes through to HTML as an attribute."""
    options = {}
    inputs = {"preview": "demo.png"}
    validator("panel", inputs, options, {}, None)

    result = formatter("x = 1", "panel", "panel-live", options, None)
    assert 'preview="demo.png"' in result
    assert "<panel-live" in result


def test_preview_attribute_with_gif():
    """Test that preview works with GIF paths."""
    options = {}
    inputs = {"preview": "../assets/gif/streaming-chart.gif"}
    validator("panel", inputs, options, {}, None)

    result = formatter("x = 1", "panel", "panel-live", options, None)
    assert 'preview="../assets/gif/streaming-chart.gif"' in result


def test_formatter_prerender_false_overrides_global(tmp_path):
    """pre-render='false' overrides global pre_render=True."""
    from panel_live.prerender import content_hash

    cache_dir = tmp_path / ".panel-live"
    cache_dir.mkdir()

    code = "import panel as pn"
    h = content_hash(code)
    (cache_dir / f"{h}.json").write_text('{"docs_json": "{}"}')

    old = dict(_PRERENDER_CONF)
    try:
        configure(pre_render=True, cache_dir=str(cache_dir))

        options = {}
        inputs = {"pre-render": "false"}
        validator("panel", inputs, options, {}, None)

        result = formatter(code, "panel", "panel-live", options, None)
        assert "panel-live-prerender" not in result
    finally:
        _PRERENDER_CONF.update(old)


# ---------------------------------------------------------------------------
# Tests: prerender_formatter
# ---------------------------------------------------------------------------


def test_prerender_formatter_forces_prerender(tmp_path):
    """prerender_formatter enables pre-rendering regardless of global config."""
    from panel_live.prerender import content_hash

    cache_dir = tmp_path / ".panel-live"
    cache_dir.mkdir()

    code = "import panel as pn"
    h = content_hash(code)
    (cache_dir / f"{h}.json").write_text('{"docs_json": "{}"}')

    old = dict(_PRERENDER_CONF)
    try:
        # Global pre-render is OFF
        configure(pre_render=False, cache_dir=str(cache_dir))

        options = {}
        inputs = {}
        validator("panel", inputs, options, {}, None)

        result = prerender_formatter(code, "panel", "panel-live", options, None)
        assert 'class="panel-live-prerender"' in result
    finally:
        _PRERENDER_CONF.update(old)


def test_prerender_formatter_restores_global_state(tmp_path):
    """prerender_formatter restores _PRERENDER_CONF after execution."""
    old = dict(_PRERENDER_CONF)
    try:
        configure(pre_render=False, cache_dir=str(tmp_path))

        options = {}
        inputs = {}
        validator("panel", inputs, options, {}, None)

        prerender_formatter("x = 1", "panel", "panel-live", options, None)
        assert _PRERENDER_CONF["pre_render"] is False
    finally:
        _PRERENDER_CONF.update(old)
