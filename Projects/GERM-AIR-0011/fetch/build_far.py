"""Build a rulebook JSON for one 14 CFR part from DRS.

Usage:  python fetch/build_far.py 27            -> data/rulebooks/14cfr-27.json
        python fetch/build_far.py 27 --raw raw.json   (reuse a saved pull, no network)

Each DRS FAR document is one section at one amendment, with the text inline
(drs:farSectionRule). The rulebook keeps every version; the page resolves
"text at amendment L" as the latest version whose amendment is at or before L.
"""
import argparse
import datetime
import hashlib
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import drs  # noqa: E402

OUT_DIR = pathlib.Path(__file__).resolve().parent.parent / "data" / "rulebooks"


def amendment_seq(label, part):
    """Sort key for an amendment label: 'Initial' -> 0, '27-30' -> 300, '36-9A' -> 91.

    Ten slots per number leave room for lettered amendments (36-9A follows 36-9).
    The FAA also calls Initial 'Amdt 27-0'.
    """
    if label is None or label.strip().lower() in ("initial", "original", "%s-0" % part):
        return 0
    m = re.fullmatch(r"\s*%s-(\d+)([A-Z]?)\s*" % re.escape(part), label)
    if not m:
        raise ValueError("unexpected amendment label %r" % label)
    return int(m.group(1)) * 10 + (ord(m.group(2)) - 64 if m.group(2) else 0)


def amendment_id(label, part):
    """Canonical id: 'Initial' -> '27-0', '36-9A' stays '36-9A'."""
    return "%s-0" % part if amendment_seq(label, part) == 0 else label.strip()


def section_key(sec):
    """'Sec. 27.173' -> '27.173'."""
    return re.sub(r"^(Sec\.|§)\s*", "", sec.strip())


def clean(text):
    if not text or text == "_EMPTY_":
        return ""
    lines = [ln.rstrip() for ln in text.replace("\r", "").split("\n")]
    return "\n".join(ln.strip() for ln in lines).strip()


def section_sort(sec):
    """Numeric sections first in numeric order, then appendices by name."""
    parts = re.split(r"[.]", sec)
    if all(p.isdigit() for p in parts):
        return (0,) + tuple(int(p) for p in parts)
    return (1, sec)


def build(part, docs):
    sections, amendments = {}, {}
    for d in docs:
        sec = section_key(d["drs:sectionNumber"][0])
        label = (d.get("drs:farAmendmentNumber") or ["Initial"])[0]
        seq = amendment_seq(label, part)
        amd_id = amendment_id(label, part)
        eff = d.get("drs:effectiveDate")
        if eff in (None, "_EMPTY_"):
            eff = None
        title = (d.get("drs:title") or "").strip()
        text = clean(d.get("drs:farSectionRule"))
        status = "in_force"
        if re.match(r"(removed|re-designated|reserved)", title.lower()):
            status = re.match(r"([a-z-]+)", title.lower()).group(1).replace("re-designated", "redesignated")
        a = amendments.setdefault(amd_id, {"id": amd_id, "seq": seq,
                                           "label": "Initial (%s-0)" % part if seq == 0 else amd_id,
                                           "effective": eff,
                                           "final_rule": clean(d.get("drs:farFinalRuleActions"))})
        if eff and (a["effective"] is None or eff < a["effective"]):
            a["effective"] = eff
        s = sections.setdefault(sec, {"section": sec, "subpart": None, "versions": []})
        sub = d.get("drs:subPart")
        if isinstance(sub, list) and sub:
            s["subpart"] = sub[0]
        s["versions"].append({
            "amendment": amd_id, "seq": seq, "effective": eff, "heading": title,
            "status": status, "drs_status": d.get("drs:status"), "text": text,
            "sha256": hashlib.sha256(text.encode()).hexdigest(),
            "source": d.get("documentURL"), "guid": d.get("documentGuid"),
        })
    for s in sections.values():
        # Same amendment twice = an FAA correction published later. Keep both, oldest
        # first, so the corrected text is the one in force at that level; drop exact copies.
        s["versions"].sort(key=lambda v: (v["seq"], v["effective"] or ""))
        kept = []
        for v in s["versions"]:
            prev = kept[-1] if kept else None
            if prev and prev["amendment"] == v["amendment"]:
                if prev["sha256"] == v["sha256"]:
                    continue
                v["correction"] = "corrected text, effective %s" % v["effective"]
            kept.append(v)
        s["versions"] = kept
        live = [v for v in s["versions"] if v["status"] == "in_force"]
        s["heading"] = (live or s["versions"])[-1]["heading"]
    return {
        "rulebook": "14 CFR %s" % part, "authority": "FAA", "id": "14cfr-%s" % part,
        "title": docs[0]["drs:partNumberDescription"][0] if docs else "",
        "source": "FAA DRS data-pull API, doctype FAR",
        "built": datetime.date.today().isoformat(),
        "confidence": "official",
        "amendments": sorted(amendments.values(), key=lambda a: a["seq"]),
        "sections": dict(sorted(sections.items(), key=lambda kv: section_sort(kv[0]))),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("part")
    ap.add_argument("--raw", help="saved DRS pull (JSON list or page) instead of fetching")
    ap.add_argument("--save-raw", help="also save the raw documents here")
    args = ap.parse_args()
    if args.raw:
        raw = json.loads(pathlib.Path(args.raw).read_text())
        docs = raw["documents"] if isinstance(raw, dict) else raw
    else:
        docs = list(drs.pull("FAR", {"drs:documentNumber": [args.part]}))
    if args.save_raw:
        pathlib.Path(args.save_raw).write_text(json.dumps(docs))
    book = build(args.part, docs)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / ("14cfr-%s.json" % args.part)
    out.write_text(json.dumps(book, indent=1, ensure_ascii=False))
    print("%s: %d sections, %d versions, %d amendments -> %s" % (
        book["rulebook"], len(book["sections"]),
        sum(len(s["versions"]) for s in book["sections"].values()),
        len(book["amendments"]), out))


if __name__ == "__main__":
    main()
