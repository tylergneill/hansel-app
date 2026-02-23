"""Page load and navigation tests."""

import pytest


STATIC_PAGES = [
    "/",
    "/about",
    "/progress",
    "/team",
    "/getting_started",
    "/contact",
]


@pytest.mark.parametrize("path", STATIC_PAGES)
def test_static_page_loads(page, base_url, path):
    response = page.goto(f"{base_url}{path}")
    assert response.status == 200


def test_robots_txt(page, base_url):
    response = page.goto(f"{base_url}/robots.txt")
    assert response.status == 200


def test_homepage_has_text_entries(page, base_url):
    page.goto(f"{base_url}/")
    # The homepage renders a list of texts as <li class="file-item"> elements
    items = page.locator("li.file-item")
    assert items.count() > 0, "Homepage should contain at least one text entry"


def test_homepage_text_links_work(page, base_url):
    page.goto(f"{base_url}/")
    # Find the first link that points to a rich HTML text
    text_link = page.locator('a[href*="texts/transforms/html/rich/"]').first
    text_link.click()
    page.wait_for_load_state("domcontentloaded")
    assert page.url != f"{base_url}/", "Should have navigated away from homepage"
    assert "texts/transforms/html/rich/" in page.url


def test_sidenav_links(page, base_url):
    page.goto(f"{base_url}/")
    # The sidenav links to #e-texts, #cumulative-data, and /about
    for href in ["#e-texts", "#cumulative-data", "/about"]:
        link = page.locator(f'a[href="{href}"]')
        assert link.count() > 0, f"Expected a link to {href} on the homepage"


def test_404_for_nonexistent_page(page, base_url):
    response = page.goto(f"{base_url}/nonexistent_page_xyz")
    assert response.status == 404
