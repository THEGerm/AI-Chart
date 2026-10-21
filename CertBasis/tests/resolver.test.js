// Run: node --test CertBasis/tests/
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const CB = require("../resolver.js");

const DATA = path.join(__dirname, "..", "data");
const load = (p) => JSON.parse(fs.readFileSync(path.join(DATA, p), "utf8"));
const books = {};
for (const f of fs.readdirSync(path.join(DATA, "rulebooks")).filter((f) => f.endsWith(".json"))) {
  const b = load(path.join("rulebooks", f));
  books[b.id] = b;
}
const h92 = load("tcds/H-92.json");
const stcs = { "SH14-47": load("stc/SH14-47.json") };
const p27 = books["14cfr-27"];
const row = (rows, s) => rows.find((r) => r.rulebook === "14cfr-27" && r.section === s && !r.scope);

test("27.173 resolves to the last version at or before the level", () => {
  assert.equal(CB.versionAt(p27, "27.173", "27-1").amendment, "27-0");
  assert.equal(CB.versionAt(p27, "27.173", "27-30").amendment, "27-21");
  assert.equal(CB.versionAt(p27, "27.173", "27-44").amendment, "27-44");
  assert.equal(CB.levelLabel(p27, "27-0"), "Initial (27-0)");
});

test("a section added later is not in force at an earlier level", () => {
  assert.equal(CB.versionAt(p27, "27.1317", "27-30"), null);
  assert.ok(CB.versionAt(p27, "27.1317", "27-42"));
});

test("Model 407 basis carries the TCDS exceptions", () => {
  const rows = CB.expandModel(h92, "407", books);
  assert.equal(row(rows, "27.173").level, "27-1");
  assert.equal(row(rows, "27.562").kind, "n/a");
  assert.equal(row(rows, "27.1195").kind, "n/a");
  const r561 = row(rows, "27.561");
  assert.equal(r561.level, "27-30");
  assert.deepEqual(r561.paragraphs.map((p) => [p.paragraph, p.level]), [["(b)(3)(i)-(iv)", "27-0"]]);
  assert.equal(row(rows, "27.1317").level, "27-42");
  assert.match(row(rows, "27.1317").condition, /C47E\/4/);
  assert.ok(rows.some((r) => r.kind === "special_condition" && r.note === "SCA 95-02"));
});

test("Eagle 407HP (SH14-47) puts 27.1195 at 27-5 and adds four ESFs", () => {
  const rows = CB.expandStc(stcs["SH14-47"], h92, books);
  const r = rows.filter((x) => x.rulebook === "14cfr-27" && x.section === "27.1195");
  assert.equal(r.length, 1);
  assert.equal(r[0].level, "27-5");
  assert.equal(rows.filter((x) => x.kind === "esf" && x.stc === "SH14-47").length, 4);
});

test("206L-4: deleted and replaced sections, CAR 6 block", () => {
  const rows = CB.expandModel(h92, "206L-4", books);
  assert.equal(row(rows, "27.71").kind, "deleted");
  assert.equal(row(rows, "27.391").kind, "replaced");
  assert.equal(row(rows, "27.2").level, "27-28");
  assert.ok(rows.some((r) => r.rulebook === "car-6" && r.section === "6.623"));
});

test("206L-3 differs from the 206L-1 on 27.1529 only (outside CAR 6)", () => {
  const a = CB.expandModel(h92, "206L-1", books);
  const b = CB.expandModel(h92, "206L-3", books);
  const cmp = CB.compareRows(a, b, ["14cfr-27|27.1529"]);
  assert.equal(cmp[0].differs, true);
  assert.equal(cmp[0].levelB, "27-18");
});

test("every Part 27 section and level named in H-92 and SH14-47 exists in the rulebook", () => {
  const problems = [];
  const check = (s, level, where) => {
    if (CB.SPECIAL_LEVELS.includes(level)) return;
    if (!p27.sections[s]) problems.push(`${where}: ${s} not in 14 CFR 27`);
    else if (!CB.versionAt(p27, s, level)) problems.push(`${where}: ${s} not in force at ${level}`);
  };
  const walk = (blocks, where) => {
    for (const b of blocks) {
      if (b.rulebook !== "14cfr-27") continue;
      for (const it of b.items || []) for (const s of it.sections) check(s, it.level, where);
      for (const o of b.overrides || []) for (const s of o.sections) check(s, o.level, where);
      if (b.type === "esf") for (const s of b.sections) check(s, b.level || "current", where);
    }
  };
  for (const m of h92.models) walk(m.basis, `H-92 ${m.id}`);
  walk(stcs["SH14-47"].basis, "SH14-47");
  assert.deepEqual(problems, []);
});

test("word diff marks insertions and deletions", () => {
  const d = CB.diffWords("must not be greater than ten percent", "must not be greater than twenty percent");
  assert.deepEqual(d.filter((x) => x.op !== "=").map((x) => [x.op, x.text.trim()]), [["-", "ten"], ["+", "twenty"]]);
});

test("Markdown export lists the basis with sources", () => {
  const rows = CB.expandModel(h92, "407", books).filter((r) => ["27.173", "27.175"].includes(r.section));
  const md = CB.toMarkdown("Test", rows, books, { withText: true, date: "2026-10-21" });
  assert.match(md, /\| 14 CFR 27 \| 27\.173 \|/);
  assert.match(md, /Initial \(27-0\)/);
  assert.match(md, /Source: https:\/\/drs\.faa\.gov/);
});

test("every CAR 6 section and level named in H-92 exists in car-6", () => {
  const car6 = books["car-6"];
  assert.ok(car6, "car-6.json loaded");
  const problems = [];
  const walk = (blocks, where) => {
    for (const b of blocks) {
      if (b.rulebook !== "car-6") continue;
      for (const it of b.items || []) for (const s of it.sections) if (!CB.versionAt(car6, s, it.level)) problems.push(`${where}: ${s} at ${it.level}`);
      for (const o of b.overrides || []) for (const s of o.sections) if (!CB.versionAt(car6, s, o.level)) problems.push(`${where}: ${s} at ${o.level}`);
    }
  };
  walk(h92.shared_blocks.car6_base, "car6_base");
  for (const m of h92.models) walk(m.basis, `H-92 ${m.id}`);
  assert.deepEqual(problems, []);
  const rows = CB.expandModel(h92, "206L", books);
  assert.ok(rows.filter((r) => r.rulebook === "car-6" && r.kind === "basis").length > 150);
  assert.equal(rows.find((r) => r.section === "6.637").level, "6-5");
});
