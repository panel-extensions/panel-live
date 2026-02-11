import panel as pn

pn.extension("echarts", sizing_mode="stretch_width")

GRADIENT = "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)"
CARD_BG = "rgba(255,255,255,0.07)"

def kpi_card(title, value, delta, color):
    return pn.pane.HTML(f"""
    <div style="background:{CARD_BG};border-radius:12px;padding:24px;
                border-left:4px solid {color};backdrop-filter:blur(8px);">
      <div style="color:#94a3b8;font-size:12px;text-transform:uppercase;
                  letter-spacing:1px;margin-bottom:8px;">{title}</div>
      <div style="color:#f1f5f9;font-size:32px;font-weight:700;">{value}</div>
      <div style="color:{color};font-size:14px;margin-top:4px;">{delta}</div>
    </div>""", sizing_mode="stretch_width")

gauge = pn.indicators.Gauge(
    name="Quarterly Target", value=72, bounds=(0, 100), format="{value}%",
    colors=[(0.4, "#ef4444"), (0.7, "#f59e0b"), (1, "#22c55e")],
    height=250, width=250,
    custom_opts={
        "detail": {"color": "#f1f5f9"},
        "title": {"color": "#94a3b8"},
        "axisLabel": {"color": "#cbd5e1"},
    },
)

months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
values = [12, 15, 13, 17, 20, 18, 22, 25, 23, 28, 30, 32]
trend = pn.pane.ECharts({
    "xAxis": {"type": "category", "data": months,
              "axisLabel": {"color": "#94a3b8"}, "axisLine": {"lineStyle": {"color": "#334155"}}},
    "yAxis": {"type": "value",
              "axisLabel": {"color": "#94a3b8"}, "splitLine": {"lineStyle": {"color": "#334155"}}},
    "series": [{"type": "line", "data": values, "smooth": True,
                "lineStyle": {"color": "#3b82f6"}, "areaStyle": {"color": "rgba(59,130,246,0.15)"},
                "itemStyle": {"color": "#3b82f6"}}],
    "grid": {"left": 40, "right": 16, "top": 16, "bottom": 24},
    "tooltip": {"trigger": "axis"},
}, height=160, sizing_mode="stretch_width")

dashboard = pn.Column(
    pn.Row(
        kpi_card("Revenue", "$128,500", "+12.5% vs last month", "#3b82f6"),
        kpi_card("Active Users", "8,420", "+340 this week", "#22c55e"),
        kpi_card("Conversion", "3.4%", "+0.2% vs last quarter", "#a855f7"),
    ),
    pn.Row(
        pn.Column(gauge, align="center"),
        pn.Column("### Monthly Growth", trend, sizing_mode="stretch_width",
                   styles={"color": "#f1f5f9"}),
    ),
    styles={"background": GRADIENT, "padding": "24px", "border-radius": "16px"},
)

pn.Column("# KPI Dashboard", dashboard).servable()
