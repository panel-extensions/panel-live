# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is panel-live?

A Python package and web component (`<panel-live>`) that lets users run Panel/Python code live in the browser via Pyodide (WASM). The JS custom element lives in `lib/`, the Python package in `src/panel_live/`, and docs use a custom Markdown fence to embed interactive examples.

## Commands

All development uses **pixi** for environment management:

```bash
# Python testing
pixi run test                        # pytest (default env)
pixi run test-coverage               # pytest with coverage
pixi run -e test-ui test-ui          # Playwright browser tests (requires chromium)

# JavaScript building & testing
pixi run npm-install                 # install npm dependencies (esbuild, vitest)
pixi run build-js                    # bundle lib/ → dist/panel-live.{js,css} (production)
pixi run build-js-dev                # bundle lib/ → dist/ (unminified, for debugging)
pixi run test-js                     # run Vitest JS unit tests
pixi run test-js-coverage            # run Vitest with V8 coverage report

# Linting
pixi run lint-install                # install pre-commit hooks
pixi run lint                        # run pre-commit on all files

# Docs (automatically builds JS and syncs assets before serving/building)
pixi run -e docs serve               # live dev server (zensical/mkdocs)
pixi run -e docs build               # build static site to site/

# Building
pixi run -e build build-wheel        # build package wheel
pixi run -e build check-wheel        # validate with twine

# Other
pixi run postinstall                 # pip install -e . (editable install)
pixi run serve                       # local HTTP server with COOP/COEP headers (for Pyodide)
pixi run sync-assets                 # build JS and copy dist/ to docs/assets/
```

Run a single test file or test function:
```bash
pixi run python -m pytest tests/test_core.py
pixi run python -m pytest tests/test_core.py::test_import -x
```

## Architecture

### Python package (`src/panel_live/`)

- **`__init__.py`** — exports `create_app()` and `__version__`
- **`main.py`** — `create_app()` returns a demo Panel Row (slider + reactive callback)
- **`fences.py`** — custom `pymdownx.superfences` validator/formatter that transforms `` ```panel `` Markdown fences into `<panel-live>` HTML elements. Configured in `zensical.toml` under `custom_fences`. Defaults: `mode="editor"`, `code-position="last"`.

### Web component (`lib/` → `dist/`)

Source ES modules in `lib/`, bundled by esbuild into `dist/panel-live.js` (main IIFE) + `dist/panel-live-worker.js` (worker IIFE) + `dist/panel-live.css`:

**Main thread:**
- **`index.js`** — entry point: service worker cleanup, imports all modules
- **`config.js`** — `_defaults`, `_config`, `cdnUrls()` (Pyodide/Panel/Bokeh versions)
- **`utils.js`** — `uid()`, `loadScript()`, `loadCSS()`
- **`theme.js`** — `resolveTheme()`, dark mode media query
- **`codemirror.js`** — CodeMirror loading + `createCMEditor()`
- **`worker-bridge.js`** — singleton bridge to Dedicated Worker: `getWorkerBridge()`, handles `init()`, `run()`, `install()`, `writeFile()`, `reset()`, Bokeh `embed_items()`, bidirectional doc sync via JSON patches, stdout streaming
- **`error-renderer.js`** — `renderError()` with traceback parsing and user-frame filtering
- **`helper-elements.js`** — `<panel-file>`, `<panel-requirements>`, `<panel-example>`
- **`url-sharing.js`** — `encodeCode()`, `decodeCode()`, hash helpers
- **`panel-live-element.js`** — `<panel-live>` custom element class
- **`controller.js`** — `PanelLiveController`
- **`api.js`** — `window.PanelLive` public API
- **`panel-live.css`** — styling for the custom element

**Dedicated Worker (`panel-live-worker.js`):**
- **`panel-live-worker.js`** — loads Pyodide via `importScripts`, handles all messages (`init`, `run`, `install`, `write-file`, `rendered`, `patch`, `reset`), internal execution queue
- **`python/worker-setup.py`** — unified setup for all 3 execution branches (servable, servable-target, expression), stdout streaming via `StreamingWriter`
- **`python/worker-render.py`** — serializes Bokeh Document to JSON via `_doc_json()`

The bundled JS/CSS in `dist/` are copied to `docs/assets/` via `pixi run sync-assets` and loaded by the docs site.

### Docs fence syntax

Authors write interactive Panel examples using fenced code blocks:

````markdown
```panel
import panel as pn
pn.panel("Hello").servable()
```
````

With optional attributes:
````markdown
```{.panel mode="app" theme="dark" height="500px"}
...
```
````

Known attributes: `mode`, `theme`, `height`, `layout`, `auto-run`, `label`, `code-visibility`, `code-position`.

### Configuration files

- **`pixi.toml`** — environments (default, py312, test-ui, docs, build, lint) and tasks
- **`pyproject.toml`** — package metadata, ruff config (line-length=165), mypy strict mode, pytest options
- **`zensical.toml`** — MkDocs/Material theme config, markdown extensions, superfences custom fence registration
- **`.pre-commit-config.yaml`** — ruff, codespell, prettier (CSS), notebook cleanup
- **`package.json`** — npm devDependencies (esbuild, vitest, jsdom) and scripts
- **`build.mjs`** — esbuild build script (JS + CSS bundling)
- **`vitest.config.js`** — Vitest test configuration (jsdom environment)

### Testing

- **`tests/conftest.py`** — autouse fixtures that reset Panel extensions, server state, and caches between tests
- **`tests/ui/`** — Playwright E2E tests (tagged with `pytest.mark.ui`, run only with `--ui` flag)
- **`tests/js/unit/`** — Vitest unit tests for JS modules (config, utils, theme, url-sharing, error-renderer, worker-bridge)

## Local development server

`serve.py` provides an HTTP server with Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy headers, required for Pyodide's SharedArrayBuffer support. Use `pixi run serve` or `python serve.py [port]`.

## Please also read

@docs/explanation/design.md
@docs/project/open-issues.md
