import random
import panel as pn

pn.extension("deckgl", sizing_mode="stretch_width")

n_points = pn.widgets.IntSlider(name="Points", start=50, end=500, step=50, value=200)

def make_spec(n):
    random.seed(42)
    data = [
        {"position": [-122.4 + random.gauss(0, 0.02), 37.78 + random.gauss(0, 0.02)],
         "color": [random.randint(50, 255), random.randint(50, 255), random.randint(50, 255)]}
        for _ in range(n)
    ]
    return {
        "initialViewState": {"longitude": -122.4, "latitude": 37.78, "zoom": 11, "pitch": 0},
        "mapStyle": "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
        "layers": [{
            "@@type": "ScatterplotLayer",
            "data": data,
            "getPosition": "@@=position",
            "getColor": "@@=color",
            "getRadius": 80,
            "radiusMinPixels": 4,
            "pickable": True,
        }],
    }

pn.Column(
    "# DeckGL Scatter",
    n_points,
    pn.pane.DeckGL(pn.bind(make_spec, n_points), height=500, sizing_mode="stretch_width"),
).servable()
