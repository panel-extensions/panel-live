"""Tests for the panel-live Quarto extension (Lua filter).

These tests verify the Lua filter by checking that the filter file
exists, is valid, and by testing the Python-side test helpers.

Integration tests that run `quarto render` require Quarto to be
installed and are skipped if unavailable.
"""

import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
LUA_FILTER = ROOT / "quarto" / "_extensions" / "panel-live" / "panel-live.lua"
EXTENSION_YML = ROOT / "quarto" / "_extensions" / "panel-live" / "_extension.yml"
DOCS_QUARTO = ROOT / "docs-quarto"


# ---------------------------------------------------------------------------
# Tests: Extension structure
# ---------------------------------------------------------------------------


def test_lua_filter_exists():
    assert LUA_FILTER.exists()


def test_extension_yml_exists():
    assert EXTENSION_YML.exists()


def test_extension_yml_valid():
    """Test that _extension.yml has required fields."""
    content = EXTENSION_YML.read_text()
    assert "name: panel-live" in content
    assert "panel-live.lua" in content
    assert "quarto-required" in content


# ---------------------------------------------------------------------------
# Tests: Lua filter content
# ---------------------------------------------------------------------------


def test_lua_filter_has_codeblock_handler():
    """Test that the Lua filter defines a CodeBlock handler."""
    content = LUA_FILTER.read_text()
    assert "function CodeBlock(el)" in content


def test_lua_filter_has_escape_html():
    content = LUA_FILTER.read_text()
    assert "escape_html" in content


def test_lua_filter_has_parse_directives():
    content = LUA_FILTER.read_text()
    assert "parse_directives" in content


def test_lua_filter_has_ensure_base_setup():
    content = LUA_FILTER.read_text()
    assert "ensure_base_setup" in content


def test_lua_filter_matches_panel_live_class():
    """Test that filter matches 'panel-live' class via includes()."""
    content = LUA_FILTER.read_text()
    assert '"panel-live"' in content


def test_lua_filter_matches_panel_class():
    """Test that filter also matches 'panel' class via includes()."""
    content = LUA_FILTER.read_text()
    assert 'el.classes:includes("panel")' in content


def test_lua_filter_uses_add_html_dependency():
    """Test that the filter uses add_html_dependency for local assets."""
    content = LUA_FILTER.read_text()
    assert "add_html_dependency" in content
    assert 'scripts = { "panel-live.js" }' in content
    assert 'stylesheets = { "panel-live.css" }' in content


def test_lua_filter_bundles_worker():
    """Test that panel-live-worker.js is included as a resource."""
    content = LUA_FILTER.read_text()
    assert "panel-live-worker.js" in content
    assert "resources" in content


def test_lua_filter_injects_js_css():
    """Test that the filter injects panel-live JS and CSS."""
    content = LUA_FILTER.read_text()
    assert "panel-live.js" in content
    assert "panel-live.css" in content


def test_lua_filter_generates_panel_live_config():
    """Test that filter generates PANEL_LIVE_CONFIG."""
    content = LUA_FILTER.read_text()
    assert "PANEL_LIVE_CONFIG" in content


def test_lua_filter_handles_requirements():
    """Test that filter handles requirements directive."""
    content = LUA_FILTER.read_text()
    assert "data-requirements" in content


def test_lua_filter_html_format_check():
    """Test that filter checks for HTML output format."""
    content = LUA_FILTER.read_text()
    assert 'is_format("html")' in content


def test_lua_filter_injects_mini_coi():
    """Test that the filter injects mini-coi.js for SharedArrayBuffer support."""
    content = LUA_FILTER.read_text()
    assert "mini-coi.js" in content
    assert "serviceworkers" in content


def test_mini_coi_js_exists():
    """Test that mini-coi.js is shipped with the extension."""
    mini_coi = LUA_FILTER.parent / "mini-coi.js"
    assert mini_coi.exists()


def test_mini_coi_js_has_service_worker():
    """Test that mini-coi.js registers a service worker."""
    mini_coi = LUA_FILTER.parent / "mini-coi.js"
    content = mini_coi.read_text()
    assert "serviceWorker" in content
    assert "Cross-Origin-Opener-Policy" in content


# ---------------------------------------------------------------------------
# Tests: Known attributes in Lua
# ---------------------------------------------------------------------------


def test_lua_filter_known_attrs():
    """Test that known HTML attributes are defined in the Lua filter."""
    content = LUA_FILTER.read_text()
    for attr in ["mode", "theme", "height", "layout", "auto-run", "label", "code-visibility", "code-position"]:
        assert f'["{attr}"]' in content


# ---------------------------------------------------------------------------
# Tests: Docs-quarto structure
# ---------------------------------------------------------------------------


def test_docs_quarto_exists():
    assert DOCS_QUARTO.exists()


def test_quarto_yml_exists():
    assert (DOCS_QUARTO / "_quarto.yml").exists()


def test_quarto_yml_has_filter():
    content = (DOCS_QUARTO / "_quarto.yml").read_text()
    assert "panel-live" in content


def test_quarto_index_exists():
    assert (DOCS_QUARTO / "index.qmd").exists()


def test_quarto_examples_exists():
    assert (DOCS_QUARTO / "examples.qmd").exists()


# ---------------------------------------------------------------------------
# Integration tests (require Quarto)
# ---------------------------------------------------------------------------


def _quarto_available():
    """Check if quarto CLI is available."""
    try:
        result = subprocess.run(["quarto", "--version"], capture_output=True, timeout=10)
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


@pytest.mark.skipif(not _quarto_available(), reason="Quarto not installed")
def test_quarto_render_index(tmp_path):
    """Integration test: render index.qmd and check output."""
    # Copy extension to tmp_path so Quarto can find it
    import shutil

    test_dir = tmp_path / "site"
    shutil.copytree(DOCS_QUARTO, test_dir)
    ext_dest = test_dir / "_extensions" / "panel-live"
    ext_dest.mkdir(parents=True, exist_ok=True)
    shutil.copy2(LUA_FILTER, ext_dest / "panel-live.lua")
    shutil.copy2(EXTENSION_YML, ext_dest / "_extension.yml")
    mini_coi_src = LUA_FILTER.parent / "mini-coi.js"
    if mini_coi_src.exists():
        shutil.copy2(mini_coi_src, ext_dest / "mini-coi.js")

    # Copy built JS/CSS assets if they exist
    for asset in ["panel-live.js", "panel-live-worker.js", "panel-live.css"]:
        asset_src = LUA_FILTER.parent / asset
        if asset_src.exists():
            shutil.copy2(asset_src, ext_dest / asset)

    result = subprocess.run(
        ["quarto", "render", "index.qmd"],
        cwd=test_dir,
        capture_output=True,
        text=True,
        timeout=120,
    )
    assert result.returncode == 0, f"Quarto render failed:\n{result.stderr}"

    output_file = test_dir / "_site" / "index.html"
    assert output_file.exists()

    html = output_file.read_text()
    assert "<panel-live" in html
    assert "panel-live.js" in html
    assert "mini-coi.js" in html
