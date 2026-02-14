# Not Working

Examples that do not currently work in the panel-live browser runtime (Pyodide/WASM). Each example has its own page where you can see it attempt to run and observe the failure. See [Known Limitations](../../reference/known-limitations.md) for general runtime constraints.

---

| Example | Reason |
|---------|--------|
| [DuckDB](duckdb.md) | Native C++ extensions unavailable in WASM |
| [GeoViews](geoviews.md) | Cartopy removed from Pyodide v0.28+ due to build issues |
| [Polars](polars.md) | Native Rust runtime cannot compile to WebAssembly |
