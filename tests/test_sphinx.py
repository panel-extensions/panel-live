"""Tests for the panel-live Sphinx extension."""

from pathlib import Path
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest

sphinx = pytest.importorskip("sphinx")
docutils = pytest.importorskip("docutils")

from panel_live.sphinx import _DEFAULTS  # noqa: E402
from panel_live.sphinx import _STATIC_DIR  # noqa: E402
from panel_live.sphinx import PanelLiveDirective  # noqa: E402
from panel_live.sphinx import _build_finished  # noqa: E402
from panel_live.sphinx import _content_hash  # noqa: E402
from panel_live.sphinx import _escape  # noqa: E402
from panel_live.sphinx import _get_conf  # noqa: E402
from panel_live.sphinx import _inject_page_assets  # noqa: E402
from panel_live.sphinx import _resolve_url  # noqa: E402
from panel_live.sphinx import setup  # noqa: E402

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_app(conf_overrides=None):
    """Create a mock Sphinx app with panel_live_conf."""
    app = MagicMock()
    # Default to pre_render=False in tests to avoid subprocess execution
    defaults = dict(_DEFAULTS)
    defaults["pre_render"] = False
    if conf_overrides:
        defaults.update(conf_overrides)
    app.config.panel_live_conf = defaults
    app.confdir = "/tmp/fake-sphinx-confdir"
    return app


def _run_directive(code, options=None, conf_overrides=None):
    """Simulate running PanelLiveDirective and return the HTML output."""
    directive = PanelLiveDirective.__new__(PanelLiveDirective)
    directive.content = code.split("\n")
    directive.options = options or {}

    # Mock state/document/env/app
    app = _make_app(conf_overrides)
    env = MagicMock()
    env.app = app
    env.docname = "test-page"
    env.panel_live_pages = set()
    settings = MagicMock()
    settings.env = env
    document = MagicMock()
    document.settings = settings
    state = MagicMock()
    state.document = document
    directive.state = state

    nodes = directive.run()
    assert len(nodes) == 1
    return nodes[0].astext() if hasattr(nodes[0], "astext") else str(nodes[0])


# ---------------------------------------------------------------------------
# Tests: HTML escaping
# ---------------------------------------------------------------------------


def test_escape_ampersand():
    assert _escape("a & b") == "a &amp; b"


def test_escape_angle_brackets():
    assert _escape("<script>") == "&lt;script&gt;"


# ---------------------------------------------------------------------------
# Tests: Content hash
# ---------------------------------------------------------------------------


def test_content_hash_deterministic():
    h1 = _content_hash("import panel as pn")
    h2 = _content_hash("import panel as pn")
    assert h1 == h2
    assert len(h1) == 64  # SHA-256 hex


def test_content_hash_different_for_different_code():
    h1 = _content_hash("code_a")
    h2 = _content_hash("code_b")
    assert h1 != h2


# ---------------------------------------------------------------------------
# Tests: Config merging
# ---------------------------------------------------------------------------


def test_get_conf_returns_defaults():
    app = _make_app()
    app.config.panel_live_conf = {}
    conf = _get_conf(app)
    assert conf["directive_name"] == "panel-live"
    assert conf["default_mode"] == "editor"


def test_get_conf_user_overrides():
    app = _make_app({"default_mode": "app", "pyodide_version": "v0.30.0"})
    conf = _get_conf(app)
    assert conf["default_mode"] == "app"
    assert conf["pyodide_version"] == "v0.30.0"
    # Non-overridden defaults preserved
    assert conf["panel_live_js"] == _DEFAULTS["panel_live_js"]


# ---------------------------------------------------------------------------
# Tests: Directive HTML output
# ---------------------------------------------------------------------------


def test_directive_produces_panel_live_element():
    html = _run_directive("import panel as pn\npn.panel('Hello').servable()")
    assert "<panel-live" in html
    assert "import panel as pn" in html


def test_directive_default_mode():
    html = _run_directive("x = 1", conf_overrides={"pre_render": False})
    assert 'mode="editor"' in html


def test_directive_mode_override():
    html = _run_directive("x = 1", options={"mode": "app"}, conf_overrides={"pre_render": False})
    assert 'mode="app"' in html


def test_directive_theme_attribute():
    html = _run_directive("x = 1", options={"theme": "dark"}, conf_overrides={"pre_render": False})
    assert 'theme="dark"' in html


