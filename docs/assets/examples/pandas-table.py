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

def filtered_table(cat):
    filtered = df if cat == "All" else df[df["Category"] == cat]
    return pn.widgets.Tabulator(
        filtered,
        page_size=10,
        sizing_mode="stretch_width",
        theme="midnight",
        max_height=500,
    )

pn.Column(
    "# Product Inventory",
    category,
    pn.bind(filtered_table, category),
).servable()
