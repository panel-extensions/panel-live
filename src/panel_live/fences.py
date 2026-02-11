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

from pymdownx.superfences import default_validator

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
        An HTML string containing a ``<panel-live>`` element.
    """
    attrs = dict(_DEFAULTS)
    for key in _KNOWN_ATTRS:
        value = options.get(key, "")
        if value:
            attrs[key] = value

    attr_str = "".join(f' {k}="{_escape(v)}"' for k, v in attrs.items())
    if source.strip():
        return f"<panel-live{attr_str}>\n{_escape(source)}\n</panel-live>"
    return f"<panel-live{attr_str}></panel-live>"
