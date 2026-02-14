import numpy as np
import pandas as pd
import panel as pn

from bokeh.models import ColumnDataSource
from bokeh.plotting import figure

pn.extension("tabulator", sizing_mode="stretch_width")

df = pd.DataFrame(np.random.randn(10, 4), columns=list("ABCD")).cumsum()

rollover = pn.widgets.IntInput(name="Rollover", value=50)
follow = pn.widgets.Toggle(name="Follow", value=True, align="end")

tabulator = pn.widgets.Tabulator(df, height=350, sizing_mode="stretch_width")

def color_negative_red(val):
    color = "red" if val < 0 else "green"
    return "color: %s" % color

tabulator.style.map(color_negative_red)

p = figure(height=350, sizing_mode="stretch_width")
cds = ColumnDataSource(data=ColumnDataSource.from_df(df))

p.line("index", "A", source=cds, line_color="#ef4444", line_width=2, legend_label="A")
p.line("index", "B", source=cds, line_color="#22c55e", line_width=2, legend_label="B")
p.line("index", "C", source=cds, line_color="#3b82f6", line_width=2, legend_label="C")
p.line("index", "D", source=cds, line_color="#a855f7", line_width=2, legend_label="D")
p.legend.location = "top_left"
p.legend.click_policy = "hide"

def stream():
    data = df.iloc[-1] + np.random.randn(4)
    tabulator.stream(data, rollover=rollover.value, follow=follow.value)
    value = {k: [v] for k, v in tabulator.value.iloc[-1].to_dict().items()}
    value["index"] = [tabulator.value.index[-1]]
    cds.stream(value, rollover=rollover.value)

cb = pn.state.add_periodic_callback(stream, period=500)

pn.Column(
    "# Streaming Random Walk",
    pn.Row(cb.param.period, rollover, follow),
    pn.pane.Bokeh(p),
    tabulator,
).servable()
