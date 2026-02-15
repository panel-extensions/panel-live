"""Command-line interface for panel-live utilities.

Usage::

    python -m panel_live pre-render CODE
    python -m panel_live pre-render --file script.py
    python -m panel_live pre-render CODE --cache-dir .cache --setup-code "import panel as pn" --timeout 60

The ``pre-render`` command executes Panel code and prints the resulting
Bokeh JSON to stdout.  Exit code 0 on success, 1 on failure.
"""

from __future__ import annotations

import argparse
import sys


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="panel_live", description="panel-live CLI utilities")
    sub = parser.add_subparsers(dest="command")

    pr = sub.add_parser("pre-render", help="Pre-render Panel code to Bokeh JSON")
    pr.add_argument("code", nargs="?", default=None, help="Python code to pre-render")
    pr.add_argument("--file", dest="file", default=None, help="Read code from a file instead of the positional argument")
    pr.add_argument("--cache-dir", dest="cache_dir", default=".panel-live", help="Cache directory (default: .panel-live)")
    pr.add_argument("--setup-code", dest="setup_code", default="", help="Setup code prepended before the main code")
    pr.add_argument("--timeout", type=int, default=120, help="Subprocess timeout in seconds (default: 120)")

    return parser


def main(argv: list[str] | None = None) -> int:
    """Entry point for ``python -m panel_live``."""
    parser = _build_parser()
    args = parser.parse_args(argv)

    if args.command is None:
        parser.print_help()
        return 1

    if args.command == "pre-render":
        return _cmd_pre_render(args)

    parser.print_help()
    return 1


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
