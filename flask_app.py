import logging
import os
import time
import json
from pathlib import Path
from typing import Dict
import io
import zipfile
import xml.etree.ElementTree as ET

from flask import Flask, request, send_file, render_template, abort

from utils import (
    find_app_version, find_data_version, find_bundle_version,
    get_geolocation, log_download,
    load_metadata, process_metadata,
    get_normalized_filename, calculate_all_sizes,
)

STATIC_FILES_PATH = Path('./static')
DATA_PATH = Path(os.getenv('DATA_PATH', str(STATIC_FILES_PATH / 'data')))
METADATA_PATH = DATA_PATH / 'metadata' / 'transforms'
FILE_TYPE_PATHS = {
    'txt': DATA_PATH / 'texts' / 'project_editions' / 'txt',
    'xml': DATA_PATH / 'texts' / 'project_editions' / 'xml',
    'html_plain': DATA_PATH / 'texts' / 'transforms' / 'html' / 'plain',
    'html_rich': DATA_PATH / 'texts' / 'transforms' / 'html' / 'rich',
    'original': DATA_PATH / 'texts' / 'original_submissions',
    'md': DATA_PATH / 'metadata' / 'markdown',
    'html': DATA_PATH / 'metadata' / 'transforms' / 'html',
    'json': METADATA_PATH / 'metadata.json'
}
RAW_METADATA: Dict = load_metadata(METADATA_PATH)
CUSTOM_METADATA = process_metadata(RAW_METADATA)
DISPLAY_FIELDS = ['Title', 'Author', 'Edition', 'Genre', 'Size (kb)', '', '', '']
NUM_ITEMS = len(CUSTOM_METADATA)

APP_VERSION = find_app_version()
DATA_VERSION = find_data_version()
BUNDLE_VERSION = find_bundle_version()
FILE_GROUP_SIZES_MB, TOTAL_CORPUS_SIZE_MB, PLAIN_TEXT_SIZE_MB = calculate_all_sizes(FILE_TYPE_PATHS, DATA_PATH)

app = Flask(__name__)
app.cache = {}  # In-memory cache for generated zip files

