# Auto-Run Configuration

Control whether `panel-live` editors execute code automatically on page load using the `auto-run` attribute.

## Auto-run enabled (default)

Set `auto-run="true"` (or omit it — `true` is the default) to run code as soon as the editor loads:

```{.panel mode="editor" auto-run="true"}
import panel as pn
pn.panel("This ran automatically on page load.").servable()
```

Use this for **demos and showcases** where you want visitors to see results immediately.

## Auto-run disabled

Set `auto-run="false"` to require the user to click **Run** before code executes:

```{.panel mode="editor" auto-run="false"}
import panel as pn
pn.panel("You clicked Run to see this!").servable()
```

Use this for **tutorials and learning exercises** where you want the reader to review the code first.

## Fence syntax

````markdown
```{.panel mode="editor" auto-run="true"}
# runs on page load
```
````

````markdown
```{.panel mode="editor" auto-run="false"}
# waits for user to click Run
```
````

## When to use each

| Scenario | Recommended |
|----------|-------------|
| Gallery / showcase pages | `auto-run="true"` |
| Step-by-step tutorials | `auto-run="false"` |
| Heavy computations | `auto-run="false"` |
| Simple hello-world demos | `auto-run="true"` |
