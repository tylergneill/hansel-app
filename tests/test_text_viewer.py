"""Rich text viewer interactive tests.

Each toggle test verifies that the DOM actually changes in the expected way,
not just that elements exist or are clickable.

bANa_kAdambarI is the primary test text because it has location markers,
line breaks, corrections, and verses — exercising every toggle.
kumArilabhaTTa_zlokavArtika is used for verse-specific tests (condensed-verse-format).
"""

import pytest

from tests.conftest import DUMMY_TEXTS, SLOW_MO

# bANa has: location markers, line breaks, corrections, verses, TOC
STANDARD_TEXT = "bANa_kAdambarI"
# ślokavārttika has: verses (condensed-verse-format), no location markers
VERSE_TEXT = "kumArilabhaTTa_zlokavArtika"

# In headed mode, pause long enough to see each state before moving on.
# In headless mode, just the minimum needed for DOM updates.
_PAUSE = max(SLOW_MO, 100)


def _open_viewer(page, base_url, stem):
    """Navigate to a rich text viewer page and wait for JS to initialize."""
    page.goto(f"{base_url}/texts/transforms/html/rich/{stem}.html")
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_timeout(_PAUSE)


def _open_toggles_panel(page):
    """Open the toggles widget panel."""
    page.locator("#toggles-widget-icon").click()
    page.wait_for_timeout(_PAUSE)


def _click_toggle(page, onchange_fn):
    """Click a toggle checkbox by its onchange handler name.
    Uses JS dispatch because the toggles panel may not be fully scrollable
    into the Playwright viewport. Pauses after so you can see the result."""
    page.evaluate(f"""(() => {{
        const cb = document.querySelector('input[onchange="{onchange_fn}(this)"]');
        cb.checked = !cb.checked;
        cb.dispatchEvent(new Event('change'));
    }})()""")
    page.wait_for_timeout(_PAUSE)


def _computed_display(page, selector):
    """Return the computed display value of the first matching element."""
    return page.evaluate(
        f"getComputedStyle(document.querySelector('{selector}')).display"
    )


# --------------------------------------------------------------------------- #
# Page load
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize("stem", DUMMY_TEXTS)
def test_rich_html_loads(page, base_url, stem):
    response = page.goto(f"{base_url}/texts/transforms/html/rich/{stem}.html")
    assert response.status == 200
    assert page.title().startswith("HANSEL")


@pytest.mark.parametrize("stem", DUMMY_TEXTS)
def test_content_div_has_text(page, base_url, stem):
    """The #content div should contain actual text content, not be empty."""
    _open_viewer(page, base_url, stem)
    text = page.locator("#content").text_content()
    assert len(text.strip()) > 100, "Content should have substantial text"


# --------------------------------------------------------------------------- #
# Toggle: Page- & Line-break Info (show-breaks)
# --------------------------------------------------------------------------- #

@pytest.mark.visual
def test_toggle_breaks_shows_labels(page, base_url):
    """Toggling 'Page- & Line-break Info' makes .pb-label and .lb-label visible."""
    _open_viewer(page, base_url, STANDARD_TEXT)

    # Before toggle: break labels are hidden
    assert _computed_display(page, ".pb-label") == "none"
    assert _computed_display(page, ".lb-label") == "none"

    # Toggle on
    _open_toggles_panel(page)
    _click_toggle(page, "toggleBreaks")

    # After toggle: break labels are visible
    assert _computed_display(page, ".pb-label") == "inline"
    assert _computed_display(page, ".lb-label") == "inline"

    # Toggle off: labels hidden again
    _click_toggle(page, "toggleBreaks")
    assert _computed_display(page, ".pb-label") == "none"


# --------------------------------------------------------------------------- #
# Toggle: Line-by-line / Paragraphs (show-line-breaks)
# --------------------------------------------------------------------------- #

@pytest.mark.visual
def test_toggle_line_breaks_shows_breaks(page, base_url):
    """Toggling line-by-line makes .lb-br elements visible (display: block)."""
    _open_viewer(page, base_url, STANDARD_TEXT)

    # Before: line break elements hidden
    assert _computed_display(page, ".lb-br") == "none"

    # Toggle on
    _open_toggles_panel(page)
    _click_toggle(page, "toggleLineBreaks")

    # After: line break elements visible
    assert _computed_display(page, ".lb-br") == "block"

    # Toggle off
    _click_toggle(page, "toggleLineBreaks")
    assert _computed_display(page, ".lb-br") == "none"


# --------------------------------------------------------------------------- #
# Toggle: Location Info (hide-editorial-coords)
# --------------------------------------------------------------------------- #

