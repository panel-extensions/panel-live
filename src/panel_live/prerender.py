"""Shared pre-rendering utilities for panel-live.

Executes Panel code at build time and produces Bokeh JSON output that can be
embedded inside ``<panel-live>`` elements for instant display before Pyodide
loads.  Used by the Sphinx extension, the MkDocs fence formatter, and the CLI.

The pipeline is:

1. Hash the code (including any setup code) with SHA-256.
2. Check a content-hash cache on disk.
3. On cache miss, spawn a subprocess that runs the code via
   ``panel.io.mime_render.exec_with_return()`` and serializes the result to
   Bokeh JSON via ``standalone_docs_json_and_render_items()``.
4. Store the JSON in the cache and return it.
5. The caller wraps the JSON in a ``<script>`` tag for embedding.
"""

from __future__ import annotations

import hashlib
import json
import logging
from multiprocessing import get_context
from pathlib import Path

log = logging.getLogger("panel-live")


def content_hash(code: str) -> str:
    """Return a SHA-256 hex digest for *code*.

    Parameters
    ----------
    code : str
        The full source code string (including any prepended setup code).

    Returns
    -------
    str
        64-character hexadecimal digest.
    """
    return hashlib.sha256(code.encode()).hexdigest()


def model_json(obj) -> str | None:
    """Serialize a Bokeh/Panel object to JSON for embedding.

    Mirrors the pattern used by ``nbsite.pyodide._model_json()``.

    Parameters
    ----------
    obj : object
        A Panel ``Viewable``, Bokeh ``Model``, or any object that
        ``pn.panel()`` can wrap.

    Returns
    -------
    str or None
        A JSON string containing ``docs_json``, ``render_items``, and
        ``ext_resources`` keys, or ``None`` if serialization fails.
    """
    from bokeh.embed.standalone import standalone_docs_json_and_render_items
    from panel import panel as pn_panel
    from panel.viewable import Viewable

    if not isinstance(obj, Viewable):
        obj = pn_panel(obj)

    doc = obj.server_doc()
    docs_json, render_items = standalone_docs_json_and_render_items(doc)
    docs_json_str = json.dumps(docs_json)
    render_items_str = json.dumps([item.to_json() for item in render_items])

    # Detect extension resources (JS/CSS) needed by models actually in the
    # document (not all registered models — that would pull in ReactiveESM etc.
    # for every example).  Use __javascript_raw__ / __css_raw__ to get the
    # original CDN URLs (typically cdn.jsdelivr.net/npm/...).  The non-raw
    # __javascript__ / __css__ attributes contain local server paths
    # (static/extensions/panel/bundled/...) that don't exist on the CDN.
    js_urls: list[str] = []
    css_urls: list[str] = []
    doc_model_classes = {type(m) for m in doc.models}
    for cls in doc_model_classes:
        for url in getattr(cls, "__javascript_raw__", []) or []:
            if url not in js_urls:
                js_urls.append(url)
        for url in getattr(cls, "__css_raw__", []) or []:
            if url not in css_urls:
                css_urls.append(url)

    result: dict = {"docs_json": docs_json_str, "render_items": render_items_str}
    if js_urls or css_urls:
        result["ext_resources"] = {"js": js_urls, "css": css_urls}
    return json.dumps(result)


def execution_process(code: str, conn) -> None:
    """Run *code* in a subprocess and send back Bokeh JSON via *conn*.

    This function is the ``target`` of a ``multiprocessing.Process`` spawned
    with ``get_context('spawn')``.

    Parameters
    ----------
    code : str
        Python source code to execute.
    conn : multiprocessing.Connection
        The child end of a ``Pipe()``.  A dict with ``error`` and ``output``
        keys is sent before the connection is closed.
    """
    try:
        import io

        from panel.io.mime_render import exec_with_return

        stderr_buf = io.StringIO()
        result = exec_with_return(code, stderr=stderr_buf)
        if result is None:
            # exec_with_return catches exceptions and prints tracebacks to
            # stderr.  If stderr captured output, treat it as an error.
            captured = stderr_buf.getvalue()
            if captured:
                conn.send({"error": captured, "traceback": captured, "output": None})
            else:
                conn.send({"error": None, "output": None})
            return

        output = model_json(result)
        conn.send({"error": None, "output": output})
    except Exception as exc:
        import traceback

        tb = traceback.format_exception(exc)
        conn.send({"error": f"{exc.__class__.__name__}: {exc}", "traceback": "".join(tb), "output": None})
    finally:
        conn.close()


def pre_render(code: str, cache_dir: Path | str, *, setup_code: str = "", timeout: int = 120) -> str | None:
    """Pre-render *code* and return the embedded JSON string.

    Uses a content-hash cache so repeated builds with unchanged code are
    nearly instant.

    Parameters
    ----------
    code : str
        The user-visible source code.
    cache_dir : Path or str
        Directory for the content-hash cache (e.g. ``".panel-live"``).
    setup_code : str
        Optional code prepended before *code* (e.g. ``pn.extension(...)``).
        Included in the content hash.
    timeout : int
        Maximum seconds to wait for the subprocess.

    Returns
    -------
    str or None
        Bokeh JSON string on success, ``None`` on failure or empty output.
    """
    cache_dir = Path(cache_dir)
    full_code = (setup_code + "\n" + code) if setup_code else code
    h = content_hash(full_code)
    cache_file = cache_dir / f"{h}.json"

    if cache_file.exists():
        try:
            return cache_file.read_text(encoding="utf-8")
        except OSError:
            pass

    ctx = get_context("spawn")
    parent_conn, child_conn = ctx.Pipe()
    proc = ctx.Process(target=execution_process, args=(full_code, child_conn))
    proc.start()
    child_conn.close()  # parent doesn't use the child end; close it so broken-pipe is detectable
    proc.join(timeout=timeout)
    if proc.is_alive():
        proc.terminate()  # kill zombie subprocess so it can't write to a closed pipe
        proc.join(timeout=5)

    code_preview = full_code.strip().split("\n")[0][:80]
    if proc.exitcode != 0 or not parent_conn.poll():
        log.warning("pre-render failed (exit code %s) for: %s", proc.exitcode, code_preview)
        return None

    result = parent_conn.recv()
    if result.get("error"):
        tb = result.get("traceback", "")
        log.info("pre-render error (will embed) for: %s\n  %s", code_preview, result["error"])
        if tb:
            log.debug("pre-render traceback:\n%s", tb)
        # Return error as embeddable JSON so the front-end can display it
        output = json.dumps({"error": tb or result["error"]})
    elif not result.get("output"):
        log.warning("pre-render produced no output for: %s", code_preview)
        return None
    else:
        output = result["output"]

    cache_dir.mkdir(parents=True, exist_ok=True)
    try:
        import portalocker

        with open(cache_file, "w", encoding="utf-8") as f:
            portalocker.lock(f, portalocker.LOCK_EX)
            f.write(output)
            portalocker.unlock(f)
    except ImportError:
        cache_file.write_text(output, encoding="utf-8")

    return output


def embed_script_tag(json_str: str) -> str:
    """Wrap *json_str* in a ``<script>`` tag for embedding inside ``<panel-live>``.

    Parameters
    ----------
    json_str : str
        The Bokeh JSON string returned by :func:`pre_render`.

    Returns
    -------
    str
        An HTML ``<script type="application/json" class="panel-live-prerender">`` tag.
    """
    return f'<script type="application/json" class="panel-live-prerender">{json_str}</script>'
