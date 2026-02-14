import panel as pn
import colorcet as cc

pn.extension(sizing_mode="stretch_width")

palette_names = sorted([name for name in cc.palette if not name.startswith("_")])[:30]
selector = pn.widgets.Select(name="Palette", options=palette_names, value="rainbow")
n_colors = pn.widgets.IntSlider(name="Colors", start=5, end=30, value=15)

def show_palette(name, n):
    colors = cc.palette[name]
    step = max(1, len(colors) // n)
    sampled = [colors[i * step] for i in range(min(n, len(colors)))]
    swatches = ""
    for c in sampled:
        swatches += f'<div style="background:{c};height:40px;border-radius:4px;"></div>'
    return pn.pane.HTML(
        f'<div style="display:grid;grid-template-columns:repeat({len(sampled)},1fr);gap:4px;">'
        f'{swatches}</div>'
    )

pn.Column(
    "# Colorcet Palettes",
    pn.Row(selector, n_colors),
    pn.bind(show_palette, selector, n_colors),
).servable()
