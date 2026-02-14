import micropip
await micropip.install(
    "https://duckdb.github.io/duckdb-pyodide/wheels/duckdb-1.2.1-cp313-cp313-pyodide_2024_0_wasm32.whl"
)
import duckdb
import panel as pn

pn.extension("tabulator", sizing_mode="stretch_width")

con = duckdb.connect()
con.execute("""
    CREATE TABLE sales AS SELECT * FROM (VALUES
        ('Widget A', 'North', 120, 2400),
        ('Widget B', 'North', 85, 1700),
        ('Gadget X', 'South', 200, 6000),
        ('Gadget Y', 'South', 150, 4500),
        ('Tool M', 'North', 95, 1900),
        ('Tool N', 'South', 60, 1200)
    ) AS t(product, region, units, revenue)
""")

query = pn.widgets.TextAreaInput(
    name="SQL Query", value="SELECT * FROM sales ORDER BY revenue DESC",
    height=80, sizing_mode="stretch_width",
)

def run_query(sql):
    try:
        result = con.execute(sql).fetchdf()
        return pn.widgets.Tabulator(result, sizing_mode="stretch_width", height=250)
    except Exception as e:
        return pn.pane.Alert(str(e), alert_type="danger")

pn.Column(
    "# DuckDB SQL Explorer",
    query,
    pn.bind(run_query, query),
).servable()
