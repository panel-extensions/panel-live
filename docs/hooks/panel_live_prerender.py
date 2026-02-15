"""MkDocs hook that enables panel-live pre-rendering at build time.

Add this hook to your ``mkdocs.yml`` (or ``zensical.toml``)::

    hooks:
      - docs/hooks/panel_live_prerender.py

The hook calls :func:`panel_live.fences.configure` during the ``on_config``
event so that every ``panel`` fenced code block is executed at build time and
the output is embedded as static HTML inside the ``<panel-live>`` element.
"""

from panel_live.fences import configure


def on_config(config):
    """Enable pre-rendering when MkDocs loads its configuration."""
    configure(
        pre_render=True,
        cache_dir=".panel-live",
        setup_code="",
        timeout=120,
    )
    return config
