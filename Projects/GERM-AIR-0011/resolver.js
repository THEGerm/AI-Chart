/* CertBasis resolver: pure functions, no DOM. Works in the browser (window.CertBasis)
 * and in Node (require). Data files are described in README.md.
 *
 * Levels. A rulebook lists its amendments with a sort key "seq". The text of a section at
 * level L is the latest version whose seq is at or before seq(L). "current" means the
 * latest version. A section with no version at or before L did not exist at L.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CertBasis = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const SPECIAL_LEVELS = ["n/a", "deleted", "replaced"];

  function levelSeq(book, level) {
    if (level === "current" || level == null) return Infinity;
    const a = book.amendments.find((x) => x.id === level);
    if (!a) throw new Error(`${book.rulebook}: unknown level ${level}`);
    return a.seq == null ? Infinity : a.seq;
  }

  function levelLabel(book, level) {
    if (SPECIAL_LEVELS.includes(level)) return level;
    if (level === "current") return "current";
    if (book && book.id === "14cfr-27" && level === "27-0") return "Initial (27-0)";
    const a = book && book.amendments.find((x) => x.id === level);
    return a && a.label ? a.label.replace(/^Change /, "") : level;
  }

  /** Version of a section in force at a level, or null if it did not exist yet. */
  function versionAt(book, section, level) {
    const s = book.sections[section];
    if (!s) return null;
    const seq = levelSeq(book, level);
    let found = null;
    for (const v of s.versions) {
      const vs = v.seq == null ? -Infinity : v.seq; // "current"-only rulebooks
      if (vs <= seq) found = v;
    }
    return found;
  }

  /** {text, version, exact} for a section at a level. exact=false when the rulebook
   * holds only current text and the level asked is older. */
  function textAt(book, section, level) {
    const v = versionAt(book, section, level);
    if (!v) return { text: null, version: null, exact: true, inForce: false };
    const exact = !(v.seq == null && level !== "current");
    return { text: v.text, version: v, exact, inForce: v.status === "in_force" };
  }

  /** Sections in force at a level, optionally limited to a subpart (substring match). */
  function sectionsInForce(book, level, subpart) {
    const out = [];
    for (const [id, s] of Object.entries(book.sections)) {
      if (subpart && !(s.subpart || "").includes(`Subpart ${subpart}`)) continue;
      if (!/^\d/.test(id) || id === "0.0") continue;
      const v = versionAt(book, id, level);
      if (v && v.status === "in_force") out.push(id);
    }
    return out;
  }

  function heading(book, section) {
    const s = book && book.sections[section];
    return s ? s.heading || "" : "";
  }

  /** Expand one model's basis into rows. books: {id: rulebook}. tcds: TCDS object. */
  function expandModel(tcds, modelId, books, opts) {
    opts = opts || {};
    const model = tcds.models.find((m) => m.id === modelId);
    if (!model) throw new Error(`No model ${modelId} in ${tcds.id}`);
    return expandBlocks(model.basis, tcds, books, { scope: opts.scope || null, source: `TCDS ${tcds.id}, ${model.name}` });
  }

  function expandBlocks(blocks, tcds, books, ctx) {
    const rows = [];
    for (const b of blocks) {
      const scope = b.scope || ctx.scope || null;
      if (b.use) {
        rows.push(...expandBlocks(tcds.shared_blocks[b.use], tcds, books, { ...ctx, scope }));
      } else if (b.use_model) {
        rows.push(...expandModel(tcds, b.use_model, books, { scope }).map((r) => ({ ...r, scope: scope || r.scope })));
      } else if (b.type === "rulebook") {
        const book = books[b.rulebook];
        if (!book) { rows.push(missingBook(b, scope, ctx)); continue; }
        const overrides = {};
        for (const o of b.overrides || []) for (const s of o.sections) (overrides[s] = overrides[s] || []).push(o);
        const listed = new Set(sectionsInForce(book, b.through, b.subpart));
        for (const s of Object.keys(overrides)) listed.add(s);
        for (const s of [...listed].sort(sectionOrder)) {
          const os = overrides[s] || [];
          const whole = os.find((o) => !o.paragraph);
          const parts = os.filter((o) => o.paragraph);
          const level = whole ? whole.level : b.through;
          rows.push({
            rulebook: b.rulebook, section: s, heading: heading(book, s), level,
            kind: SPECIAL_LEVELS.includes(level) ? level : whole ? "override" : "basis",
            paragraphs: parts.map((p) => ({ paragraph: p.paragraph, level: p.level, note: p.note || null })),
            note: whole && whole.note ? whole.note : null,
            condition: whole && whole.condition ? whole.condition : null,
            block: b.label || `${book.rulebook} through ${b.through}`, scope, source: ctx.source,
          });
        }
      } else if (b.type === "sections") {
        const book = books[b.rulebook];
        for (const it of b.items) for (const s of it.sections) {
          rows.push({
            rulebook: b.rulebook, section: s, heading: book ? heading(book, s) : it.title || "", level: it.level,
            kind: "listed", paragraphs: it.paragraph ? [{ paragraph: it.paragraph, level: it.level, note: null }] : [],
            note: it.paragraph ? `paragraph ${it.paragraph} only` : null, condition: null,
            block: b.label || (book ? book.rulebook : b.rulebook), scope, source: ctx.source, missingBook: !book,
          });
        }
      } else if (["esf", "special_condition", "exemption", "reference", "exception"].includes(b.type)) {
        const book = books[b.rulebook];
        rows.push({
          rulebook: b.rulebook || null, section: (b.sections || []).join(", ") || null,
          sections: b.sections || [], heading: b.title || "", level: b.level || null, kind: b.type,
          paragraphs: b.paragraph ? [{ paragraph: b.paragraph, level: b.level || null, note: null }] : [],
          note: b.ref || null, condition: b.condition || null, date: b.date || null,
          block: b.ref || b.title, scope, source: ctx.source, missingBook: b.rulebook ? !book : false,
        });
      } else {
        throw new Error(`Unknown block ${JSON.stringify(b).slice(0, 80)}`);
      }
    }
    return rows;
  }

  function missingBook(b, scope, ctx) {
    return { rulebook: b.rulebook, section: null, heading: b.label || b.rulebook, level: b.through, kind: "missing",
      paragraphs: [], note: `Rulebook ${b.rulebook} not loaded yet`, condition: null, block: b.label, scope, source: ctx.source, missingBook: true };
  }

  function sectionOrder(a, b) {
    const pa = a.split(/[.\-]/).map((x) => (/^\d+$/.test(x) ? +x : x));
    const pb = b.split(/[.\-]/).map((x) => (/^\d+$/.test(x) ? +x : x));
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      if (pa[i] === undefined) return -1;
      if (pb[i] === undefined) return 1;
      if (pa[i] === pb[i]) continue;
      if (typeof pa[i] === "number" && typeof pb[i] === "number") return pa[i] - pb[i];
      return String(pa[i]).localeCompare(String(pb[i]));
    }
    return 0;
  }

  /** Apply an existing STC (e.g. SH14-47) on top of a model: its own rows replace the
   * model rows for the same rulebook and section, and ESFs are added. */
  function expandStc(stc, tcds, books) {
    const base = [];
    const own = [];
    for (const b of stc.basis) {
      if (b.use_model) base.push(...expandModel(tcds, b.use_model, books));
      else own.push(...expandBlocks([b], tcds, books, { scope: null, source: `STC ${stc.id}` }));
    }
    const replaced = new Set(own.filter((r) => r.kind === "listed").map((r) => `${r.rulebook}|${r.section}`));
    return [...base.filter((r) => !replaced.has(`${r.rulebook}|${r.section}`)), ...own.map((r) => ({ ...r, stc: stc.id }))];
  }

  /** Rows for a project model choice: {model, stc?}. */
  function rowsFor(choice, tcds, books, stcs) {
    if (choice.stc) return expandStc(stcs[choice.stc], tcds, books);
    return expandModel(tcds, choice.model, books);
  }

  /** Apply project elections: [{rulebook, section, level, reason}] -> rows with kind "elected". */
  function applyElections(rows, elections) {
    const out = rows.map((r) => ({ ...r }));
    for (const e of elections || []) {
      const r = out.find((x) => x.rulebook === e.rulebook && x.section === e.section && !["esf", "special_condition", "exemption", "reference"].includes(x.kind));
      if (r) { r.electedFrom = r.level; r.level = e.level; r.kind = "elected"; r.note = e.reason || r.note; }
      else out.push({ rulebook: e.rulebook, section: e.section, heading: "", level: e.level, kind: "elected", paragraphs: [], note: e.reason || null, block: "Applicant election", scope: null });
    }
    return out;
  }

  /** Index rows by "rulebook|section" for regulation rows (one per section; scoped rows kept apart). */
  function index(rows) {
    const m = new Map();
    for (const r of rows) {
      if (!r.section || ["esf", "special_condition", "exemption", "reference"].includes(r.kind)) continue;
      const k = `${r.rulebook}|${r.section}${r.scope ? `|${r.scope}` : ""}`;
      m.set(k, r);
    }
    return m;
  }

  /** Compare two models' rows for a list of sections (rulebook|section keys or bare ids). */
  function compareRows(rowsA, rowsB, sections) {
    const pick = (rows, key) => rows.filter((r) => r.section && `${r.rulebook}|${r.section}` === key && !["esf", "special_condition", "exemption", "reference"].includes(r.kind));
    return sections.map((key) => {
      const a = pick(rowsA, key);
      const b = pick(rowsB, key);
      const la = a.map((r) => r.level + (r.scope ? ` [${r.scope}]` : "")).join("; ") || "not in basis";
      const lb = b.map((r) => r.level + (r.scope ? ` [${r.scope}]` : "")).join("; ") || "not in basis";
      return { key, levelA: la, levelB: lb, differs: la !== lb };
    });
  }

  /** Word-level diff: returns [{op: "=", "+", "-", text}]. */
  function diffWords(a, b) {
    const ta = tokenize(a || "");
    const tb = tokenize(b || "");
    const n = ta.length, m = tb.length;
    if (n * m > 4e6) return [{ op: "-", text: a }, { op: "+", text: b }];
    const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
      dp[i][j] = ta[i] === tb[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const out = [];
    const push = (op, t) => { if (out.length && out[out.length - 1].op === op) out[out.length - 1].text += t; else out.push({ op, text: t }); };
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (ta[i] === tb[j]) { push("=", ta[i]); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) push("-", ta[i++]);
      else push("+", tb[j++]);
    }
    while (i < n) push("-", ta[i++]);
    while (j < m) push("+", tb[j++]);
    return out;
  }

  function tokenize(s) { return s.match(/\s+|[^\s]+/g) || []; }

  function levelsOf(book, section) {
    const s = book.sections[section];
    return s ? s.versions.map((v) => ({ amendment: v.amendment, effective: v.effective, status: v.status })) : [];
  }

  /** Markdown listing for a set of rows. */
  function toMarkdown(title, rows, books, opts) {
    opts = opts || {};
    const lines = [`# ${title}`, "", `Generated ${opts.date || new Date().toISOString().slice(0, 10)} by CertBasis. Sources are cited per section.`, ""];
    const regs = rows.filter((r) => r.section && !["esf", "special_condition", "exemption", "reference"].includes(r.kind));
    const others = rows.filter((r) => ["esf", "special_condition", "exemption", "reference"].includes(r.kind));
    lines.push("## Basis", "", "| Rulebook | Section | Heading | Level | Text in force from | Note |", "|---|---|---|---|---|---|");
    for (const r of regs) {
      const book = books[r.rulebook];
      const para = (r.paragraphs || []).map((p) => `${p.paragraph} at ${levelLabel(book, p.level)}${p.note ? ` (${p.note})` : ""}`).join("; ");
      const note = [r.kind === "elected" ? `elected (from ${levelLabel(book, r.electedFrom)})` : null, r.note, para, r.condition, r.scope].filter(Boolean).join("; ");
      const v = book && !SPECIAL_LEVELS.includes(r.level) ? versionAt(book, r.section, r.level) : null;
      const from = v ? `${levelLabel(book, v.amendment)}${v.effective ? `, ${v.effective}` : ""}` : "";
      lines.push(`| ${book ? book.rulebook : r.rulebook} | ${r.section} | ${r.heading || ""} | ${levelLabel(book, r.level)} | ${from} | ${note.replace(/\|/g, "/")} |`);
    }
    if (others.length) {
      lines.push("", "## Special conditions, ESFs, exemptions and references", "");
      for (const r of others) lines.push(`- **${r.kind.replace("_", " ")}**: ${r.heading || ""}${r.section ? ` (${r.section}${r.paragraphs.length ? ` ${r.paragraphs[0].paragraph}` : ""})` : ""}${r.level ? ` at ${r.level}` : ""}${r.note ? `, ${r.note}` : ""}${r.condition ? `, ${r.condition}` : ""}`);
    }
    if (opts.withText) {
      lines.push("", "## Text", "");
      for (const r of regs) {
        const book = books[r.rulebook];
        if (!book || SPECIAL_LEVELS.includes(r.level)) continue;
        const t = textAt(book, r.section, r.level);
        lines.push(`### ${book.rulebook} ${r.section} ${r.heading || ""}, at ${levelLabel(book, r.level)}`, "");
        if (t.version && t.version.amendment !== r.level && t.version.seq != null) lines.push(`Text in force from ${levelLabel(book, t.version.amendment)} (${t.version.effective || "date unknown"}).`, "");
        if (!t.text) { lines.push("_Not in force at this level._", ""); continue; }
        if (!t.exact) lines.push("> Current text shown: the text at this Change is not loaded.", "");
        lines.push(t.text, "", `Source: ${t.version.source || book.source} (version ${t.version.amendment}, sha256 ${t.version.sha256.slice(0, 12)})`, "");
      }
    }
    return lines.join("\n");
  }

  return { levelSeq, levelLabel, versionAt, textAt, sectionsInForce, expandModel, expandStc, rowsFor,
    applyElections, compareRows, diffWords, levelsOf, toMarkdown, sectionOrder, index, SPECIAL_LEVELS };
});
