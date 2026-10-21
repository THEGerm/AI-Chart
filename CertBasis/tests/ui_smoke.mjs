// UI smoke test for the CertBasis web pages (Playwright, Chromium).
// Usage: node CertBasis/tests/ui_smoke.mjs [baseUrl]
//   baseUrl defaults to http://localhost:8765/CertBasis/ (serve the repo root with python3 -m http.server 8765)
// Env: PW_CORE   path to playwright-core's index.mjs if it is not resolvable from here
//      CHROMIUM  browser executable (default /opt/pw-browsers/chromium)
//      SHOTS     folder for screenshots (optional)
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const base = process.argv[2] || "http://localhost:8765/CertBasis/";
const pw = await import(process.env.PW_CORE ? pathToFileURL(process.env.PW_CORE).href : "playwright-core");
const chromium = pw.chromium || pw.default.chromium;
const shots = process.env.SHOTS || null;
if (shots) fs.mkdirSync(shots, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium" });
const errors = [];
const results = [];
function check(name, ok, detail) { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`); }
function watch(page) {
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
}
// A rulebook that is not built yet (car-6) returns 404; that is expected and handled.
const expected404 = (t) => /404/.test(t) && /Failed to load resource/.test(t);

try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  watch(page);

  // 1. Library: 27.173 ladder
  await page.goto(`${base}#/library/14cfr-27/27.173`);
  await page.waitForSelector("#ladder li", { timeout: 30000 });
  const ladder = await page.$$eval("#ladder li", (lis) => lis.map((li) => li.dataset.amendment));
  check("library shows 27.173 versions Initial, 27-2, 27-21, 27-44", ["27-0", "27-2", "27-21", "27-44"].every((a) => ladder.includes(a)), ladder.join(", "));
  const ladderText = await page.textContent("#ladder");
  check("Initial is labelled Initial (27-0)", ladderText.includes("Initial (27-0)"));
  check("text renders", (await page.textContent("#regtext")).includes("longitudinal"));
  await page.fill("#sec-filter", "stability");
  const visible = await page.$$eval("#sec-list li:not(.is-hidden)", (l) => l.length);
  check("section filter narrows the list", visible > 0 && visible < 20, `${visible} visible`);

  // 2. Diff Initial vs 27-44
  await page.goto(`${base}#/diff/14cfr-27/27.173?a=27-0&b=27-44`);
  await page.waitForSelector("#diff-a");
  const nDel = await page.$$eval("#diff-a del", (x) => x.length);
  const nIns = await page.$$eval("#diff-b ins", (x) => x.length);
  check("diff 27.173 Initial vs 27-44 has deletions and insertions", nDel > 0 && nIns > 0, `${nDel} del, ${nIns} ins`);
  await page.click("#next-a");
  await page.waitForFunction(() => location.hash.includes("a=27-2"));
  check("next button on the left steps to 27-2", true);
  if (shots) await page.screenshot({ path: path.join(shots, "desktop-library-diff.png"), fullPage: false });

  // 3. TCDS H-92 Model 407
  await page.goto(`${base}#/tcds/H-92/407`);
  await page.waitForSelector('tr[data-section="27.562"]', { timeout: 60000 });
  const r562 = await page.textContent('tr[data-section="27.562"][data-rulebook="14cfr-27"]');
  check("Model 407: 27.562 is n/a", /n\/a/.test(r562));
  const r561 = await page.textContent('tr[data-section="27.561"][data-rulebook="14cfr-27"]');
  check("Model 407: 27.561 carries the (b)(3)(i)-(iv) note", r561.includes("(b)(3)(i)-(iv)") && r561.includes("Initial (27-0)"));
  // click through to the text at the basis level
  await page.click('tr[data-section="27.173"][data-rulebook="14cfr-27"] td.sec a');
  await page.waitForSelector(".textmeta");
  const meta = await page.textContent(".textmeta");
  check("27.173 from the 407 basis opens at 27-1 with text in force from Initial", meta.includes("Text in force from Initial (27-0), 1965-02-01") && meta.includes("27-1"), meta.trim().slice(0, 90));
  // AWM 527 current-only warning
  await page.goto(`${base}#/library/awm-527/527.1093?at=527-3`);
  await page.waitForSelector("#inexact");
  check("AWM 527 warns that only current text is loaded", (await page.textContent("#inexact")).includes("Change 527-3 is not loaded"));

  // 4. STC project
  await page.goto(`${base}#/stc/B206-407-BASKET`);
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) { /* ignore */ } });
  await page.reload();
  await page.waitForSelector("#main-model", { timeout: 60000 });
  check("STC view lists the Eagle 407HP", (await page.textContent("#main-model")).includes("Eagle 407HP"));
  check("seeded sections are labelled draft, not confirmed", (await page.$$("#picker .tag.draft")).length >= 20);
  await page.check('input[data-model="206L-3"]');
  await page.waitForSelector("#cmp-table td.differs");
  const ndiff = await page.$$eval("#cmp-table td.differs", (x) => x.length);
  check("206L-3 selected: at least one section differs", ndiff > 0, `${ndiff} cells`);
  // election
  await page.selectOption("#el-section", "14cfr-27|27.173");
  await page.selectOption("#el-level", "27-0");
  await page.fill("#el-reason", "slope negative in level flight");
  await page.click('#elect-form button[type="submit"]');
  await page.waitForSelector('#stc-basis tr.k-elected[data-section="27.173"]');
  check("election shows as elected in the project basis", true);
  const bodyText = await page.textContent("main");
  check("no stray [object] or null text on the STC page", !/\[object |\bnull\b|undefined/.test(bodyText));
  if (shots) await page.screenshot({ path: path.join(shots, "desktop-stc.png"), fullPage: false });

  // 5. Markdown export
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#md-download")]);
  const md = fs.readFileSync(await dl.path(), "utf8");
  check("Markdown export contains 27.173", md.includes("27.173"), `${md.length} chars`);
  check("Markdown export carries the election", md.includes("slope negative in level flight"));
  const [dj] = await Promise.all([page.waitForEvent("download"), page.click("#json-export")]);
  const js = JSON.parse(fs.readFileSync(await dj.path(), "utf8"));
  check("JSON export holds the election", js.elections && js.elections[0].section === "27.173");

  // persisted after reload
  await page.reload();
  await page.waitForSelector("#main-model");
  check("project state survives a reload", (await page.$$('#stc-basis tr.k-elected[data-section="27.173"]')).length === 1);

  // TCDS markdown
  await page.goto(`${base}#/tcds/H-92/407`);
  await page.waitForSelector("#md-download");
  const [d2] = await Promise.all([page.waitForEvent("download"), page.click("#md-download")]);
  check("TCDS Markdown export contains 27.173", fs.readFileSync(await d2.path(), "utf8").includes("| 27.173 |"));

  // 6. Phone width
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const pp = await phone.newPage();
  watch(pp);
  await pp.goto(`${base}#/stc/B206-407-BASKET`);
  await pp.waitForSelector("#main-model", { timeout: 60000 });
  await pp.check('input[data-model="206L-3"]');
  await pp.waitForSelector("#cmp-table");
  const sw = await pp.evaluate(() => document.documentElement.scrollWidth);
  check("no horizontal page scroll at 390 px", sw <= 390, `scrollWidth ${sw}`);
  if (shots) await pp.screenshot({ path: path.join(shots, "phone-stc.png"), fullPage: false });
  await pp.goto(`${base}#/library/14cfr-27/27.173`);
  await pp.waitForSelector("#regtext");
  const sw2 = await pp.evaluate(() => document.documentElement.scrollWidth);
  check("no horizontal page scroll at 390 px on the library", sw2 <= 390, `scrollWidth ${sw2}`);

  const real = errors.filter((e) => !expected404(e));
  check("no console errors", real.length === 0, real.slice(0, 3).join(" | "));
} finally {
  await browser.close();
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
