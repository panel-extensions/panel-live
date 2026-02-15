Examples
========

This page tests various directive options.

Dark Theme
----------

.. panel-live::
   :mode: editor
   :theme: dark

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


Custom Height
-------------

.. panel-live::
   :height: 400px

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

Horizontal Layout
-----------------

.. panel-live::
   :mode: editor
   :layout: horizontal

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

Code Hidden
-----------

.. panel-live::
   :mode: editor
   :code-visibility: hidden

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

Skip Pre-render
---------------

.. panel-live::
   :pre-render: false

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

Auto-Run Disabled
-----------------

With ``:auto-run: false``, the code is not executed on page load — the user must click Run.

.. panel-live::
   :mode: editor
   :auto-run: false

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

Expression Mode
---------------

.. panel-live::
   :mode: editor
   :label: Python

   1 + 1