@pytest.mark.visual
def test_toggle_editorial_coords(page, base_url):
    """Toggling 'Location Info' shows/hides .editorial-coord elements.
    #content starts with hide-editorial-coords class, so markers are hidden by default."""
    _open_viewer(page, base_url, STANDARD_TEXT)

    # Default: #content has hide-editorial-coords, so markers are hidden
    assert _computed_display(page, ".editorial-coord") == "none"
    has_class = page.evaluate(
        "document.getElementById('content').classList.contains('hide-editorial-coords')"
    )
    assert has_class is True

    # Toggle on: removes hide-editorial-coords, markers become visible
    _open_toggles_panel(page)
    _click_toggle(page, "toggleEditorialCoords")

    assert _computed_display(page, ".editorial-coord") != "none"
    has_class = page.evaluate(
        "document.getElementById('content').classList.contains('hide-editorial-coords')"
    )
    assert has_class is False

    # Toggle off: hides them again
    _click_toggle(page, "toggleEditorialCoords")
    assert _computed_display(page, ".editorial-coord") == "none"


# --------------------------------------------------------------------------- #
# Toggle: Corrections
# --------------------------------------------------------------------------- #

@pytest.mark.visual
def test_toggle_corrections(page, base_url):
    """Toggling corrections swaps ante-correction (visible) → post-correction (visible)."""
    _open_viewer(page, base_url, STANDARD_TEXT)

    # Default state: ante-correction visible, post-correction hidden
    assert _computed_display(page, ".ante-correction") == "inline"
    assert _computed_display(page, ".post-correction") == "none"

    # Toggle on
    _open_toggles_panel(page)
    _click_toggle(page, "toggleCorrections")

    # After: ante hidden, post visible
    assert _computed_display(page, ".ante-correction") == "none"
    assert _computed_display(page, ".post-correction") == "inline"

    # Toggle off: back to default
    _click_toggle(page, "toggleCorrections")
    assert _computed_display(page, ".ante-correction") == "inline"
    assert _computed_display(page, ".post-correction") == "none"


# --------------------------------------------------------------------------- #
# Toggle: Search-friendly (simple-view)
# --------------------------------------------------------------------------- #

@pytest.mark.visual
def test_toggle_search_friendly(page, base_url):
    """Search-friendly mode swaps .rich-text (hidden) / .plain-text (shown)
    and hides the TOC and Metadata buttons."""
    _open_viewer(page, base_url, STANDARD_TEXT)

    # Use p.rich-text / p.plain-text to test block-level elements
    # (the first .rich-text might be an inline element like an <a>)
    assert _computed_display(page, "p.rich-text") == "block"
    assert _computed_display(page, "p.plain-text") == "none"
    assert _computed_display(page, "#toc-widget-container") != "none"
    assert _computed_display(page, "#metadata-widget-container") != "none"

    # Toggle on
    _open_toggles_panel(page)
    _click_toggle(page, "toggleViewMode")

    # After: rich-text hidden, plain-text visible
    assert _computed_display(page, "p.rich-text") == "none"
    assert _computed_display(page, "p.plain-text") == "block"
    # TOC and Metadata buttons hidden
    assert _computed_display(page, "#toc-widget-container") == "none"
    assert _computed_display(page, "#metadata-widget-container") == "none"

    # Toggle off: back to default
    _click_toggle(page, "toggleViewMode")
    assert _computed_display(page, "p.rich-text") == "block"
    assert _computed_display(page, "p.plain-text") == "none"


# --------------------------------------------------------------------------- #
# Toggle: Verse Styling
# --------------------------------------------------------------------------- #

@pytest.mark.visual
def test_toggle_verse_styling(page, base_url):
    """Toggling verse styling removes 'simple-verse-style' from body,
    enabling alternating verse colors."""
    _open_viewer(page, base_url, STANDARD_TEXT)

    # Default: body has simple-verse-style (no alternating colors)
    has_simple = page.evaluate("document.body.classList.contains('simple-verse-style')")
    assert has_simple is True

    # Toggle on (enables fancy verse formatting)
    _open_toggles_panel(page)
    _click_toggle(page, "toggleVerseFormatting")

    has_simple = page.evaluate("document.body.classList.contains('simple-verse-style')")
    assert has_simple is False

    # Verse spacing slider should now be visible
    slider = page.locator("#width-slider")
    assert slider.is_visible()

    # Toggle off: simple-verse-style restored
    _click_toggle(page, "toggleVerseFormatting")
    has_simple = page.evaluate("document.body.classList.contains('simple-verse-style')")
    assert has_simple is True


# --------------------------------------------------------------------------- #
# Font size controls
# --------------------------------------------------------------------------- #

@pytest.mark.visual
def test_font_size_controls(page, base_url):
    """Font-size increase/decrease/reset buttons change CSS on #content."""
    _open_viewer(page, base_url, STANDARD_TEXT)
    _open_toggles_panel(page)

    font_eval = "parseFloat(getComputedStyle(document.querySelector('#content')).fontSize)"

    initial_size = page.evaluate(font_eval)

    page.locator("#font-size-increase").click()
    page.wait_for_timeout(_PAUSE)
    increased = page.evaluate(font_eval)
    assert increased > initial_size, "Font size should increase"

    page.locator("#font-size-decrease").click()
    page.wait_for_timeout(_PAUSE)
    page.locator("#font-size-decrease").click()
    page.wait_for_timeout(_PAUSE)
    decreased = page.evaluate(font_eval)
    assert decreased < increased, "Font size should decrease"

    page.locator("#font-size-reset").click()
    page.wait_for_timeout(_PAUSE)
    reset = page.evaluate(font_eval)
    assert reset == initial_size, "Font size should reset to initial"


