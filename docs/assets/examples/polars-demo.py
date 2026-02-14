import panel as pn
import polars as pl

pn.extension("tabulator", sizing_mode="stretch_width")

df = pl.DataFrame({
    "product": ["Widget A", "Widget B", "Gadget X", "Gadget Y", "Tool M", "Tool N",
                "Widget A", "Widget B", "Gadget X", "Gadget Y", "Tool M", "Tool N"],
    "region": ["North", "North", "North", "North", "North", "North",
               "South", "South", "South", "South", "South", "South"],
    "units": [120, 85, 200, 150, 95, 60, 140, 70, 180, 130, 110, 45],
    "revenue": [2400, 1700, 6000, 4500, 1900, 1200, 2800, 1400, 5400, 3900, 2200, 900],
})

region = pn.widgets.RadioButtonGroup(
    name="Region", options=["All", "North", "South"], value="All",
    button_style="outline", button_type="primary",
)

def filter_data(r):
    filtered = df if r == "All" else df.filter(pl.col("region") == r)
    summary = filtered.group_by("product").agg(
        pl.col("units").sum().alias("total_units"),
        pl.col("revenue").sum().alias("total_revenue"),
    ).sort("total_revenue", descending=True)
    return pn.widgets.Tabulator(summary.to_pandas(), sizing_mode="stretch_width", height=250)

pn.Column(
    "# Polars Data Summary",
    region,
    pn.bind(filter_data, region),
).servable()