# Configure logging
logging.basicConfig(
    filename="app.log",
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

@app.route(f"/{STATIC_FILES_PATH}/<path:filename>")
def serve_file(filename):
    """
    Serve ANY file under the /static/data/... URL, including subdirectories.
    Logs the download details as needed.
    """
    start_time = time.time()
    client_ip  = request.remote_addr

    normalized_filename = get_normalized_filename(filename)
    file_path = os.path.join(STATIC_FILES_PATH, normalized_filename)

    if not os.path.isfile(file_path):
        logging.error(f"File not found: {file_path}")
        abort(404, description="File not found")

    file_size = os.path.getsize(file_path)
    country, region, city = get_geolocation(client_ip)
    processing_time = time.time() - start_time
    log_download(
        normalized_filename,
        client_ip,
        country,
        region,
        city,
        file_size,
        processing_time
    )
    logging.info(
        f"Served {normalized_filename} (size {file_size}) "
        f"to {client_ip} in {processing_time:.2f} seconds"
    )

    as_attachment_flag = normalized_filename.lower().endswith(".zip")

    return send_file(file_path, as_attachment=as_attachment_flag)

@app.route("/texts/transforms/html/rich/<filename>")
def view_text(filename):
    """
    Render a rich HTML text inside the shared application template so that the
    UI chrome (toggles, metadata panel, etc.) lives only in the app.
    Falls back to serving the static file directly if the new context marker
    is missing to preserve compatibility with older exports.
    """
    # The HTML file contains the content, the JSON file contains the context.
    # Both are named after the original XML file.
    base_name = Path(filename).stem
    html_path = FILE_TYPE_PATHS['html_rich'] / f"{base_name}.html"
    json_path = FILE_TYPE_PATHS['html_rich'] / f"{base_name}.json"

    if not html_path.is_file() or not json_path.is_file():
        abort(404, description="Text not found")

    # Read the HTML content
    with open(html_path, 'r', encoding='utf-8') as f:
        content_html = f.read()

    # Read the JSON context
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            raw_context = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        logging.error(f"Error loading or parsing context JSON for {filename}: {e}")
        raw_context = {} # Fallback to empty context

    context_defaults = {
        "title": Path(filename).stem,
        "toc": [],
        "toc_available": False,
        "metadata_html": "",
        "metadata_available": False,
        "metadata_entries": [],
        "corrections": [],
        "has_corrections": False,
        "verse_only": False,
        "includes_plain_variant": False,
        "no_line_numbers": False,
    }
    context = {**context_defaults, **raw_context}

    context_json = json.dumps(context, ensure_ascii=False)

    return render_template(
        "text_viewer.html",
        content_html=content_html,
        context=context,
        context_json=context_json,
        static_files_path=STATIC_FILES_PATH,
        filename=filename,
    )

@app.route("/download", methods=['POST'])
def download_bundle():
    """
    Dynamically creates and serves a zip file of texts and metadata.
    Can be a full bundle of all data, or a custom bundle based on user selection.
    """
    data = request.get_json()
    if not data:
        abort(400, "Invalid request, JSON body required.")

    text_format = data.get('text')
    meta_format = data.get('metadata')
    is_full_bundle = text_format == 'all' and meta_format == 'all'

    # --- Validation ---
    if not meta_format or (meta_format != 'all' and meta_format not in FILE_TYPE_PATHS):
        abort(400, "A valid metadata format is required.")
    if not text_format or (text_format != 'all' and text_format != 'none' and text_format not in FILE_TYPE_PATHS):
        abort(400, "Invalid text format specified.")

    # --- Set up filenames and cache keys ---
    if is_full_bundle:
        internal_zip_name = f'hansel_all_{DATA_VERSION}.zip'
        user_facing_filename = f"hansel_download_all_{DATA_VERSION}.zip"
        root_folder_name = user_facing_filename.removesuffix('.zip')
    else:
        cache_key_parts = []
        if text_format and text_format != 'none':
            cache_key_parts.append(f"text-{text_format}")
        cache_key_parts.append(f"meta-{meta_format}")
        cache_key_base = "_".join(cache_key_parts)
        internal_zip_name = f'hansel_bundle_{cache_key_base}_{DATA_VERSION}.zip'

        name_parts = ['hansel_download']
        if text_format and text_format != 'none':
            name_parts.append(f"text_{text_format}")
        name_parts.append(f"metadata_{meta_format}")
        name_parts.append(DATA_VERSION)
        user_facing_filename = "_".join(name_parts) + ".zip"

    # --- Caching ---
    if internal_zip_name in app.cache:
        logging.info(f"Serving cached file: {internal_zip_name} as {user_facing_filename}")
        file_to_send = io.BytesIO(app.cache[internal_zip_name])
        return send_file(
            file_to_send,
            as_attachment=True,
            download_name=user_facing_filename,
            mimetype='application/zip'
        )

    logging.info(f"Cache miss for {internal_zip_name}. Generating new zip file.")

    # --- Zip file creation ---
    memory_file = io.BytesIO()
    with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
        # Add VERSION file
        version_file_path = DATA_PATH / 'VERSION'
        if version_file_path.is_file():
            arcname = os.path.join(root_folder_name, 'VERSION') if is_full_bundle else 'VERSION'
            zf.write(version_file_path, arcname=arcname)

        if is_full_bundle:
            # Add all texts and metadata
            for dir_path in [DATA_PATH / 'texts', DATA_PATH / 'metadata']:
                if dir_path.is_dir():
                    for file_path in dir_path.rglob('*'):
                        if file_path.is_file() and file_path.suffix != '.zip':
                            relative_path = file_path.relative_to(DATA_PATH)
                            new_arcname = os.path.join(root_folder_name, relative_path)
                            zf.write(file_path, arcname=new_arcname)
        else:
            # Add selected text format
            if text_format and text_format != 'none':
                text_path = FILE_TYPE_PATHS[text_format]
                if text_path.is_dir():
                    for file_path in sorted(text_path.rglob('*')):
                        if file_path.is_file():
                            zf.write(file_path, arcname=f"text/{file_path.name}")

            # Add selected metadata format
            meta_path = FILE_TYPE_PATHS[meta_format]
            if meta_path.is_file():
                zf.write(meta_path, arcname=f"metadata/{meta_path.name}")
            elif meta_path.is_dir():
                if meta_format == 'md':
                    for file_path in sorted(meta_path.glob('*.md')):
                        if file_path.is_file():
                            zf.write(file_path, arcname=f"metadata/{file_path.name}")
                else:
                    for file_path in sorted(meta_path.rglob('*')):
                        if file_path.is_file() and file_path.suffix != '.zip':
                            zf.write(file_path, arcname=f"metadata/{file_path.name}")

    app.cache[internal_zip_name] = memory_file.getvalue()
    memory_file.seek(0)

    return send_file(
        memory_file,
        as_attachment=True,
        download_name=user_facing_filename,
        mimetype='application/zip'
    )


@app.route("/")
def index():
    return render_template(
        "index.html",
        static_files_path=STATIC_FILES_PATH,
        metadata=CUSTOM_METADATA,
        rows=CUSTOM_METADATA,
        display_fields=DISPLAY_FIELDS,
        file_group_sizes_mb=FILE_GROUP_SIZES_MB,
        total_corpus_size_mb=TOTAL_CORPUS_SIZE_MB
    )


@app.route("/about")
def about():
    return render_template(
        "about.html",
        static_files_path=STATIC_FILES_PATH,
        app_version = APP_VERSION,
        data_version = DATA_VERSION,
        bundle_version = BUNDLE_VERSION,
        num_items = NUM_ITEMS,
        plain_text_size_mb = PLAIN_TEXT_SIZE_MB,
    )

@app.route("/team")
def team():
    return render_template("team.html")

@app.route("/getting_started")
def getting_started():
    return render_template("getting_started.html")


@app.route("/contact")
def contact():
    return render_template("contact.html")


if __name__ == "__main__":
    # Enable debug mode for local development
    app.run(debug=True, host="0.0.0.0", port=5030)
