# CAR 6 build report

Output: `car-6.json` in this folder. Built 2026-10-21 from FAA DRS scans. Confidence: reconstructed.

## Counts

- Sections: 220. That is 206 in the December 20, 1956 edition plus 14 added by amendments (6.116, 6.226, 6.246, 6.247, 6.328, 6.418, 6.419, 6.447, 6.452, 6.606, 6.617, 6.618, 6.619, 6.637).
- Versions: 300. That is 206 base versions plus 94 amendment versions.
- Revoked: 6.445 and 6.446 (Amdt 6-4), 6.715 (Amdt 6-4). Their revoked versions carry the text "[Deleted]".

## Sources

- Base: `CAR6.pdf`, 20 pages, the GPO reprint "As amended to December 20, 1956" (CAB revision of Part 6 signed by M. C. Mulligan). It is complete: every section in the edition's table of contents is present, 6.0 through 6.751.
- Germ's Drive copy `faa-car-6-amdt-6-0a.pdf` is the same scan. Its OCR text was used as a second reading for every base section. It did not help where the scan itself is cut off (page 20, below).
- Amendments: the seven DRS PDFs. Each was read from the page image, column by column. The noisy text layers were used only to locate items.

## Amendments and the sections each changed

All operations listed in each amendment were applied. The build script checks that every quoted "delete X, insert Y" string occurs exactly once before it applies it.

| Amdt | Effective | Adopted or issued | Citation | Sections changed |
|---|---|---|---|---|
| 6-1 | 1957-04-01 | 1957-02-25 | notice 21 F.R. 3388 | 6.632, 6.637 (new) |
| 6-2 | 1957-08-12 | 1957-07-08 | notice 21 F.R. 9217 | 6.237, 6.246 (new), 6.247 (new), 6.383, 6.425, 6.441 |
| 6-3 | 1958-05-17 | 1958-04-15 | notice 22 F.R. 9116 | 6.1, 6.401 |
| 6-4 | 1959-10-01 | 1959-08-24 | notice 24 F.R. 128; F.R. Doc. 59-7153 | 6.1, 6.110, 6.111, 6.116 (new), 6.121, 6.123, 6.140, 6.203, 6.235, 6.237, 6.246, 6.247, 6.320, 6.328 (new), 6.420, 6.421, 6.424, 6.445 (deleted), 6.446 (deleted), 6.480, 6.485, 6.604, 6.606 (new), 6.612, 6.613, 6.621, 6.632, 6.715 (deleted), 6.732, 6.736, 6.741, 6.743 |
| 6-5 | 1962-05-03 | 1962-03-27 | Reg. Docket 107; 27 F.R. 2996 (March 30, 1962); notice 26 F.R. 5130; F.R. Doc. 62-3088 | 6.11, 6.203, 6.225, 6.226 (new), 6.237, 6.251, 6.306, 6.307, 6.340, 6.341, 6.418 (new), 6.419 (new), 6.420, 6.421, 6.424, 6.447 (new), 6.604, 6.605, 6.617 (new), 6.618 (new), 6.619 (new, redesignated from 6.621), 6.620, 6.621, 6.622, 6.623, 6.625, 6.626, 6.627, 6.634, 6.637, 6.642, 6.714, 6.738 |
| 6-6 | 1962-12-18 | 1962-12-18 | Reg. Docket 1530; 27 F.R. 12747 (December 27, 1962); F.R. Doc. 62-12682 | 6.623 |
| 6-7 | 1963-11-14 | 1963-10-08 | Reg. Docket 1512; 28 F.R. 10994 (October 15, 1963); notice 27 F.R. 12224; F.R. Doc. 63-10855 | 6.111, 6.113, 6.116, 6.121, 6.251, 6.304, 6.401, 6.427, 6.450, 6.451, 6.452 (new), 6.460, 6.461, 6.462, 6.463, 6.485, 6.604, 6.714 |

The 6-1, 6-2 and 6-3 sheets give no Federal Register page for the final rule, only the notice citation. That is what is recorded.

## Spot checks

I re-read these against the 300 dpi page image after the build. All matched word for word: 6.220, 6.225, 6.251, 6.307, 6.323, 6.623, 6.624, 6.625, 6.626, 6.637 (6-1 text, checked against the 6-1 scan and its text layer). I also checked 6.383 (c) and the 6.1 (e) (4) TAS formula at 600 dpi.

