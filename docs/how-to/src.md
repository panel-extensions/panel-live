# External Source

Load Python code from an external URL using the `src` attribute instead of embedding code inline.

## Loading from a URL

Point the `src` attribute to any publicly accessible `.py` file:

```{.panel mode="editor" src="../../assets/examples/hello.py"}
```

The code is fetched at runtime and displayed in the editor. Users can still edit and re-run the loaded code.

## GitHub URLs

GitHub blob URLs are automatically converted to raw URLs. You can use a regular GitHub file link as the `src` value:

```{.panel mode="editor" src="https://github.com/panel-extensions/panel-live/blob/main/docs/assets/examples/hello.py"}
```

The URL `https://github.com/owner/repo/blob/branch/path.py` is rewritten to `https://raw.githubusercontent.com/owner/repo/branch/path.py` before fetching.

### HTML syntax

```html
<panel-live mode="editor"
  src="https://github.com/panel-extensions/panel-live/blob/main/docs/assets/examples/hello.py"
  auto-run>
</panel-live>
```

## Error handling

If `src` points to a non-Python resource (e.g. an HTML 404 page or a wrong URL), panel-live shows a clear error message instead of a confusing `SyntaxError` on `<!doctype html>`.

The fetch validates:

- **HTTP status** — non-200 responses produce an error with the status code
- **Content-Type** — HTML responses are detected and rejected
- **HTML detection** — responses starting with `<!` are flagged as non-Python

```html
<!-- This would show: "Expected Python source from ... but received HTML" -->
<panel-live src="https://example.com/nonexistent.py"></panel-live>
```

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
