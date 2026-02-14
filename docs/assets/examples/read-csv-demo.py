import pandas as pd
import panel as pn

pn.extension("tabulator", sizing_mode="stretch_width")

url = "https://raw.githubusercontent.com/mwaskom/seaborn-data/master/penguins.csv"
df = pd.read_csv(url).dropna()

species = pn.widgets.RadioButtonGroup(
    name="Species", options=["All"] + sorted(df["species"].unique().tolist()), value="All",
    button_type="primary", button_style="outline",
)

def filter_data(s):
    filtered = df if s == "All" else df[df["species"] == s]
    return pn.widgets.Tabulator(filtered, sizing_mode="stretch_width", height=300, page_size=15)

pn.Column(
    "# Penguins (pd.read_csv from URL)",
    pn.pane.Markdown(f"Loaded {len(df)} rows via `pd.read_csv(url)`"),
    species,
    pn.bind(filter_data, species),
).servable()
