"""Tests for the shared pre-rendering module."""

from pathlib import Path
from unittest.mock import MagicMock
from unittest.mock import patch

from panel_live.prerender import content_hash
from panel_live.prerender import embed_script_tag
from panel_live.prerender import pre_render

# ---------------------------------------------------------------------------
# content_hash
# ---------------------------------------------------------------------------


def test_content_hash_deterministic():
    h1 = content_hash("import panel as pn")
    h2 = content_hash("import panel as pn")
    assert h1 == h2


def test_content_hash_correct_length():
    h = content_hash("code")
    assert len(h) == 64  # SHA-256 hex


def test_content_hash_different_input():
    h1 = content_hash("code_a")
    h2 = content_hash("code_b")
    assert h1 != h2


def test_content_hash_includes_setup_code():
    """setup_code changes the hash when prepended by the caller."""
    h1 = content_hash("import panel as pn")
    h2 = content_hash("setup()\nimport panel as pn")
    assert h1 != h2


# ---------------------------------------------------------------------------
# embed_script_tag
# ---------------------------------------------------------------------------


def test_embed_script_tag_structure():
    tag = embed_script_tag('{"docs_json": "{}"}')
    assert tag.startswith('<script type="application/json" class="panel-live-prerender">')
    assert tag.endswith("</script>")
    assert '{"docs_json": "{}"}' in tag


def test_embed_script_tag_preserves_json():
    json_str = '{"a": 1, "b": [2, 3]}'
    tag = embed_script_tag(json_str)
    assert json_str in tag


# ---------------------------------------------------------------------------
# pre_render — cache behaviour (no subprocess)
# ---------------------------------------------------------------------------


def test_pre_render_cache_hit(tmp_path):
    """Cached result is returned without spawning a subprocess."""
    cache_dir = tmp_path / ".panel-live"
    cache_dir.mkdir()

    code = "import panel as pn"
    h = content_hash(code)
    cache_file = cache_dir / f"{h}.json"
    cache_file.write_text('{"docs_json": "{}", "render_items": "[]"}')

    result = pre_render(code, cache_dir)
    assert result is not None
    assert "docs_json" in result


def test_pre_render_setup_code_changes_cache_key(tmp_path):
    """Different setup_code produces a different cache key."""
    cache_dir = tmp_path / ".panel-live"
    cache_dir.mkdir()

    code = "x = 1"
    # Cache with no setup_code
    h1 = content_hash(code)
    (cache_dir / f"{h1}.json").write_text('{"result": "no_setup"}')

    # Cache with setup_code
    h2 = content_hash("setup()\n" + code)
    (cache_dir / f"{h2}.json").write_text('{"result": "with_setup"}')

    r1 = pre_render(code, cache_dir)
    r2 = pre_render(code, cache_dir, setup_code="setup()")

    assert r1 == '{"result": "no_setup"}'
    assert r2 == '{"result": "with_setup"}'


def test_pre_render_cache_miss_spawns_subprocess(tmp_path):
    """On cache miss, a subprocess is spawned and the result is cached."""
    cache_dir = tmp_path / ".panel-live"

    mock_proc = MagicMock()
    mock_proc.exitcode = 0

    mock_parent = MagicMock()
    mock_parent.poll.return_value = True
    mock_parent.recv.return_value = {"error": None, "output": '{"ok": true}'}

    mock_ctx = MagicMock()
    mock_ctx.Pipe.return_value = (mock_parent, MagicMock())
    mock_ctx.Process.return_value = mock_proc

    with patch("panel_live.prerender.get_context", return_value=mock_ctx):
        result = pre_render("x = 1", cache_dir)

    assert result == '{"ok": true}'
    # Cache file was written
    h = content_hash("x = 1")
    assert (cache_dir / f"{h}.json").read_text() == '{"ok": true}'


def test_pre_render_cache_dir_auto_creation(tmp_path):
    """Cache dir is created automatically on cache miss."""
    cache_dir = tmp_path / "new-cache"
    assert not cache_dir.exists()

    mock_proc = MagicMock()
    mock_proc.exitcode = 0

    mock_parent = MagicMock()
    mock_parent.poll.return_value = True
    mock_parent.recv.return_value = {"error": None, "output": '{"ok": true}'}

    mock_ctx = MagicMock()
    mock_ctx.Pipe.return_value = (mock_parent, MagicMock())
    mock_ctx.Process.return_value = mock_proc

    with patch("panel_live.prerender.get_context", return_value=mock_ctx):
        pre_render("x = 1", cache_dir)

    assert cache_dir.exists()


def test_pre_render_subprocess_failure_returns_none(tmp_path):
    """Subprocess failure returns None."""
    cache_dir = tmp_path / ".panel-live"

    mock_proc = MagicMock()
    mock_proc.exitcode = 1

    mock_ctx = MagicMock()
    mock_ctx.Pipe.return_value = (MagicMock(), MagicMock())
    mock_ctx.Process.return_value = mock_proc

    with patch("panel_live.prerender.get_context", return_value=mock_ctx):
        result = pre_render("x = 1", cache_dir)

    assert result is None


def test_pre_render_error_in_result_returns_none(tmp_path):
    """Error in subprocess result returns None."""
    cache_dir = tmp_path / ".panel-live"

    mock_proc = MagicMock()
    mock_proc.exitcode = 0

    mock_parent = MagicMock()
    mock_parent.poll.return_value = True
    mock_parent.recv.return_value = {"error": "boom", "output": None}

    mock_ctx = MagicMock()
    mock_ctx.Pipe.return_value = (mock_parent, MagicMock())
    mock_ctx.Process.return_value = mock_proc

    with patch("panel_live.prerender.get_context", return_value=mock_ctx):
        result = pre_render("x = 1", cache_dir)

    assert result is None


def test_pre_render_timeout_forwarded(tmp_path):
    """timeout parameter is forwarded to proc.join()."""
    cache_dir = tmp_path / ".panel-live"

    mock_proc = MagicMock()
    mock_proc.exitcode = 0

    mock_parent = MagicMock()
    mock_parent.poll.return_value = True
    mock_parent.recv.return_value = {"error": None, "output": '{"ok": true}'}

    mock_ctx = MagicMock()
    mock_ctx.Pipe.return_value = (mock_parent, MagicMock())
    mock_ctx.Process.return_value = mock_proc

    with patch("panel_live.prerender.get_context", return_value=mock_ctx):
        pre_render("x = 1", cache_dir, timeout=42)

    mock_proc.join.assert_called_once_with(timeout=42)


def test_pre_render_string_cache_dir(tmp_path):
    """cache_dir can be a string path."""
    cache_dir = str(tmp_path / ".panel-live")
    Path(cache_dir).mkdir()

    code = "x = 1"
    h = content_hash(code)
    Path(cache_dir, f"{h}.json").write_text('{"ok": true}')

    result = pre_render(code, cache_dir)
    assert result == '{"ok": true}'
