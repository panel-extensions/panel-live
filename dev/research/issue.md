# Pyodide Issue: STATUS_ACCESS_VIOLATION crash on Chrome 137+ caused by JSPI + runPythonAsync

**Template for filing against [pyodide/pyodide](https://github.com/pyodide/pyodide)**

---

## Title

STATUS_ACCESS_VIOLATION crash on Chrome/ Edge when JSPI is enabled and `runPythonAsync` imports heavy packages

## Description

Chrome 137+ ships JSPI (JavaScript Promise Integration) enabled by default. When Pyodide runs `runPythonAsync('import panel as pn')` (or other heavy WASM operations involving asyncio event loops), the browser crashes with `STATUS_ACCESS_VIOLATION` in Chrome/Edge on some machines. The crash kills the process silently — no `onerror` fires, no exception is thrown.

**Note on reproducibility:** The crash is hardware/environment-dependent. It reproduces consistently on one specific Windows laptop (Chrome and Edge) in a corporate environment but does not occur on a second Windows laptop, iOS iPhone, iOS tablet, or Firefox. This suggests an interaction between JSPI, specific hardware/driver configurations, and Pyodide's WASM memory operations.

### Environment

- **Pyodide version:** 0.28.2
- **Browser:** Chrome 137+ / Edge (Chromium-based)
- **OS:** Windows (reproduced on one specific Windows laptop; a second Windows laptop, iOS iPhone, and iOS tablet do not crash. Firefox is unaffected.)
- **Context:** Dedicated Worker (`new Worker(...)`)

### Reproduction

Minimal HTML that crashes:

```html
<!DOCTYPE html>
<html>
<head><title>JSPI Crash Repro</title></head>
<body>
  <div id="status">Starting...</div>
  <script>
    const workerCode = `
      importScripts('https://cdn.jsdelivr.net/pyodide/v0.28.2/full/pyodide.js');
      async function run() {
        const pyodide = await self.loadPyodide();
        await pyodide.loadPackage('micropip');
        const micropip = pyodide.pyimport('micropip');
        await micropip.install([
          'https://cdn.holoviz.org/panel/1.8.7/dist/wheels/bokeh-3.8.2-py3-none-any.whl',
          'https://cdn.holoviz.org/panel/1.8.7/dist/wheels/panel-1.8.7-py3-none-any.whl'
        ]);
        // This line triggers the crash:
        await pyodide.runPythonAsync('import panel as pn');
        self.postMessage({ type: 'done' });
      }
      run().catch(e => self.postMessage({ type: 'error', msg: e.message }));
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    worker.onmessage = e => {
      document.getElementById('status').textContent =
        e.data.type === 'done' ? 'SUCCESS' : 'ERROR: ' + e.data.msg;
    };
    // If worker crashes, this timer fires:
    setTimeout(() => {
      document.getElementById('status').textContent = 'CRASH: Worker stopped responding';
    }, 120000);
  </script>
</body>
</html>
```

### Workaround

Deleting JSPI APIs before loading Pyodide and passing `enableRunUntilComplete: false` prevents the crash:

```javascript
// Before importScripts('pyodide.js'):
if (typeof WebAssembly !== 'undefined' && WebAssembly.Suspending) {
  delete WebAssembly.Suspending;
  delete WebAssembly.promising;
}

// When loading Pyodide:
const pyodide = await self.loadPyodide({ enableRunUntilComplete: false });
```

This forces Pyodide to use the traditional `setTimeout`-based async scheduler instead of the JSPI-based one.

<details>
<summary>Test matrix (4 targeted experiments)</summary>

| Test | JSPI | Thread | Method | Result |
|------|------|--------|--------|--------|
| `test-async-main.html` | Enabled (default) | Main | `runPythonAsync` | **CRASHES** |
| `test-jspi-disabled-main.html` | **Disabled** | Main | `runPythonAsync` | Works (many runs) |
| `test-jspi-disabled-two.html` | **Disabled** | Main x2 | `runPythonAsync` | Works (many runs) |
| `test-jspi-disabled-worker.html` | **Disabled** | Worker | `runPythonAsync` | Works (Panel loaded + rendered) |

</details>

<details>
<summary>Stress test results (placeholder)</summary>

**ALL PASSED: 26/26 examples in 6.0s** on the crash-prone Windows machine (Chrome/Edge).

The stress test runs 26 examples sequentially in a single Pyodide instance with JSPI disabled, including heavy imports (matplotlib, numpy, seaborn, altair, plotly, hvplot, holoviews, xarray, colorcet).

</details>

### Root Cause Analysis

JSPI adds `WebAssembly.Suspending` and `WebAssembly.promising` APIs that allow WASM functions to suspend and resume across async boundaries. Pyodide's async scheduler conflicts with JSPI's suspension mechanism:

1. Tight asyncio loops (common during `import panel`) trigger `RangeError: WebAssembly.Table.get(): invalid address`
2. The WASM memory corruption escalates to `STATUS_ACCESS_VIOLATION`

When `enableRunUntilComplete: true` (the default when JSPI is available), Pyodide uses JSPI to run Python code synchronously from the JS perspective. This new code path has the crash-causing conflict with certain WASM operations.

### Related Issues

- [pyodide#5702](https://github.com/pyodide/pyodide/issues/5702) — JSPI memory leak / crash
- [pyodide#5705](https://github.com/pyodide/pyodide/issues/5705) — STATUS_STACK_BUFFER_OVERRUN with JSPI
- [pyodide#5768](https://github.com/pyodide/pyodide/issues/5768) — Enterprise antivirus StackPivot detection

### Impact

Any application using Pyodide with `runPythonAsync` to import heavy packages (Panel, Bokeh, matplotlib, etc.) may crash on Chrome 137+ without the workaround. The crash is silent — no error event fires, making it extremely difficult to diagnose.

### Suggested Fix

Consider either:
1. Auto-detecting JSPI stability issues and falling back to the traditional scheduler
2. Making `enableRunUntilComplete: false` the default until JSPI compatibility is confirmed
3. Documenting the workaround prominently for downstream projects
