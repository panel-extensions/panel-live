# External Source

Load Python code from an external URL using the `src` attribute instead of embedding code inline.

## Loading from a URL

Point the `src` attribute to any publicly accessible `.py` file:

```{.panel mode="editor" src="../../assets/examples/hello.py" auto-run="true"}
```

The code is fetched at runtime and displayed in the editor. Users can still edit and re-run the loaded code.

## Fence syntax

````markdown
```{.panel mode="editor" src="examples/hello.py"}
```
````

## HTML syntax

```html
<panel-live mode="editor" src="https://example.com/app.py"></panel-live>
```

Child elements also support `src` for individual files:

```html
<panel-live mode="editor">
  <panel-file name="app.py" src="https://example.com/app.py" entrypoint></panel-file>
  <panel-file name="utils.py" src="https://example.com/utils.py"></panel-file>
</panel-live>
```

## When to use

| Scenario | Recommended |
|----------|-------------|
| Reusing examples across pages | `src` to a shared `.py` file |
| Large code blocks | `src` keeps Markdown clean |
| External code repositories | `src` to raw GitHub URLs |
| Self-contained Markdown | Inline code (no `src`) |
