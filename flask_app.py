import logging
import os
import time
from pathlib import Path
from typing import Dict
import io
import zipfile
from datetime import datetime

from flask import Flask, request, send_file, render_template, abort

from utils import (
    find_app_version, find_data_version, find_bundle_version,
    get_geolocation, log_download,
    load_metadata, process_metadata, get_collection_size, get_normalized_filename,
)

STATIC_FILES_PATH = Path('./static')
DATA_PATH = Path(os.getenv('DATA_PATH', str(STATIC_FILES_PATH / 'data')))
METADATA_PATH = DATA_PATH / 'metadata' / 'transforms' / 'cumulative'
RAW_METADATA: Dict = load_metadata(METADATA_PATH)
CUSTOM_METADATA = process_metadata(RAW_METADATA)
DISPLAY_FIELDS = ['Title', 'Author', 'Edition', 'Genre', 'Size (kb)', '', '', '']
NUM_ITEMS = len(CUSTOM_METADATA)
TOTAL_SIZE_MB = get_collection_size(CUSTOM_METADATA)

APP_VERSION = find_app_version()
DATA_VERSION = find_data_version()
FILENAME_DATE_STR = DATA_VERSION.replace('.', '')
BUNDLE_VERSION = find_bundle_version()

app = Flask(__name__)
app.cache = {}  # In-memory cache for generated zip files

# --- Caching and Sizing Logic ---

FILE_TYPE_PATHS = {
    'txt': DATA_PATH / 'texts' / 'project_editions' / 'txt',
    'xml': DATA_PATH / 'texts' / 'project_editions' / 'xml',
    'html_plain': DATA_PATH / 'texts' / 'transforms' / 'html' / 'plain',
    'html_rich': DATA_PATH / 'texts' / 'transforms' / 'html' / 'rich',
    'md': DATA_PATH / 'metadata',
    'html': DATA_PATH / 'metadata' / 'transforms' / 'html',
    'json': METADATA_PATH / 'metadata.json'
}

LATEST_UPDATE_DATE_STR = ""
FILE_GROUP_SIZES = {}

def get_latest_update_date():
    """
    Finds the most recent 'Last Updated' date from all metadata items
    and returns it as a string for use in cache keys.
    """
    global LATEST_UPDATE_DATE_STR
    logging.info("Finding latest update date from metadata for cache invalidation...")
    
    latest_date = None
    
    for item in CUSTOM_METADATA:
        date_str = item.get('Last Updated')
        if date_str:
            try:
                current_date = datetime.strptime(date_str, '%Y-%m-%d')
                if latest_date is None or current_date > latest_date:
                    latest_date = current_date
            except ValueError:
                logging.warning(f"Could not parse date string from metadata: {date_str}")
                continue

    if latest_date:
        LATEST_UPDATE_DATE_STR = latest_date.strftime('%Y%m%d')
    else:
        LATEST_UPDATE_DATE_STR = time.strftime('%Y%m%d')
        
    logging.info(f"Latest update date for cache key: {LATEST_UPDATE_DATE_STR}")

def calculate_file_group_sizes():
    """Calculates the total size for each file type group."""
    logging.info("Calculating file group sizes...")
    for key, path in FILE_TYPE_PATHS.items():
        total_size = 0
        if not path.exists():
            continue
        if path.is_file():
            total_size = path.stat().st_size
        elif path.is_dir():
            total_size = sum(p.stat().st_size for p in path.rglob('*') if p.is_file())
        # Store size in MB with one decimal place
        FILE_GROUP_SIZES[key] = round(total_size / (1024 * 1024), 1)
    logging.info(f"File group sizes (MB): {FILE_GROUP_SIZES}")