# --------------------------------------------------------------------------- #
# Metadata panel
# --------------------------------------------------------------------------- #

@pytest.mark.visual
def test_metadata_panel_opens_with_content(page, base_url):
    """Clicking Metadata opens a panel with actual metadata fields."""
    _open_viewer(page, base_url, STANDARD_TEXT)

    panel = page.locator("#metadata-panel")
    assert _computed_display(page, "#metadata-panel") == "none"

    page.locator("#metadata-button").click()
    page.wait_for_timeout(_PAUSE)

    assert _computed_display(page, "#metadata-panel") == "block"

    items = panel.locator("#metadata-list li")
    assert items.count() > 0

    # Check that real metadata content is present (title should appear)
    panel_text = panel.text_content()
    assert "Kādambarī" in panel_text, "Metadata panel should show the text title"


@pytest.mark.visual
def test_metadata_panel_closes_on_second_click(page, base_url):
    """Clicking Metadata again closes the panel."""
    _open_viewer(page, base_url, STANDARD_TEXT)

    page.locator("#metadata-button").click()
    page.wait_for_timeout(_PAUSE)
    assert _computed_display(page, "#metadata-panel") == "block"

    page.locator("#metadata-button").click()
    page.wait_for_timeout(_PAUSE)
    assert _computed_display(page, "#metadata-panel") == "none"


# --------------------------------------------------------------------------- #
# TOC panel
# --------------------------------------------------------------------------- #

@pytest.mark.visual
def test_toc_panel_has_links(page, base_url):
    """TOC panel opens and contains anchor links to sections."""
    _open_viewer(page, base_url, STANDARD_TEXT)

    page.locator("#toc-button").click()
    page.wait_for_timeout(_PAUSE)

    assert _computed_display(page, "#toc-panel") == "block"

    toc_links = page.locator("#toc-list li a")
    assert toc_links.count() > 0, "TOC should have at least one entry"

    # Each link should have an href starting with #
    first_href = toc_links.first.get_attribute("href")
    assert first_href.startswith("#"), "TOC links should be anchor links"


# --------------------------------------------------------------------------- #
# Transliteration
# --------------------------------------------------------------------------- #

@pytest.mark.visual
def test_transliteration_changes_content(page, base_url):
    """Switching transliteration scheme actually changes the displayed text."""
    _open_viewer(page, base_url, STANDARD_TEXT)

    # Grab some original IAST text from the content
    original_text = page.locator("#content").text_content()

    # Open toggles and switch to Devanagari
    _open_toggles_panel(page)
    select = page.locator("#transliteration-scheme")
    select.select_option("devanagari")
    page.wait_for_timeout(_PAUSE)

    transliterated_text = page.locator("#content").text_content()
    assert transliterated_text != original_text, "Content should change after transliteration"

    # Devanagari text should contain Devanagari characters
    has_devanagari = any("\u0900" <= ch <= "\u097F" for ch in transliterated_text)
    assert has_devanagari, "Transliterated content should contain Devanagari characters"

    # Switch back to IAST
    select.select_option("iast")
    page.wait_for_timeout(_PAUSE)

    restored_text = page.locator("#content").text_content()
    assert restored_text == original_text, "Content should restore to original after switching back to IAST"


# --------------------------------------------------------------------------- #
# Home button
# --------------------------------------------------------------------------- #

def test_home_button_navigates_home(page, base_url):
    _open_viewer(page, base_url, STANDARD_TEXT)
    page.locator("#home-button").click()
    page.wait_for_load_state("domcontentloaded")
    assert page.url.rstrip("/") == base_url.rstrip("/")


# --------------------------------------------------------------------------- #
# Corrections info icon → metadata panel
# --------------------------------------------------------------------------- #

@pytest.mark.visual
def test_corrections_info_icon_opens_metadata(page, base_url):
    """The corrections info icon opens the metadata panel and expands the corrections list."""
    _open_viewer(page, base_url, STANDARD_TEXT)
    _open_toggles_panel(page)

    info_icon = page.locator("#corrections-info-icon")
    assert info_icon.is_visible()

    info_icon.click()
    page.wait_for_timeout(_PAUSE)

    # Metadata panel should be open
    assert _computed_display(page, "#metadata-panel") == "block"

    # Corrections table inside the panel should be visible (expanded)
    corrections_table = page.locator("#corrections-list-container table")
    if corrections_table.count() > 0:
        assert corrections_table.evaluate("el => el.style.display") == "table"
