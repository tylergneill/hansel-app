"""Metadata viewer tests."""

import pytest

from tests.conftest import DUMMY_TEXTS

pytestmark = pytest.mark.chrome_only


@pytest.mark.parametrize("stem", DUMMY_TEXTS)
def test_metadata_page_loads(page, base_url, stem):
    response = page.goto(f"{base_url}/view_metadata/{stem}.html")
    assert response.status == 200


@pytest.mark.parametrize("stem", DUMMY_TEXTS)
def test_metadata_has_content(page, base_url, stem):
    page.goto(f"{base_url}/view_metadata/{stem}.html")
    # The metadata viewer template renders content_html inside the page
    body_text = page.text_content("body")
    assert len(body_text.strip()) > 0, "Metadata page should have visible content"


def test_metadata_404_for_nonexistent(page, base_url):
    response = page.goto(f"{base_url}/view_metadata/nonexistent_text.html")
    assert response.status == 404
