import io
import json
import sys

from bokeh.document import Document
from bokeh.io.doc import set_curdoc
from bokeh.model import Model
from bokeh.settings import settings as bk_settings
from panel.io.document import MockSessionContext
from panel.io.state import state


# Streaming stdout/stderr writer that calls JS callbacks for real-time output
class StreamingWriter:
    def __init__(self, callback, fallback):
        self._callback = callback
        self._fallback = fallback
        self._buffer = io.StringIO()

    def write(self, text):
        self._buffer.write(text)
        if text and self._callback:
            try:
                self._callback(text)
            except Exception:
                pass
        return len(text)

    def flush(self):
        pass

    def getvalue(self):
        return self._buffer.getvalue()


# Determine execution branch
code = __panel_user_code__  # noqa: F821
target_id = __panel_target_id__  # noqa: F821
has_servable = ".servable(" in code
has_servable_target = False
import re

if has_servable:
    has_servable_target = bool(re.search(r"\.servable\s*\(\s*target\s*=", code))

is_expression = not has_servable
branch = "expression" if is_expression else ("servable-target" if has_servable_target else "servable")

# Set up document
__ns__ = {"__builtins__": __builtins__}
exec("import panel as pn", __ns__)
bk_settings.simple_ids.set_value(False)
doc = Document()
set_curdoc(doc)
doc.hold()
doc._session_context = lambda: MockSessionContext(document=doc)
state.curdoc = doc

# Capture stdout/stderr with streaming
stdout_cb = __stream_stdout__ if "__stream_stdout__" in dir() else None  # noqa: F821
stderr_cb = __stream_stderr__ if "__stream_stderr__" in dir() else None  # noqa: F821
stdout_writer = StreamingWriter(stdout_cb, sys.__stdout__)
stderr_writer = StreamingWriter(stderr_cb, sys.__stderr__)
sys.stdout = stdout_writer
sys.stderr = stderr_writer


# Inject send_output() for client→server data
# Closure captures target_id so callbacks fire with the correct element ID
def _make_send_output(tid):
    def send_output(data):
        import json as _j

        __send_output_raw__(_j.dumps(data), tid)  # noqa: F821

    return send_output


__ns__["send_output"] = _make_send_output(target_id)

# Inject reactive server object for server→client data
# Per-element: reuse existing if send() was called before first run()
try:
    if target_id not in __server_data_objs__:  # noqa: F821
        __server_data_objs__[target_id] = __ServerData__()  # noqa: F821
    _server_obj = __server_data_objs__[target_id]  # noqa: F821
except Exception:
    # Fallback: create a fresh server object if globals aren't available
    import param as _param_fallback

    class _FallbackServerData(_param_fallback.Parameterized):
        input = _param_fallback.Parameter(default=None)
        output = _param_fallback.Parameter(default=None)

    _server_obj = _FallbackServerData()
__ns__["server"] = _server_obj


# Wire output param → server: setting server.output sends data back
def _on_output_change(event, _tid=target_id):
    if event.new is not None:
        import json as _j

        __send_output_raw__(_j.dumps(event.new), _tid)  # noqa: F821


_server_obj.param.watch(_on_output_change, ["output"])

try:
    if is_expression:
        from panel.io.mime_render import exec_with_return

        __exec_result__ = exec_with_return(code, __ns__, stderr=stderr_writer)
        if __exec_result__ is None and stderr_writer.getvalue():
            raise RuntimeError(stderr_writer.getvalue())
        # Wrap expression result into the document for unified serialization
        if __exec_result__ is not None:
            import panel as pn

            pn.panel(__exec_result__).server_doc(doc=doc)
    else:
        exec(code, __ns__)
finally:
    sys.stdout = sys.__stdout__
    sys.stderr = sys.__stderr__

__captured_stdout__ = stdout_writer.getvalue()
__captured_stderr__ = stderr_writer.getvalue()

# Detect extension resources (JS/CSS URLs needed on main thread)
js_urls = []
css_urls = []
for _cls in Model.model_class_reverse_map.values():
    for url in getattr(_cls, "__javascript__", []) or []:
        if url not in js_urls:
            js_urls.append(url)
    for url in getattr(_cls, "__css__", []) or []:
        if url not in css_urls:
            css_urls.append(url)
__ext_resources__ = json.dumps({"js": js_urls, "css": css_urls})

# Store doc for later _link_docs_worker call
if "__active_docs__" not in dir():
    __active_docs__ = {}  # noqa: F841
__active_docs__[target_id] = doc

# Store branch info for render script
__exec_branch__ = branch
__has_output__ = not is_expression or __exec_result__ is not None  # noqa: F821