def test_directive_height_attribute():
    html = _run_directive("x = 1", options={"height": "500px"}, conf_overrides={"pre_render": False})
    assert 'height="500px"' in html


def test_directive_layout_attribute():
    html = _run_directive("x = 1", options={"layout": "horizontal"}, conf_overrides={"pre_render": False})
    assert 'layout="horizontal"' in html


def test_directive_code_visibility():
    html = _run_directive("x = 1", options={"code-visibility": "hidden"}, conf_overrides={"pre_render": False})
    assert 'code-visibility="hidden"' in html


def test_directive_requirements():
    html = _run_directive("import numpy", options={"requirements": "numpy pandas"}, conf_overrides={"pre_render": False})
    assert 'data-requirements="numpy pandas"' in html


def test_directive_escapes_code():
    html = _run_directive('print("<hello>")', conf_overrides={"pre_render": False})
    assert "&lt;hello&gt;" in html
    assert "<hello>" not in html


def test_directive_empty_source():
    html = _run_directive("", conf_overrides={"pre_render": False})
    assert "<panel-live" in html
    assert "</panel-live>" in html


def test_directive_preview_attribute():
    """Test that :preview: option generates HTML attribute."""
    html = _run_directive("x = 1", options={"preview": "demo.png"}, conf_overrides={"pre_render": False})
    assert 'preview="demo.png"' in html


def test_directive_marks_page():
    """Test that the directive adds the docname to panel_live_pages."""
    directive = PanelLiveDirective.__new__(PanelLiveDirective)
    directive.content = ["x = 1"]
    directive.options = {}

    app = _make_app({"pre_render": False})
    env = MagicMock()
    env.app = app
    env.docname = "my-page"
    env.panel_live_pages = set()
    settings = MagicMock()
    settings.env = env
    document = MagicMock()
    document.settings = settings
    state = MagicMock()
    state.document = document
    directive.state = state

    directive.run()
    assert "my-page" in env.panel_live_pages


# ---------------------------------------------------------------------------
# Tests: pre-render false
# ---------------------------------------------------------------------------


def test_directive_prerender_false():
    """Test that :pre-render: false prevents pre-render script tag."""
    html = _run_directive(
        "import panel as pn\npn.panel('test').servable()",
        options={"pre-render": "false"},
        conf_overrides={"pre_render": True},
    )
    assert "panel-live-prerender" not in html


# ---------------------------------------------------------------------------
# Tests: per-directive pre-render
# ---------------------------------------------------------------------------


def test_directive_per_directive_prerender(tmp_path):
    """Test that :pre-render: true forces pre-rendering even with global off."""
    from panel_live.prerender import content_hash

    cache_dir = tmp_path / ".panel-live"
    cache_dir.mkdir()

    code = "import panel as pn\npn.panel('test').servable()"
    h = content_hash(code)
    (cache_dir / f"{h}.json").write_text('{"docs_json": "{}", "render_items": "[]"}')

    # Set up directive with pre-render option and global pre_render=False
    directive = PanelLiveDirective.__new__(PanelLiveDirective)
    directive.content = code.split("\n")
    directive.options = {"pre-render": "true"}

    app = _make_app({"pre_render": False})
    app.config.panel_live_conf["pre_render"] = False
    env = MagicMock()
    env.app = app
    env.docname = "test-page"
    env.panel_live_pages = set()
    # Point srcdir to tmp_path so cache lookup works
    env.app.srcdir = str(tmp_path)
    settings = MagicMock()
    settings.env = env
    document = MagicMock()
    document.settings = settings
    state = MagicMock()
    state.document = document
    directive.state = state

    nodes = directive.run()
    html = nodes[0].astext() if hasattr(nodes[0], "astext") else str(nodes[0])
    assert 'class="panel-live-prerender"' in html


# ---------------------------------------------------------------------------
# Tests: Asset injection
# ---------------------------------------------------------------------------


def test_inject_assets_for_directive_page():
    app = _make_app()
    env = MagicMock()
    env.panel_live_pages = {"index"}
    app.env = env

    context = {"metatags": ""}
    _inject_page_assets(app, "index", "page.html", context, None)

    metatags = context["metatags"]
    assert "panel-live.js" in metatags
    assert "panel-live.css" in metatags
    assert "PANEL_LIVE_CONFIG" in metatags
    assert "panel-live-config" in metatags


