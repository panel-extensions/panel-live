# Preview Image

Show a static image or GIF in the output area before the user runs the code, using the `preview` attribute.

## With a preview image

Set `preview` to an image URL. The image is displayed with a clickable "Run" badge overlay. Clicking the image or the Run button executes the code and replaces the preview with live output:

```{.panel mode="editor" auto-run="false" pre-render="false" preview="../../assets/gif/streaming-chart.gif"}
import panel as pn
pn.panel("**Live output** — the preview image has been replaced.").servable()
```

## Without preview (default)

When `auto-run="false"` with no `preview` and no `pre-render`, a "Click Run to execute this example" placeholder appears in the output area:

```{.panel mode="editor" auto-run="false" pre-render="false"}
import panel as pn
pn.panel("You clicked Run to see this!").servable()
```

## Fence syntax

**MkDocs:**

````markdown
```{.panel mode="editor" auto-run="false" preview="path/to/screenshot.png"}
import panel as pn
pn.panel("Hello").servable()
```
````

**Sphinx:**

```rst
.. panel-live::
   :auto-run: false
   :preview: path/to/screenshot.png

   import panel as pn
   pn.panel("Hello").servable()
```

**Quarto:**

````markdown
```{.panel-live}
#| auto-run: false
#| preview: path/to/screenshot.png
import panel as pn
pn.panel("Hello").servable()
```
````

## When to use

| Scenario | Recommended |
|----------|-------------|
| Streaming / periodic callbacks (can't pre-render) | `preview` with a screenshot |
| Landing pages (avoid 300 MB download) | `preview` or `pre-render` |
| Large example galleries | `preview` with `auto-run="false"` |
| PDF / email embeds (no Pyodide) | `preview` shows a static image |
| Examples that can be pre-rendered | Use `pre-render="true"` instead |
