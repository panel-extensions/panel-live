(()=>{var b=`import io
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

doc = __active_docs__[__panel_target_id__]  # noqa: F821

if not __has_output__:  # noqa: F821
    __render_result__ = "__NO_OUTPUT__"
else:
    docs_json, render_items, root_ids = _doc_json(doc)
    doc._session_context = None
    __render_result__ = json.dumps(
        {
            "docs_json": docs_json,
            "render_items": render_items,
            "root_ids": root_ids,
        }
    )
`;var s=null,l=null,w={},g=new Set(["panel","bokeh","pyodide-http"]),f=Promise.resolve();function n(e){return f=f.then(e,e),f}function j(e){if(!e||typeof e!="object"||!["init","run","install","write-file","rendered","patch","reset","eval"].includes(e.type))return!1;switch(e.type){case"init":return e.config!=null&&typeof e.config=="object";case"run":return typeof e.code=="string"&&typeof e.targetId=="string"&&typeof e.runId=="string";case"install":return Array.isArray(e.packages);case"write-file":return typeof e.name=="string"&&typeof e.content=="string";case"rendered":return typeof e.targetId=="string"&&typeof e.runId=="string";case"patch":return typeof e.targetId=="string"&&e.patch!=null;case"reset":return typeof e.targetId=="string";case"eval":return typeof e.code=="string"&&typeof e.evalId=="string";default:return!0}}self.onmessage=async e=>{let t=e.data;if(!j(t)){console.warn("[panel-live-worker] Invalid message rejected:",t);return}try{switch(t.type){case"init":await P(t.config);break;case"run":await n(()=>M(t));break;case"install":await n(()=>E(t.packages));break;case"write-file":await n(()=>F(t.name,t.content));break;case"rendered":await n(()=>A(t));break;case"patch":await n(()=>q(t));break;case"reset":await n(()=>W(t));break;case"eval":await n(()=>R(t));break;default:console.warn("[panel-live-worker] Unknown message type:",t.type)}}catch(r){console.error("[panel-live-worker] Error handling message:",t.type,r),t.runId?self.postMessage({type:"error",runId:t.runId,message:r.message||String(r),traceback:String(r)}):t.evalId&&self.postMessage({type:"eval-result",evalId:t.evalId,result:null,error:r.message||String(r)})}};async function P(e){return l||(l=(async()=>{w=e.packageAliases||{},e.disableJSPI!==!1&&typeof WebAssembly<"u"&&(WebAssembly.Suspending&&delete WebAssembly.Suspending,WebAssembly.promising&&delete WebAssembly.promising),self.postMessage({type:"status",msg:"Loading Pyodide..."}),importScripts(e.pyodideUrl),self.postMessage({type:"status",msg:"Initializing Pyodide..."}),s=await self.loadPyodide({...e.disableJSPI!==!1&&{enableRunUntilComplete:!1}}),self.postMessage({type:"status",msg:"Loading micropip..."}),await s.loadPackage("micropip"),self.postMessage({type:"status",msg:"Installing Bokeh + Panel wheels..."}),await s.pyimport("micropip").install([e.bokehWhl,e.panelWhl]),self.postMessage({type:"status",msg:"Initializing Panel..."}),await s.runPythonAsync(`
import panel as pn
print("Panel", pn.__version__, "ready (worker)")
`),s.globals.set("__stream_stdout__",r=>{self._currentRunId&&self.postMessage({type:"stdout",text:r,runId:self._currentRunId})}),s.globals.set("__stream_stderr__",r=>{self._currentRunId&&self.postMessage({type:"stderr",text:r,runId:self._currentRunId})}),await s.runPythonAsync("__active_docs__ = {}"),self.postMessage({type:"ready"})})(),l)}function v(e){return e.map(t=>w[t]||t)}async function M(e){let{code:t,targetId:r,runId:_}=e;self._currentRunId=_;try{self.postMessage({type:"status",msg:"Detecting requirements..."}),s.globals.set("__user_code__",t);let a=await s.runPythonAsync(`
from panel.io.mime_render import find_requirements
import json
json.dumps(find_requirements(__user_code__))
`),o=JSON.parse(a).filter(c=>!g.has(c.toLowerCase()));if(o.length>0){let c=v(o);self.postMessage({type:"status",msg:"Installing: "+o.join(", ")+"..."}),await s.pyimport("micropip").install(c),o.forEach(u=>g.add(u.toLowerCase()))}await s.runPythonAsync(`
from bokeh.io.doc import set_curdoc
from bokeh.document import Document
set_curdoc(Document())
`),self.postMessage({type:"status",msg:"Running code..."}),s.globals.set("__panel_user_code__",t),s.globals.set("__panel_target_id__",r),await s.runPythonAsync(b);let d="",p="";try{d=s.globals.get("__captured_stdout__")||"",p=s.globals.get("__captured_stderr__")||""}catch{}let k=s.globals.get("__ext_resources__"),I=JSON.parse(k||'{"js":[],"css":[]}');await s.runPythonAsync(h);let y=s.globals.get("__render_result__");if(y==="__NO_OUTPUT__")self.postMessage({type:"no-output",runId:_,targetId:r,stdout:d,stderr:p});else{let{docs_json:c,render_items:m,root_ids:u}=JSON.parse(y);self.postMessage({type:"render",runId:_,targetId:r,docs_json:c,render_items:m,root_ids:u,ext_resources:I,stdout:d,stderr:p})}self.postMessage({type:"done",runId:_})}catch(a){let i="",o="";try{i=s.globals.get("__captured_stdout__")||"",o=s.globals.get("__captured_stderr__")||""}catch{}self.postMessage({type:"error",runId:_,targetId:r,message:a.message||String(a),traceback:String(a),stdout:i,stderr:o})}finally{self._currentRunId=null}}async function R(e){let{code:t,evalId:r}=e;self._currentRunId=r;try{if(!l)throw new Error("Worker not initialized \u2014 call init before eval");await l;let _=await s.runPythonAsync(t),a=null;_!=null&&(typeof _.toJs=="function"?(a=_.toJs({dict_converter:Object.fromEntries}),_.destroy()):a=_),self.postMessage({type:"eval-result",evalId:r,result:a})}catch(_){self.postMessage({type:"eval-result",evalId:r,result:null,error:_.message||String(_)})}finally{self._currentRunId=null}}async function A(e){let{targetId:t,runId:r}=e;try{let _=(a,i,o)=>{self.postMessage({type:"patch",targetId:t,patch:a,buffers:i})};s.globals.set("__sendPatch__",_),s.globals.set("__panel_target_id__",t),await s.runPythonAsync(`
from panel.io.pyodide import _link_docs_worker
doc = __active_docs__.get(__panel_target_id__)
if doc:
    _link_docs_worker(doc, __sendPatch__, setter='js')
`)}catch(_){console.error("[panel-live-worker] Error in handleRendered:",_)}}async function q(e){let{targetId:t,patch:r}=e;try{s.globals.set("__patch__",r),s.globals.set("__panel_target_id__",t),await s.runPythonAsync(`
from panel.io.pyodide import _convert_json_patch
doc = __active_docs__.get(__panel_target_id__)
if doc:
    doc.apply_json_patch(_convert_json_patch(__patch__), setter='js')
`)}catch(_){console.error("[panel-live-worker] Error applying patch:",_)}self.postMessage({type:"idle",targetId:t})}async function W(e){let{targetId:t}=e;try{s.globals.set("__panel_target_id__",t),await s.runPythonAsync(`
doc = __active_docs__.get(__panel_target_id__)
if doc:
    # Remove all callbacks to prevent stale refs
    doc.callbacks._change_callbacks.clear()
    doc.callbacks._event_callbacks.clear()
    del __active_docs__[__panel_target_id__]
`)}catch(r){console.error("[panel-live-worker] Error in reset:",r)}}async function E(e){if(!e||e.length===0)return;let t=v(e);self.postMessage({type:"status",msg:"Installing: "+e.join(", ")+"..."}),await s.pyimport("micropip").install(t),e.forEach(_=>{let a=_.split(/[=<>!~\[@ ]/)[0].trim().toLowerCase();a&&g.add(a)})}async function F(e,t){s.globals.set("__file_name__",e),s.globals.set("__file_content__",t),await s.runPythonAsync(`
import pathlib
pathlib.Path(__file_name__).write_text(__file_content__)
`)}})();
//# sourceMappingURL=panel-live-worker.js.map
