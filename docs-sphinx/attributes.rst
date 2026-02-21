Directive Attributes
====================

This page demonstrates every ``panel-live`` directive option with a non-default value.
Each section shows a single attribute so you can verify it works in isolation.

Defaults
--------

.. list-table::
   :header-rows: 1
   :widths: 20 15 65

   * - Attribute
     - Default
     - Description
   * - ``mode``
     - ``editor`` (from conf)
     - Display mode: ``app``, ``editor``, or ``playground``
   * - ``theme``
     - ``auto``
     - Color scheme: ``auto``, ``light``, or ``dark``
   * - ``height``
     - unset
     - CSS height of the element
   * - ``layout``
     - ``vertical`` (editor) / ``auto`` (app, playground)
     - Editor/output arrangement: ``auto``, ``vertical``, or ``horizontal``
   * - ``auto-run``
     - ``true``
     - Execute code on page load
   * - ``label``
     - unset
     - Label text shown above the editor
   * - ``code-visibility``
     - ``visible``
     - Show or hide the code editor: ``visible`` or ``hidden``
   * - ``code-position``
     - ``first``
     - Code above or below output: ``first`` or ``last``
   * - ``requirements``
     - unset
     - Extra packages to install via micropip
   * - ``pre-render``
     - from conf (``true``)
     - Per-directive override: ``true`` to force, ``false`` to skip
   * - ``preview``
     - unset
     - URL of a static image shown in output before first run

mode: app
---------

App mode hides the code editor and shows only the rendered output.

.. panel-live::
   :mode: app

   import panel as pn
   slider = pn.widgets.IntSlider(name="Pick a number", start=1, end=20, value=7)
   pn.Column(
       "Running in **app** mode — no editor visible.",
       pn.Row(slider, pn.bind(lambda v: f"### You picked {v}", slider)),
   ).servable()

mode: playground
----------------

Playground mode adds example tabs and a share button alongside the editor.

.. panel-live::
   :mode: playground

   import panel as pn
   pn.extension(sizing_mode="stretch_width")
   slider = pn.widgets.IntSlider(name="Pick a number", start=1, end=20, value=7)
   pn.Column(
       "**Playground** mode — share button, reset, and examples dropdown.",
       pn.Row(slider, pn.bind(lambda v: f"### You picked {v}", slider)),
   ).servable()

theme: dark
-----------

Forces the dark color scheme regardless of OS preference.

.. panel-live::
   :theme: dark

   import panel as pn
   slider = pn.widgets.IntSlider(name="Pick a number", start=1, end=20, value=7)
   pn.Column(
       "Dark theme applied.",
       pn.Row(slider, pn.bind(lambda v: f"### You picked {v}", slider)),
   ).servable()

height: 300px
--------------

Sets a fixed CSS height on the ``<panel-live>`` element.

.. panel-live::
   :height: 300px

   import panel as pn
   slider = pn.widgets.IntSlider(name="Pick a number", start=1, end=20, value=7)
   pn.Column(
       "This element has ``height: 300px``.",
       pn.Row(slider, pn.bind(lambda v: f"### You picked {v}", slider)),
   ).servable()

layout: horizontal
-------------------

Places the code editor and output side by side instead of stacked.

.. panel-live::
   :layout: horizontal

   import panel as pn
   pn.extension(sizing_mode="stretch_width")
   slider = pn.widgets.IntSlider(name="Pick a number", start=1, end=20, value=7)
   pn.Column(
       "Horizontal layout — editor on the left, output on the right.",
       pn.Row(slider, pn.bind(lambda v: f"### You picked {v}", slider)),
   ).servable()

auto-run: false
---------------

Code is **not** executed on page load. The user must click Run.

.. panel-live::
   :auto-run: false

   import panel as pn
   slider = pn.widgets.IntSlider(name="Pick a number", start=1, end=20, value=7)
   pn.Column(
       "Code is **not** executed on page load — click Run.",
       pn.Row(slider, pn.bind(lambda v: f"### You picked {v}", slider)),
   ).servable()

label
-----

Displays a custom label above the code editor.

.. panel-live::
   :label: My Custom Label

   import panel as pn
   slider = pn.widgets.IntSlider(name="Pick a number", start=1, end=20, value=7)
   pn.Column(
       "Check the label above the editor.",
       pn.Row(slider, pn.bind(lambda v: f"### You picked {v}", slider)),
   ).servable()

code-visibility: hidden
------------------------

Hides the code editor entirely. The user sees only the output.

.. panel-live::
   :mode: editor
   :code-visibility: hidden

   import panel as pn
   slider = pn.widgets.IntSlider(name="Pick a number", start=1, end=20, value=7)
   pn.Column(
       "The code editor is **hidden** for this example.",
       pn.Row(slider, pn.bind(lambda v: f"### You picked {v}", slider)),
   ).servable()

code-position: last
-------------------

Places the code editor below the output instead of above it.

.. panel-live::
   :code-position: last

   import panel as pn
   slider = pn.widgets.IntSlider(name="Pick a number", start=1, end=20, value=7)
   pn.Column(
       "Output appears **above** the editor.",
       pn.Row(slider, pn.bind(lambda v: f"### You picked {v}", slider)),
   ).servable()

requirements
------------

Installs extra packages via micropip before execution.

.. panel-live::
   :requirements: numpy

   import numpy as np
   import panel as pn
   slider = pn.widgets.IntSlider(name="Pick a number", start=1, end=20, value=7)
   pn.Column(
       f"numpy version: **{np.__version__}**",
       pn.Row(slider, pn.bind(lambda v: f"### You picked {v}", slider)),
   ).servable()

pre-render: false
-----------------

Explicit per-directive pre-render override. This example is **not** pre-rendered even though the default is true.

.. panel-live::
   :pre-render: false

   import panel as pn
   slider = pn.widgets.IntSlider(name="Pick a number", start=1, end=20, value=7)
   pn.Column(
       "Not pre-rendered — ``:pre-render: false`` overrides the default.",
       pn.Row(slider, pn.bind(lambda v: f"### You picked {v}", slider)),
   ).servable()

preview
-------

Shows a static preview image in the output area instead of a blank space. The user clicks the image or Run to activate.

.. panel-live::
   :auto-run: false
   :pre-render: false
   :preview: https://panel-extensions.github.io/panel-live/assets/png/streaming-chart.png

   import panel as pn
   pn.panel("Preview replaced with live output after clicking Run.").servable()
