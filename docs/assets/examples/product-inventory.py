import numpy as np
import pandas as pd
import panel as pn

pn.extension("tabulator")

np.random.seed(0)
n = 50
df = pd.DataFrame({
    "Name": [f"Item-{i:03d}" for i in range(n)],
    "Category": np.random.choice(["Electronics", "Clothing", "Food", "Books"], n),
    "Price": np.round(np.random.uniform(5, 200, n), 2),
    "Stock": np.random.randint(0, 500, n),
    "Rating": np.round(np.random.uniform(1, 5, n), 1),
})

category = pn.widgets.Select(name="Category", options=["All"] + sorted(df["Category"].unique().tolist()), value="All")
theme = pn.widgets.RadioButtonGroup(
    name="theme", value="modern", options=["midnight", "modern", "simple", "default"],
    button_style="outline", button_type="primary",
    margin=(23, 5, 10, 5),
)
table = pn.widgets.Tabulator(df, page_size=10, sizing_mode="stretch_width", theme=theme, max_height=500)

def update_table(event):
    table.value = df if event.new == "All" else df[df["Category"] == event.new]

category.param.watch(update_table, "value")

pn.Column(
    "# Product Inventory",
    pn.Row(category, theme),
    table,
).servable()
