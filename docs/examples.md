# Examples

Explore interactive examples below. Click **Run All** above or toggle **Auto-run** to execute examples. Each example can also be run individually.

## Basic

### Hello World

Minimal Panel app using `pn.panel()` and `.servable()`. Demonstrates the simplest panel-live usage.

```{.panel mode="editor" src="../assets/examples/hello.py" code-visibility="collapsed" code-position="last"}
```

## HoloViz

### hvPlot

Interactive line chart from a pandas DataFrame using `.hvplot.line()` with a `CheckButtonGroup` for multi-column selection. Demonstrates hvPlot's concise API for interactive visualization.

Docs: [hvPlot](https://hvplot.holoviz.org/) · Panel pane: [`pn.pane.HoloViews`](https://panel.holoviz.org/reference/panes/HoloViews.html)

```{.panel mode="editor" src="../assets/examples/hvplot-demo.py" code-visibility="collapsed" code-position="last"}
<panel-requirements>hvplot</panel-requirements>
```

### HoloViews

HoloViews overlay of `hv.Curve` and `hv.Scatter` with styling via `.opts()`. Rendered via the Bokeh backend and displayed with `pn.pane.HoloViews`.

Docs: [HoloViews](https://holoviews.org/) · Panel pane: [`pn.pane.HoloViews`](https://panel.holoviz.org/reference/panes/HoloViews.html)

```{.panel mode="editor" src="../assets/examples/holoviews-demo.py" code-visibility="collapsed" code-position="last"}
<panel-requirements>holoviews</panel-requirements>
```

### Colorcet

Browse perceptually uniform colormaps from the colorcet library. Uses `pn.widgets.Select` and `pn.widgets.IntSlider` to explore palettes interactively.

Docs: [Colorcet](https://colorcet.holoviz.org/)

```{.panel mode="editor" src="../assets/examples/colorcet-demo.py" code-visibility="collapsed" code-position="last"}
<panel-requirements>colorcet</panel-requirements>
```

## PyViz

### Altair Scatter Plot

Interactive scatter plot with color-coded categories using Altair's declarative grammar. Expression mode — returns the `chart` object as the last expression, no `.servable()` needed.

Docs: [Altair](https://altair-viz.github.io/) · Panel pane: [`pn.pane.Vega`](https://panel.holoviz.org/reference/panes/Vega.html)

```{.panel mode="editor" src="../assets/examples/altair-demo.py" label="Python" code-visibility="collapsed" code-position="last"}
<panel-requirements>altair</panel-requirements>
```

### Bokeh Stock Ticker

Simulated stock price history with moving average overlay. Demonstrates time series visualization with date formatting and legend.

Docs: [Bokeh](https://docs.bokeh.org/) · Panel pane: [`pn.pane.Bokeh`](https://panel.holoviz.org/reference/panes/Bokeh.html)

```{.panel mode="editor" src="../assets/examples/stock-ticker.py" code-visibility="collapsed" code-position="last"}
```

### DeckGL 3D Heatmap

3D hexagonal aggregation layer using `pn.pane.DeckGL` with a JSON spec. Loads point data from a URL and renders extruded hexagons over a dark basemap. Expression mode — returns the `deck_gl` pane as the last expression.

Docs: [deck.gl](https://deck.gl/) · Panel pane: [`pn.pane.DeckGL`](https://panel.holoviz.org/reference/panes/DeckGL.html)

!!! note
    This example may occasionally fail to render when loaded alongside many other examples on this page. If it does not display, try it in the [Playground](playground.md).

```{.panel mode="editor" src="../assets/examples/deckgl-demo.py" label="Python" code-visibility="collapsed" code-position="last"}
<panel-requirements>pydeck</panel-requirements>
```

### ECharts Bar Chart

Apache ECharts integration via `pn.pane.ECharts`. Demonstrates the Panel ECharts pane with a horizontal bar chart and data zoom.

Docs: [Apache ECharts](https://echarts.apache.org/) · Panel pane: [`pn.pane.ECharts`](https://panel.holoviz.org/reference/panes/ECharts.html)

```{.panel mode="editor" src="../assets/examples/echarts-demo.py" code-visibility="collapsed" code-position="last"}
```

### Matplotlib

Pure Python with no Panel imports. The last expression (`fig`) is rendered automatically — no `.servable()` needed.

Docs: [Matplotlib](https://matplotlib.org/) · Panel pane: [`pn.pane.Matplotlib`](https://panel.holoviz.org/reference/panes/Matplotlib.html)

```{.panel mode="editor" src="../assets/examples/matplotlib-demo.py" label="Python" code-visibility="collapsed" code-position="last"}
```

### Plotly Grouped Bar Chart

Interactive Plotly bar chart with a `RadioButtonGroup` to switch metrics. Demonstrates `pn.pane.Plotly` with reactive `pn.bind()`.

Docs: [Plotly](https://plotly.com/python/) · Panel pane: [`pn.pane.Plotly`](https://panel.holoviz.org/reference/panes/Plotly.html)

```{.panel mode="editor" src="../assets/examples/plotly-demo.py" code-visibility="collapsed" code-position="last"}
<panel-requirements>plotly</panel-requirements>
```

### Seaborn Violin Plot

Statistical visualization using Seaborn's `violinplot()`. Expression mode — returns `fig` as the last expression, no `.servable()` needed.

Docs: [Seaborn](https://seaborn.pydata.org/) · Panel pane: [`pn.pane.Matplotlib`](https://panel.holoviz.org/reference/panes/Matplotlib.html)

```{.panel mode="editor" src="../assets/examples/seaborn-demo.py" label="Python" code-visibility="collapsed" code-position="last"}
<panel-requirements>seaborn</panel-requirements>
```

## PyData

### xarray

Create an `xr.Dataset` with synthetic climate data on lat/lon/time coordinates. Expression mode — xarray's rich HTML representation renders automatically.

Docs: [xarray](https://docs.xarray.dev/)

```{.panel mode="editor" src="../assets/examples/xarray-demo.py" label="Python" code-visibility="collapsed" code-position="last"}
<panel-requirements>xarray</panel-requirements>
```

## Text

### LaTeX Renderer

Interactive LaTeX equation rendering using Panel's KaTeX integration. Enter any LaTeX equation and see it rendered live.

Docs: Panel pane: [`pn.pane.LaTeX`](https://panel.holoviz.org/reference/panes/LaTeX.html)

```{.panel mode="editor" src="../assets/examples/latex-demo.py" code-visibility="collapsed" code-position="last"}
```

## Loading External Data

### HTTP Requests

Standard `requests.get()` works in the Pyodide runtime — `pyodide-http` patches the `requests` package automatically. This example fetches the Iris CSV dataset from GitHub and displays it in a Tabulator table with species filtering.

```{.panel mode="editor" src="../assets/examples/requests-demo.py" code-visibility="collapsed" code-position="last"}
<panel-requirements>requests</panel-requirements>
```

### Read CSV from URL

`pd.read_csv("https://...")` works directly — no extra imports or setup needed. This example loads the Palmer Penguins dataset from GitHub and displays it in a Tabulator table.

```{.panel mode="editor" src="../assets/examples/read-csv-demo.py" code-visibility="collapsed" code-position="last"}
```

### Read Parquet from URL

Loads a Parquet file from a URL using `requests.get()` and `pd.read_parquet()` with the fastparquet engine. Unlike CSV, `pd.read_parquet(url)` does not work directly in Pyodide because `urllib` is not patched for HTTPS — the workaround is to fetch the bytes via `requests.get()` (patched by `pyodide-http`) and pass a `BytesIO` object. Uses the HoloViz wind turbines dataset. Note: fastparquet is ~5MB, so initial load takes slightly longer than CSV examples.

```{.panel mode="editor" src="../assets/examples/read-parquet-demo.py" code-visibility="collapsed" code-position="last"}
<panel-requirements>fastparquet requests</panel-requirements>
```

## Dashboards

### KPI Dashboard

Multi-indicator dashboard with styled number displays and trend arrows. Shows reactive updates via `pn.bind()` and custom HTML styling.

```{.panel mode="editor" src="../assets/examples/kpi-dashboard.py" code-visibility="collapsed" code-position="last"}
```

### Radar Chart

ECharts radar chart with configurable data points. Demonstrates more advanced ECharts configuration with Panel widgets.

```{.panel mode="editor" src="../assets/examples/radar-chart.py" code-visibility="collapsed" code-position="last"}
```

## Data Exploration

### Product Inventory Table

Tabulator table with filtering and sorting. Demonstrates `pn.widgets.Tabulator` for interactive data exploration.

```{.panel mode="editor" src="../assets/examples/product-inventory.py" code-visibility="collapsed" code-position="last"}
```

### Sales Dashboard

Multi-widget dashboard combining sliders, selectors, and a Tabulator table. Demonstrates cross-widget filtering with `pn.bind()`.

```{.panel mode="editor" src="../assets/examples/sales-dashboard.py" code-visibility="collapsed" code-position="last"}
```

### Data Explorer

Dynamic data exploration with column selection and aggregation. Demonstrates building a flexible data analysis tool with Panel.

```{.panel mode="editor" src="../assets/examples/data-explorer.py" code-visibility="collapsed" code-position="last"}
```

## Real-time

### Streaming Chart

Real-time data streaming with `pn.state.add_periodic_callback()`. Demonstrates live-updating chart and table with rollover buffer.

```{.panel mode="editor" src="../assets/examples/streaming-demo.py" code-visibility="collapsed" code-position="last"}
```

## Tools

### Color Palette Generator

Uses `pn.bind()` to reactively generate HTML from widget values. Demonstrates `RadioButtonGroup` and `ColorPicker`.

```{.panel mode="editor" src="../assets/examples/color-palette.py" code-visibility="collapsed" code-position="last"}
```

### Mini Calculator

Simple calculator using `FloatInput` widgets and a `Select` for the operator. Demonstrates `pn.bind()` with multiple widget inputs.

```{.panel mode="editor" src="../assets/examples/mini-calculator.py" code-visibility="collapsed" code-position="last"}
```

### Unit Converter

Temperature, length, and weight converter using `RadioButtonGroup` for category selection. Demonstrates dynamic widget updates with `pn.bind()`.

```{.panel mode="editor" src="../assets/examples/unit-converter.py" code-visibility="collapsed" code-position="last"}
```

### Markdown Preview

Live Markdown editor with real-time preview. Demonstrates `pn.pane.Markdown` with a `TextAreaInput` widget.

```{.panel mode="editor" src="../assets/examples/markdown-preview.py" code-visibility="collapsed" code-position="last"}
```

## Layouts

### Layout Showcase

Demonstrates Panel's layout system with `Tabs`, `Card`, `Row`, and `Column`. Shows how to organize widgets and outputs.

```{.panel mode="editor" src="../assets/examples/tabs-layout.py" code-visibility="collapsed" code-position="last"}
```

## Testing

### Print Output

`print()` statements produce visible output above the app. Useful for debugging and progress feedback.

```{.panel mode="editor" src="../assets/examples/print-demo.py" code-visibility="collapsed" code-position="last"}
```

### Exception Handling Test

This example deliberately raises an exception to verify that errors are displayed in the output section.

```{.panel mode="editor" src="../assets/examples/exception-test.py" label="Python" code-visibility="collapsed" code-position="last"}
```
