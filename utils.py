import collections
import json
import logging
import os
import time
from typing import Dict, List
import unicodedata
from urllib.parse import quote

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
        # Assuming the __version__ line is the first line
        return file.readline().strip().split('=')[1].strip().replace("'", "").replace('"', '')


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


def load_metadata(file_path="static/data/metadata.json") -> Dict:
    with open(file_path, "r", encoding="utf-8") as f:
        metadata = json.load(f)
    ordered_metadata = collections.OrderedDict(sorted(metadata.items()))
    return ordered_metadata


def get_filename_info(record):
    if 'XML Filename' in record:
        return record['XML Filename']
    elif 'Draft Filename' in record:
        return record['Draft Filename']

def get_author_info(record):
    if 'Author(s)' not in record:
        return None
    elif len(record['Author(s)']) == 1:
        return record['Author(s)'][0]
    else:
        return ', '.join(record['Author(s)'])

def get_custom_metadata_subset(full_metadata: Dict[str, Dict]) -> List[Dict]:
    """
    :param full_metadata: mapping with unique id (mostly = catalog num) to full record (~18 fields)
    :return: flattened list of dicts with 4 fields
    """
    metadata_subset = []
    for (key, record) in full_metadata.items():
        control_num = record['Control number']
        filename = get_filename_info(record)
        work_title = record['Work Title']
        author_info = get_author_info(record)
        metadata_subset.append({
            'control_number': control_num,
            'filename': filename,
            'title': work_title,
            'author': author_info,
        })
    sorted_metadata_subset = sorted(metadata_subset, key=lambda x: custom_sort_key(x['title']))
    return sorted_metadata_subset


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
