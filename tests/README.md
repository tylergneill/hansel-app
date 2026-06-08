# Integration Tests (Playwright)

Integration tests that run against the Docker container with real `hansel-data` mounted.

## Browser × Device Matrix

Every test runs across five configurations:

| ID                | Engine   | Emulates                                    |
|-------------------|----------|---------------------------------------------|
| chrome-macos      | Chromium | Desktop Chrome (baseline)                   |
| edge-windows      | Chromium | Edge on Windows (UA + 1920×1080 viewport)   |
| safari-ios        | WebKit   | iPhone 13 (viewport, touch, device scale)   |
| chrome-ios        | WebKit   | iPhone 13 (iOS Chrome uses WebKit)          |
| firefox-android   | Firefox  | Pixel 5 (viewport, touch, device scale)     |

## Setup

### 1. Install test dependencies

```bash
pip install -r requirements-test.txt
playwright install chromium firefox webkit
```

### 2. Start the app container

In a separate terminal:

```bash
cd hansel-app
make run          # Staging image on port 5051 with hansel-data mounted
```

## Running Tests

```bash
cd hansel-app
pytest tests/ -v
```

### Filter by browser

```bash
pytest tests/ -v -k "chrome-macos"
pytest tests/ -v -k "firefox-android"
pytest tests/ -v -k "safari-ios"
```

### Filter by test file

```bash
pytest tests/test_pages.py -v
pytest tests/test_text_viewer.py -v
pytest tests/test_downloads.py -v
pytest tests/test_metadata.py -v
```

### Headed mode (watch tests run)

Tests marked `@pytest.mark.visual` (toggles, panels, transliteration, font size)
open in a visible browser window when `HEADED=1` is set. All other tests
(page loads, downloads, metadata 200s) always run headless.

```bash
# Run only visual tests in a visible browser
HEADED=1 pytest tests/ -v -m visual -k "chrome-macos"

# Slow down so you can follow each action
HEADED=1 SLOW_MO=1500 pytest tests/ -v -m visual -k "chrome-macos"

# Run the full suite — visual tests headed, everything else headless
HEADED=1 SLOW_MO=750 pytest tests/ -v -k "chrome-macos"
```

### Custom server URL

By default tests hit `http://localhost:5051`. Override with:

```bash
HANSEL_TEST_URL=http://localhost:5050 pytest tests/ -v
```

## Environment Variables

| Variable           | Default                   | Description                                      |
|--------------------|---------------------------|--------------------------------------------------|
| `HANSEL_TEST_URL`  | `http://localhost:5051`   | Base URL of the running app                      |
| `HEADED`           | (unset = headless)        | Set to `1` to open a visible browser for `@pytest.mark.visual` tests |
| `SLOW_MO`          | `0`                       | Milliseconds to wait between each Playwright action (headed only) |

## Test Coverage

### test_pages.py
Static page loads (200 status), homepage text list, navigation links, robots.txt, 404 handling.

### test_text_viewer.py
Each toggle is tested for actual DOM/CSS side effects, not just clickability:

| Test | Verifies |
|------|----------|
| toggle_breaks | `.pb-label`/`.lb-label` visibility toggles (`none` ↔ `inline`) |
| toggle_line_breaks | `.lb-br` visibility toggles (`none` ↔ `block`) |
| toggle_editorial_coords | `hide-editorial-coords` class on `#content`; `.editorial-coord` visibility |
| toggle_corrections | `.ante-correction`/`.post-correction` display swaps |
| toggle_search_friendly | `p.rich-text`/`p.plain-text` visibility swaps; TOC/Metadata buttons hidden |
| toggle_verse_styling | `simple-verse-style` class on `body`; width slider visibility |
| font_size_controls | `#content` computed `fontSize` increases, decreases, resets |
| metadata_panel | Opens/closes; contains actual metadata (e.g. "Kādambarī") |
| toc_panel | Opens with anchor links (`href` starting with `#`) |
| transliteration | Switching to Devanagari produces real Devanagari Unicode; switching back restores IAST |
| corrections_info_icon | Opens metadata panel; expands corrections table |

### test_downloads.py
Full bundle zip, custom text+metadata selections, metadata-only, zip contents validation, error handling.

### test_metadata.py
Metadata viewer pages load with content, 404 for nonexistent texts.
