# panel-live

> **Early-stage development** — APIs may change. If you find a version that works, pin it. Check out the [roadmap](https://panel-extensions.github.io/panel-live/project/open-issues/).

> **Only works in FireFox** - Issue reported [here](https://github.com/holoviz/panel/issues/8416#issuecomment-3882057737)

[![CI](https://img.shields.io/github/actions/workflow/status/panel-extensions/panel-live/ci.yml?style=flat-square&branch=main)](https://github.com/panel-extensions/panel-live/actions/workflows/ci.yml)
[![conda-forge](https://img.shields.io/conda/vn/conda-forge/panel-live?logoColor=white&logo=conda-forge&style=flat-square)](https://prefix.dev/channels/conda-forge/packages/panel-live)
[![pypi-version](https://img.shields.io/pypi/v/panel-live.svg?logo=pypi&logoColor=white&style=flat-square)](https://pypi.org/project/panel-live)
[![python-version](https://img.shields.io/pypi/pyversions/panel-live?logoColor=white&logo=python&style=flat-square)](https://pypi.org/project/panel-live)

**Write, edit, and run Python interactively in the browser — no server required.**

Turn any web page into an interactive Python playground with the `<panel-live>` web component. Works with matplotlib, pandas, scikit-learn, Panel, and 200+ packages from the Python ecosystem. Visualizations, analyses, dashboards, and interactive tools are fully interactive — users can view, explore, edit code, and re-run, all directly in the browser via [Pyodide](https://pyodide.org/) — no backend, no deployment, no infrastructure.

## Quick Start

> **Not Possible Yet!** - The panel-live css and js assets have not yet been deployed.

### HTML (any web page)

Include the CSS and JS from the CDN:

```html
<link rel="stylesheet" href="https://cdn.holoviz.org/panel-live/latest/panel-live.css">
<script src="https://cdn.holoviz.org/panel-live/latest/panel-live.js"></script>
```

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

### MkDocs / Documentation

In your MkDocs docs, use fenced code blocks with the `panel` language:

````markdown
```panel
import panel as pn

slider = pn.widgets.IntSlider(name="Value", start=0, end=100, value=50)
output = pn.pane.Markdown(pn.bind(lambda v: f"## Value: {v}", slider))
pn.Column(slider, output).servable()
```
````

Add attributes for other modes:

````markdown
```{.panel mode="editor" theme="dark"}
# your code here
```
````

Configure the custom fence in your `zensical.toml` (or `mkdocs.yml`):

```toml
[project.markdown_extensions.pymdownx.superfences]
custom_fences = [
  { name = "panel", class = "panel-live", validator = "panel_live.fences.validator", format = "panel_live.fences.formatter" }
]
```

## Features

- **3 modes:** app (output only), editor (code + output), playground (side-by-side)
- **Light / dark / auto theming** that follows the host page
- **CSS custom properties** for full branding control
- **Multi-file support** via `<panel-file>` child elements
- **Explicit requirements** via `<panel-requirements>`
- **MkDocs integration** via fenced code blocks and `pymdownx.superfences`
- **No server needed** — runs entirely in the browser via Pyodide

## Live Demos

- [Examples](https://panel-extensions.github.io/panel-live/examples/) — many cool examples
- [API Explorer](https://panel-extensions.github.io/panel-live/api-explorer.html) — interactive configuration
- [Playground](https://panel-extensions.github.io/panel-live/playground.html) — full-screen editing

## Pin Your Version

This project is **in its early stages**, so if you find a version that suits your needs, it's recommended to **pin your version**, as updates may introduce changes.

## Installation

```bash
pip install panel-live
```

## Development

```bash
git clone https://github.com/panel-extensions/panel-live
cd panel-live
```

For a simple setup use [`uv`](https://docs.astral.sh/uv/):

```bash
uv venv
source .venv/bin/activate
uv pip install -e .[dev]
pre-commit run install
pytest tests
```

For the full GitHub Actions setup use [pixi](https://pixi.sh):

```bash
pixi run pre-commit-install
pixi run postinstall
pixi run test
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch: `git checkout -b feature/YourFeature`.
3. Make your changes and commit them: `git commit -m 'Add some feature'`.
4. Push to the branch: `git push origin feature/YourFeature`.
5. Open a pull request.

Please ensure your code adheres to the project's coding standards and passes all tests.
