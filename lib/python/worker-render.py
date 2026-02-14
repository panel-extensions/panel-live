import json

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
