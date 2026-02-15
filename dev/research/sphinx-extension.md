# Sphinx Extension Research

## nbsite.pyodide Analysis

The existing Sphinx extension for Panel's pyodide integration lives in `nbsite/pyodide/__init__.py` (~450 lines).

### Key Patterns

1. **PyodideDirective** — standard Sphinx/docutils `Directive` subclass
2. **Pre-rendering** — `multiprocessing.Process` with `get_context('spawn')` + `Pipe()`
3. **Code execution** — `panel.io.mime_render.exec_with_return()`
4. **Bokeh serialization** — `standalone_docs_json_and_render_items()`
5. **Content-hash caching** — MD5 hash of source file, cached in `.pyodide/{hash}.json`
6. **File locking** — `portalocker.Lock` for cross-process cache file safety
7. **Sphinx events** — `builder-inited`, `html-page-context`, `build-finished`

### Config Dict (`nbsite_pyodide_conf`)

```python
DEFAULT_PYODIDE_CONF = {
    'PYODIDE_URL': 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js',
    'autodetect_deps': True,
    'enable_pwa': True,
    'requirements': ['panel', 'pandas'],
    'scripts': [...],  # Bokeh/Panel JS URLs
    'extra_css': [],
    'setup_code': "",
    'requires': {},
}
```

### What nbsite Does That We Don't (Yet)

- Sequential cell execution (shared namespace across cells in a file)
- Auto-detection of Python package dependencies from imports
- JS/CSS dependency extraction from `pn.extension()` calls
- PWA support (ServiceWorker, webmanifest)
- Run button with warning message

### What panel-live Does Better

- `<panel-live>` web component (richer than `<pre>` + run button)
- Three display modes (app, editor, playground)
- Automatic dark/light theme
- Dedicated Worker (main thread stays responsive)
- CodeMirror 6 editor
- Real-time stdout streaming
- URL sharing

## Implementation Approach

### Aligned with nbsite

- Same function names: `_model_json`, `_execution_process`, `exec_with_return`
- Same caching: `.panel-live/{content_hash}.json` (mirrors `.pyodide/`)
- Same `portalocker` locking pattern
- Same Sphinx events: `builder-inited`, `html-page-context`, `build-finished`

### Key Difference

nbsite renders into custom `<pre>` blocks + run buttons; panel-live renders into `<panel-live>` elements with embedded pre-rendered output.

### Configurable Directive Name

The `directive_name` config (default `'panel-live'`) can be set to `'pyodide'` for backward compat with Panel docs. This means zero RST changes when migrating.

```python
# conf.py — drop-in for Panel docs:
panel_live_conf = {'directive_name': 'pyodide'}
```

## Files Created

- `src/panel_live/sphinx.py` — Sphinx extension (~300 lines)
- `tests/test_sphinx.py` — Unit tests
- `docs-sphinx/` — Test project (conf.py, index.rst, examples.rst, Makefile)
- `docs/how-to/sphinx-integration.md` — User documentation
