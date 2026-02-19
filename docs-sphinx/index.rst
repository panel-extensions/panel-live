panel-live Sphinx Test
======================

This site tests the ``panel-live`` Sphinx extension.

Default Mode (Editor)
--------

.. panel-live::

   import panel as pn
   slider = pn.widgets.IntSlider(name="Value", start=0, end=10, value=5)
   pn.Row(slider, pn.bind(lambda v: f"## {v}", slider)).servable()

Expression Mode (Matplotlib)
----------------------------

Not just Panel — any Python expression works. Here matplotlib renders without
any Panel imports.

.. panel-live::
   :mode: editor
   :label: Python
   :code-visibility: collapsed
   :code-position: last

   import matplotlib
   matplotlib.use("agg")
   import matplotlib.pyplot as plt
   import numpy as np

   x = np.linspace(0, 2 * np.pi, 200)
   fig, ax = plt.subplots(figsize=(6, 3))
   for n in range(1, 5):
       ax.plot(x, np.sin(n * x) / n, label=f"sin({n}x)/{n}")
   ax.set_title("Harmonic Series")
   ax.legend(loc="upper right")
   ax.grid(True, alpha=0.3)
   fig

App Mode
--------

.. panel-live::
   :mode: app

   import panel as pn
   slider = pn.widgets.IntSlider(name="Value", start=0, end=10, value=5)
   pn.Row(slider, pn.bind(lambda v: f"## {v}", slider)).servable()

App Mode With Requirements
--------------------------

.. panel-live::
   :mode: app
   :requirements: numpy

   import panel as pn
   slider = pn.widgets.IntSlider(name="Value", start=0, end=10, value=5)
   pn.Row(slider, pn.bind(lambda v: f"## {v}", slider)).servable()

Editor Mode
-----------

.. panel-live::
   :mode: editor

   import panel as pn
   slider = pn.widgets.IntSlider(name="Value", start=0, end=10, value=5)
   pn.Row(slider, pn.bind(lambda v: f"## {v}", slider)).servable()

Playground Mode
-----------

.. panel-live::
   :mode: playground

   import panel as pn
   slider = pn.widgets.IntSlider(name="Value", start=0, end=10, value=5)
   pn.Row(slider, pn.bind(lambda v: f"## {v}", slider)).servable()

.. toctree::
   :maxdepth: 2

   attributes
   pre-rendering
   examples
