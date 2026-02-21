"""Smoke tests for the PanelLive showcase app using Playwright."""

import subprocess
import time

import pytest

pytest.importorskip("playwright")

pytestmark = [pytest.mark.ui, pytest.mark.xdist_group("ui")]

SHOWCASE_PORT = 5018
BASE_URL = f"http://localhost:{SHOWCASE_PORT}"
PAGE_TIMEOUT = 30_000

ACCORDION_SECTIONS = [
    "1. Editor Mode",
    "2. App Mode",
    "3. Progress Mode",
    "4. Progress Mode",
    "5. Debug Mode",
    "6. Playground Mode",
    "7. Headless Mode",
    "8. Server RPC",
    "9. Server\u2192Client Reactive Push",
    "10. Server\u2192Client Periodic Push",
    "11. Client\u2192Server Data",
]


@pytest.fixture(scope="module")
def panel_serve():
    """Launch ``panel-live serve`` as a subprocess for the showcase app."""
    proc = subprocess.Popen(
        ["panel-live", "serve", "--port", str(SHOWCASE_PORT)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    # Wait for server to start
    time.sleep(5)
    yield BASE_URL
    proc.terminate()
    proc.wait(timeout=10)


def test_showcase_page_loads(page, panel_serve):
    """Verify the showcase page loads without JS errors."""
    errors = []
    page.on("pageerror", lambda err: errors.append(str(err)))
    page.goto(panel_serve, timeout=PAGE_TIMEOUT)
    page.wait_for_load_state("networkidle", timeout=PAGE_TIMEOUT)
    # Filter out known non-critical errors (COOP/COEP warnings etc.)
    critical_errors = [e for e in errors if "SharedArrayBuffer" not in e]
    assert len(critical_errors) == 0, f"JS errors on page: {critical_errors}"


def test_showcase_has_all_sections(page, panel_serve):
    """Verify all 11 accordion section headers are present."""
    page.goto(panel_serve, timeout=PAGE_TIMEOUT)
    page.wait_for_load_state("networkidle", timeout=PAGE_TIMEOUT)
    content = page.content()
    for section in ACCORDION_SECTIONS:
        assert section in content, f"Missing accordion section: {section}"


def test_showcase_has_logo_bar(page, panel_serve):
    """Verify the logo bar with Panel and Pyodide logos is present."""
    page.goto(panel_serve, timeout=PAGE_TIMEOUT)
    page.wait_for_load_state("networkidle", timeout=PAGE_TIMEOUT)
    # Check for logo images
    logos = page.locator("img[alt='Panel'], img[alt='Pyodide']")
    assert logos.count() >= 2, f"Expected 2 logos, found {logos.count()}"


def test_editor_mode_has_panel_live_element(page, panel_serve):
    """Verify the first accordion section contains a <panel-live> element."""
    page.goto(panel_serve, timeout=PAGE_TIMEOUT)
    page.wait_for_load_state("networkidle", timeout=PAGE_TIMEOUT)
    # panel-live elements should be present in the DOM
    pl_elements = page.locator("panel-live")
    assert pl_elements.count() > 0, "No <panel-live> elements found on showcase page"
