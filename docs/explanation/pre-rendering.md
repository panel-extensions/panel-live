# Pre-Rendering

Pre-rendering executes Panel code **at build time** and embeds the resulting static HTML inside each `<panel-live>` element. When users load the page they see the output instantly — before Pyodide has even started downloading.

## Why Pre-Render?

Without pre-rendering, every `<panel-live>` element starts blank and shows a loading spinner while Pyodide (300-500 MB) downloads, initializes, and executes the code. This can take 5-15 seconds on a fast connection. Pre-rendering eliminates that wait for the initial view.

Benefits:

- **Instant visual output** — content appears on page load, not after Pyodide boots.
- **SEO-friendly** — search engines index the static HTML.
- **Fallback** — browsers without WebAssembly still see the output.
- **Perceived performance** — users see results immediately, even if interactivity takes a few seconds to become available.

## How It Works

### Build-Time Pipeline

1. **Hash the code.** The full source (including any `setup_code`) is hashed with SHA-256 to produce a cache key.
2. **Check the cache.** If a file named `{hash}.json` exists in the cache directory, its contents are returned immediately — no subprocess is spawned.
3. **Spawn a subprocess.** On cache miss, a `multiprocessing.Process` (using the `spawn` context) executes the code via `panel.io.mime_render.exec_with_return()`.
4. **Serialize to JSON.** The resulting Panel/Bokeh object is serialized to JSON via `bokeh.embed.standalone.standalone_docs_json_and_render_items()`.
5. **Cache the result.** The JSON is written to the cache directory with `portalocker` file locking (falling back to plain writes when `portalocker` is not installed).
6. **Embed in HTML.** The JSON is wrapped in a `<script type="application/json" class="panel-live-prerender">` tag inside the `<panel-live>` element.

### Page-Load Pipeline

1. The `<panel-live>` custom element finds the embedded `<script class="panel-live-prerender">` child.
2. It parses the JSON and calls Bokeh's `embed_items()` to render the static output.
3. The status overlay is hidden, and the output is visible immediately.
4. When Pyodide finishes loading (in the background), the element transitions to interactive mode — the pre-rendered output is replaced by the live output.

### Transition to Interactive

- When `auto-run="true"`, the element automatically re-executes the code once Pyodide is ready and replaces the static output with the live version.
- When `auto-run="false"`, the static output persists until the user clicks "Run". This is recommended for documentation pages with many examples.

## Caching

Pre-rendered output is cached in a directory (default `.panel-live/`) using content-hash filenames:

```
.panel-live/
  a1b2c3d4e5...json    # SHA-256 of the full code (including setup_code)
  f6g7h8i9j0...json
```

- **Cache hit** — if the code hasn't changed, the cached JSON is returned without spawning a subprocess.
- **Cache invalidation** — changing the code (or `setup_code`) produces a different hash and triggers re-rendering.
- **File locking** — `portalocker` is used for file-level locking to support parallel builds. When `portalocker` is not installed, plain file writes are used (safe for serial builds).

Add `.panel-live/` to `.gitignore`:

```
.panel-live/
```

## Framework Integration

Pre-rendering is available across all three supported documentation frameworks. The simplest approach is the **per-fence attribute** — add `pre-render="true"` to individual fences or directives without any configuration changes.

| Framework | Per-Fence On | Site-Wide | Per-Fence Off |
|-----------|-------------|-----------|---------------|
| **MkDocs** | `pre-render="true"` attribute | `prerender_formatter` or `configure()` hook | `pre-render="false"` attribute |
| **Sphinx** | `:pre-render: true` option | `panel_live_conf = {"pre_render": True}` | `:pre-render: false` option |
| **Quarto** | `python -m panel_live pre-render` via Lua `io.popen()` | (call CLI for all fences) | (call CLI selectively) |
| **CLI** | `python -m panel_live pre-render CODE` | N/A | N/A |

See the [Pre-Rendering How-to Guide](../how-to/pre-rendering.md) for live demos of all combinations.

### MkDocs

**Per-fence** (simplest — no config change needed):

````markdown
```{.panel pre-render="true"}
import panel as pn
pn.panel("Hello").servable()
```
````

**Site-wide via formatter** — point superfences at `prerender_formatter`:

```toml
custom_fences = [
  { name = "panel", class = "panel-live", validator = "panel_live.fences.validator", format = "panel_live.fences.prerender_formatter" }
]
```

**Site-wide via hook** (advanced — custom cache_dir, setup_code, etc.):

```python
# docs/hooks/panel_live_prerender.py
from panel_live.fences import configure

def on_config(config):
    configure(pre_render=True, cache_dir=".panel-live")
    return config
```

Register the hook in your MkDocs config:

```yaml
hooks:
  - docs/hooks/panel_live_prerender.py
```

### Sphinx

**Per-directive** (simplest):

```rst
.. panel-live::
   :pre-render: true

   import panel as pn
   pn.panel("Hello").servable()
```

**Site-wide** — pre-rendering is enabled by default when using the `panel_live.sphinx` extension:

```python
# conf.py
extensions = ["panel_live.sphinx"]

panel_live_conf = {
    "pre_render": True,       # default
    "setup_code": "",         # prepended to all directives
}
```

See the [Sphinx Integration Guide](../how-to/sphinx-integration.md) for full configuration.

### CLI

The CLI is useful for Quarto integration and scripting:

```bash
# Inline code
python -m panel_live pre-render "import panel as pn; pn.panel('hello').servable()"

# From a file
python -m panel_live pre-render --file examples/app.py

# With options
python -m panel_live pre-render --file app.py --cache-dir .cache --timeout 60
```

The JSON output is printed to stdout. Quarto's Lua filter can call this via `io.popen()`.

## Build Requirements

Pre-rendering executes Panel code in a subprocess, so the build environment must have:

- **Panel** and **Bokeh** installed (matching the versions configured for the frontend)
- Any packages imported by the code (e.g. `hvplot`, `numpy`, `pandas`)

The subprocess uses `panel.io.mime_render.exec_with_return()`, which requires a working Panel installation.

## Skipping Pre-Render

Some code cannot be pre-rendered (e.g. code that requires browser APIs or user interaction). Use `pre-render="false"` to exclude specific blocks:

**Sphinx:**
```rst
.. panel-live::
   :pre-render: false

   import panel as pn
   pn.panel("This won't be pre-rendered").servable()
```

**MkDocs:**
````markdown
```{.panel pre-render="false"}
import panel as pn
pn.panel("This won't be pre-rendered").servable()
```
````

## Limitations

- **No browser APIs** — code that accesses `window`, `document`, or other browser globals will fail in the subprocess.
- **Only initial state** — pre-rendering captures the initial render of the Panel app. Dynamic behavior (callbacks, streaming) is only available after Pyodide loads.
- **Build time** — each uncached directive spawns a subprocess. Large documentation sites may have longer build times. The cache mitigates this for rebuilds.
- **Memory** — each subprocess loads Panel/Bokeh. Parallel builds with many directives may use significant memory.
