"""Sphinx extension for embedding interactive Panel apps via ``<panel-live>``.

Registers a configurable RST directive (default ``panel-live``, switchable
to ``pyodide`` or ``python``) that transforms directive content into
``<panel-live>`` HTML elements.  Injects the panel-live JS/CSS and a
``window.PANEL_LIVE_CONFIG`` script into every page that uses the directive.

Optionally pre-renders Panel output at build time using a subprocess,
aligned with the pattern in ``nbsite.pyodide``.

Configuration
-------------
In ``conf.py``::

    extensions = ["panel_live.sphinx"]

    panel_live_conf = {
        "directive_name": "panel-live",      # or "pyodide", "python"
        "panel_live_js": "https://cdn.jsdelivr.net/npm/@panel-extensions/panel-live@latest/dist/panel-live.js",
        "panel_live_css": "https://cdn.jsdelivr.net/npm/@panel-extensions/panel-live@latest/dist/panel-live.css",
        "mini_coi": True,                    # inject mini-coi.js for SharedArrayBuffer
        "pyodide_version": "v0.28.2",
        "panel_version": "1.8.7",
        "bokeh_version": "3.8.2",
        "panel_cdn": "https://cdn.holoviz.org/panel/",
        "bokeh_cdn": "https://cdn.bokeh.org/bokeh/release/",
        "requirements": ["panel"],
        "requires": {},
        "setup_code": "",
        "pre_render": True,
        "default_mode": "editor",
    }

Asset loading
-------------
``panel_live_js`` and ``panel_live_css`` accept either absolute URLs
(``https://...``) or Sphinx-relative ``_static/`` paths (e.g.
``_static/panel-live.js``).  For local development, copy the built JS/CSS
into your project's ``_static/`` directory and use local paths.

``mini_coi`` (default ``True``) copies a bundled ``mini-coi.js`` service
worker to the build root for COOP/COEP headers needed by Pyodide.
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any
from typing import ClassVar

from docutils import nodes
from docutils.parsers.rst import Directive
from docutils.parsers.rst import directives
from sphinx.application import Sphinx

from panel_live.prerender import content_hash
from panel_live.prerender import embed_script_tag
from panel_live.prerender import pre_render

# Backward-compat aliases for existing imports
_content_hash = content_hash

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------

_DEFAULTS: dict[str, Any] = {
    "directive_name": "panel-live",
    "panel_live_js": "https://cdn.jsdelivr.net/npm/@panel-extensions/panel-live@latest/dist/panel-live.js",
    "panel_live_css": "https://cdn.jsdelivr.net/npm/@panel-extensions/panel-live@latest/dist/panel-live.css",
    "mini_coi": True,
    "pyodide_version": "v0.28.2",
    "panel_version": "1.8.7",
    "bokeh_version": "3.8.2",
    "panel_cdn": "https://cdn.holoviz.org/panel/",
    "bokeh_cdn": "https://cdn.bokeh.org/bokeh/release/",
    "requirements": ["panel"],
    "requires": {},
    "setup_code": "",
    "pre_render": True,
    "default_mode": "editor",
}

# Path to the bundled static assets directory
_STATIC_DIR = Path(__file__).parent / "static"

# Known HTML attributes for <panel-live>
_KNOWN_ATTRS = frozenset(
    {
        "mode",
        "theme",
        "height",
        "layout",
        "auto-run",
        "label",
        "code-visibility",
        "code-position",
        "src",
    }
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _escape(text: str) -> str:
    """Escape HTML entities."""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _get_conf(app: Sphinx) -> dict[str, Any]:
    """Merge user config with defaults."""
    user = getattr(app.config, "panel_live_conf", {}) or {}
    merged = dict(_DEFAULTS)
    merged.update(user)
    return merged


# ---------------------------------------------------------------------------
# Directive
# ---------------------------------------------------------------------------


class PanelLiveDirective(Directive):
    """RST directive that produces ``<panel-live>`` HTML elements.

    Options map to HTML attributes on the ``<panel-live>`` element.
    """

    has_content = True
    required_arguments = 0
    optional_arguments = 0

    option_spec: ClassVar[dict[str, Any]] = {
        "mode": directives.unchanged,
        "theme": directives.unchanged,
        "height": directives.unchanged,
        "layout": directives.unchanged,
        "auto-run": directives.unchanged,
        "label": directives.unchanged,
        "code-visibility": directives.unchanged,
        "code-position": directives.unchanged,
        "requirements": directives.unchanged,
        "pre-render": directives.unchanged,
    }

    def run(self):
        """Parse directive options and return a raw HTML node."""
        conf = _get_conf(self.state.document.settings.env.app)
        code = "\n".join(self.content)

        # Build HTML attributes
        attrs: dict[str, str] = {}
        for key in _KNOWN_ATTRS:
            value = self.options.get(key, "")
            if value:
                attrs[key] = value

        # Apply default mode
        if "mode" not in attrs and conf.get("default_mode"):
            attrs["mode"] = conf["default_mode"]

        # Handle requirements
        requirements = self.options.get("requirements", "")
        if requirements:
            attrs["data-requirements"] = requirements

        # Build attribute string
        attr_str = "".join(f' {k}="{_escape(v)}"' for k, v in attrs.items())

        # Pre-render if enabled (per-directive overrides global)
        pre_rendered_html = ""
        pre_render_opt = self.options.get("pre-render", "").lower()
        if pre_render_opt == "true":
            should_prerender = True
        elif pre_render_opt == "false":
            should_prerender = False
        else:
            should_prerender = conf.get("pre_render", False)
        if should_prerender and code.strip():
            cache_dir = Path(self.state.document.settings.env.app.srcdir) / ".panel-live"
            output = pre_render(code, cache_dir, setup_code=conf.get("setup_code", ""))
            if output:
                pre_rendered_html = "\n" + embed_script_tag(output)

        # Build the element
        escaped_code = _escape(code)
        if escaped_code.strip():
            html = f"<panel-live{attr_str}>\n{escaped_code}{pre_rendered_html}\n</panel-live>"
        else:
            html = f"<panel-live{attr_str}>{pre_rendered_html}</panel-live>"

        # Mark page as needing panel-live assets
        env = self.state.document.settings.env
        if not hasattr(env, "panel_live_pages"):
            env.panel_live_pages = set()
        env.panel_live_pages.add(env.docname)

        node = nodes.raw("", html, format="html")
        return [node]


# ---------------------------------------------------------------------------
# Sphinx event hooks
# ---------------------------------------------------------------------------


def _init_conf(app: Sphinx) -> None:
    """Merge user config with defaults on ``builder-inited``."""
    conf = _get_conf(app)
    # Store merged config back
    app.config.panel_live_conf = conf


def _resolve_url(url: str, pagename: str, context: dict) -> str:
    """Resolve a URL — absolute URLs pass through, relative paths use pathto."""
    if url.startswith(("http://", "https://", "//")):
        return url
    # Use Sphinx's pathto to get correct relative path from current page
    pathto = context.get("pathto")
    if pathto:
        return pathto(url, 1)
    # Fallback: calculate relative root manually
    depth = pagename.count("/")
    return ("../" * depth) + url


def _inject_page_assets(
    app: Sphinx,
    pagename: str,
    templatename: str,
    context: dict,
    doctree: Any,
) -> None:
    """Inject panel-live JS/CSS into pages that use the directive.

    Connected to ``html-page-context``.
    """
    env = app.env
    pages = getattr(env, "panel_live_pages", set())
    if pagename not in pages:
        return

    conf = _get_conf(app)

    js_url = _resolve_url(conf["panel_live_js"], pagename, context)
    css_url = _resolve_url(conf["panel_live_css"], pagename, context)

    # Build PANEL_LIVE_CONFIG script
    config_obj: dict[str, Any] = {}
    if conf.get("pyodide_version"):
        config_obj["pyodideVersion"] = conf["pyodide_version"]
    if conf.get("panel_version"):
        config_obj["panelVersion"] = conf["panel_version"]
    if conf.get("bokeh_version"):
        config_obj["bokehVersion"] = conf["bokeh_version"]
    if conf.get("panel_cdn"):
        config_obj["panelCdn"] = conf["panel_cdn"]
    if conf.get("bokeh_cdn"):
        config_obj["bokehCdn"] = conf["bokeh_cdn"]
    if conf.get("requirements"):
        config_obj["requirements"] = conf["requirements"]

    config_script = ""
    if config_obj:
        config_json = json.dumps(config_obj)
        config_script = f"<script>window.PANEL_LIVE_CONFIG = {config_json};</script>\n"

    # mini-coi.js for COOP/COEP headers (Pyodide SharedArrayBuffer)
    mini_coi_html = ""
    if conf.get("mini_coi", True):
        # mini-coi.js is copied to the build root (not _static/) so the
        # service worker scope covers the entire site
        depth = pagename.count("/")
        mini_coi_url = ("../" * depth) + "mini-coi.js"
        mini_coi_html = f'<script src="{mini_coi_url}" type="module"></script>\n'

    # Inject into page via metatags (Sphinx mechanism for adding to <head>)
    metatags = context.get("metatags", "")
    injection = f"{mini_coi_html}" f"{config_script}" f'<link rel="stylesheet" href="{css_url}">\n' f'<script src="{js_url}"></script>\n'
    context["metatags"] = metatags + injection


def _build_finished(app: Sphinx, exception: Exception | None) -> None:
    """Copy mini-coi.js to build root on ``build-finished``.

    mini-coi.js must be at the site root (not ``_static/``) so the service
    worker scope covers the entire site.
    """
    if exception:
        return

    conf = _get_conf(app)
    if not conf.get("mini_coi", True):
        return

    # Only copy if at least one page uses the directive
    pages = getattr(app.env, "panel_live_pages", set())
    if not pages:
        return

    src = _STATIC_DIR / "mini-coi.js"
    if not src.exists():
        return

    dst = Path(app.outdir) / "mini-coi.js"
    shutil.copy2(src, dst)


# ---------------------------------------------------------------------------
# Extension setup
# ---------------------------------------------------------------------------


def setup(app: Sphinx) -> dict[str, Any]:
    """Register the panel-live Sphinx extension.

    Parameters
    ----------
    app : Sphinx
        The Sphinx application instance.

    Returns
    -------
    dict
        Extension metadata.
    """
    app.add_config_value("panel_live_conf", {}, "html")

    # Determine directive name from config (available at setup time via conf.py globals)
    # We need to read it from conf.py directly since Sphinx config isn't fully
    # initialized yet during setup(). Use the raw conf.py dict.
    raw_conf = {}
    conf_file = Path(app.confdir) / "conf.py"
    if conf_file.exists():
        ns: dict[str, Any] = {}
        exec(compile(conf_file.read_text(encoding="utf-8"), str(conf_file), "exec"), ns)  # noqa: S102
        raw_conf = ns.get("panel_live_conf", {})

    directive_name = raw_conf.get("directive_name", _DEFAULTS["directive_name"])
    app.add_directive(directive_name, PanelLiveDirective)

    app.connect("builder-inited", _init_conf)
    app.connect("html-page-context", _inject_page_assets)
    app.connect("build-finished", _build_finished)

    return {
        "version": "0.1.0",
        "parallel_read_safe": True,
        "parallel_write_safe": True,
    }
