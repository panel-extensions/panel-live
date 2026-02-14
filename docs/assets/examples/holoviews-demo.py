import panel as pn
import holoviews as hv
import numpy as np

pn.extension(sizing_mode="stretch_width")
hv.extension("bokeh")

x = np.linspace(0, 4 * np.pi, 200)
y = np.sin(x) * np.exp(-x / 12)

curve = hv.Curve((x, y), "x", "y").opts(
    color="#3b82f6", line_width=2, tools=["hover"],
)
scatter = hv.Scatter((x[::10], y[::10]), "x", "y").opts(
    color="#ef4444", size=8, marker="circle",
)
overlay = (curve * scatter).opts(
    title="Damped Sine Wave", responsive=True, height=400,
)

pn.Column(
    "# HoloViews Overlay",
    pn.pane.HoloViews(overlay, sizing_mode="stretch_width"),
).servable()
