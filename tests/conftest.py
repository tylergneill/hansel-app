import os
import urllib.request
import urllib.error

import pytest
from playwright.sync_api import sync_playwright, Playwright

BASE_URL = os.environ.get("HANSEL_TEST_URL", "http://localhost:5031")
HEADED = os.environ.get("HEADED", "").lower() in ("1", "true", "yes")
SLOW_MO = int(os.environ.get("SLOW_MO", "0"))  # milliseconds between actions

# Texts available in dummy data (and in full Docker mount)
DUMMY_TEXTS = [
    "bANa_kAdambarI",
    "kumArilabhaTTa_zlokavArtika",
    "zukasaptati_o",
    "zukasaptati_s",
]

# --------------------------------------------------------------------------- #
# Browser × device matrix
# --------------------------------------------------------------------------- #

MATRIX = [
    # Desktop — Chrome on macOS (baseline)
    ("chromium", "chrome-macos", {}),
    # Desktop — Edge on Windows (same Chromium engine; viewport + UA emulation)
    ("chromium", "edge-windows", {
        "user_agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0"
        ),
        "viewport": {"width": 1920, "height": 1080},
    }),
    # Mobile — Safari on iPhone (WebKit engine)
    ("webkit", "safari-ios", "iPhone 13"),
    # Mobile — Chrome on iPhone (WebKit under the hood on iOS)
    ("webkit", "chrome-ios", "iPhone 13"),
    # Mobile — Firefox on Android (Gecko engine)
    # Note: Firefox doesn't support isMobile, so we use a plain viewport dict
    # instead of the "Pixel 5" device preset.
    ("firefox", "firefox-android", {
        "user_agent": (
            "Mozilla/5.0 (Linux; Android 12; Pixel 5) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Mobile Safari/537.36"
        ),
        "viewport": {"width": 393, "height": 851},
    }),
]


def _server_is_reachable():
    try:
        urllib.request.urlopen(BASE_URL, timeout=5)
        return True
    except (urllib.error.URLError, OSError):
        return False


def pytest_configure(config):
    config.addinivalue_line("markers", "browser_context_args: internal marker for browser matrix")
    config.addinivalue_line("markers", "visual: tests that benefit from headed/slow-mo mode")


@pytest.fixture(scope="session", autouse=True)
def check_server():
    """Fail fast if the app server is not running."""
    if not _server_is_reachable():
        pytest.exit(
            f"Server not reachable at {BASE_URL}. "
            "Start it with `cd hansel-app && make run` before running tests.",
            returncode=1,
        )


@pytest.fixture(scope="session")
def playwright_instance():
    with sync_playwright() as p:
        yield p


@pytest.fixture(scope="session")
def _browsers_headless(playwright_instance):
    """Headless browsers — used by non-visual tests (always)."""
    launched = {}
    for engine in ("chromium", "firefox", "webkit"):
        browser_type = getattr(playwright_instance, engine)
        launched[engine] = browser_type.launch(headless=True)
    yield launched
    for b in launched.values():
        b.close()


@pytest.fixture(scope="session")
def _browsers_headed(playwright_instance):
    """Headed browsers — only launched when HEADED=1 is set."""
    if not HEADED:
        yield None
        return
    launch_kwargs = {"headless": False}
    if SLOW_MO:
        launch_kwargs["slow_mo"] = SLOW_MO
    launched = {}
    for engine in ("chromium", "firefox", "webkit"):
        browser_type = getattr(playwright_instance, engine)
        launched[engine] = browser_type.launch(**launch_kwargs)
    yield launched
    for b in launched.values():
        b.close()


def _resolve_context_kwargs(playwright_instance, entry):
    """Turn a MATRIX entry into (browser_type_name, dict_of_context_kwargs)."""
    engine, _label, device_or_kwargs = entry
    if isinstance(device_or_kwargs, str):
        return engine, {**playwright_instance.devices[device_or_kwargs]}
    return engine, device_or_kwargs


def pytest_generate_tests(metafunc):
    """Parametrize every test that uses the `page` fixture across the browser matrix."""
    if "page" in metafunc.fixturenames:
        ids = [entry[1] for entry in MATRIX]
        metafunc.parametrize(
            "_matrix_entry",
            MATRIX,
            ids=ids,
            indirect=True,
            scope="function",
        )


@pytest.fixture
def _matrix_entry(request):
    """Indirect fixture — just passes through the MATRIX tuple."""
    return request.param


@pytest.fixture
def page(request, _matrix_entry, _browsers_headless, _browsers_headed, playwright_instance):
    # Use headed browser if HEADED=1 and this test is marked @pytest.mark.visual
    is_visual = request.node.get_closest_marker("visual") is not None
    use_headed = HEADED and is_visual and _browsers_headed is not None

    browsers = _browsers_headed if use_headed else _browsers_headless
    engine, ctx_kwargs = _resolve_context_kwargs(playwright_instance, _matrix_entry)
    browser = browsers[engine]
    context = browser.new_context(**ctx_kwargs)
    pg = context.new_page()
    # WebKit mobile emulation is slower; give it more time for navigation.
    if engine == "webkit" and ctx_kwargs.get("is_mobile"):
        pg.set_default_navigation_timeout(60_000)
        pg.set_default_timeout(60_000)
    yield pg
    pg.close()
    context.close()


@pytest.fixture
def base_url():
    return BASE_URL
