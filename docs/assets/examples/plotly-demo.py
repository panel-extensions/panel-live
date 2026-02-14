import panel as pn

pn.extension("plotly", sizing_mode="stretch_width")

import plotly.graph_objects as go

metric = pn.widgets.RadioButtonGroup(
    name="Metric", options=["Revenue", "Units", "Margin"],
    value="Revenue", button_type="primary", button_style="outline",
)

def make_chart(m):
    categories = ["Q1", "Q2", "Q3", "Q4"]
    datasets = {
        "Revenue": {"2024": [120, 145, 160, 180], "2025": [135, 155, 175, 200]},
        "Units":   {"2024": [300, 350, 380, 420], "2025": [330, 370, 410, 460]},
        "Margin":  {"2024": [22, 25, 27, 30],     "2025": [24, 28, 31, 34]},
    }
    d = datasets[m]
    fig = go.Figure()
    fig.add_trace(go.Bar(name="2024", x=categories, y=d["2024"], marker_color="#636EFA"))
    fig.add_trace(go.Bar(name="2025", x=categories, y=d["2025"], marker_color="#EF553B"))
    units = {"Revenue": "($K)", "Units": "", "Margin": "(%)"}
    fig.update_layout(
        title=f"{m} by Quarter {units[m]}",
        barmode="group", template="plotly_white",
        margin=dict(t=50, b=40, l=50, r=20), height=400,
    )
    return fig

pn.Column(
    "# Plotly Grouped Bar Chart",
    metric,
    pn.pane.Plotly(pn.bind(make_chart, metric), sizing_mode="stretch_width"),
).servable()
