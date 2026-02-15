# Chrome Crash (STATUS_ACCESS_VIOLATION) — Research & Implementation Plan

Research and implementation plan for fixing the P0 browser crash issue in panel-live.

---

## 1. Problem Summary

Chrome 137+ enabled **JSPI (JavaScript Promise Integration)** by default, which causes `STATUS_ACCESS_VIOLATION` crashes when Pyodide performs heavy WASM operations like `import panel as pn`. The crash kills the worker process silently — no `onerror` fires, no exception is thrown. The page just freezes.

**Observed:** Windows machine, Chrome 137+, enterprise antivirus (Sophos). Crash occurs during "Initializing Panel" phase (`panel-live-worker.js` line 110-114).

**Not observed:** Firefox (handles JSPI differently), iOS Safari, second Windows laptop.

---

## 2. Root Causes

### 2.1 JSPI (JavaScript Promise Integration)

Chrome 137+ ships with JSPI enabled by default. JSPI adds `WebAssembly.Suspending` and `WebAssembly.promising` APIs that allow WASM functions to suspend and resume across async boundaries.

**Why it crashes Pyodide:**
- Pyodide's async scheduler conflicts with JSPI's suspension mechanism
- Tight asyncio loops (common during `import panel`) trigger `RangeError: WebAssembly.Table.get(): invalid address`
- The WASM memory corruption escalates to `STATUS_ACCESS_VIOLATION`

