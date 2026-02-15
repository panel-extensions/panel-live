"""Accessible imports for the panel_live package."""

import importlib.metadata
import warnings

try:
    __version__ = importlib.metadata.version(__name__)
except importlib.metadata.PackageNotFoundError as e:  # pragma: no cover
    warnings.warn(f"Could not determine version of {__name__}\n{e!s}", stacklevel=2)
    __version__ = "unknown"

from panel_live.prerender import content_hash
from panel_live.prerender import pre_render

__all__: list[str] = [
    "__version__",
    "content_hash",
    "pre_render",
]
