import numpy as np
import pandas as pd
import panel as pn
from bokeh.plotting import figure
from bokeh.models import NumeralTickFormatter, HoverTool

pn.extension(sizing_mode="stretch_width")

np.random.seed(42)
dates = pd.date_range("2024-01-01", periods=90, freq="D")
df = pd.DataFrame({
    "date": dates,
    "sales": np.random.randint(100, 500, 90).cumsum(),
    "returns": np.random.randint(5, 50, 90).cumsum(),
})

select = pn.widgets.RadioButtonGroup(
    name="Metric", options=["sales", "returns"], value="sales",
    button_style="outline", button_type="primary",
)
window = pn.widgets.IntSlider(name="Rolling Window", start=1, end=14, value=7)

def make_dashboard(metric, win):
    series = df.set_index("date")[metric].rolling(win).mean().dropna()
    latest, mn, mx = series.iloc[-1], series.min(), series.max()

    p = figure(title=f"{metric.title()} — {win}-day rolling average",
               x_axis_type="datetime", height=300, sizing_mode="stretch_width",
               tools="pan,wheel_zoom,reset")
    p.varea(x=series.index, y1=0, y2=series.values, fill_alpha=0.15, fill_color="#3b82f6")
    p.line(series.index, series.values, line_width=2, color="#3b82f6")
    p.yaxis.formatter = NumeralTickFormatter(format="0,0")
    p.add_tools(HoverTool(tooltips=[("Date", "@x{%F}"), ("Value", "@y{0,0}")],
                           formatters={"@x": "datetime"}, mode="vline"))

    stats = pn.pane.HTML(f"""
    <div style="display:flex;gap:24px;padding:12px 0;">
      <div><span style="color:#64748b;font-size:12px;">LATEST</span>
           <div style="font-size:24px;font-weight:700;">{latest:,.0f}</div></div>
      <div><span style="color:#64748b;font-size:12px;">MIN</span>
           <div style="font-size:24px;font-weight:700;">{mn:,.0f}</div></div>
      <div><span style="color:#64748b;font-size:12px;">MAX</span>
           <div style="font-size:24px;font-weight:700;">{mx:,.0f}</div></div>
    </div>""", sizing_mode="stretch_width")

    return pn.Column(stats, pn.pane.Bokeh(p))

pn.Column(
    "# Sales Dashboard",
    pn.Row(select, window),
    pn.bind(make_dashboard, select, window),
).servable()
