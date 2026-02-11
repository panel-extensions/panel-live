import numpy as np
import pandas as pd
import panel as pn

pn.extension()

np.random.seed(42)
dates = pd.date_range("2024-01-01", periods=90, freq="D")
df = pd.DataFrame({
    "date": dates,
    "sales": np.random.randint(100, 500, 90).cumsum(),
    "returns": np.random.randint(5, 50, 90).cumsum(),
})

select = pn.widgets.Select(name="Metric", options=["sales", "returns"], value="sales")
window = pn.widgets.IntSlider(name="Rolling Window", start=1, end=14, value=7)

def make_plot(metric, win):
    series = df.set_index("date")[metric].rolling(win).mean().dropna()
    return pn.pane.Markdown(
        f"### {metric.title()} (rolling {win}-day average)\n\n"
        f"Latest: **{series.iloc[-1]:,.0f}** | "
        f"Min: {series.min():,.0f} | Max: {series.max():,.0f}"
    )

pn.Column(
    "# Sales Dashboard",
    pn.Row(select, window),
    pn.bind(make_plot, select, window),
).servable()
