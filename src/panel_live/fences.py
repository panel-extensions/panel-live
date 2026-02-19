"""Custom pymdownx.superfences fence for panel-live code blocks in MkDocs.

Allows writing interactive Panel apps in markdown using fenced code blocks:

    ```panel
    import panel as pn
    pn.panel("Hello").servable()
    ```

or with attributes:

    ```{.panel mode="editor" theme="dark" height="500px"}
    import panel as pn
    pn.panel("Hello").servable()
    ```

Pre-rendering can be enabled via :func:`configure` so that Panel code is
executed at MkDocs build time and the output is embedded as static HTML.
"""

import logging
import re
from pathlib import Path

from pymdownx.superfences import default_validator
from pymdownx.superfences import fence_code_format

log = logging.getLogger("panel-live")

_CHILD_RE = re.compile(
    r"(<panel-(?:requirements|file|example)\b[^>]*>.*?</panel-(?:requirements|file|example)>)",
    re.DOTALL,
)

_REQ_RE = re.compile(
    r"<panel-requirements\b[^>]*>(.*?)</panel-requirements>",
    re.DOTALL,
)

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
        "pre-render",
    }
)

_DEFAULTS = {"auto-run": "false"}

_PRERENDER_CONF: dict = {
    "pre_render": False,
    "cache_dir": ".panel-live",
    "setup_code": "",
    "timeout": 120,
    "docs_dir": "docs",
}


def configure(*, pre_render=False, cache_dir=".panel-live", setup_code="", timeout=120, docs_dir="docs"):
    """Configure pre-rendering for the MkDocs fence formatter.

    Call this from a MkDocs hook (``on_startup`` or ``on_config``) to enable
    build-time pre-rendering of ``panel`` fenced code blocks.

    Parameters
    ----------
    pre_render : bool
        Enable pre-rendering (default ``False``).
    cache_dir : str
        Directory for the content-hash cache (default ``".panel-live"``).
    setup_code : str
        Python code prepended before every fence's code.
    timeout : int
        Maximum seconds to wait for each subprocess (default ``120``).
    docs_dir : str
        Path to the MkDocs docs directory (default ``"docs"``).
        Used to resolve ``src`` attribute paths for pre-rendering.
    """
    _PRERENDER_CONF["pre_render"] = pre_render
    _PRERENDER_CONF["cache_dir"] = cache_dir
    _PRERENDER_CONF["setup_code"] = setup_code
    _PRERENDER_CONF["timeout"] = timeout
    _PRERENDER_CONF["docs_dir"] = docs_dir


def _escape(text):
    """Escape HTML entities in *text*.

    Parameters
    ----------
    text : str
        Raw text that may contain ``&``, ``<``, or ``>`` characters.

    Returns
    -------
    str
        The text with ``&``, ``<``, and ``>`` replaced by their HTML entities.
    """
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def validator(language, inputs, options, attrs, md):
    """Parse fence attributes into *options* for the formatter.

    Called by ``pymdownx.superfences`` when a ``panel`` fence is encountered.
    Known attributes (see ``_KNOWN_ATTRS``) are popped from *inputs* and
    stored in *options* so that ``formatter`` can read them later.

    Parameters
    ----------
    language : str
        The fence language identifier (e.g. ``"panel"``).
    inputs : dict
        Raw key-value pairs parsed from the fence opening line.
        Known attributes are popped and moved into *options*.
    options : dict
        Mutable dict that carries validated options to the formatter.
    attrs : dict
        Additional attributes from ``pymdownx.superfences``.
    md : markdown.Markdown
        The Markdown processor instance.

    Returns
    -------
    bool
        ``True`` if the fence is valid and should be processed.
    """
    for key in _KNOWN_ATTRS:
        options[key] = inputs.pop(key, "")
    return default_validator(language, inputs, options, attrs, md)


