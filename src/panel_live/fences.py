"""Custom pymdownx.superfences fence for panel-live code blocks.

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
    }
)

_DEFAULTS = {
    "mode": "editor",
    "code-position": "last",
}


def _escape(text):
    """Escape HTML entities in *text*."""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def validator(language, inputs, options, attrs, md):
    """Parse fence attributes into *options* for the formatter."""
    for key in _KNOWN_ATTRS:
        options[key] = inputs.pop(key, "")
    return default_validator(language, inputs, options, attrs, md)


def formatter(source, language, css_class, options, md, **kwargs):
    """Wrap *source* in a ``<panel-live>`` element."""
    attrs = dict(_DEFAULTS)
    for key in _KNOWN_ATTRS:
        value = options.get(key, "")
        if value:
            attrs[key] = value

    attr_str = "".join(f' {k}="{_escape(v)}"' for k, v in attrs.items())
    return f"<panel-live{attr_str}>\n{_escape(source)}\n</panel-live>"
