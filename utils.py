import collections
import json
import logging
import os
from pathlib import Path
from typing import Dict, List
import unicodedata
from urllib.parse import urlencode

import requests
from skrutable.transliteration import Transliterator

T = Transliterator(from_scheme='IAST', to_scheme='HK')


def find_app_version():
    app_version_filepath = './VERSION'
    with open(app_version_filepath, 'r', encoding='utf8') as file:
        # Assuming the __version__ line is the first line
        return file.readline().strip().split('=')[1].strip().replace("'", "").replace('"', '')


def find_data_version():
    data_version_filepath = './static/data/VERSION'
    with open(data_version_filepath, 'r', encoding='utf8') as file:
        for line in file:
            if line.startswith('__data_version__'):
                return line.split('=')[1].strip().replace("'", "").replace('"', '')


def find_bundle_version():
    data_version_filepath = './static/data/VERSION'
    with open(data_version_filepath, 'r', encoding='utf8') as file:
        for line in file:
            if line.startswith('__bundle_version__'):
                return line.split('=')[1].strip().replace("'", "").replace('"', '')


# JSON log file for downloads
DOWNLOAD_LOG_FILE = "downloads.json"
if not os.path.exists(DOWNLOAD_LOG_FILE):
    with open(DOWNLOAD_LOG_FILE, 'w') as f:
        json.dump([], f)


def get_geolocation(ip_address):
    try:
        response = requests.get(f"https://ipinfo.io/{ip_address}/json")
        if response.status_code == 200:
            data = response.json()
            country = data.get("country", "Unknown")
            region = data.get("region", "Unknown")
            city = data.get("city", "Unknown")
        else:
            country, region, city = "Unknown", "Unknown", "Unknown"
    except Exception as e:
        logging.error(f"Geolocation error for IP {ip_address}: {e}")
        country, region, city = "Unknown", "Unknown", "Unknown"
    return country, region, city


def log_download(filename, ip, country, region, city, file_size, processing_time):
    log_entry = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "filename": filename,
        "ip_address": ip,
        "country": country,
        "region": region,
        "city": city,
        "file_size": file_size,
        "processing_time": processing_time
    }
    try:
        with open(DOWNLOAD_LOG_FILE, 'r+') as f:
            data = json.load(f)
            data.append(log_entry)
            f.seek(0)
            json.dump(data, f, indent=4)
    except Exception as e:
        logging.error(f"Error logging download: {e}")


def load_metadata(metadata_path=Path("static/data/metadata")) -> Dict:
    metadata_file = metadata_path / 'metadata.json'
    with open(metadata_file, encoding="utf-8") as f:
        metadata = json.load(f)
    ordered_metadata = collections.OrderedDict(sorted(metadata.items()))
    return ordered_metadata


def get_filename_info(record):
    if 'Filename' not in record:
        raise(f"Filename missing for {record}")
    filename_base = record['Filename']
    original_submission_filename_extension = record['Original Submission Filetype']
    return filename_base, original_submission_filename_extension


def get_author_info(record):
    if 'Author' in record:
        return record['Author']
    if 'Authors' in record:
        return ', '.join(record['Authors'])
    if 'Attributed Author' in record:
        return record['Attributed Author']
    return ''


def get_pandit_author_info(record):
    if 'Pandit Author IDs' in record:
        author_ids = record['Pandit Author IDs']
        if isinstance(author_ids, list):
            return ','.join(author_ids)
        return str(author_ids)
    if 'Pandit Attributed Author ID' in record:
        return record['Pandit Attributed Author ID']
    return ''

def get_panditya_url(record):
    pandit_author = get_pandit_author_info(record)
    pandit_work = record.get('Pandit Work ID', '')
    if not(pandit_author or pandit_work):
        return ''

    params = {'hops': '1'}
    if pandit_author:
        params['authors'] = pandit_author
    if pandit_work:
        params['works'] = pandit_work
    return 'https://panditya.info/view?' + urlencode(params)


def get_pdf_links(record):
    pdf_links = []
    if 'Edition PDFs' in record:
        for pdf_string in record['Edition PDFs']:
            if pdf_string.startswith('[') and '](' in pdf_string:
                parts = pdf_string.split('](')
                text = parts[0][1:]
                url = parts[1][:-1]
                pdf_links.append({'text': text, 'url': url})
    return pdf_links


