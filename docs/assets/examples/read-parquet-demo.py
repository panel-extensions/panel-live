import requests
from io import BytesIO
import pandas as pd
import panel as pn

pn.extension("tabulator", sizing_mode="stretch_width")

url = "https://datasets.holoviz.org/windturbines/v1/windturbines.parq"
resp = requests.get(url)
df = pd.read_parquet(BytesIO(resp.content), engine="fastparquet")

state = pn.widgets.RadioButtonGroup(
    name="State",
    options=["All"] + sorted(df["t_state"].value_counts().head(5).index.tolist()),
    value="All", button_type="primary", button_style="outline",
)

def filter_data(s):
    filtered = df if s == "All" else df[df["t_state"] == s]
    return pn.widgets.Tabulator(
        filtered[["p_name", "t_state", "t_county", "t_cap", "t_ttlh"]].head(50),
        sizing_mode="stretch_width", height=300, page_size=15,
    )

pn.Column(
    "# Wind Turbines (pd.read_parquet from URL)",
    pn.pane.Markdown(f"Loaded **{len(df):,}** rows via `pd.read_parquet(url)`"),
    state,
    pn.bind(filter_data, state),
).servable()
