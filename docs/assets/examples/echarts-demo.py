import panel as pn

pn.extension("echarts", sizing_mode="stretch_width")

categories = ["Electronics", "Clothing", "Food", "Books", "Sports"]
data_2023 = [120, 200, 150, 80, 70]
data_2024 = [180, 170, 210, 110, 130]

year = pn.widgets.RadioButtonGroup(
    name="Year", options=["2023", "2024"], value="2024",
    button_style="outline", button_type="primary",
)

def make_chart(yr):
    values = data_2023 if yr == "2023" else data_2024
    colors = ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ef4444"]
    return {
        "xAxis": {"type": "category", "data": categories},
        "yAxis": {"type": "value"},
        "series": [{
            "type": "bar", "data": [{"value": v, "itemStyle": {"color": c}}
                                     for v, c in zip(values, colors)],
            "animationDuration": 800, "animationEasing": "cubicOut",
        }],
        "tooltip": {"trigger": "axis"},
        "grid": {"left": 48, "right": 16, "top": 16, "bottom": 32},
    }

pn.Column(
    "# ECharts Bar Chart",
    year,
    pn.pane.ECharts(pn.bind(make_chart, year), height=400, sizing_mode="stretch_width"),
).servable()
