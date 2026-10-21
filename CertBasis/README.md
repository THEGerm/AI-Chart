# CertBasis

CertBasis turns a certification basis, as a Transport Canada TCDS or an STC states it, into the exact regulation text at each amendment level. You can step through the levels of any section and compare two levels side by side.

It is a static page published from this repo with GitHub Pages: `https://thegerm.github.io/AI-Chart/CertBasis/`. It's Germ's own tool, with no login and no server.

## How it is organised

1. **Regulation library** (`data/rulebooks/`). Every section of a rulebook at every amendment that changed it. The text at level L is the latest version at or before L.
2. **TCDS library** (`data/tcds/`). One file per TCDS, with each model's basis as blocks: a rulebook through an amendment, sections held at other levels, n/a, deleted or replaced sections, special conditions, ESFs and references.
3. **STC layer** (`data/stc/`).
   - An existing STC (for example `SH14-47`, the Eagle 407HP) changes a model's basis.
   - A project (for example `B206-407-BASKET`) has a main model, selectable models with their deltas, applicable sections, elections, exceptions, special conditions, exemptions and additional regulations.

`resolver.js` holds all the logic and has no page code. `index.html`, `app.js` and `style.css` are the page.

## Data

| File | Source | Confidence |
|---|---|---|
| `14cfr-27.json` | FAA DRS API, doctype `FAR`: 276 sections, 568 versions, Initial (27-0) to 27-51 | official |
| `14cfr-36.json` | FAA DRS API, doctype `FAR` | official |
| `car-6.json` | FAA DRS doctype `CAR`, scanned PDFs of the 20 Dec 1956 edition and Amdt 6-1 to 6-7, transcribed | reconstructed |
| `awm-527.json` | tc.canada.ca, current text only, with the change markers found in each section | current only |

TC publishes only the current AWM text. When a basis cites an older Change, for example AWM 527 Change 527-3 in the Bell 407 basis, the page shows the current text with a warning. Example: 527.1581(e) was deleted at Change 527-4, so its 527-3 text is not on the TC site.

## Refreshing the data

Run these from a computer that holds the DRS key. The key never goes in this repo.

```bash
python3 CertBasis/fetch/build_far.py 27      # asks for the DRS API key once, saves it to ~/.certbasis/drs_api_key
python3 CertBasis/fetch/build_far.py 36
python3 CertBasis/fetch/build_awm.py 527
```

The DRS key comes from the DRS Help & Training "DRS API" page and lasts 12 months. The fetcher also reads the environment variable `DRS_API_KEY`.

DRS only accepts browser calls from its own site (CORS), so the page can't call DRS. The fetchers run in Python and the page reads the JSON they write.

## BigQuery

The dataset is `obsidian-377800.certbasis`, in `northamerica-northeast1`. Its tables are `source_document`, `reg_amendment` and `reg_section_version`.

```bash
gcloud auth application-default login         # once
pip install google-cloud-bigquery
python3 CertBasis/fetch/bq_load.py CertBasis/data/rulebooks/*.json      # full load, with text
```

`--sql-metadata` prints the same rows without the text, as SQL, for a session that can only run SQL.

## Tests

```bash
node --test CertBasis/tests/*.test.js
python3 -m unittest discover -s CertBasis/tests -p 'test_*.py'
node CertBasis/tests/ui_smoke.mjs http://localhost:8765/CertBasis/   # needs playwright-core and Chromium
```

CI runs the first two on every change under `CertBasis/`.
