# Known Limitations

panel-live runs Python entirely in the browser via [Pyodide](https://pyodide.org/) (WebAssembly). This enables zero-server deployment but introduces constraints compared to a traditional Python environment.

## Runtime limitations

### No threads

Python's `threading` module is not available. Code that creates threads raises `RuntimeError: can't start new thread`. This affects some Panel/Bokeh features that use background threads internally.

### No subprocesses

`subprocess`, `os.system()`, and related APIs raise `OSError: [Errno 138] emscripten does not support processes`. This is a fundamental WebAssembly limitation and cannot be worked around.

### 2GB memory limit

WebAssembly has a hard 2GB memory ceiling. Large datasets, file uploads, or memory-intensive computations may hit this limit. Monitor memory usage for data-heavy applications.

### `time.sleep()` busy-waits

`time.sleep()` blocks the worker thread via busy-wait, consuming CPU without yielding. Progress bars and animations will not update during sleep. Use `pn.state.add_periodic_callback()` for timed operations instead.

### C extension packages

Only packages compiled for `wasm32/emscripten` by Pyodide are available. NumPy, pandas, scikit-learn, matplotlib, and 200+ packages work. Packages with C extensions not in Pyodide's package list (e.g. TensorFlow, PyTorch) are not available. Check [Pyodide's package list](https://pyodide.org/en/stable/usage/packages-in-pyodide.html) for compatibility.

### Pyodide version coupling

Upstream Pyodide releases can silently change behavior. panel-live pins default Pyodide, Panel, and Bokeh versions in each release to ensure compatibility.

## Display limitations

### No `.show()` or `.plot()`

Methods that open a browser window or start a server do not work in the Pyodide environment:

- `plt.show()` — use `fig` as the last expression instead
- `fig.show()` (Plotly) — return `fig` as the last expression
- `pn.serve()`, `.show()` — use `.servable()` instead

### Expression mode

When no `.servable()` call is present, panel-live renders the last expression automatically. This works for matplotlib figures, pandas DataFrames, HTML strings, and other displayable objects.

## Source code visibility

Code embedded in `<panel-live>` elements is visible in the browser's DOM and developer tools. Base64 encoding (used for URL sharing) is obfuscation, not encryption. Do not embed secrets, API keys, or proprietary algorithms in panel-live code.

## Network and CORS

panel-live fetches resources from CDN (Pyodide, Panel, Bokeh). Sites behind restrictive firewalls or without internet access need [self-hosting](../how-to/self-hosting.md). Fetching external data from Python code is subject to browser CORS policies.

## Performance expectations

| Phase | Typical time |
|-------|-------------|
| Initial load (Pyodide + Panel) | 5-15 seconds |
| Subsequent runs (same page) | < 1 second |
| Package installation | 1-10 seconds per package |

Memory usage is approximately 300-500MB per page (Pyodide runtime + Panel + loaded packages). Machines with less than 8GB RAM may experience slowdowns with multiple tabs.
