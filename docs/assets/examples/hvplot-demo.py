import holoviews as hv
import panel as pn
import numpy as np

hv.extension("bokeh")

data = {"group": np.random.randint(0, 10, 100), "value": np.random.randn(100)}

import pandas as pd
import hvplot.pandas

df = pd.DataFrame(data)
plot = df.hvplot.box(by="group", y="value", responsive=True, height=300)
plot