**Upstream issues:**
- [pyodide#5702](https://github.com/pyodide/pyodide/issues/5702) — JSPI memory leak / crash
- [pyodide#5705](https://github.com/pyodide/pyodide/issues/5705) — STATUS_STACK_BUFFER_OVERRUN with JSPI

### 2.2 Enterprise Antivirus StackPivot Detection

Sophos and similar endpoint protection flag WASM memory operations as potential exploits (StackPivot detection). This is a separate trigger from JSPI — it catches WASM stack manipulation patterns that look like exploit techniques.

**Upstream issue:** [pyodide#5768](https://github.com/pyodide/pyodide/issues/5768)

### 2.3 Current panel-live Code

`panel-live-worker.js` line 101 calls `loadPyodide()` with **no options**:

```javascript
pyodide = await self.loadPyodide();
```

This means:
- JSPI is used if the browser supports it (Chrome 137+)
- `enableRunUntilComplete` defaults to `true` when JSPI is available
- No crash mitigation whatsoever

---

## 3. JSPI Auto-Detection Analysis

**Question:** Can we auto-detect whether to disable JSPI rather than always disabling it?

### 3.1 Feature Detection (recommended)

```javascript
if (typeof WebAssembly !== 'undefined' && WebAssembly.Suspending) {
  delete WebAssembly.Suspending;
  delete WebAssembly.promising;
}
```

This only acts when JSPI APIs are present. On Firefox or older Chrome, it's a no-op. **This is the best available auto-detection** because:
- It precisely targets the problematic feature
- Zero false positives (if JSPI isn't present, nothing happens)
- No user-agent sniffing required

### 3.2 Crash Detection (impossible)

`STATUS_ACCESS_VIOLATION` kills the worker process instantly. You cannot try-catch it. The stall detection + recovery mechanism in the plan is the fallback for when crashes happen despite the JSPI fix.

### 3.3 Pyodide Version Detection (too late)

```javascript
const ver = pyodide.version; // e.g. "0.28.2"
```

The crash happens *during* `loadPyodide()`, so checking the Pyodide version afterward is too late. The JSPI APIs must be removed *before* `importScripts(pyodideUrl)`.

### 3.4 Browser Detection (fragile)

User-agent sniffing (`navigator.userAgent` containing "Chrome/137") is fragile:
- Chrome versions change frequently
- Edge uses Chrome's engine but different UA
- Future Chrome releases may fix the JSPI issue

### 3.5 Conclusion

**Feature detection (3.1) is the correct auto-detection strategy.** The `disableJSPI` config option serves as a manual override for when Pyodide eventually ships a JSPI-compatible release, allowing users to re-enable it via `PanelLive.configure({ disableJSPI: false })`.

---

## 4. Why Disabling JSPI is Safe for panel-live

panel-live never uses JSPI-dependent features:

1. **No `run_until_complete()`** — All Python execution uses `runPythonAsync()` with the explicit execution queue
2. **No synchronous-style async** — The worker↔main thread protocol is fully asynchronous via `postMessage`
3. **`enableRunUntilComplete: false`** — Makes Pyodide use the traditional `setTimeout`-based scheduler (the default for all Pyodide versions before 0.27)
4. **No performance regression** — JSPI is a transparent optimization; disabling it just reverts to the proven pre-JSPI behavior

---

## 5. Implementation Plan

### Step 1: Disable JSPI in worker (primary fix)

**File: `lib/panel-live-worker.js`**

In `handleInit()` (line 94), before `importScripts(config.pyodideUrl)` (line 98), add JSPI disabling code. Also pass `enableRunUntilComplete: false` to `loadPyodide()` (line 101).

```javascript
// In handleInit(), before importScripts:
if (config.disableJSPI !== false && typeof WebAssembly !== 'undefined') {
  delete WebAssembly.Suspending;
  delete WebAssembly.promising;
}

// Change loadPyodide() call:
pyodide = await self.loadPyodide({
  ...(config.disableJSPI !== false && { enableRunUntilComplete: false }),
});
```

### Step 2: Add `disableJSPI` config option

**File: `lib/config.js`** — Add `disableJSPI: true` to `_defaults` (line 3-12).

**File: `lib/worker-bridge.js`** — Pass `disableJSPI` in the init message (line 80-88):

```javascript
this._worker.postMessage({
  type: 'init',
  config: {
    pyodideUrl: urls.pyodide,
    bokehWhl: urls.bokehWhl,
    panelWhl: urls.panelWhl,
    packageAliases: _config.packageAliases || {},
    disableJSPI: _config.disableJSPI !== false,
  },
});
```

Users opt out via `PanelLive.configure({ disableJSPI: false })`.

### Step 3: Worker crash detection and recovery

**File: `lib/worker-bridge.js`**

Add stall detection and auto-recovery for silent worker death (STATUS_ACCESS_VIOLATION kills the process without firing `onerror`):

1. **Constants:** `DEFAULT_STALL_TIMEOUT_MS = 45_000`, `MAX_CRASH_RETRIES = 1`
2. **`_resetStallTimer()`** — reset on every worker message; if no message within timeout, assume crash
3. **`_onWorkerStall()`** — if retries remain, call `_attemptRecovery()`; otherwise `_rejectAllPending()`
4. **`_attemptRecovery()`** — terminate dead worker, clear `_initPromise`, create new worker, re-init
5. **`_rejectAllPending(error)`** — reject all pending runs and init promise
6. **Enhanced `_onWorkerError()`** — attempt recovery for crash-like errors (not network/file errors)
7. **Wire stall timer** — reset on every `_onMessage`, clear on `ready` and `terminate()`

### Step 4: Enhanced cross-origin isolation warning

**File: `lib/worker-bridge.js`** — After existing `console.warn` (line 59-64), also call `statusCallback` so users see the warning in the UI.

### Step 5: Unit tests

**File: `tests/js/unit/worker-bridge.test.js`**

- `disableJSPI` passed in init config by default
- `disableJSPI: false` when configured
- Stall detection triggers recovery
- Stall timer resets on worker messages
- All pending rejected after max retries
- `_onWorkerError` triggers recovery for crash-like errors

### Step 6: Update documentation

**File: `docs/project/open-issues.md`** — Update P0 status to `MITIGATED`.

---

## 6. Files to Modify

| File | Change |
|------|--------|
| `lib/panel-live-worker.js` | Disable JSPI before `importScripts`, pass `enableRunUntilComplete: false` to `loadPyodide()` |
| `lib/config.js` | Add `disableJSPI: true` default |
| `lib/worker-bridge.js` | Pass `disableJSPI` in init config, add stall detection, crash recovery, COI warning |
| `tests/js/unit/worker-bridge.test.js` | Add tests for JSPI config and crash recovery |
| `docs/project/open-issues.md` | Update P0 status |

---

## 7. Verification

1. `pixi run build-js` — bundle changes
2. `pixi run test-js` — Vitest unit tests pass (including new tests)
3. `pixi run sync-assets` — copy to docs
4. Manual test on Chrome 137+ Windows — should not crash during "Initializing Panel"
5. Manual test on Firefox — no regression
6. Test `PanelLive.configure({ disableJSPI: false })` — verify JSPI can be re-enabled

---

## 8. References

- [pyodide#5702](https://github.com/pyodide/pyodide/issues/5702) — JSPI async crash
- [pyodide#5705](https://github.com/pyodide/pyodide/issues/5705) — STATUS_STACK_BUFFER_OVERRUN
- [pyodide#5768](https://github.com/pyodide/pyodide/issues/5768) — Enterprise antivirus StackPivot
- [V8 JSPI proposal](https://v8.dev/blog/jspi) — Chrome JSPI implementation details
- [dev/research/webworker-and-crashes.md](webworker-and-crashes.md) — Earlier worker architecture & crash research
