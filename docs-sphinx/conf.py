"""Sphinx configuration for testing the panel-live extension."""

project = "panel-live-sphinx-test"
extensions = ["panel_live.sphinx"]

# Use pydata-sphinx-theme if available, otherwise default
try:
    import pydata_sphinx_theme  # noqa: F401

    html_theme = "pydata_sphinx_theme"
except ImportError:
    pass

# Tell Sphinx to copy _static/ contents to the build output
html_static_path = ["_static"]

# panel-live configuration — demonstrates all options
panel_live_conf = {
    # Use 'panel-live' directive name (default)
    "directive_name": "panel-live",
    # Local assets (copied from dist/ by pixi task)
    "panel_live_js": "_static/panel-live.js",
    "panel_live_css": "_static/panel-live.css",
    # mini-coi.js for COOP/COEP headers (Pyodide SharedArrayBuffer)
    "mini_coi": True,
    # Runtime versions
    "pyodide_version": "v0.28.2",
    "panel_version": "1.8.7",
    "bokeh_version": "3.8.2",
    # Pre-render output at build time (Panel + Bokeh required)
    "pre_render": True,
    # Default mode for all directives
    "default_mode": "editor",
    # Don't auto-run Pyodide — show pre-rendered preview instead
    "default_auto_run": False,
}
