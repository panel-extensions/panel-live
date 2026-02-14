"""UI tests for the panel-live docs site using Playwright."""

import subprocess
import time

import pytest

pytest.importorskip("playwright")

pytestmark = [pytest.mark.ui, pytest.mark.xdist_group("ui")]

SITE_DIR = "site"
SERVER_PORT = 8787
BASE_URL = f"http://localhost:{SERVER_PORT}"
# Pyodide takes a long time to initialize
PYODIDE_TIMEOUT = 180_000  # 3 minutes


@pytest.fixture(scope="module")
def docs_server():
    """Build docs and start a COOP/COEP server for the built site."""
    # Build the docs
    subprocess.run(["pixi", "run", "-e", "docs", "build"], check=True, capture_output=True)
    # Start the server serving the site/ directory
    proc = subprocess.Popen(
        [
            "python",
            "-c",
            "from functools import partial\n"
            "from http.server import HTTPServer, SimpleHTTPRequestHandler\n"
            "class H(SimpleHTTPRequestHandler):\n"
            "  def end_headers(self):\n"
            "    self.send_header('Cross-Origin-Opener-Policy','same-origin')\n"
            "    self.send_header('Cross-Origin-Embedder-Policy','credentialless')\n"
            "    super().end_headers()\n"
            f"HTTPServer(('',{SERVER_PORT}),partial(H,directory='{SITE_DIR}')).serve_forever()",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )
    time.sleep(1)  # Wait for server to start
    yield BASE_URL
    proc.terminate()
    proc.wait(timeout=5)


def test_examples_page_loads(page, docs_server):
    """Verify the examples page loads and contains panel-live elements."""
    page.goto(f"{docs_server}/examples/", timeout=30_000)
    # Page should contain panel-live elements
    elements = page.locator("panel-live")
    assert elements.count() > 0, "No <panel-live> elements found on examples page"


def test_hello_example_renders(page, docs_server):
    """Verify the hello example initializes Pyodide and renders output."""
    page.goto(f"{docs_server}/examples/", timeout=30_000)
    # Wait for the first panel-live output to have content (Pyodide must load)
    first_output = page.locator("panel-live .pl-output").first
    first_output.wait_for(state="attached", timeout=PYODIDE_TIMEOUT)
    # Wait for status to be hidden (meaning rendering is complete)
    first_status = page.locator("panel-live .pl-status").first
    first_status.wait_for(state="hidden", timeout=PYODIDE_TIMEOUT)
    # The output should have rendered content (not be empty)
    assert first_output.inner_html() != "", "First example output is empty after rendering"


def test_exception_example_shows_error(page, docs_server):
    """Verify the exception test example displays an error in the output."""
    page.goto(f"{docs_server}/examples/", timeout=30_000)
    # Wait for Pyodide to finish loading by checking the first example
    page.locator("panel-live .pl-status.hidden").first.wait_for(timeout=PYODIDE_TIMEOUT)
    # Find the exception-test panel-live element (last one on the page)
    error_panels = page.locator(".pl-error-panel")
    # Wait for at least one error panel to appear (from the exception test)
    error_panels.first.wait_for(state="attached", timeout=PYODIDE_TIMEOUT)
    assert error_panels.count() >= 1, "Exception test should display an error panel"


def test_playground_page_loads(page, docs_server):
    """Verify the standalone playground.html loads correctly."""
    page.goto(f"{docs_server}/playground.html", timeout=30_000)
    # Should contain a panel-live element
    pl = page.locator("panel-live")
    pl.wait_for(state="attached", timeout=10_000)
    assert pl.count() > 0, "playground.html should contain a <panel-live> element"


def test_api_explorer_page_loads(page, docs_server):
    """Verify the standalone api-explorer.html loads correctly."""
    page.goto(f"{docs_server}/api-explorer.html", timeout=30_000)
    # Should contain the explorer target panel-live element
    pl = page.locator("panel-live#explorer-target")
    pl.wait_for(state="attached", timeout=10_000)
    assert pl.count() > 0, "api-explorer.html should contain the explorer panel-live element"
