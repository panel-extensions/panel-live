# Layout Direction

Control how the code editor and output preview are arranged using the `layout` attribute.

## Vertical layout

Code above, output below. This is the default for **editor** mode.

```{.panel mode="editor" layout="vertical" auto-run="true"}
import panel as pn
pn.panel("**Vertical layout** — code above, output below.").servable()
```

## Horizontal layout

Code and output side by side. This is the default for **playground** mode.

```{.panel mode="playground" layout="horizontal" auto-run="true"}
import panel as pn
pn.panel("**Horizontal layout** — code left, output right.").servable()
```

## Overriding defaults

You can override the default layout for any mode:

```{.panel mode="editor" layout="horizontal" auto-run="true"}
import panel as pn
pn.panel("Editor mode with **horizontal** layout override.").servable()
```

## Fence syntax

````markdown
```{.panel mode="editor" layout="vertical"}
# vertical: code above, output below (editor default)
```
````

````markdown
```{.panel mode="playground" layout="horizontal"}
# horizontal: side by side (playground default)
```
````

## Mode defaults

| Mode | Default Layout |
|------|---------------|
| `app` | N/A (output only) |
| `editor` | `vertical` |
| `playground` | `horizontal` |
