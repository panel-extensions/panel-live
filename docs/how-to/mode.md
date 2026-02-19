# Display Modes

Control how `panel-live` presents your code and output using the `mode` attribute.

## App mode (default)

Renders the output only — no editor, no controls. Use for embedded demos.

```{.panel mode="app"}
import panel as pn
pn.panel("This is **app mode** — output only, no editor visible.").servable()
```

## Editor mode

Shows code and output stacked vertically with a Run button. Users can edit and re-run.

```{.panel mode="editor"}
import panel as pn
pn.panel("This is **editor mode** — edit the code and press Run.").servable()
```

## Playground mode

Side-by-side editor and live preview. Best for exploration and experimentation.

```{.panel mode="playground"}
import panel as pn
slider = pn.widgets.IntSlider(name="Value", start=0, end=100, value=42)
pn.Column(slider, pn.bind(lambda v: f"**Value:** {v}", slider)).servable()
```

## Org mode (static code block)

Renders a standard syntax-highlighted code block — no `<panel-live>` element, no interactivity. Useful when you want to show Panel code with syntax highlighting but without live execution.

````markdown
```{.panel mode="org"}
import panel as pn
pn.panel("This renders as a static code block.").servable()
```
````

## Fence syntax

````markdown
```panel
# app mode (default)
```
````

````markdown
```{.panel mode="editor"}
# editor mode
```
````

````markdown
```{.panel mode="playground"}
# playground mode
```
````

````markdown
```{.panel mode="org"}
# static code block (no interactivity)
```
````

## When to use each

| Scenario | Recommended Mode |
|----------|-----------------|
| Embedded demos in docs | `app` |
| Tutorials with editable examples | `editor` |
| Interactive exploration / playground | `playground` |
| Showcase pages | `app` or `editor` with `code-visibility="collapsed"` |
| Static code display (no execution) | `org` |
