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
"""

import re

from pymdownx.superfences import default_validator
from pymdownx.superfences import fence_code_format

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
    }
)

_DEFAULTS = {}


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
    for key in _KNOWN_ATTRS:
        value = options.get(key, "")
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
    if code.strip():
        return f"<panel-live{attr_str}>\n{_escape(code)}\n</panel-live>"
    return f"<panel-live{attr_str}></panel-live>"
