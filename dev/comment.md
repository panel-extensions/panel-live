# Feedback Round 3 — Resolved

## 1. Read Parquet — requirements parsing bug `FIXED`

`bridge.install("fastparquet requests")` now correctly splits by whitespace. Previously split only by `\n`, producing `["fastparquet requests"]` as a single invalid package name.

## 2. DuckDB `BLOCKED — upstream`

DuckDB cannot work with Pyodide v0.28.2. The duckdb-pyodide project only provides wheels for older platforms (`pyodide_2024_0_wasm32`, `emscripten_3_1_46_wasm32`). Pyodide v0.28.2 uses `emscripten-4.0.9-wasm32`, so micropip rejects all available wheels:

```
ValueError: Wheel platform 'pyodide_2024_0_wasm32' is not compatible with Pyodide's platform 'emscripten-4.0.9-wasm32'
```

**What was done:** Added a `packageAliases` config feature to panel-live that maps package names to wheel URLs. The infrastructure is ready — once duckdb-pyodide publishes a compatible wheel, adding it to `_defaults.packageAliases` will make `import duckdb` work transparently. DuckDB remains in `docs/project/not-working/`.

## 3. Playground URL broken on subpages `FIXED`

`_updatePlaygroundLink()` now derives the site root from the `<script src="...panel-live.js">` tag instead of resolving relative to the current page. From `/examples/`, the link now correctly points to `<root>/playground.html`.

## 4. Button height mismatch `FIXED`

Replaced `line-height: 1` with `display: inline-flex; align-items: center` on `.pl-btn`, normalizing height across `<button>` and `<a>` elements.

## 5. Playground button not visible when code expanded `FIXED`

Changed the CSS hide rule from `.pl-toggle-btn` (hid both Copy and Playground) to `.copy-btn.pl-toggle-btn` (hides only Copy). Playground link now stays visible when code is expanded.
