import altair as alt
import pandas as pd
import numpy as np

np.random.seed(42)
n = 80
df = pd.DataFrame({
    "x": np.random.randn(n),
    "y": np.random.randn(n),
    "category": np.random.choice(["A", "B", "C"], n),
    "size": np.random.uniform(20, 200, n),
})

chart = alt.Chart(df).mark_circle(opacity=0.7).encode(
    x=alt.X("x:Q", title="X Value"),
    y=alt.Y("y:Q", title="Y Value"),
    color=alt.Color("category:N", scale=alt.Scale(scheme="category10")),
    size=alt.Size("size:Q", legend=None),
    tooltip=["x:Q", "y:Q", "category:N"],
).properties(
    title="Altair Scatter Plot",
    width="container",
    height=400,
).interactive()

chart