def test_no_inject_for_non_directive_page():
    app = _make_app()
    env = MagicMock()
    env.panel_live_pages = {"index"}
    app.env = env

    context = {"metatags": ""}
    _inject_page_assets(app, "other-page", "page.html", context, None)

    assert context["metatags"] == ""


def test_inject_config_contains_versions():
    app = _make_app({"pyodide_version": "v0.30.0", "panel_version": "1.9.0", "bokeh_version": "3.9.0"})
    env = MagicMock()
    env.panel_live_pages = {"page"}
    app.env = env

    context = {"metatags": ""}
    _inject_page_assets(app, "page", "page.html", context, None)

    metatags = context["metatags"]
    assert "v0.30.0" in metatags
    assert "1.9.0" in metatags
    assert "3.9.0" in metatags


# ---------------------------------------------------------------------------
# Tests: mini-coi.js injection
# ---------------------------------------------------------------------------


def test_inject_mini_coi_default():
    """Test that mini-coi.js is injected by default."""
    app = _make_app()
    env = MagicMock()
    env.panel_live_pages = {"index"}
    app.env = env

    context = {"metatags": ""}
    _inject_page_assets(app, "index", "page.html", context, None)

    metatags = context["metatags"]
    assert "mini-coi.js" in metatags
    assert 'type="module"' not in metatags


def test_inject_mini_coi_disabled():
    """Test that mini-coi.js is NOT injected when mini_coi=False."""
    app = _make_app({"mini_coi": False})
    env = MagicMock()
    env.panel_live_pages = {"index"}
    app.env = env

    context = {"metatags": ""}
    _inject_page_assets(app, "index", "page.html", context, None)

    metatags = context["metatags"]
    assert "mini-coi.js" not in metatags


def test_mini_coi_relative_path_nested_page():
    """Test that mini-coi.js gets correct relative path for nested pages."""
    app = _make_app()
    env = MagicMock()
    env.panel_live_pages = {"subdir/page"}
    app.env = env

    context = {"metatags": ""}
    _inject_page_assets(app, "subdir/page", "page.html", context, None)

    metatags = context["metatags"]
    assert "../mini-coi.js" in metatags


# ---------------------------------------------------------------------------
# Tests: URL resolution
# ---------------------------------------------------------------------------


def test_resolve_url_absolute():
    """Absolute URLs pass through unchanged."""
    assert _resolve_url("https://cdn.example.com/file.js", "index", {}) == "https://cdn.example.com/file.js"
    assert _resolve_url("http://cdn.example.com/file.js", "index", {}) == "http://cdn.example.com/file.js"
    assert _resolve_url("//cdn.example.com/file.js", "index", {}) == "//cdn.example.com/file.js"


def test_resolve_url_relative_root_page():
    """Relative URLs at root level stay as-is."""
    url = _resolve_url("_static/panel-live.js", "index", {})
    assert url == "_static/panel-live.js"


def test_resolve_url_relative_nested_page():
    """Relative URLs for nested pages get ../ prefix."""
    url = _resolve_url("_static/panel-live.js", "subdir/page", {})
    assert url == "../_static/panel-live.js"


def test_resolve_url_relative_deeply_nested():
    """Relative URLs for deeply nested pages get correct depth."""
    url = _resolve_url("_static/panel-live.js", "a/b/c/page", {})
    assert url == "../../../_static/panel-live.js"


def test_resolve_url_uses_pathto():
    """When context has pathto, it's used for resolution."""
    context = {"pathto": lambda path, resource: f"RESOLVED/{path}"}
    url = _resolve_url("_static/panel-live.js", "index", context)
    assert url == "RESOLVED/_static/panel-live.js"


def test_inject_local_asset_urls():
    """Test that local _static/ paths are resolved correctly."""
    app = _make_app({"panel_live_js": "_static/panel-live.js", "panel_live_css": "_static/panel-live.css"})
    env = MagicMock()
    env.panel_live_pages = {"index"}
    app.env = env

    context = {"metatags": ""}
    _inject_page_assets(app, "index", "page.html", context, None)

    metatags = context["metatags"]
    assert "_static/panel-live.js" in metatags
    assert "_static/panel-live.css" in metatags
    assert "https://" not in metatags.split("PANEL_LIVE_CONFIG")[0]  # no CDN in JS/CSS links


# ---------------------------------------------------------------------------
# Tests: build-finished hook
# ---------------------------------------------------------------------------