A word-level comparison against the Drive OCR found no transcription errors. Every disagreement it flagged was an OCR misreading or a column-order artifact on the OCR side.

## Illegible spots

| Section | Version | Page | What |
|---|---|---|---|
| 6.250 | 6-0 onward | CAR6.pdf p.10 | Intro: "paragraphs (a) through ([illegible])". The letter is a smudge at 600 dpi. The section runs (a) to (f), so it is probably (f), but this is not shown in the text. |
| 6.741 | 6-0 and 6-4 | CAR6.pdf p.20 | Paragraphs (b) to (g): the right edge of the third column is cut off in the scan. 26 gaps. |
| 6.742 | 6-0 | CAR6.pdf p.20 | Same cut-off edge. 9 gaps. |
| 6.743 | 6-0 and 6-4 | CAR6.pdf p.20 | Same cut-off edge. 9 gaps. |
| 6.750 | 6-0 | CAR6.pdf p.20 | Same cut-off edge. 10 gaps. |
| 6.751 | 6-0 | CAR6.pdf p.20 | Same cut-off edge. 3 gaps. |
| 6.604 (a) | 6-4, 6-5, 6-7 | CAR_06_04.pdf p.3 | "Carburetor air temperature indi[illegible]". The word is partly blotted. It is almost certainly "indicator". |

Germ's Drive copy has the same cut-off on page 20, so it cannot fill these gaps. A clean copy of the 1957 GPO reprint, or the 1956 Federal Register printing of the revision, would close them. Two items were restored with certainty because Amendment 6-4 quotes them: the 6.741 (f) "Limiting heights" sentence and the "(a) and (b)" in the 6.743 introduction. The headings of 6.743 and 6.744 come from the table of contents.

## Judgment calls and uncertain points

- **Scan-edge letters in 6-4.** Page 2 of the 6-4 scan clips one or two letters at the column edge. I restored these obvious words without marking them: 6.328 "alternate", 6.420 (b) "fuel" and "engine", 6.424 "automatically" and "such". The same words are complete elsewhere in the text or in the 6-5 restatement of 6.424.
- **6.1 (e) (4).** The 1956 edition prints "(TAS=EAS (po/ρ)^1/2)" with a roman "po". Amendment 6-4 corrects it to ρ0. Both versions are recorded as printed.
- **6.637 opening words.** "An airplane to be eligible for night operation" is as printed in Amendment 6-1, even though the part covers rotorcraft. It is not a transcription error.
- **6.251 (c) at 6-7.** "multiplying the means torque by 1.25" is as printed.
- **6.0** keeps the printed typo "applicaitons".
- **6.619.** 6-5 redesignated the 6-4 storage battery section 6.621 as 6.619. It is recorded as a new section at 6-5 with the 6-4 text and heading. 6.621 at 6-5 is the new "Generator controls" text.
- **6.420 at 6-4.** The amendment redesignated the old text as paragraph (a) without restating the paragraph heading. I wrote it as "(a) Capacity and feed." using the old section title, which follows the amendment's wording ("redesignating the present title and text as paragraph (a)").
- **Sections 6.623-1, 6.625-1, 6.625-2, 6.627-1.** 6-5 deletes these. They are CAA interpretive sections that are not in the CAB edition, so they are not in the file.
- **Center headings** (such as "Floats", renamed "Hulls and Floats" by 6-5) are not stored. Each section carries its subpart only.
- **Formulas and figures** are plain text. Examples: the tip speed ratio in 6.1 (h) (6), the effective-mass note in 6.237, and the effective intensity in 6.637 (d). Figures 6-1 to 6-4 are pipe-separated tables. Superscripts and subscripts are flattened (VNE, ρ0, sec²/ft⁴).
- **Footnotes** to 6.1 (¹ Part 13, ² Part 14, ³ NACA TN 1604) are kept at the end of the 6.1 text.
- **Typography.** The dashes inside the regulation text (for example the 6.225 (a) pilot force list and the 6.1 paragraph run-in heads) reproduce the printed text.
- **Version sources** give the amendment file and the page range of its rule text, not a page per section.
