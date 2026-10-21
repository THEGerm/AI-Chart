"""Load rulebook JSON files into BigQuery (project obsidian-377800, dataset certbasis).

Two modes:
  python fetch/bq_load.py data/rulebooks/14cfr-27.json ...
      Full load with text, using the google-cloud-bigquery client and your Google login
      (once: `gcloud auth application-default login`). Replaces the rows of each rulebook.
  python fetch/bq_load.py --sql-metadata data/rulebooks/*.json > load.sql
      Prints INSERT statements without the text (section, level, dates, hash) for a
      session that can only run SQL. The text stays in the JSON files.
"""
import argparse
import datetime
import json
import pathlib

PROJECT = "obsidian-377800"
DATASET = "certbasis"


def rows(book):
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    amds = [{"authority": book["authority"], "rulebook": book["rulebook"], "amendment": a["id"],
             "amendment_seq": a.get("seq"), "title": a.get("label"), "adopted_date": None,
             "effective_date": a.get("effective"), "citation": a.get("final_rule"),
             "source_id": book["source"]} for a in book["amendments"]]
    secs = []
    for s in book["sections"].values():
        vs = s["versions"]
        for i, v in enumerate(vs):
            nxt = vs[i + 1]["effective"] if i + 1 < len(vs) else None
            secs.append({"authority": book["authority"], "rulebook": book["rulebook"], "section": s["section"],
                         "heading": v.get("heading"), "amendment": v["amendment"], "amendment_seq": v.get("seq"),
                         "effective_from": v.get("effective"), "effective_to": nxt, "status": v.get("status"),
                         "text": v.get("text"), "text_sha256": v.get("sha256"),
                         "confidence": book.get("confidence"), "source_id": v.get("guid") or v.get("source") or book["source"],
                         "loaded_at": now})
    return amds, secs


def lit(v):
    if v is None:
        return "NULL"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n") + "'"


def sql_metadata(books, chunk=400):
    t = "`%s.%s`" % (PROJECT, DATASET)
    out = []
    for book in books:
        amds, secs = rows(book)
        rb = lit(book["rulebook"])
        out.append("DELETE FROM %s.reg_amendment WHERE rulebook = %s;" % (t, rb))
        out.append("DELETE FROM %s.reg_section_version WHERE rulebook = %s;" % (t, rb))
        vals = ["(%s)" % ", ".join([lit(a["authority"]), rb, lit(a["amendment"]), lit(a["amendment_seq"]),
                                    lit(a["title"]), "NULL",
                                    "DATE %s" % lit(a["effective_date"]) if a["effective_date"] else "NULL",
                                    lit(a["citation"]), lit(a["source_id"])]) for a in amds]
        out.append("INSERT INTO %s.reg_amendment VALUES %s;" % (t, ",\n".join(vals)))
        for i in range(0, len(secs), chunk):
            vals = ["(%s)" % ", ".join([lit(s["authority"]), rb, lit(s["section"]), lit(s["heading"]),
                                        lit(s["amendment"]), lit(s["amendment_seq"]),
                                        "DATE %s" % lit(s["effective_from"]) if s["effective_from"] else "NULL",
                                        "DATE %s" % lit(s["effective_to"]) if s["effective_to"] else "NULL",
                                        lit(s["status"]), "NULL", lit(s["text_sha256"]), lit(s["confidence"]),
                                        lit(s["source_id"]), "CURRENT_TIMESTAMP()"]) for s in secs[i:i + chunk]]
            out.append("INSERT INTO %s.reg_section_version VALUES %s;" % (t, ",\n".join(vals)))
    return "\n".join(out)


def full_load(books):
    from google.cloud import bigquery  # pip install google-cloud-bigquery
    client = bigquery.Client(project=PROJECT)
    for book in books:
        amds, secs = rows(book)
        for table, data in (("reg_amendment", amds), ("reg_section_version", secs)):
            client.query("DELETE FROM `%s.%s.%s` WHERE rulebook = @rb" % (PROJECT, DATASET, table),
                         job_config=bigquery.QueryJobConfig(query_parameters=[
                             bigquery.ScalarQueryParameter("rb", "STRING", book["rulebook"])])).result()
            job = client.load_table_from_json(data, "%s.%s.%s" % (PROJECT, DATASET, table))
            job.result()
            print("%s: %d rows into %s" % (book["rulebook"], len(data), table))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="+")
    ap.add_argument("--sql-metadata", action="store_true")
    a = ap.parse_args()
    books = [json.loads(pathlib.Path(f).read_text()) for f in a.files]
    if a.sql_metadata:
        print(sql_metadata(books))
    else:
        full_load(books)


if __name__ == "__main__":
    main()
