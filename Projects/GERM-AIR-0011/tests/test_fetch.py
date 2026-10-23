"""Tests for the fetch scripts. Run: python3 -m unittest discover -s Projects/GERM-AIR-0011/tests -p 'test_*.py'"""
import json
import pathlib
import sys
import unittest

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "fetch"))
import build_awm  # noqa: E402
import build_far  # noqa: E402
import bq_load  # noqa: E402

DATA = HERE.parent / "data" / "rulebooks"


def doc(sec, amd, eff, text, title="Heading."):
    return {"drs:sectionNumber": ["Sec. " + sec], "drs:farAmendmentNumber": [amd],
            "drs:effectiveDate": eff, "drs:title": title, "drs:farSectionRule": text,
            "drs:subPart": ["Subpart B - Flight"], "drs:status": "Historical",
            "drs:partNumberDescription": ["Part 27 - TEST"], "drs:farFinalRuleActions": "FR",
            "documentURL": "https://example/" + sec + amd, "documentGuid": "g-" + sec + amd}


class FarBuild(unittest.TestCase):
    def test_amendment_labels(self):
        self.assertEqual(build_far.amendment_seq("Initial", "27"), 0)
        self.assertEqual(build_far.amendment_seq("27-30", "27"), 300)
        self.assertEqual(build_far.amendment_seq("36-9A", "36"), 91)
        self.assertLess(build_far.amendment_seq("36-9", "36"), build_far.amendment_seq("36-9A", "36"))
        self.assertEqual(build_far.amendment_id("Initial", "27"), "27-0")
        with self.assertRaises(ValueError):
            build_far.amendment_seq("25-1", "27")

    def test_build_orders_versions_and_sections(self):
        docs = [doc("27.173", "27-21", "1984-12-06", "(a) new"), doc("27.173", "Initial", "1965-02-01", "(a) old"),
                doc("27.21", "Initial", "1965-02-01", "x"), doc("27.401", "27-25", "1990-01-01", "", "Removed")]
        book = build_far.build("27", docs)
        self.assertEqual(list(book["sections"]), ["27.21", "27.173", "27.401"])
        self.assertEqual([v["amendment"] for v in book["sections"]["27.173"]["versions"]], ["27-0", "27-21"])
        self.assertEqual(book["sections"]["27.401"]["versions"][0]["status"], "removed")
        self.assertEqual(book["amendments"][0]["label"], "Initial (27-0)")

    def test_live_part27_file(self):
        book = json.loads((DATA / "14cfr-27.json").read_text())
        self.assertGreaterEqual(len(book["sections"]), 270)
        for s in book["sections"].values():
            seqs = [v["seq"] for v in s["versions"]]
            self.assertEqual(seqs, sorted(seqs), s["section"])


class AwmBuild(unittest.TestCase):
    PAGE = ('<h3 id="527_1581">527.1581 General</h3><ol><li>(a) Furnishing information.</li>'
            '<li>(e) <strong>[</strong>Deleted<strong>]</strong>.<p>(Change&nbsp;527-4)</p></li></ol>'
            '<h3 id="527_1583">527.1583 Operating Limitations</h3><ol><li>(a) Airspeed.</li></ol><footer>')

    def test_sections_and_change_markers(self):
        secs = build_awm.sections_from_page("527", self.PAGE, "https://x")
        self.assertEqual(list(secs), ["527.1581", "527.1583"])
        v = secs["527.1581"]["versions"][0]
        self.assertEqual(v["change_markers"], ["Change 527-4"])
        self.assertIn("(e) [Deleted].", v["text"])
        self.assertEqual(secs["527.1581"]["heading"], "General")

    def test_preamble_changes(self):
        text = "Change 527-3\nEffective: January 3, 1994\nblah\nChange 527-8\nPublished: 30 June 2009"
        ch = build_awm.changes_from_preamble("527", text)
        self.assertEqual([(c["id"], c["effective"]) for c in ch], [("527-3", "1994-01-03"), ("527-8", "2009-06-30")])


class BqLoad(unittest.TestCase):
    def test_literal_escaping(self):
        self.assertEqual(bq_load.lit("O'Neil\\x\n"), "'O\\'Neil\\\\x\\n'")
        self.assertEqual(bq_load.lit(None), "NULL")
        self.assertEqual(bq_load.lit(30), "30")

    def test_metadata_sql_has_no_text(self):
        book = build_far.build("27", [doc("27.173", "Initial", "1965-02-01", "SECRET TEXT")])
        sql = bq_load.sql_metadata([book])
        self.assertNotIn("SECRET TEXT", sql)
        self.assertIn("DELETE FROM `obsidian-377800.certbasis`.reg_section_version", sql)


if __name__ == "__main__":
    unittest.main()
