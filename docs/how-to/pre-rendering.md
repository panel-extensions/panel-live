# Pre-Rendering

Show output instantly on page load using the `pre-render` attribute. Pre-rendered fences execute Panel code at build time and embed the static HTML output — users see results before Pyodide even starts downloading.

## Pre-render + auto-run (recommended)

Set `pre-render="true" auto-run="true"` to show output instantly and transition to interactive when Pyodide loads:

```{.panel mode="editor" pre-render="true" auto-run="true"}
import panel as pn
pn.panel("**Instant output.** This appeared before Pyodide loaded. Edit the code and press Run to interact.").servable()
```

Best for **showcases and demos** — users see results immediately, and the app becomes interactive in the background.

## Pre-render + no auto-run

Set `pre-render="true" auto-run="false"` to show static output that stays until the user clicks Run:

```{.panel mode="editor" pre-render="true" auto-run="false"}
import panel as pn
pn.panel("**Static output.** Click Run to make this interactive.").servable()
```

Best for **documentation with many examples** — avoids downloading Pyodide until the user explicitly wants interactivity.

## No pre-render + auto-run

Omit `pre-render` with `auto-run="true"` to show a loading spinner, then output:

```{.panel mode="editor" auto-run="true"}
import panel as pn
pn.panel("**Live output.** This appeared after Pyodide loaded and executed the code.").servable()
```

Best when pre-rendering is not available in the build environment.

## No pre-render + no auto-run

Omit `pre-render` with `auto-run="false"` — a "Click Run to execute this example" placeholder appears in the output area until the user clicks Run:

```{.panel mode="editor" auto-run="false"}
import panel as pn
pn.panel("**On-demand output.** You clicked Run to see this.").servable()
```

Best for **tutorials and exercises** where the user should read the code first.

For examples that can't be pre-rendered (e.g. streaming or periodic callbacks), use the `preview` attribute to show a static screenshot instead. See [Preview Image](preview.md).

## Fence syntax

**MkDocs — per-fence:**

````markdown
```{.panel pre-render="true" auto-run="true"}
import panel as pn
pn.panel("Hello").servable()
```
````

**MkDocs — skip pre-render on a specific fence:**

````markdown
```{.panel pre-render="false"}
import panel as pn
# This fence won't be pre-rendered even if enabled globally
pn.panel("Hello").servable()
```
````

**MkDocs — site-wide via formatter:** set `format` to `panel_live.fences.prerender_formatter` in your superfences config — every fence is pre-rendered without needing a hook.

**Sphinx:**

```rst
.. panel-live::
   :pre-render: true
   :auto-run: true

   import panel as pn
   pn.panel("Hello").servable()
```

## When to use each

| Combination | Output on load | Interactive | Best for |
|-------------|---------------|-------------|----------|
| `pre-render="true"` + `auto-run="true"` | Instant | Auto | Showcases, demos |
| `pre-render="true"` + `auto-run="false"` | Instant (static) | On click | Docs with many examples |
| `auto-run="true"` (no pre-render) | After Pyodide loads | Auto | No build-time Panel |
| `auto-run="false"` (no pre-render) | Placeholder text | On click | Tutorials, exercises |
| `preview` + `auto-run="false"` | Preview image | On click | Streaming, periodic callbacks |
