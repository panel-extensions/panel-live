"""Command-line interface for panel-live utilities.

Usage::

    panel-live serve --port 5008
    panel-live pre-render CODE
    panel-live pre-render --file script.py
    panel-live pre-render CODE --cache-dir .cache --setup-code "import panel as pn" --timeout 60

The ``serve`` command starts a Panel server with the showcase example app,
demonstrating all PanelLive display modes.

The ``pre-render`` command executes Panel code and prints the resulting
Bokeh JSON to stdout.  Exit code 0 on success, 1 on failure.
"""

from __future__ import annotations

import argparse
import sys


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="panel-live", description="panel-live CLI utilities")
    sub = parser.add_subparsers(dest="command")

    # --- serve ---
    srv = sub.add_parser("serve", help="Serve the PanelLive showcase example app")
    srv.add_argument("--port", type=int, default=5008, help="Port to serve on (default: 5008)")

    # --- pre-render ---
    pr = sub.add_parser("pre-render", help="Pre-render Panel code to Bokeh JSON")
    pr.add_argument("code", nargs="?", default=None, help="Python code to pre-render")
    pr.add_argument("--file", dest="file", default=None, help="Read code from a file instead of the positional argument")
    pr.add_argument("--cache-dir", dest="cache_dir", default=".panel-live", help="Cache directory (default: .panel-live)")
    pr.add_argument("--setup-code", dest="setup_code", default="", help="Setup code prepended before the main code")
    pr.add_argument("--timeout", type=int, default=120, help="Subprocess timeout in seconds (default: 120)")

    return parser


def main(argv: list[str] | None = None) -> int:
    """Entry point for ``python -m panel_live`` and ``panel-live`` CLI."""
    parser = _build_parser()
    args = parser.parse_args(argv)

    if args.command is None:
        parser.print_help()
        return 1

    if args.command == "serve":
        return _cmd_serve(args)

    if args.command == "pre-render":
        return _cmd_pre_render(args)

    parser.print_help()
    return 1


def _cmd_serve(args: argparse.Namespace) -> int:
    import pathlib

    import panel as pn

    showcase_path = pathlib.Path(__file__).parent / "examples" / "showcase.py"
    if not showcase_path.exists():
        print(f"Error: showcase app not found at {showcase_path}", file=sys.stderr)
        return 1

    # Find the panel-live JS/CSS assets to serve as static files.
    # Fallback order: dist/ (repo dev) → in-package static/ (pip install) → CDN
    # Each candidate must contain panel-live.js to be accepted.
    pkg_dir = pathlib.Path(__file__).parent
    static_dir = None
    for candidate in [
        pkg_dir.parent.parent / "dist",
        pkg_dir / "static",
    ]:
        if (candidate / "panel-live.js").exists():
            static_dir = candidate
            break

    # Serve docs/ folder for local assets (logo, etc.)
    docs_dir = pkg_dir.parent.parent / "docs"

    static_dirs = {}
    if static_dir:
        static_dirs["pl"] = str(static_dir)
    if docs_dir.exists():
        static_dirs["docs"] = str(docs_dir)

    print(f"Serving PanelLive showcase on http://localhost:{args.port}")
    print(f"  App: {showcase_path}")
    if static_dir:
        print(f"  Assets: {static_dir}")
    else:
        print("  Assets: CDN (no local JS found)")
    print()

    pn.serve(
        {"/": str(showcase_path)},
        port=args.port,
        show=True,
        static_dirs=static_dirs,
    )
    return 0


def _cmd_pre_render(args: argparse.Namespace) -> int:
    code = args.code
    if args.file:
        try:
            with open(args.file, encoding="utf-8") as f:
                code = f.read()
        except OSError as exc:
            print(f"Error reading file: {exc}", file=sys.stderr)
            return 1

    if not code:
        print("Error: no code provided (use positional argument or --file)", file=sys.stderr)
        return 1

    from panel_live.prerender import pre_render

    result = pre_render(code, args.cache_dir, setup_code=args.setup_code, timeout=args.timeout)
    if result is None:
        print("Pre-rendering failed or produced no output.", file=sys.stderr)
        return 1

    print(result)
    return 0
