# Labels

Customize the language pill text displayed in the editor header using the `label` attribute.

## Default label

The default label is "Python":

```{.panel mode="editor"}
import panel as pn
pn.panel("Default label: **Python**").servable()
```

## Custom label

Set a custom label to describe your code:

```{.panel mode="editor" label="Panel App"}
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

## Naming rationale

The `label` attribute name was chosen deliberately:

- **Semantic** — "label" describes the *purpose* (identifying what the code is) rather than the visual presentation
- **HTML convention** — aligns with `<label>` in HTML forms, `aria-label` in accessibility, and `label` in many component libraries
- **Not visual** — alternatives like `badge`, `pill`, or `tag` describe how it looks, not what it means. Visual presentation can change; the semantic role remains stable
- **Future-proof** — `title` and `description` remain available for supplementary metadata if needed later. `name` was avoided because it conflicts with the HTML `name` attribute used for form submission
