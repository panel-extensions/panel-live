# Labels

Customize the language pill text displayed in the editor header using the `label` attribute.

## Default label

The default label is "Python":

```{.panel mode="editor" auto-run="true"}
import panel as pn
pn.panel("Default label: **Python**").servable()
```

## Custom label

Set a custom label to describe your code:

```{.panel mode="editor" label="Panel App" auto-run="true"}
import panel as pn
pn.panel("Custom label: **Panel App**").servable()
```

## Fence syntax

````markdown
```{.panel mode="editor"}
# default "Python" label
```
````

````markdown
```{.panel mode="editor" label="Panel App"}
# custom label
```
````

## When to use each

| Scenario | Recommended Label |
|----------|-------------------|
| General Python code | `Python` (default) |
| Panel-specific examples | `Panel` or `Panel App` |
| Library-specific demos | Library name (e.g. `hvPlot`) |
| Tutorial steps | Step description (e.g. `Step 1`) |
