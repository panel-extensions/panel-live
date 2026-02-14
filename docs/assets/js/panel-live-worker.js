(()=>{var y=`import io
import sys
import json

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
    has_servable_target = bool(re.search(r"\\.servable\\s*\\(\\s*target\\s*=", code))

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
`;var h=`import json
from panel.io.pyodide import _doc_json
from panel.io.state import state

doc = __active_docs__[__panel_target_id__]  # noqa: F821

if not __has_output__:  # noqa: F821
    __render_result__ = "__NO_OUTPUT__"
else:
    docs_json, render_items, root_ids = _doc_json(doc)
    doc._session_context = None
    __render_result__ = json.dumps({
        "docs_json": docs_json,
        "render_items": render_items,
        "root_ids": root_ids,
    })
`;var e=null,c=null,f=new Set(["panel","bokeh","pyodide-http"]),m=Promise.resolve();function n(s){return m=m.then(s,s),m}self.onmessage=async s=>{let t=s.data;try{switch(t.type){case"init":await P(t.config);break;case"run":await n(()=>S(t));break;case"install":await n(()=>R(t.packages));break;case"write-file":await n(()=>q(t.name,t.content));break;case"rendered":await n(()=>I(t));break;case"patch":await n(()=>j(t));break;case"reset":await n(()=>M(t));break;default:console.warn("[panel-live-worker] Unknown message type:",t.type)}}catch(r){console.error("[panel-live-worker] Error handling message:",t.type,r),t.runId&&self.postMessage({type:"error",runId:t.runId,message:r.message||String(r),traceback:String(r)})}};async function P(s){return c||(c=(async()=>{self.postMessage({type:"status",msg:"Loading Pyodide..."}),importScripts(s.pyodideUrl),self.postMessage({type:"status",msg:"Initializing Pyodide..."}),e=await self.loadPyodide(),self.postMessage({type:"status",msg:"Loading micropip..."}),await e.loadPackage("micropip"),self.postMessage({type:"status",msg:"Installing Bokeh + Panel wheels..."}),await e.pyimport("micropip").install([s.bokehWhl,s.panelWhl]),self.postMessage({type:"status",msg:"Initializing Panel..."}),await e.runPythonAsync(`
import panel as pn
print("Panel", pn.__version__, "ready (worker)")
`),e.globals.set("__stream_stdout__",r=>{self._currentRunId&&self.postMessage({type:"stdout",text:r,runId:self._currentRunId})}),e.globals.set("__stream_stderr__",r=>{self._currentRunId&&self.postMessage({type:"stderr",text:r,runId:self._currentRunId})}),await e.runPythonAsync("__active_docs__ = {}"),self.postMessage({type:"ready"})})(),c)}async function S(s){let{code:t,targetId:r,runId:_}=s;self._currentRunId=_;try{self.postMessage({type:"status",msg:"Detecting requirements..."}),e.globals.set("__user_code__",t);let a=await e.runPythonAsync(`
from panel.io.mime_render import find_requirements
import json
json.dumps(find_requirements(__user_code__))
`),o=JSON.parse(a).filter(l=>!f.has(l.toLowerCase()));o.length>0&&(self.postMessage({type:"status",msg:"Installing: "+o.join(", ")+"..."}),await e.pyimport("micropip").install(o),o.forEach(u=>f.add(u.toLowerCase()))),await e.runPythonAsync(`
from bokeh.io.doc import set_curdoc
from bokeh.document import Document
set_curdoc(Document())
`),self.postMessage({type:"status",msg:"Running code..."}),e.globals.set("__panel_user_code__",t),e.globals.set("__panel_target_id__",r),await e.runPythonAsync(y);let d="",p="";try{d=e.globals.get("__captured_stdout__")||"",p=e.globals.get("__captured_stderr__")||""}catch{}let b=e.globals.get("__ext_resources__"),w=JSON.parse(b||'{"js":[],"css":[]}');await e.runPythonAsync(h);let g=e.globals.get("__render_result__");if(g==="__NO_OUTPUT__")self.postMessage({type:"no-output",runId:_,targetId:r,stdout:d,stderr:p});else{let{docs_json:l,render_items:u,root_ids:k}=JSON.parse(g);self.postMessage({type:"render",runId:_,targetId:r,docs_json:l,render_items:u,root_ids:k,ext_resources:w,stdout:d,stderr:p})}self.postMessage({type:"done",runId:_})}catch(a){let i="",o="";try{i=e.globals.get("__captured_stdout__")||"",o=e.globals.get("__captured_stderr__")||""}catch{}self.postMessage({type:"error",runId:_,targetId:r,message:a.message||String(a),traceback:String(a),stdout:i,stderr:o})}finally{self._currentRunId=null}}async function I(s){let{targetId:t,runId:r}=s;try{let _=(a,i,o)=>{self.postMessage({type:"patch",targetId:t,patch:a,buffers:i})};e.globals.set("__sendPatch__",_),e.globals.set("__panel_target_id__",t),await e.runPythonAsync(`
from panel.io.pyodide import _link_docs_worker
doc = __active_docs__.get(__panel_target_id__)
if doc:
    _link_docs_worker(doc, __sendPatch__, setter='js')
`)}catch(_){console.error("[panel-live-worker] Error in handleRendered:",_)}}async function j(s){let{targetId:t,patch:r}=s;try{e.globals.set("__patch__",r),e.globals.set("__panel_target_id__",t),await e.runPythonAsync(`
from panel.io.pyodide import _convert_json_patch
doc = __active_docs__.get(__panel_target_id__)
if doc:
    doc.apply_json_patch(_convert_json_patch(__patch__), setter='js')
`)}catch(_){console.error("[panel-live-worker] Error applying patch:",_)}self.postMessage({type:"idle",targetId:t})}async function M(s){let{targetId:t}=s;try{e.globals.set("__panel_target_id__",t),await e.runPythonAsync(`
doc = __active_docs__.get(__panel_target_id__)
if doc:
    # Remove all callbacks to prevent stale refs
    doc.callbacks._change_callbacks.clear()
    doc.callbacks._event_callbacks.clear()
    del __active_docs__[__panel_target_id__]
`)}catch(r){console.error("[panel-live-worker] Error in reset:",r)}}async function R(s){if(!s||s.length===0)return;self.postMessage({type:"status",msg:"Installing: "+s.join(", ")+"..."}),await e.pyimport("micropip").install(s),s.forEach(r=>{let _=r.split(/[=<>!~\[@ ]/)[0].trim().toLowerCase();_&&f.add(_)})}async function q(s,t){e.globals.set("__file_name__",s),e.globals.set("__file_content__",t),await e.runPythonAsync(`
import pathlib
pathlib.Path(__file_name__).write_text(__file_content__)
`)}})();
//# sourceMappingURL=panel-live-worker.js.map
