"""Build a rulebook JSON for one TC Airworthiness Manual chapter (e.g. 527) from tc.canada.ca.

Usage:  python fetch/build_awm.py 527 --cache DIR

TC publishes the CURRENT text only. Each section is stored as one version labelled
"current", with the change markers found in its text, e.g. "(Change 527-4)" or
"(amended 2009/06/30)". Text at an earlier Change is not available from this source;
the page shows the current text and says so (confidence "current-only").
The Change list (number and date) comes from the chapter preamble.
"""
import argparse
import datetime
import hashlib
import html
import json
import pathlib
import re
import time
import urllib.request

OUT_DIR = pathlib.Path(__file__).resolve().parent.parent / "data" / "rulebooks"
ROOT = ("https://tc.canada.ca/en/corporate-services/acts-regulations/list-regulations/"
        "canadian-aviation-regulations-sor-96-433/standards/")
CHAPTERS = {
    "527": {
        "index": "airworthiness-manual-chapter-527-normal-category-rotorcraft-canadian-aviation-regulations-cars",
        "title": "AWM Chapter 527, Normal Category Rotorcraft",
    },
}
MONTHS = {m: i for i, m in enumerate(
    ["january", "february", "march", "april", "may", "june", "july", "august",
     "september", "october", "november", "december"], 1)}


def fetch(url, cache):
    name = re.sub(r"[^a-z0-9]+", "_", url.lower())[-120:] + ".html"
    path = pathlib.Path(cache) / name if cache else None
    if path and path.exists():
        return path.read_text()
    req = urllib.request.Request(url, headers={"user-agent": "Mozilla/5.0 certbasis/0.1"})
    with urllib.request.urlopen(req, timeout=120) as r:
        text = r.read().decode("utf-8", "replace")
    if path:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)
    time.sleep(1)
    return text


def to_text(fragment):
    """HTML fragment -> plain text, one list item or paragraph per line."""
    f = re.sub(r"(?s)<(script|style).*?</\1>", "", fragment)
    f = re.sub(r"(?i)<\s*(li|p|br|tr|h\d)[^>]*>", "\n", f)
    f = re.sub(r"<[^>]+>", "", f)
    f = html.unescape(f).replace("\xa0", " ")
    lines = [re.sub(r"[ \t]+", " ", ln).strip() for ln in f.split("\n")]
    return "\n".join(ln for ln in lines if ln)


def parse_date(s):
    s = s.strip().rstrip(".")
    for fmt in ("%B %d, %Y", "%d %B %Y"):
        try:
            return datetime.datetime.strptime(s, fmt).date().isoformat()
        except ValueError:
            pass
    return None


def changes_from_preamble(chapter, page_text):
    """Return [{'id': '527-3', 'seq': 30, 'effective': '1994-01-03', ...}]."""
    lines = page_text.split("\n")
    out = []
    for i, ln in enumerate(lines):
        m = re.fullmatch(r"\s*Change %s-(\d+)\s*" % chapter, ln)
        if not m:
            continue
        n = int(m.group(1))
        eff = pub = None
        for nxt in lines[i + 1:i + 4]:
            e = re.match(r"\s*(Effective|Published)\s*:\s*(.+)", nxt)
            if e:
                d = parse_date(e.group(2))
                if e.group(1) == "Effective":
                    eff = d
                else:
                    pub = d
        out.append({"id": "%s-%d" % (chapter, n), "seq": n * 10,
                    "label": "Change %s-%d" % (chapter, n),
                    "effective": eff or pub, "published": pub})
    return out


def sections_from_page(chapter, raw, url):
    """Split a subchapter page on <h3 id="527_1093"> headings."""
    out = {}
    heads = list(re.finditer(r'<h3 id="%s_([0-9A-Za-z_\-]+)">(.*?)</h3>' % chapter, raw, re.S))
    for k, h in enumerate(heads):
        end = heads[k + 1].start() if k + 1 < len(heads) else raw.find("<footer", h.end())
        body = raw[h.end():end if end > 0 else None]
        body = re.split(r"<h2[ >]", body)[0]
        sec = "%s.%s" % (chapter, h.group(1).replace("_", "-"))
        heading = to_text(h.group(2))
        heading = re.sub(r"^%s\s*" % re.escape(sec), "", heading).strip()
        text = to_text(body)
        markers = sorted(set(re.findall(r"Change\s*%s-\d+" % chapter, text)) |
                         set(re.findall(r"amended \d{4}/\d{2}/\d{2}", text)))
        out[sec] = {"section": sec, "subpart": None, "heading": heading, "versions": [{
            "amendment": "current", "seq": None, "effective": None, "heading": heading,
            "status": "in_force", "text": text,
            "sha256": hashlib.sha256(text.encode()).hexdigest(),
            "source": "%s#%s_%s" % (url, chapter, h.group(1)), "guid": None,
            "change_markers": [re.sub(r"\s+", " ", m) for m in markers],
        }]}
    return out


def build(chapter, cache=None):
    meta = CHAPTERS[chapter]
    index_url = ROOT + meta["index"]
    index = fetch(index_url, cache)
    changes = changes_from_preamble(chapter, to_text(index))
    links = sorted(set(re.sub(r"\s+", "", h).split("#")[0] for h in re.findall(
        r'href="(/en/[^"]*chapter-%s[^"]*subchapter[^"]*)"' % chapter, index)))
    sections = {}
    for link in links:
        url = "https://tc.canada.ca" + link
        sections.update(sections_from_page(chapter, fetch(url, cache), url))

    def key(s):
        nums = re.findall(r"\d+", s)
        return tuple(int(n) for n in nums)
    return {
        "rulebook": "AWM %s" % chapter, "authority": "TCCA", "id": "awm-%s" % chapter,
        "title": meta["title"], "source": index_url,
        "built": datetime.date.today().isoformat(), "confidence": "current-only",
        "note": "TC publishes the current text only. Text at an earlier Change is not shown "
                "unless an archived copy is loaded; check the change markers.",
        "amendments": changes,
        "sections": dict(sorted(sections.items(), key=lambda kv: key(kv[0]))),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("chapter")
    ap.add_argument("--cache", help="folder to cache fetched pages")
    a = ap.parse_args()
    book = build(a.chapter, a.cache)
    out = OUT_DIR / ("awm-%s.json" % a.chapter)
    out.write_text(json.dumps(book, indent=1, ensure_ascii=False))
    print("%s: %d sections, %d changes -> %s" % (book["rulebook"], len(book["sections"]),
                                                 len(book["amendments"]), out))


if __name__ == "__main__":
    main()
