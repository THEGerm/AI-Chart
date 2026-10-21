"""FAA Dynamic Regulatory System (DRS) data-pull client.

Endpoints (from the third-party faa-drs package, checked live 2026-10-21):
  GET  https://drs.faa.gov/api/drs/data-pull/{doctype}?offset=N
  POST https://drs.faa.gov/api/drs/data-pull/{doctype}/filtered
       body {"offset": N, "documentFilters": {"<field>": ["v", ...]}}
  GET  https://drs.faa.gov/api/drs/data-pull/download/{file_id}
Header: x-api-key. At most 750 documents per page.

The key is never stored in this repo. Lookup order:
  1. environment variable DRS_API_KEY
  2. ~/.certbasis/drs_api_key (written on first use, mode 600)
  3. prompt (getpass), then save to 2.
"""
import getpass
import json
import os
import pathlib
import time
import urllib.error
import urllib.request

BASE_URL = "https://drs.faa.gov/api/drs/data-pull"
KEY_FILE = pathlib.Path.home() / ".certbasis" / "drs_api_key"
USER_AGENT = "certbasis/0.1 (+https://github.com/THEGerm/AI-Chart/tree/main/CertBasis)"
PAGE_SIZE = 750
PAUSE_S = 1.0  # polite gap between requests


def get_key(prompt=True):
    """Return the DRS API key, asking once and saving it if none is found."""
    key = os.environ.get("DRS_API_KEY", "").strip()
    if key:
        return key
    if KEY_FILE.exists():
        return KEY_FILE.read_text().strip()
    if not prompt:
        raise RuntimeError("No DRS API key: set DRS_API_KEY or run interactively once.")
    key = getpass.getpass("FAA DRS API key (saved to %s): " % KEY_FILE).strip()
    KEY_FILE.parent.mkdir(parents=True, exist_ok=True)
    KEY_FILE.write_text(key + "\n")
    KEY_FILE.chmod(0o600)
    return key


def _request(url, key, body=None, retries=4):
    data = None if body is None else json.dumps(body).encode()
    headers = {"x-api-key": key, "accept": "*/*", "user-agent": USER_AGENT}
    if data is not None:
        headers["content-type"] = "application/json"
    for attempt in range(retries):
        req = urllib.request.Request(url, data=data, headers=headers,
                                     method="POST" if data is not None else "GET")
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                return resp.read()
        except urllib.error.HTTPError as err:
            if err.code in (429, 500, 502, 503, 504) and attempt < retries - 1:
                time.sleep(float(err.headers.get("Retry-After") or 2 ** (attempt + 1)))
                continue
            raise
    raise RuntimeError("unreachable")


def pull(doctype, filters=None, key=None):
    """Yield every document of a doctype, optionally filtered, page by page."""
    key = key or get_key()
    offset = 0
    while True:
        if filters:
            raw = _request("%s/%s/filtered" % (BASE_URL, doctype), key,
                           {"offset": offset, "documentFilters": filters})
        else:
            raw = _request("%s/%s?offset=%d" % (BASE_URL, doctype, offset), key)
        page = json.loads(raw)
        docs = page.get("documents") or []
        yield from docs
        if not page.get("summary", {}).get("hasMoreItems") or not docs:
            return
        offset += len(docs)
        time.sleep(PAUSE_S)


def download(url, key=None):
    """Download a document's main file (PDF or HTML) as bytes."""
    return _request(url, key or get_key())
