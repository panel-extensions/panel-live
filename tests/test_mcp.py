"""Tests for the panel-live MCP server."""

import json
import sys

import pytest

from panel_live.cli import main

fastmcp = pytest.importorskip("fastmcp", reason="fastmcp not installed (install panel-live[mcp])")

try:
    import pytest_asyncio  # noqa: F401

    _has_asyncio = True
except ImportError:
    _has_asyncio = False

requires_asyncio = pytest.mark.skipif(not _has_asyncio, reason="pytest-asyncio not installed")


def test_mcp_help_exits_0(capsys):
    """``panel-live mcp --help`` exits 0."""
    with pytest.raises(SystemExit, match="0"):
        main(["mcp", "--help"])


def test_version_exits_0(capsys):
    """``panel-live --version`` exits 0."""
    with pytest.raises(SystemExit, match="0"):
        main(["--version"])


@pytest.mark.filterwarnings("ignore::RuntimeWarning")
def test_mcp_no_panel_import():
    """Importing panel_live.mcp must NOT trigger panel/bokeh imports."""
    # Snapshot modules before import
    mods_before = set(sys.modules.keys())
    import panel_live.mcp  # noqa: F401

    mods_after = set(sys.modules.keys())
    new_mods = mods_after - mods_before
    assert "panel" not in new_mods
    assert "bokeh" not in new_mods


@requires_asyncio
async def test_show_panel_live_payload():
    """Tool returns valid JSON with expected fields."""
    from fastmcp import Client

    from panel_live.mcp import mcp

    async with Client(mcp) as client:
        result = await client.call_tool(
            "show_panel_live",
            {"code": "import panel as pn\npn.panel('hi').servable()"},
        )
        # fastmcp 3.x returns CallToolResult with .content list
        text = result.content[0].text
        payload = json.loads(text)
        assert payload["tool"] == "show_panel_live"
        assert payload["runtime"] == "panel-live-pyodide"
        assert "code" in payload
        assert "name" not in payload
        assert "description" not in payload


@requires_asyncio
async def test_show_panel_live_empty_code():
    """Empty code returns error, not crash."""
    from fastmcp import Client

    from panel_live.mcp import mcp

    async with Client(mcp) as client:
        result = await client.call_tool("show_panel_live", {"code": "   "})
        text = result.content[0].text
        payload = json.loads(text)
        assert "error" in payload


@requires_asyncio
async def test_resource_returns_html():
    """``ui://panel-live/show.html`` returns HTML with expected markers."""
    from fastmcp import Client

    from panel_live.mcp import mcp

    async with Client(mcp) as client:
        resources = await client.list_resources()
        uris = [str(r.uri) for r in resources]
        assert "ui://panel-live/show.html" in uris

        content = await client.read_resource("ui://panel-live/show.html")
        # read_resource returns a list of content blocks or a ReadResourceResult
        if hasattr(content, "contents"):
            html = content.contents[0].text
        elif isinstance(content, list):
            html = content[0].text if hasattr(content[0], "text") else str(content[0])
        else:
            html = str(content)
        assert "PanelLive" in html
        assert "ext-apps" in html


def test_template_file_exists():
    """Template file exists on disk and is valid HTML."""
    from panel_live.mcp import TEMPLATE_PATH

    assert TEMPLATE_PATH.exists()
    html = TEMPLATE_PATH.read_text(encoding="utf-8")
    assert html.startswith("<!doctype html>")
    assert "panel-live-show" in html