def formatter(source, language, css_class, options, md, **kwargs):
    """Wrap *source* in a ``<panel-live>`` HTML element.

    Called by ``pymdownx.superfences`` after ``validator`` has run.
    Builds the ``<panel-live>`` tag with attributes from *options*
    and the fenced source code as escaped inner text.

    If ``mode="org"`` is set, delegates to the standard
    ``pymdownx.superfences.fence_code_format`` to render a plain
    syntax-highlighted code block instead of a ``<panel-live>`` element.

    Parameters
    ----------
    source : str
        The raw content inside the fenced code block.
    language : str
        The fence language identifier (e.g. ``"panel"``).
    css_class : str
        CSS class assigned by ``pymdownx.superfences`` (unused).
    options : dict
        Validated options produced by ``validator``.
    md : markdown.Markdown
        The Markdown processor instance.
    **kwargs
        Additional keyword arguments from ``pymdownx.superfences``.

    Returns
    -------
    str
        An HTML string containing a ``<panel-live>`` element, or a
        standard ``<pre><code>`` block when ``mode="org"``.
    """
    attrs = dict(_DEFAULTS)
    fence_prerender = None  # None = unset (use global)
    for key in _KNOWN_ATTRS:
        value = options.get(key, "")
        if key == "pre-render":
            if value:
                fence_prerender = value.lower() == "true"
            continue
        if value:
            attrs[key] = value

    if attrs.get("mode") == "org":
        kw = {"classes": kwargs.get("classes", []), "id_value": kwargs.get("id_value", ""), "attrs": kwargs.get("attrs", {})}
        return fence_code_format(source, "python", css_class, options, md, **kw)

    # Extract <panel-requirements> content and promote to data attribute
    # so it survives HTML sanitisation in static-site generators.
    req_match = _REQ_RE.search(source)
    if req_match:
        attrs["data-requirements"] = req_match.group(1).strip()

    # Strip all child elements from source, leaving only code
    code = _CHILD_RE.sub("", source)

    attr_str = "".join(f' {k}="{_escape(v)}"' for k, v in attrs.items())

    # Resolve src file for pre-rendering (code from external file)
    src_code = ""
    src_value = attrs.get("src", "")
    if src_value and not code.strip():
        # Skip absolute URLs (e.g. https://...)
        if src_value.startswith(("http://", "https://", "//")):
            log.debug("pre-render: skipping absolute URL src: %s", src_value)
        else:
            docs_dir = Path(_PRERENDER_CONF.get("docs_dir", "docs"))
            # src is a URL-relative path (e.g. "../assets/examples/hello.py").
            # Strip leading "../" and resolve relative to docs_dir.
            clean = src_value
            while clean.startswith("../"):
                clean = clean[3:]
            candidate = docs_dir / clean
            if candidate.exists():
                src_code = candidate.read_text(encoding="utf-8").strip()
            else:
                log.warning("pre-render: src file not found: %s (resolved to %s)", src_value, candidate)

    # Pre-render if enabled (per-fence overrides global)
    if fence_prerender is not None:
        should_prerender = fence_prerender
    else:
        should_prerender = _PRERENDER_CONF["pre_render"]
    pre_rendered_html = ""
    prerender_code = code.strip() or src_code
    if should_prerender and prerender_code:
        from panel_live.prerender import embed_script_tag
        from panel_live.prerender import pre_render

        output = pre_render(
            prerender_code,
            _PRERENDER_CONF["cache_dir"],
            setup_code=_PRERENDER_CONF["setup_code"],
            timeout=_PRERENDER_CONF["timeout"],
        )
        if output:
            pre_rendered_html = "\n" + embed_script_tag(output)

    if code.strip():
        return f"<panel-live{attr_str}>\n{_escape(code)}{pre_rendered_html}\n</panel-live>"
    return f"<panel-live{attr_str}>{pre_rendered_html}</panel-live>"


def prerender_formatter(source, language, css_class, options, md, **kwargs):
    """Wrap *source* in a ``<panel-live>`` element with pre-rendering forced on.

    Drop-in replacement for :func:`formatter` that always pre-renders,
    regardless of the global ``configure()`` setting.  Use this in your
    superfences configuration when you want **every** fence to be
    pre-rendered without needing a MkDocs hook::

        custom_fences = [
            {
                "name": "panel",
                "class": "panel-live",
                "validator": "panel_live.fences.validator",
                "format": "panel_live.fences.prerender_formatter",
            }
        ]

    Parameters
    ----------
    source, language, css_class, options, md, **kwargs
        Same as :func:`formatter`.

    Returns
    -------
    str
        An HTML string containing a ``<panel-live>`` element with
        pre-rendered output embedded.
    """
    old = _PRERENDER_CONF["pre_render"]
    _PRERENDER_CONF["pre_render"] = True
    try:
        return formatter(source, language, css_class, options, md, **kwargs)
    finally:
        _PRERENDER_CONF["pre_render"] = old
