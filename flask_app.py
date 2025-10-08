import logging
import os
import time
from pathlib import Path
from typing import Dict

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
BUNDLE_VERSION = find_bundle_version()

app = Flask(__name__)

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


@app.route("/")
def index():
    return render_template(
        "index.html",
        static_files_path=STATIC_FILES_PATH,
        metadata=CUSTOM_METADATA,
        rows=CUSTOM_METADATA,
        display_fields=DISPLAY_FIELDS,
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

@app.route("/tutorial")
def tutorial():
    return render_template("tutorial.html")


if __name__ == "__main__":
    # Enable debug mode for local development
    app.run(debug=True, host="0.0.0.0", port=5030)
