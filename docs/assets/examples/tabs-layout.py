import panel as pn

pn.extension(sizing_mode="stretch_width")

def card(label, color, height=60, width=None):
    style = (f'background:{color};color:#fff;padding:20px;border-radius:8px;'
             f'text-align:center;font-weight:600;height:{height}px;'
             f'display:flex;align-items:center;justify-content:center;')
    kwargs = {}
    if width:
        kwargs["width"] = width
    return pn.pane.HTML(f'<div style="{style}">{label}</div>', **kwargs)

column_tab = pn.Column(card("A", "#3b82f6"), card("B", "#ef4444"), card("C", "#22c55e"))
row_tab = pn.Row(card("X", "#8b5cf6"), card("Y", "#f59e0b"), card("Z", "#06b6d4"))

# FlexBox with varied sizes — items wrap responsively
flexbox_tab = pn.FlexBox(
    card("Wide", "#3b82f6", height=80, width=300),
    card("Tall", "#ef4444", height=120, width=150),
    card("Small", "#22c55e", height=60, width=100),
    card("Medium", "#f59e0b", height=80, width=200),
    card("Narrow", "#8b5cf6", height=60, width=120),
    card("Large", "#06b6d4", height=100, width=250),
    card("Tiny", "#e11d48", height=50, width=80),
    card("Extra Wide", "#059669", height=70, width=350),
    card("Square", "#d97706", height=90, width=90),
    flex_wrap="wrap", min_height=200, gap="8px",
)

grid_tab = pn.GridBox(
    card("1", "#e11d48"), card("2", "#7c3aed"), card("3", "#0891b2"),
    card("4", "#059669"), card("5", "#d97706"), card("6", "#dc2626"),
    ncols=3,
)

pn.Column(
    "# Layout Showcase",
    pn.Tabs(
        ("Column", column_tab),
        ("Row", row_tab),
        ("FlexBox", flexbox_tab),
        ("GridBox", grid_tab),
    ),
).servable()
