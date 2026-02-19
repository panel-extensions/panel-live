# Code Editor Options

Control editor visibility and position using `code-visibility` and `code-position` attributes.

## Code visibility

### Visible (default)

The code editor is shown and expanded.

```{.panel mode="editor" code-visibility="visible"}
import panel as pn
pn.panel("Code is **visible** by default.").servable()
```

### Hidden

The code editor is completely hidden. The output is shown alone, similar to app mode but with the editor header/controls still available.

```{.panel mode="editor" code-visibility="hidden"}
import panel as pn
pn.panel("Code is **hidden** — output only.").servable()
```

### Collapsed

The code editor is collapsed behind a toggle button. Click **Expand Code** to reveal the editor; it changes to **Collapse Code** when expanded.

```{.panel mode="editor" code-visibility="collapsed"}
import panel as pn
pn.panel("Code is **collapsed** — click to expand.").servable()
```

## Code position

### First (default)

Code appears before (above or left of) the output.

```{.panel mode="editor" code-position="first"}
import panel as pn
pn.panel("Code is **first** — above the output.").servable()
```

### Last

Code appears after (below or right of) the output.

```{.panel mode="editor" code-position="last"}
import panel as pn
pn.panel("Code is **last** — below the output.").servable()
```

## Fence syntax

````markdown
```{.panel mode="editor" code-visibility="visible"}
# editor with visible code (default)
```
````

````markdown
```{.panel mode="editor" code-visibility="hidden"}
# output only, no code shown
```
````

````markdown
```{.panel mode="editor" code-visibility="collapsed"}
# code behind a toggle
```
````

````markdown
```{.panel mode="editor" code-position="first"}
# code before output (default)
```
````

````markdown
```{.panel mode="editor" code-position="last"}
# code after output
```
````

## When to use each

| Scenario | `code-visibility` | `code-position` |
|----------|-------------------|-----------------|
| Interactive tutorial | `visible` | `first` |
| Output showcase with optional code | `collapsed` | `last` |
| Embedded demo (no editing) | `hidden` | — |
| Code-focused documentation | `visible` | `first` |
| Result-focused documentation | `visible` | `last` |
