# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is panel-live?

A Python package and web component (`<panel-live>`) that lets users run Panel/Python code live in the browser via Pyodide (WASM). The JS custom element lives in `lib/`, the Python package in `src/panel_live/`, and docs use a custom Markdown fence to embed interactive examples.

## Commands

All development uses **pixi** for environment management:

```bash
# Testing
pixi run test                        # pytest (default env)
pixi run test-coverage               # pytest with coverage
pixi run -e test-ui test-ui          # Playwright browser tests (requires chromium)

# Linting
pixi run lint-install                # install pre-commit hooks
pixi run lint                        # run pre-commit on all files

# Docs
pixi run -e docs serve               # live dev server (zensical/mkdocs)
pixi run -e docs build               # build static site to site/

# Building
pixi run -e build build-wheel        # build package wheel
pixi run -e build check-wheel        # validate with twine

# Other
pixi run postinstall                 # pip install -e . (editable install)
pixi run serve                       # local HTTP server with COOP/COEP headers (for Pyodide)
pixi run sync-assets                 # copy lib/panel-live.{js,css} to docs/assets/
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

### Web component (`lib/`)

- **`panel-live.js`** — `<panel-live>` custom element: manages Pyodide runtime, code editor, execution, and output rendering
- **`panel-live.css`** — styling for the custom element

The JS/CSS are copied to `docs/assets/` via `pixi run sync-assets` and loaded by the docs site.

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

### Testing

- **`tests/conftest.py`** — autouse fixtures that reset Panel extensions, server state, and caches between tests
- **`tests/ui/`** — Playwright E2E tests (tagged with `pytest.mark.ui`, run only with `--ui` flag)

## Local development server

`serve.py` provides an HTTP server with Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy headers, required for Pyodide's SharedArrayBuffer support. Use `pixi run serve` or `python serve.py [port]`.