# Configure logging
logging.basicConfig(
    filename="app.log",
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

# Startup calculations
get_latest_update_date()
calculate_file_group_sizes()

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

@app.route("/downloads/all")
def download_all():
    """
    Dynamically creates and serves a zip file of the entire static/data directory.
    """
    # --- Filename and Cache Key Generation ---
    internal_zip_name = f'hansel_all_{LATEST_UPDATE_DATE_STR}.zip'
    
    user_facing_filename = f"hansel_download_all_{FILENAME_DATE_STR}.zip"
    root_folder_name = user_facing_filename.removesuffix('.zip')

    # --- Caching ---
    if internal_zip_name in app.cache:
        logging.info(f"Serving cached file: {internal_zip_name} as {user_facing_filename}")
        # Create a new stream from the cached bytes for this request
        file_to_send = io.BytesIO(app.cache[internal_zip_name])
        return send_file(
            file_to_send,
            as_attachment=True,
            download_name=user_facing_filename,
            mimetype='application/zip'
        )

    logging.info(f"Cache miss for {internal_zip_name}. Generating new 'all data' zip file.")

    # --- Zip File Creation ---
    memory_file = io.BytesIO()
    with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
        for file_path in DATA_PATH.rglob('*'):
            if file_path.is_file():
                relative_path = file_path.relative_to(DATA_PATH)
                new_arcname = os.path.join(root_folder_name, relative_path)
                zf.write(file_path, arcname=new_arcname)
    
    # Store the raw bytes in the cache
    app.cache[internal_zip_name] = memory_file.getvalue()
    
    memory_file.seek(0)

    return send_file(
        memory_file,
        as_attachment=True,
        download_name=user_facing_filename,
        mimetype='application/zip'
    )

@app.route("/downloads/cumulative", methods=['POST'])
def cumulative_download():
    """
    Dynamically creates and serves a zip file based on user-selected text and metadata formats.
    Implements caching based on the latest modification times of the selected file types.
    """
    data = request.get_json()
    if not data:
        abort(400, "Invalid request, JSON body required.")

    text_format = data.get('text')
    meta_format = data.get('metadata')

    # Validation
    if not meta_format or meta_format not in FILE_TYPE_PATHS:
        abort(400, "A valid metadata format is required.")
    if text_format and text_format != 'none' and text_format not in FILE_TYPE_PATHS:
        abort(400, "Invalid text format specified.")

    # --- Filename and Cache Key Generation ---

    # Cache key is based on formats and the single latest update date
    cache_key_parts = []
    if text_format and text_format != 'none':
        cache_key_parts.append(f"text-{text_format}")
    cache_key_parts.append(f"meta-{meta_format}")
    cache_key_base = "_".join(cache_key_parts)
    internal_zip_name = f'hansel_bundle_{cache_key_base}_{LATEST_UPDATE_DATE_STR}.zip'

    # User-facing filename is based on formats and the data version date
    name_parts = ['hansel_download']
    if text_format and text_format != 'none':
        name_parts.append(f"text_{text_format}")
    name_parts.append(f"metadata_{meta_format}")
    name_parts.append(FILENAME_DATE_STR)
    user_facing_filename = "_".join(name_parts) + ".zip"

    # --- Caching ---

    if internal_zip_name in app.cache:
        logging.info(f"Serving cached file: {internal_zip_name} as {user_facing_filename}")
        # Create a new stream from the cached bytes for this request
        file_to_send = io.BytesIO(app.cache[internal_zip_name])
        return send_file(
            file_to_send,
            as_attachment=True,
            download_name=user_facing_filename,
            mimetype='application/zip'
        )

    logging.info(f"Cache miss for {internal_zip_name}. Generating new zip file.")

    # --- Zip File Creation ---

    memory_file = io.BytesIO()
    with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
        # Add text files
        if text_format and text_format != 'none':
            text_path = FILE_TYPE_PATHS[text_format]
            if text_path.is_dir():
                for file_path in sorted(text_path.rglob('*')): # Sort for consistent order
                    if file_path.is_file():
                        zf.write(file_path, arcname=f"text/{file_path.name}")

        # Add metadata files
        meta_path = FILE_TYPE_PATHS[meta_format]
        if meta_path.is_file():
            zf.write(meta_path, arcname=f"metadata/{meta_path.name}")
        elif meta_path.is_dir():
            if meta_format == 'md':
                # For 'md', only grab .md files from the root of the metadata dir, not recursively
                for file_path in sorted(meta_path.glob('*.md')):
                    if file_path.is_file():
                        zf.write(file_path, arcname=f"metadata/{file_path.name}")
            else:
                # Original behavior for other directory-based metadata types (e.g., html)
                for file_path in sorted(meta_path.rglob('*')): # Sort for consistent order
                     if file_path.is_file() and file_path.suffix != '.zip':
                        zf.write(file_path, arcname=f"metadata/{file_path.name}")

    # Store the raw bytes in the cache
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
        file_group_sizes=FILE_GROUP_SIZES,
        total_size_mb=TOTAL_SIZE_MB
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
        total_size_mb = TOTAL_SIZE_MB,
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
