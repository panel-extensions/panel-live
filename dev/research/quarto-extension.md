# Quarto Extension Research

## Shinylive Quarto Extension Analysis

The shinylive Quarto extension (`quarto-ext/shinylive`) uses a Lua filter that calls back into a Python CLI for dependency resolution. This keeps the extension thin while Python handles complex logic.

### Key Patterns from Shinylive

1. **Lua filter** — `shinylive.lua` processes code blocks
2. **Python CLI callback** — `shinylive extension info/base-htmldeps/...` for deps
3. **`#|` directive syntax** — standard Quarto convention for code block options
4. **`quarto.doc.add_html_dependency()`** — inject JS/CSS once per document
5. **Class matching** — `el.classes:includes("shinylive-python")` or `"shinylive-r"`

## Panel-live Approach

### Simpler Than Shinylive

panel-live is purely client-side — no Python CLI callback needed. The Lua filter:
1. Matches `{panel-live}` and `{panel}` code block classes
2. Parses `#|` directives into HTML attributes
3. Escapes code and wraps in `<panel-live>` element
4. Injects JS/CSS once via `quarto.doc.add_html_dependency()`
5. Reads version config from YAML document metadata

### Code Block Syntax

```markdown
```{panel-live}
#| mode: editor
#| theme: dark
#| requirements: numpy
import panel as pn
pn.panel("Hello").servable()
```
```

### Configuration

Via YAML metadata in `_quarto.yml` or document front matter:

```yaml
panel-live:
  panel-live-js: "https://cdn.holoviz.org/panel-live/latest/panel-live.js"
  panel-live-css: "https://cdn.holoviz.org/panel-live/latest/panel-live.css"
  pyodide-version: "v0.28.2"
  panel-version: "1.8.7"
  bokeh-version: "3.8.2"
```

### Non-HTML Fallback

For non-HTML output (PDF, DOCX), the filter returns `nil` to pass through the original code block unchanged.

## Migration from holoviz-quarto

1. Install panel-live extension
2. Update `_quarto.yml` filter name
3. Update code block class from `{holoviz}` to `{panel-live}`

## Files Created

- `quarto/_extensions/panel-live/panel-live.lua` — Lua filter (~190 lines)
- `quarto/_extensions/panel-live/_extension.yml` — Extension metadata
- `tests/test_quarto.py` — Tests (structural + optional integration)
- `docs-quarto/` — Test site (_quarto.yml, index.qmd, examples.qmd, versions.qmd)
- `docs/how-to/quarto-integration.md` — User documentation
