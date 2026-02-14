# DuckDB

In-memory SQL queries with DuckDB, displayed in a Tabulator table.

**Why it fails:** DuckDb was available in Pyodide v0.27.0 but is no longer included. The Pyodide team states that DuckDb is disabled because they are waiting on the DuckDb maintainers to build a version for the updated ABI. See [Pyodide 0.28 release notes](https://blog.pyodide.org/posts/0.28-release/).

**Blocked on:** duckdb-pyodide publishing a wheel compatible with Pyodide v0.28+ (emscripten 4.x).

**Note:** panel-live has a `packageAliases` config that can map package names to wheel URLs. Once a compatible wheel is available, adding `duckdb` to the default aliases will make `import duckdb` work transparently.

Docs: [DuckDB](https://duckdb.org/docs/) · [duckdb-pyodide](https://github.com/duckdb/duckdb-pyodide)