def process_metadata(raw_metadata: Dict[str, Dict]) -> List[Dict]:
    """
    :param raw_metadata: mapping with unique id (mostly = catalog num) to full record (~18 fields)
    :return: flattened list of dicts with error-checked values
    """
    metadata_subset = []
    for (key, record) in raw_metadata.items():
        if key == "version":
            continue
        filename_base, original_submission_filename_extension = get_filename_info(record)
        panditya_url = get_panditya_url(record)
        pdf_links = get_pdf_links(record)
        metadata_subset.append({
            'Filename Base': filename_base,
            'Original Submission Filename Extension': original_submission_filename_extension,
            'Title': record['Title'],
            'Author': get_author_info(record),
            'Panditya URL': panditya_url,
            'Edition': record['Edition Short'],
            'PDFLinks': pdf_links,
            'Size (kb)': record['File Size (KB)'],
            'Genre': ', '.join(record['Genres']),
        })
    sorted_metadata_subset = sorted(metadata_subset, key=lambda x: custom_sort_key(x['Title']))
    return sorted_metadata_subset


def get_collection_size(custom_metadata):
    return round(sum([item['Size (kb)'] for item in custom_metadata]) / 1024, 1)


sanskrit_alphabet = [
    'a', 'ā', 'i', 'ī', 'u', 'ū', 'ṛ', 'ṝ', 'ḷ', 'ḹ', 'e', 'ai', 'o', 'au',
    'k', 'kh', 'g', 'gh', 'ṅ',
    'c', 'ch', 'j', 'jh', 'ñ',
    'ṭ', 'ṭh', 'ḍ', 'ḍh', 'ṇ',
    't', 'th', 'd', 'dh', 'n',
    'p', 'ph', 'b', 'bh', 'm',
    'y', 'r', 'l', 'v',
    'ś', 'ṣ', 's',
    'h',
    'ṃ', 'ḥ'
]


# Create a mapping of each symbol to its position
custom_order = {char: idx for idx, char in enumerate(sanskrit_alphabet)}


# Custom sort function
def custom_sort_key(word):
    word = word.lower()  # Normalize case to lowercase
    return [custom_order.get(word[i:i+2], custom_order.get(word[i], len(sanskrit_alphabet)))
            for i in range(len(word))]


def get_normalized_filename(filename, form='NFD'):
    return unicodedata.normalize(form, filename)



def calculate_all_sizes(file_type_paths: Dict[str, Path], data_path: Path):
    """
    Calculates all file group sizes and the total collection size.
    """
    logging.info("Calculating all file and group sizes...")

    file_group_sizes = {}

    # Calculate individual group sizes
    for key, path in file_type_paths.items():
        total_size = 0
        if path.exists():
            if path.is_file():
                total_size = path.stat().st_size
            elif path.is_dir():
                total_size = sum(p.stat().st_size for p in path.rglob('*') if p.is_file() and p.suffix != '.zip')
        file_group_sizes[key] = round(total_size / (1024 * 1024), 1)
    logging.info(f"File group sizes (MB): {file_group_sizes}")

    # Calculate total size from 'texts' and 'metadata' folders
    texts_path = data_path / 'texts'
    metadata_path = data_path / 'metadata'
    
    total_bytes = 0
    if texts_path.is_dir():
        total_bytes += sum(p.stat().st_size for p in texts_path.rglob('*') if p.is_file() and p.suffix != '.zip')
    if metadata_path.is_dir():
        total_bytes += sum(p.stat().st_size for p in metadata_path.rglob('*') if p.is_file() and p.suffix != '.zip')

    total_size_mb = round(total_bytes / (1024 * 1024), 1)
    logging.info(f"Total size calculated: {total_size_mb} MB")

    # Calculate plain text size
    plain_text_path = file_type_paths['txt']
    plain_text_bytes = 0
    if plain_text_path.is_dir():
        plain_text_bytes = sum(p.stat().st_size for p in plain_text_path.rglob('*') if p.is_file() and p.suffix != '.zip')
    value =  plain_text_bytes / (1024 * 1024)
    temp_plain_text_size_mb = round(value, 1)
    if temp_plain_text_size_mb == 0 and value > 0:
        plain_text_size_mb = round(value, 2)
    else:
        plain_text_size_mb = temp_plain_text_size_mb
    logging.info(f"Plain text size calculated: {plain_text_size_mb} MB")

    return file_group_sizes, total_size_mb, plain_text_size_mb
