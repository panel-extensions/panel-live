import requests
import panel as pn
from io import StringIO
import pandas as pd

pn.extension("tabulator", sizing_mode="stretch_width")

url = "https://raw.githubusercontent.com/mwaskom/seaborn-data/master/iris.csv"
response = requests.get(url)
response.raise_for_status()
df = pd.read_csv(StringIO(response.text))

species = pn.widgets.RadioButtonGroup(
    name="Species", options=["All"] + sorted(df["species"].unique().tolist()), value="All",
    button_type="primary", button_style="outline",
)

def filter_data(s):
    filtered = df if s == "All" else df[df["species"] == s]
    return pn.widgets.Tabulator(filtered, sizing_mode="stretch_width", height=300, page_size=15)

pn.Column(
    "# Iris Dataset (fetched with requests)",
    pn.pane.Markdown(f"Fetched {len(df)} rows from GitHub"),
    species,
    pn.bind(filter_data, species),
).servable()
