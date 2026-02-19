# Height

Control the height of `panel-live` elements using the `height` attribute.

## Auto height (default)

When no `height` is specified, the element sizes to fit its content.

```{.panel mode="editor"}
import panel as pn
pn.panel("**Auto height** — sizes to fit content.").servable()
```

## Fixed height

Set an explicit height using any CSS length value:

```{.panel mode="editor" height="500px"}
import panel as pn

items = pn.Column(*[
    pn.pane.Markdown(f"Item **{i}**") for i in range(1, 11)
])
items.servable()
```

## Fence syntax

````markdown
```{.panel mode="editor"}
# auto height (default)
```
````

````markdown
```{.panel mode="editor" height="500px"}
# fixed 500px height
```
````

## When to use each

| Scenario | Recommended |
|----------|-------------|
| Simple, short output | Omit `height` (auto) |
| Tall output with scrolling | `height="500px"` or similar |
| Consistent page layout | Fixed height for uniform blocks |
| Playground mode | `height="600px"` recommended |