def test_build_finished_copies_mini_coi(tmp_path):
    """Test that _build_finished copies mini-coi.js to build root."""
    app = _make_app()
    app.outdir = str(tmp_path)
    env = MagicMock()
    env.panel_live_pages = {"index"}
    app.env = env

    _build_finished(app, None)

    dst = tmp_path / "mini-coi.js"
    assert dst.exists()
    assert "Cross-Origin-Opener-Policy" in dst.read_text()


def test_build_finished_skips_on_exception(tmp_path):
    """Test that _build_finished does nothing if there was a build exception."""
    app = _make_app()
    app.outdir = str(tmp_path)
    env = MagicMock()
    env.panel_live_pages = {"index"}
    app.env = env

    _build_finished(app, RuntimeError("build failed"))

    assert not (tmp_path / "mini-coi.js").exists()


def test_build_finished_skips_when_disabled(tmp_path):
    """Test that _build_finished does nothing when mini_coi=False."""
    app = _make_app({"mini_coi": False})
    app.outdir = str(tmp_path)
    env = MagicMock()
    env.panel_live_pages = {"index"}
    app.env = env

    _build_finished(app, None)

    assert not (tmp_path / "mini-coi.js").exists()


def test_build_finished_skips_no_directive_pages(tmp_path):
    """Test that _build_finished does nothing when no pages use the directive."""
    app = _make_app()
    app.outdir = str(tmp_path)
    env = MagicMock()
    env.panel_live_pages = set()
    app.env = env

    _build_finished(app, None)

    assert not (tmp_path / "mini-coi.js").exists()


def test_static_dir_contains_mini_coi():
    """Test that the bundled static directory contains mini-coi.js."""
    assert (_STATIC_DIR / "mini-coi.js").exists()


# ---------------------------------------------------------------------------
# Tests: Directive name configuration
# ---------------------------------------------------------------------------


def test_setup_registers_directive():
    """Test that setup() registers a directive and returns metadata."""
    app = MagicMock()
    app.config.panel_live_conf = {}
    app.confdir = "/tmp/fake-confdir"

    # Mock conf.py not existing (use default directive name)
    with patch("panel_live.sphinx.Path") as MockPath:
        mock_conf = MagicMock()
        mock_conf.exists.return_value = False
        MockPath.return_value.__truediv__ = MagicMock(return_value=mock_conf)

        result = setup(app)

    assert result["version"] == "0.1.0"
    assert result["parallel_read_safe"] is True
    assert result["parallel_write_safe"] is True
    app.add_config_value.assert_called_once()
    app.add_directive.assert_called_once()


def test_setup_custom_directive_name():
    """Test that directive_name config changes the registered directive."""
    app = MagicMock()
    app.config.panel_live_conf = {}
    app.confdir = "/tmp/fake-confdir"

    # Create a real temp conf.py with directive_name='pyodide'
    import tempfile

    with tempfile.TemporaryDirectory() as tmpdir:
        conf_path = Path(tmpdir) / "conf.py"
        conf_path.write_text('panel_live_conf = {"directive_name": "pyodide"}')
        app.confdir = tmpdir

        setup(app)

    # Check that 'pyodide' was registered as the directive name
    call_args = app.add_directive.call_args
    assert call_args[0][0] == "pyodide"


def test_setup_python_directive_name():
    """Test that directive_name='python' works."""
    app = MagicMock()
    app.config.panel_live_conf = {}

    import tempfile

    with tempfile.TemporaryDirectory() as tmpdir:
        conf_path = Path(tmpdir) / "conf.py"
        conf_path.write_text('panel_live_conf = {"directive_name": "python"}')
        app.confdir = tmpdir

        setup(app)

    call_args = app.add_directive.call_args
    assert call_args[0][0] == "python"


# ---------------------------------------------------------------------------
# Tests: Pre-render caching
# ---------------------------------------------------------------------------


def test_content_hash_caching(tmp_path):
    """Test that cached pre-render results are reused."""
    from panel_live.prerender import pre_render

    cache_dir = tmp_path / ".panel-live"
    cache_dir.mkdir()

    code = "import panel as pn\npn.panel('test').servable()"
    h = _content_hash(code)
    cache_file = cache_dir / f"{h}.json"
    cache_file.write_text('{"docs_json": "{}", "render_items": "[]"}')

    result = pre_render(code, cache_dir)
    assert result is not None
    assert "docs_json" in result
