"""PanelLive server component.

A ``JSComponent`` that wraps the ``<panel-live>`` web component, enabling
Panel server applications to run Python code in the browser via Pyodide
with bidirectional data exchange.
"""

from __future__ import annotations

import asyncio
import uuid
from typing import Any
from typing import ClassVar

import param
from panel.custom import JSComponent

_CDN_BASE = "https://cdn.jsdelivr.net/npm/@panel-extensions/panel-live@latest/dist"


class PanelLive(JSComponent):
    """Run Python code in the browser via Pyodide, with bidirectional server communication.

    Wraps the ``<panel-live>`` web component as a Panel ``JSComponent``.
    Code executes client-side in a Pyodide Web Worker; the ``value``
    parameter provides a bidirectional data channel between server and
    browser.

    The panel-live JS/CSS bundle is loaded automatically from CDN by
    default.  To use local assets instead, call :meth:`configure` before
    creating any instances::

        PanelLive.configure(js_url="./pl/panel-live.js")

    Parameters
    ----------
    code : str
        Python code to execute in Pyodide.
    requirements : list[str]
        Packages to install via micropip before execution.
    mode : str
        Display mode:

        - ``"editor"`` — code editor + output (default)
        - ``"app"`` — output only
        - ``"playground"`` — editor + examples selector
        - ``"headless"`` — invisible (0px), pure background compute
        - ``"compact"`` — status line only, no visible output
        - ``"debug"`` — stdout/stderr visible, for development
    theme : str
        Color theme: ``"auto"`` (OS preference), ``"light"``, or ``"dark"``.
    layout : str
        Editor/output arrangement: ``"vertical"`` or ``"horizontal"``.
    auto_run : bool
        If ``True``, execute code automatically on load.
    code_visibility : str
        Code editor visibility: ``"visible"``, ``"collapsed"``, or ``"hidden"``.
    value : object
        Bidirectional value for server→client and client→server data.
        Supports JSON-serializable types (``str``, ``int``, ``float``,
        ``dict``, ``list``, ``bool``, ``None``).
    output : object
        Client→server data channel (read-only from server perspective).
        Updated when client-side code sends data back.
    run : Event
        Trigger code execution manually.
    status : str
        Current execution status (read-only from user perspective).
    error : str
        Last error message from execution.
    stdout : str
        Captured stdout from last execution.
    """

    # --- Asset URLs (auto-loaded by Panel) ---
    __javascript__: ClassVar[list[str] | None] = [f"{_CDN_BASE}/panel-live.js"]
    __css__: ClassVar[list[str] | None] = [f"{_CDN_BASE}/panel-live.css"]

    @classmethod
    def configure(cls, *, js_url: str | None = None, css_url: str | None = None) -> None:
        """Override the panel-live JS and/or CSS asset URLs.

        Call before creating any ``PanelLive`` instances::

            PanelLive.configure(js_url="./pl/panel-live.js", css_url="./pl/panel-live.css")

        HTTP(S) URLs are loaded via ``__javascript__`` / ``__css__``.
        Relative URLs (for local ``--static-dirs`` serving) are injected
        via ``pn.config.js_files`` / ``pn.config.css_files``.
        """
        if js_url is not None:
            if js_url.startswith(("http://", "https://")):
                cls.__javascript__ = [js_url]
            else:
                import panel as pn

                cls.__javascript__ = []
                pn.config.js_files["panel-live"] = js_url

        if css_url is not None:
            if css_url.startswith(("http://", "https://")):
                cls.__css__ = [css_url]
            else:
                import panel as pn

                cls.__css__ = []
                pn.config.css_files.append(css_url)

    # --- Code ---
    code = param.String(default="", doc="Python code to execute in Pyodide")
    requirements = param.List(default=[], item_type=str, doc="Packages to install via micropip")

    # --- Display ---
    mode = param.Selector(
        default="editor",
        objects=["app", "editor", "playground", "headless", "compact", "debug"],
        doc=(
            "Display mode: 'editor' (code + output), 'app' (output only), "
            "'playground' (editor + examples), 'headless' (invisible 0px), "
            "'compact' (status line only), 'debug' (stdout/stderr visible)."
        ),
    )
    theme = param.Selector(default="auto", objects=["auto", "light", "dark"])
    layout = param.Selector(default="vertical", objects=["vertical", "horizontal"])
    auto_run = param.Boolean(default=True, doc="Run code automatically on load")
    code_visibility = param.Selector(
        default="visible",
        objects=["visible", "collapsed", "hidden"],
    )

    # --- Data ---
    value = param.Parameter(
        doc="Bidirectional value. JSON-serializable types: str, int, float, dict, list, None.",
    )
    output = param.Parameter(
        doc="Client-to-server data. Updated when Pyodide code sends data back via postMessage.",
    )

    # --- Execution ---
    run = param.Event(doc="Trigger code execution manually")

    # --- Status (read-only from user perspective) ---
    status = param.Selector(
        default="idle",
        objects=["idle", "loading", "running", "ready", "error"],
    )
    error = param.String(default="", doc="Last error message")
    stdout = param.String(default="", doc="Captured stdout from last execution")

    _esm = "panel_live_esm.js"

    def __init__(self, **params: Any) -> None:
        super().__init__(**params)
        self._pending_requests: dict[str, asyncio.Future] = {}

    def send(self, data: Any) -> None:
        """Send data from server to client-side Pyodide code.

        The data must be JSON-serializable. On the client side, the data
        is available via the ``pl-server-data`` event on the ``<panel-live>``
        element.

        Parameters
        ----------
        data : Any
            JSON-serializable data to send to the client.
        """
        self._send_msg({"type": "server_data", "data": data})

    async def run_python(self, code: str, timeout: float = 30.0, **kwargs: Any) -> Any:
        """Execute Python code in the client-side Pyodide worker.

        Sends the code to the browser for execution and waits for the
        result asynchronously.

        Parameters
        ----------
        code : str
            Python code to execute in Pyodide.
        timeout : float
            Maximum seconds to wait for a result (default 30).
        **kwargs : Any
            JSON-serializable keyword arguments injected as globals
            in the Pyodide execution namespace.

        Returns
        -------
        Any
            The result returned by the executed code (must be
            JSON-serializable).

        Raises
        ------
        TimeoutError
            If the execution does not complete within ``timeout`` seconds.
        RuntimeError
            If the client-side execution raises an error.
        """
        request_id = str(uuid.uuid4())
        future: asyncio.Future = asyncio.get_event_loop().create_future()
        self._pending_requests[request_id] = future

        self._send_msg(
            {
                "type": "run_python",
                "code": code,
                "kwargs": kwargs,
                "request_id": request_id,
            }
        )

        try:
            return await asyncio.wait_for(future, timeout=timeout)
        finally:
            self._pending_requests.pop(request_id, None)

    def _handle_msg(self, data: Any) -> None:
        """Handle incoming messages from the client-side ESM.

        Routes messages by ``type``:

        - ``"output"`` — updates the ``output`` param
        - ``"run_python_result"`` — resolves a pending ``run_python`` future
        - ``"run_python_error"`` — rejects a pending ``run_python`` future
        """
        if not isinstance(data, dict):
            return

        msg_type = data.get("type")

        if msg_type == "output":
            self.output = data.get("data")

        elif msg_type == "run_python_result":
            request_id = data.get("request_id", "")
            future = self._pending_requests.get(str(request_id))
            if future and not future.done():
                future.set_result(data.get("result"))

        elif msg_type == "run_python_error":
            request_id = data.get("request_id", "")
            future = self._pending_requests.get(str(request_id))
            if future and not future.done():
                future.set_exception(RuntimeError(data.get("error", "Unknown error")))
