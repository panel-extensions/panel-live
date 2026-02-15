"""Tests for the panel-live CLI."""

from unittest.mock import patch

from panel_live.cli import main
from panel_live.prerender import content_hash


def test_no_command_returns_1():
    assert main([]) == 1


def test_pre_render_no_code_returns_1():
    assert main(["pre-render"]) == 1


def test_pre_render_cached_result_to_stdout(tmp_path, capsys):
    """Cached pre-render result is printed to stdout."""
    cache_dir = tmp_path / ".panel-live"
    cache_dir.mkdir()

    code = "x = 1"
    h = content_hash(code)
    (cache_dir / f"{h}.json").write_text('{"ok": true}')

    rc = main(["pre-render", code, "--cache-dir", str(cache_dir)])
    assert rc == 0
    assert '{"ok": true}' in capsys.readouterr().out


def test_pre_render_file_input(tmp_path, capsys):
    """--file reads code from a file."""
    cache_dir = tmp_path / ".panel-live"
    cache_dir.mkdir()

    code = "y = 2"
    script = tmp_path / "app.py"
    script.write_text(code)

    h = content_hash(code)
    (cache_dir / f"{h}.json").write_text('{"file_ok": true}')

    rc = main(["pre-render", "--file", str(script), "--cache-dir", str(cache_dir)])
    assert rc == 0
    assert '{"file_ok": true}' in capsys.readouterr().out


def test_pre_render_file_not_found(capsys):
    rc = main(["pre-render", "--file", "/nonexistent/file.py"])
    assert rc == 1
    assert "Error reading file" in capsys.readouterr().err


def test_pre_render_failure_returns_1(tmp_path, capsys):
    """pre_render returning None causes exit code 1."""
    with patch("panel_live.prerender.pre_render", return_value=None):
        rc = main(["pre-render", "x = 1", "--cache-dir", str(tmp_path)])
    assert rc == 1
    assert "failed" in capsys.readouterr().err.lower()
