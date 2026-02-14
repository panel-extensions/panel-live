import panel as pn

pn.extension("katex", sizing_mode="stretch_width")

equation = pn.widgets.TextInput(
    name="LaTeX Equation",
    value=r"E = mc^2",
    sizing_mode="stretch_width",
)

def render(eq):
    return pn.pane.LaTeX(
        f"$${eq}$$",
        styles={"font-size": "24px", "text-align": "center"},
        sizing_mode="stretch_width",
    )

pn.Column(
    "# LaTeX Renderer",
    equation,
    pn.bind(render, equation),
).servable()
