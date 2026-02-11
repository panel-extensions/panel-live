"""
Minimal HTTP server with Cross-Origin Isolation headers.

These headers enable SharedArrayBuffer, which Pyodide needs for efficient
WASM memory management. Without them, Pyodide uses a fallback that roughly
doubles memory usage, often causing STATUS_ACCESS_VIOLATION crashes.

Usage:
    python serve.py [port]
    # Default: http://localhost:8080
"""

import sys
from functools import partial
from http.server import HTTPServer
from http.server import SimpleHTTPRequestHandler


class COOPCOEPHandler(SimpleHTTPRequestHandler):
    """HTTP request handler with COOP and COEP headers.

    Args:
        SimpleHTTPRequestHandler (_type_): _description_
    """

    def end_headers(self):
        """Add COOP and COEP headers to enable cross-origin isolation."""
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "credentialless")
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
HTTPServer(("", port), partial(COOPCOEPHandler, directory=".")).serve_forever()
