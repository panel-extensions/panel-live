# panel-live

> **Not yet released** — APIs may change. If you find a version that works, pin it. Check out the [roadmap](https://panel-extensions.github.io/panel-live/project/open-issues/).

[![CI](https://img.shields.io/github/actions/workflow/status/panel-extensions/panel-live/ci.yml?style=flat-square&branch=main)](https://github.com/panel-extensions/panel-live/actions/workflows/ci.yml)
[![conda-forge](https://img.shields.io/conda/vn/conda-forge/panel-live?logoColor=white&logo=conda-forge&style=flat-square)](https://prefix.dev/channels/conda-forge/packages/panel-live)
[![pypi-version](https://img.shields.io/pypi/v/panel-live.svg?logo=pypi&logoColor=white&style=flat-square)](https://pypi.org/project/panel-live)
[![python-version](https://img.shields.io/pypi/pyversions/panel-live?logoColor=white&logo=python&style=flat-square)](https://pypi.org/project/panel-live)

**Write, edit, and run Python interactively in the browser — no server required.**

Turn any web page into an interactive Python playground with the `<panel-live>` web component. Works with matplotlib, pandas, scikit-learn, Panel, and 200+ packages from the Python ecosystem. Visualizations, analyses, dashboards, and interactive tools are fully interactive — users can view, explore, edit code, and re-run, all directly in the browser via [Pyodide](https://pyodide.org/) — no backend, no deployment, no infrastructure.

## Quick Start

### HTML (any web page)

Include the CSS and JS:

```html
<link rel="stylesheet" href="https://panel-extensions.github.io/panel-live/assets/css/panel-live.css">
<script src="https://panel-extensions.github.io/panel-live/assets/js/panel-live.js"></script>
```

> **Pre-release:** The JS/CSS URLs above point to GitHub Pages. Once published to npm, they will change to `cdn.jsdelivr.net/npm/@panel-extensions/panel-live@latest/dist/`. Similarly, `pip install panel-live` will work once published to PyPI.

Then add a `<panel-live>` element with your Panel code inside:

**App mode** — renders the app with no editor:

```html
<panel-live>
import panel as pn

slider = pn.widgets.IntSlider(name="Value", start=0, end=100, value=50)
output = pn.pane.Markdown(pn.bind(lambda v: f"## Value: {v}", slider))
pn.Column(slider, output).servable()
</panel-live>
```

**Editor mode** — editable code with a Run button:

```html
<panel-live mode="editor">
import panel as pn

name = pn.widgets.TextInput(name="Name", value="World")
pn.Column(pn.bind(lambda n: f"# Hello, {n}!", name), name).servable()
</panel-live>
```

**Playground mode** — side-by-side editor and live preview:

```html
<panel-live mode="playground" layout="horizontal">
import panel as pn

slider = pn.widgets.IntSlider(name="Value", start=0, end=100, value=50)
output = pn.pane.Markdown(pn.bind(lambda v: f"## Value: {v}", slider))
pn.Column(slider, output).servable()
</panel-live>
```

See the [full playground](https://panel-extensions.github.io/panel-live/playground.html) for an interactive editing experience.

## Features

- **3 modes:** app (output only), editor (code + output), playground (side-by-side)
- **Web Worker execution** — Pyodide runs in a Dedicated Worker, keeping the page responsive
- **Light / dark / auto theming** that follows the host page
- **CSS custom properties** for full branding control
- **Real-time print output** — `print()` streams incrementally as code executes
- **Multi-file support** via `<panel-file>` child elements
- **Explicit requirements** via `<panel-requirements>`
- **Docs integration** via fenced code blocks in MkDocs, Quarto or Sphinx.
- **No server needed** — runs entirely in the browser via Pyodide

## Live Demos

- [Examples](https://panel-extensions.github.io/panel-live/examples/) — many cool examples
- [API Explorer](https://panel-extensions.github.io/panel-live/api-explorer.html) — interactive configuration
- [Playground](https://panel-extensions.github.io/panel-live/playground.html) — full-screen editing

## Pin Your Version

This project has **not been released yet**, so if you find a version that suits your needs, it's recommended to **pin your version**, as updates may introduce changes.

## Installation

```bash
pip install git+https://github.com/panel-extensions/panel-live.git
```

> **Pre-release:** `pip install panel-live` will work once the package is published to PyPI.

## Development

```bash
git clone https://github.com/panel-extensions/panel-live
cd panel-live
```

All development uses [pixi](https://pixi.sh) for environment management:

```bash
# Setup
pixi run postinstall                 # pip install -e . (editable install)
pixi run npm-install                 # install npm dependencies (esbuild, vitest)
pixi run lint-install                # install pre-commit hooks

# Python
pixi run test                        # pytest
pixi run test-coverage               # pytest with coverage

# JavaScript
pixi run build-js                    # bundle lib/ → dist/ (production)
pixi run test-js                     # run Vitest unit tests (69 tests)
pixi run test-js-coverage            # Vitest with V8 coverage

# Docs
pixi run -e docs serve               # live dev server
pixi run -e sphinx build             # build Sphinx test site
pixi run -e sphinx serve             # serve Sphinx site on localhost:8001
pixi run -e quarto build             # render Quarto test site
pixi run -e quarto serve             # preview Quarto site
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch: `git checkout -b feature/YourFeature`.
3. Make your changes and commit them: `git commit -m 'Add some feature'`.
4. Push to the branch: `git push origin feature/YourFeature`.
5. Open a pull request.

Please ensure your code adheres to the project's coding standards and passes all tests.
