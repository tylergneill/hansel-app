"""Download form and zip generation tests."""

import io
import zipfile

import pytest
from playwright.sync_api import expect

pytestmark = pytest.mark.chrome_only


def _post_download(page, base_url, payload):
    """POST to /download via fetch() and return response info."""
    result = page.evaluate(
        """async ([url, payload]) => {
            const resp = await fetch(url + '/download', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload),
            });
            const blob = await resp.blob();
            const buffer = await blob.arrayBuffer();
            // Chunked base64 encoding to avoid call-stack overflow on large zips
            const bytes = new Uint8Array(buffer);
            let binary = '';
            const chunkSize = 8192;
            for (let i = 0; i < bytes.length; i += chunkSize) {
                binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
            }
            return {
                status: resp.status,
                contentType: resp.headers.get('content-type'),
                contentDisposition: resp.headers.get('content-disposition'),
                size: buffer.byteLength,
                data: btoa(binary),
            };
        }""",
        [base_url, payload],
    )
    return result


def _decode_zip(b64_data):
    """Decode base64 zip data and return a ZipFile."""
    import base64
    raw = base64.b64decode(b64_data)
    return zipfile.ZipFile(io.BytesIO(raw))


def test_full_bundle_download(page, base_url):
    page.goto(f"{base_url}/")
    result = _post_download(page, base_url, {"text": "all", "metadata": "all"})

    assert result["status"] == 200
    assert "application/zip" in result["contentType"]
    assert result["size"] > 0
    assert "hansel_download_all_" in result["contentDisposition"]

    zf = _decode_zip(result["data"])
    names = zf.namelist()
    assert len(names) > 0, "Zip should contain files"
    # Should have a VERSION file
    assert any("VERSION" in n for n in names), "Zip should contain VERSION"


def test_custom_txt_json_download(page, base_url):
    page.goto(f"{base_url}/")
    result = _post_download(page, base_url, {"text": "txt", "metadata": "json"})

    assert result["status"] == 200
    assert "application/zip" in result["contentType"]

    zf = _decode_zip(result["data"])
    names = zf.namelist()

    txt_files = [n for n in names if n.startswith("text/") and n.endswith(".txt")]
    assert len(txt_files) > 0, "Should contain .txt files"

    meta_files = [n for n in names if n.startswith("metadata/")]
    assert len(meta_files) > 0, "Should contain metadata files"


def test_custom_xml_md_download(page, base_url):
    page.goto(f"{base_url}/")
    result = _post_download(page, base_url, {"text": "xml", "metadata": "md"})

    assert result["status"] == 200

    zf = _decode_zip(result["data"])
    names = zf.namelist()

    xml_files = [n for n in names if n.startswith("text/") and n.endswith(".xml")]
    assert len(xml_files) > 0, "Should contain .xml files"

    md_files = [n for n in names if n.startswith("metadata/") and n.endswith(".md")]
    assert len(md_files) > 0, "Should contain .md metadata files"


def test_metadata_only_download(page, base_url):
    page.goto(f"{base_url}/")
    result = _post_download(page, base_url, {"text": "none", "metadata": "json"})

    assert result["status"] == 200

    zf = _decode_zip(result["data"])
    names = zf.namelist()

    txt_files = [n for n in names if n.startswith("text/")]
    assert len(txt_files) == 0, "Should not contain text files"

    meta_files = [n for n in names if n.startswith("metadata/")]
    assert len(meta_files) > 0, "Should contain metadata files"


def test_invalid_download_request(page, base_url):
    page.goto(f"{base_url}/")
    result = page.evaluate(
        """async ([url]) => {
            const resp = await fetch(url + '/download', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({}),
            });
            return { status: resp.status };
        }""",
        [base_url],
    )
    assert result["status"] == 400
