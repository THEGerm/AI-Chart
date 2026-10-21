/* CertBasis web UI. Vanilla JS, no build step. All regulation text is rendered with
 * text nodes (never innerHTML). Logic lives in resolver.js (window.CertBasis). */
(function () {
  "use strict";
  const CB = window.CertBasis;
  const NON_REG = ["esf", "special_condition", "exemption", "reference", "exception"];
  const SPECIAL = CB.SPECIAL_LEVELS;
  const KIND_LABEL = { basis: "basis", override: "override", listed: "listed", "n/a": "n/a", deleted: "deleted",
    replaced: "replaced", elected: "elected", esf: "ESF", special_condition: "special condition", exemption: "exemption",
    reference: "reference", exception: "exception", missing: "not loaded yet" };

  const cache = { manifest: null, books: {}, missing: new Set(), tcds: {}, stc: {}, pending: {} };
  const libFilter = {};
  let renderToken = 0;
  const main = document.getElementById("main");

  // ---------- DOM helpers ----------
  function h(tag, attrs) {
    const el = document.createElement(tag);
    const late = {};
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "value" || k === "checked" || k === "selected") late[k] = v;
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, "");
      else el.setAttribute(k, String(v));
    }
    for (let i = 2; i < arguments.length; i++) add(el, arguments[i]);
    for (const [k, v] of Object.entries(late)) el[k] = v;
    return el;
  }
  function add(el, kid) {
    if (kid == null || kid === false) return;
    if (Array.isArray(kid)) { kid.forEach((k) => add(el, k)); return; }
    el.appendChild(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  function put(el) { add(el, [].slice.call(arguments, 1)); return el; }
  function setMain() { main.replaceChildren(...[].slice.call(arguments).flat(Infinity).filter(Boolean)); }
  function loading(msg) { return h("p", { class: "loading", role: "status" }, msg); }
  function tag(kind, text) { return h("span", { class: `tag k-${kind}` }, text || KIND_LABEL[kind] || kind); }
  function wrapTable(table) { return h("div", { class: "table-wrap" }, table); }
  function safeUrl(u) { return typeof u === "string" && /^https?:\/\//.test(u) ? u : null; }
  function sourceLink(u, text) { const s = safeUrl(u); return s ? h("a", { href: s, target: "_blank", rel: "noopener" }, text || "source") : null; }

  // ---------- storage (optional) ----------
  function storeGet(k) { try { const v = window.localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function storeSet(k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function storeDel(k) { try { window.localStorage.removeItem(k); } catch (e) { /* ignore */ } }

  // ---------- data ----------
  async function getJSON(path) {
    const r = await fetch(`data/${path}`);
    if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
    return r.json();
  }
  async function manifest() {
    if (!cache.manifest) cache.manifest = await getJSON("index.json");
    return cache.manifest;
  }
  async function loadBook(id) {
    if (cache.books[id] || cache.missing.has(id)) return cache.books[id];
    if (!cache.pending[id]) {
      cache.pending[id] = (async () => {
        const m = await manifest();
        const e = m.rulebooks.find((x) => x.id === id);
        if (!e) { cache.missing.add(id); return; }
        try { cache.books[id] = await getJSON(e.file); } catch (err) { cache.missing.add(id); }
      })();
    }
    await cache.pending[id];
    return cache.books[id];
  }
  async function loadAllBooks() { const m = await manifest(); await Promise.all(m.rulebooks.map((b) => loadBook(b.id))); }
  async function loadTcds(id) {
    if (!cache.tcds[id]) { const m = await manifest(); const e = m.tcds.find((x) => x.id === id); if (!e) throw new Error(`No TCDS ${id}`); cache.tcds[id] = await getJSON(e.file); }
    return cache.tcds[id];
  }
  async function loadStcs() {
    const m = await manifest();
    await Promise.all(m.stc.map(async (e) => { if (!cache.stc[e.id]) cache.stc[e.id] = await getJSON(e.file); }));
    return cache.stc;
  }
  function bookLabel(id) {
    const e = cache.manifest && cache.manifest.rulebooks.find((x) => x.id === id);
    return (cache.books[id] && cache.books[id].rulebook) || (e && e.label) || id;
  }
  function lvl(book, level) { return level == null ? "" : CB.levelLabel(book || null, level); }
  function isReg(r) { return r.section && !NON_REG.includes(r.kind) && r.kind !== "missing"; }
  function rkey(r) { return `${r.rulebook}|${r.section}`; }

  // ---------- routing ----------
  function href(parts, q) {
    const p = "#/" + parts.map(encodeURIComponent).join("/");
    const qs = q ? new URLSearchParams(Object.entries(q).filter(([, v]) => v != null && v !== "")).toString() : "";
    return qs ? `${p}?${qs}` : p;
  }
  function libHref(rulebook, section, at, ctx) { return href(["library", rulebook, section], { at, ctx }); }
  function diffHref(rulebook, section, a, b, ctx) { return href(["diff", rulebook, section], { a, b, ctx }); }
  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, "");
    const [path, qs] = raw.split("?");
    const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
    return { parts, q: new URLSearchParams(qs || "") };
  }
  function setNav(name) {
    document.querySelectorAll(".top nav a").forEach((a) => {
      if (a.dataset.nav === name) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
  }

  async function route() {
    const token = ++renderToken;
    const { parts, q } = parseHash();
    const view = parts[0] || "";
    try {
      if (view === "library") { setNav("library"); await viewLibrary(token, parts[1], parts[2], q); }
      else if (view === "diff") { setNav("library"); await viewDiff(token, parts[1], parts[2], q); }
      else if (view === "tcds") { setNav("tcds"); await viewTcds(token, parts[1] || "H-92", parts[2]); }
      else if (view === "stc") {
        const id = parts[1] || "B206-407-BASKET";
        setNav(id === "B206-407-BASKET" ? "project" : "stc");
        await viewStc(token, id);
      } else { setNav(""); await viewHome(token); }
    } catch (err) {
      if (token === renderToken) setMain(h("p", { class: "error", role: "alert" }, `Could not load: ${err.message}`));
      console.warn(err);
    }
    if (token === renderToken && !q.get("keep")) window.scrollTo(0, 0);
  }
  const stale = (t) => t !== renderToken;

  // ---------- home ----------
  async function viewHome(token) {
    const m = await manifest();
    if (stale(token)) return;
    document.title = "CertBasis";
    setMain(
      h("h1", null, "CertBasis"),
      h("p", { class: "muted" }, "Resolve a certification basis from a Transport Canada TCDS and its STCs into the regulation text at each amendment level."),
      h("div", { class: "cards" },
        h("div", { class: "card" }, h("h2", null, h("a", { href: "#/library" }, "Library")),
          h("p", null, "Search a rulebook, read any section at any amendment, compare two levels side by side."),
          h("ul", { class: "small" }, m.rulebooks.map((b) => h("li", null, h("a", { href: href(["library", b.id]) }, b.label))))),
        h("div", { class: "card" }, h("h2", null, h("a", { href: "#/tcds/H-92" }, "TCDS H-92")),
          h("p", null, "Bell 206L and 407 series: the basis of each model, section by section.")),
        h("div", { class: "card" }, h("h2", null, h("a", { href: "#/stc/B206-407-BASKET" }, "STC project")),
          h("p", null, "Boost basket and step: applicability, applicable sections, elections and export.")),
        h("div", { class: "card" }, h("h2", null, h("a", { href: "#/stc/SH14-47" }, "STC SH14-47")),
          h("p", null, "Eagle 407HP: the Model 407 basis with the STC's own sections and ESFs.")))
    );
  }

  // ---------- library ----------
  async function viewLibrary(token, bookId, sectionId, q) {
    const m = await manifest();
    bookId = bookId || "14cfr-27";
    if (!cache.books[bookId] && !cache.missing.has(bookId)) {
      setMain(loading(`Loading ${bookLabel(bookId)} (large file, a few seconds)`));
    }
    const book = await loadBook(bookId);
    if (stale(token)) return;
    const picker = h("select", { id: "book-pick", "aria-label": "Rulebook", onchange: (e) => { location.hash = href(["library", e.target.value]); } },
      m.rulebooks.map((b) => h("option", { value: b.id, selected: b.id === bookId }, b.label + (cache.missing.has(b.id) ? " (not loaded yet)" : ""))));
    const head = h("div", { class: "row" }, h("label", { for: "book-pick" }, "Rulebook"), picker);
    if (!book) {
      document.title = "Library: CertBasis";
      setMain(h("h1", null, "Library"), head,
        h("p", { class: "notice" }, `${bookLabel(bookId)} is not loaded yet. The data file has not been built.`));
      return;
    }
    document.title = sectionId ? `${sectionId}: CertBasis` : `${book.rulebook}: CertBasis`;
    const ids = Object.keys(book.sections).filter((id) => /^\d/.test(id) && id !== "0.0").sort(CB.sectionOrder);
    const filter = h("input", { type: "search", id: "sec-filter", placeholder: "Number or heading", "aria-label": "Filter sections", value: libFilter[bookId] || "" });
    const items = ids.map((id) => {
      const s = book.sections[id];
      const last = s.versions[s.versions.length - 1];
      const li = h("li", { "data-search": `${id} ${s.heading || ""}`.toLowerCase() },
        h("a", { href: libHref(bookId, id), "aria-current": id === sectionId ? "true" : null },
          h("span", { class: "sid" }, id), s.heading || "",
          last && last.status !== "in_force" ? [" ", tag("deleted", last.status)] : null));
      return li;
    });
    const count = h("p", { class: "small muted", "aria-live": "polite" });
    const apply = () => {
      const t = filter.value.trim().toLowerCase();
      libFilter[bookId] = filter.value;
      let n = 0;
      for (const li of items) { const show = !t || li.dataset.search.includes(t); li.classList.toggle("is-hidden", !show); if (show) n++; }
      count.textContent = `${n} of ${ids.length} sections`;
    };
    filter.addEventListener("input", apply);
    apply();
    const list = h("div", { class: "lib-list" }, h("label", { for: "sec-filter", class: "small muted" }, "Find a section"), filter, count, h("ul", { id: "sec-list" }, items));
    const detail = h("div", { class: "lib-detail" });
    if (sectionId) sectionDetail(detail, book, sectionId, q);
    else put(detail, h("p", { class: "muted" }, `${book.title || book.rulebook}. ${ids.length} sections. Pick a section to see its amendment ladder and text.`),
      book.note ? h("p", { class: "notice" }, book.note) : null,
      h("p", { class: "small" }, "Source: ", sourceLink(book.source, book.source) || book.source || "not recorded"));
    setMain(h("h1", null, "Library"), head, h("div", { class: `lib${sectionId ? " has-section" : ""}` }, list, detail));
    if (sectionId) {
      const cur = list.querySelector('a[aria-current="true"]');
      if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: "nearest" });
    }
  }

  function sectionDetail(el, book, id, q) {
    const s = book.sections[id];
    const back = h("a", { class: "btn lib-back", href: href(["library", book.id]) }, "All sections");
    if (!s) { put(el, back, h("p", { class: "notice" }, `Section ${id} is not in ${book.rulebook}.`)); return; }
    const latest = s.versions[s.versions.length - 1];
    const at = q.get("at") || (latest.seq == null ? "current" : latest.amendment);
    const ctx = q.get("ctx");
    let t;
    try { t = CB.textAt(book, id, at); } catch (e) { t = CB.textAt(book, id, "current"); }
    const v = t.version;
    put(el, back,
      h("h2", { class: "sec-title" }, `${book.rulebook} ${id} ${s.heading || ""}`),
      s.subpart ? h("p", { class: "small muted" }, s.subpart) : null,
      ctx ? h("p", { class: "info" }, ctx) : null);

    // ladder
    put(el, h("h3", null, "Amendment ladder"),
      h("p", { class: "small muted" }, "Each entry is a version of the text. A level between two entries uses the earlier one."),
      h("ul", { class: "ladder", id: "ladder" }, s.versions.map((x) =>
        h("li", { "data-amendment": x.amendment },
          h("a", { href: libHref(book.id, id, x.amendment, ctx), "aria-current": v && v.amendment === x.amendment ? "true" : null },
            lvl(book, x.amendment), x.status !== "in_force" ? ` (${x.status})` : "", x.correction ? ` (${x.correction})` : "",
            h("span", { class: "eff" }, x.effective || "date not recorded"))))));

    // pick any level
    const levels = book.amendments.map((a) => ({ id: a.id, text: `${lvl(book, a.id)}${a.effective ? `, ${a.effective}` : ""}` }));
    levels.push({ id: "current", text: "current (latest text)" });
    const atSel = h("select", { id: "at-pick", onchange: (e) => { location.hash = libHref(book.id, id, e.target.value, ctx); } },
      levels.map((o) => h("option", { value: o.id, selected: o.id === at }, o.text)));
    const vIds = s.versions.map((x) => x.amendment);
    const curIdx = v ? vIds.indexOf(v.amendment) : vIds.length - 1;
    const selA = h("select", { id: "cmp-a", "aria-label": "Left level" }, vIds.map((a, i) => h("option", { value: a, selected: i === (curIdx > 0 ? curIdx - 1 : 0) }, lvl(book, a))));
    const selB = h("select", { id: "cmp-b", "aria-label": "Right level" }, vIds.map((a, i) => h("option", { value: a, selected: i === (curIdx > 0 ? curIdx : Math.min(1, vIds.length - 1)) }, lvl(book, a))));
    put(el, h("div", { class: "row" }, h("label", { for: "at-pick" }, "Show text at level"), atSel),
      vIds.length > 1 ? h("div", { class: "row" }, h("span", null, "Compare"), selA, h("span", null, "with"), selB,
        h("button", { type: "button", id: "cmp-go", onclick: () => { location.hash = diffHref(book.id, id, selA.value, selB.value, ctx); } }, "Side by side")) : null);

    // text
    if (!v) {
      put(el, h("p", { class: "notice" }, `${id} was not in force at ${lvl(book, at)}. It first appears at ${lvl(book, s.versions[0].amendment)}.`));
      return;
    }
    const meta = h("p", { class: "textmeta" },
      h("strong", null, `Text in force from ${lvl(book, v.amendment)}${v.effective ? `, ${v.effective}` : ""}`),
      at !== v.amendment ? ` (level asked: ${lvl(book, at)})` : "",
      v.status !== "in_force" ? [" ", tag("deleted", v.status)] : "",
      ". ", sourceLink(v.source, "Source"), v.sha256 ? h("span", { class: "small muted" }, ` sha256 ${v.sha256.slice(0, 12)}`) : null);
    put(el, meta);
    if (!t.exact) put(el, h("p", { class: "notice", id: "inexact" }, `Current text shown; the text at Change ${lvl(book, at)} is not loaded.`));
    if (v.change_markers && v.change_markers.length) put(el, h("p", { class: "small muted" }, `Change markers in this text: ${v.change_markers.join(", ")}.`));
    const hist = book.sections[id] && book.sections[id].history_notes;
    if (hist && hist.length) put(el, h("div", { class: "notice", id: "history-notes" }, h("strong", null, "Change history"), h("ul", null, hist.map((n) => h("li", null, n))), book.history_source ? h("p", { class: "small muted" }, book.history_source) : null));
    put(el, h("pre", { class: "regtext", id: "regtext" }, t.text || "(no text)"));
  }

  // ---------- diff ----------
  async function viewDiff(token, bookId, id, q) {
    if (!cache.books[bookId]) setMain(loading(`Loading ${bookLabel(bookId)}`));
    const book = await loadBook(bookId);
    if (stale(token)) return;
    if (!book) { setMain(h("p", { class: "notice" }, `${bookLabel(bookId)} is not loaded yet.`)); return; }
    const s = book.sections[id];
    if (!s) { setMain(h("p", { class: "notice" }, `Section ${id} is not in ${book.rulebook}.`)); return; }
    document.title = `${id} compare: CertBasis`;
    const vIds = s.versions.map((x) => x.amendment);
    const a = q.get("a") || vIds[0];
    const b = q.get("b") || vIds[vIds.length - 1];
    const ctx = q.get("ctx");
    const ta = safeText(book, id, a), tb = safeText(book, id, b);
    const d = CB.diffWords(ta.text || "", tb.text || "");
    const nIns = d.filter((x) => x.op === "+").length, nDel = d.filter((x) => x.op === "-").length;

    function pane(side, level, t) {
      const other = side === "a" ? b : a;
      const go = (lv) => side === "a" ? diffHref(book.id, id, lv, other, ctx) : diffHref(book.id, id, other, lv, ctx);
      const opts = vIds.map((x) => ({ id: x, text: `${lvl(book, x)}${versionEff(s, x)}` }));
      if (!vIds.includes(level)) {
        const extra = { id: level, text: `${lvl(book, level)} (text from ${t.version ? lvl(book, t.version.amendment) : "none"})` };
        let seqL; try { seqL = CB.levelSeq(book, level); } catch (e) { seqL = Infinity; }
        const pos = s.versions.findIndex((x) => (x.seq == null ? -Infinity : x.seq) > seqL);
        opts.splice(pos < 0 ? opts.length : pos, 0, extra);
      }
      const idx = opts.findIndex((o) => o.id === level);
      const sel = h("select", { id: `lvl-${side}`, "aria-label": side === "a" ? "Left level" : "Right level", onchange: (e) => { location.hash = go(e.target.value); } },
        opts.map((o) => h("option", { value: o.id, selected: o.id === level }, o.text)));
      const prev = h("button", { type: "button", id: `prev-${side}`, disabled: idx <= 0, onclick: () => { location.hash = go(opts[idx - 1].id); } }, "Previous");
      const next = h("button", { type: "button", id: `next-${side}`, disabled: idx >= opts.length - 1, onclick: () => { location.hash = go(opts[idx + 1].id); } }, "Next");
      const pre = h("pre", { class: "regtext", id: `diff-${side}` });
      if (!t.text) pre.append(h("em", null, `Not in force at ${lvl(book, level)}.`));
      else for (const part of d) {
        if (part.op === "=") pre.append(part.text);
        else if (part.op === "-" && side === "a") pre.append(h("del", null, part.text));
        else if (part.op === "+" && side === "b") pre.append(h("ins", null, part.text));
      }
      const v = t.version;
      return h("div", { class: "pane" },
        h("div", { class: "pane-head" }, prev, sel, next),
        h("p", { class: "small" }, v ? `Text in force from ${lvl(book, v.amendment)}${v.effective ? `, ${v.effective}` : ""}. ` : "", v ? sourceLink(v.source, "Source") : null),
        !t.exact ? h("p", { class: "notice" }, `Current text shown; the text at Change ${lvl(book, level)} is not loaded.`) : null,
        pre);
    }
    setMain(
      h("p", null, h("a", { href: libHref(book.id, id, b, ctx) }, `Back to ${id}`)),
      h("h1", null, `${book.rulebook} ${id} ${s.heading || ""}`),
      ctx ? h("p", { class: "info" }, ctx) : null,
      h("p", { class: "legend small", id: "diff-summary" },
        nIns || nDel ? `${nDel} deletions and ${nIns} insertions. ` : "No text change between these levels. ",
        "Key: ", h("del", null, "deleted on the left"), " ", h("ins", null, "inserted on the right"), "."),
      h("div", { class: "diff" }, pane("a", a, ta), pane("b", b, tb)));
  }
  function safeText(book, id, level) { try { return CB.textAt(book, id, level); } catch (e) { return { text: null, version: null, exact: true }; } }
  function versionEff(s, a) { const v = s.versions.find((x) => x.amendment === a); return v && v.effective ? `, ${v.effective}` : ""; }

  // ---------- basis tables (TCDS, STC) ----------
  function sectionCell(r, ctxText) {
    const book = cache.books[r.rulebook];
    if (!book || r.missingBook) return h("td", { class: "sec" }, r.section || "", " ", tag("missing"));
    const at = SPECIAL.includes(r.level) ? null : r.level;
    return h("td", { class: "sec" }, h("a", { href: libHref(r.rulebook, r.section, at, ctxText) }, r.section));
  }
  function ctxFor(r, owner) {
    const book = cache.books[r.rulebook];
    const bits = [`${owner}: ${r.section} at ${lvl(book, r.level)}`];
    if (r.kind === "elected") bits.push(`elected, was ${lvl(book, r.electedFrom)}`);
    for (const p of r.paragraphs || []) bits.push(`paragraph ${p.paragraph} at ${lvl(book, p.level)}${p.note ? `: ${p.note}` : ""}`);
    if (r.condition) bits.push(r.condition);
    if (r.scope) bits.push(r.scope);
    return bits.join(". ") + ".";
  }
  function notesCell(r) {
    const book = cache.books[r.rulebook];
    const td = h("td", { class: "notes" });
    for (const p of r.paragraphs || []) {
      if (r.kind === "listed" && p.level === r.level && !p.note) { td.append(h("span", { class: "note-line" }, `Paragraph ${p.paragraph} only`)); continue; }
      const link = book && !SPECIAL.includes(p.level) ? h("a", { href: libHref(r.rulebook, r.section, p.level, `${r.section}${p.paragraph} at ${lvl(book, p.level)}${p.note ? `: ${p.note}` : ""}`) }, lvl(book, p.level)) : lvl(book, p.level);
      td.append(h("span", { class: "note-line para-note" }, `${p.paragraph} at `, link, p.note ? `: ${p.note}` : ""));
    }
    if (r.note && !(r.kind === "listed" && /^paragraph /.test(r.note))) td.append(h("span", { class: "note-line" }, r.kind === "elected" ? `Reason: ${r.note}` : r.note));
    if (r.condition) td.append(h("span", { class: "note-line" }, `Condition: ${r.condition}`));
    if (r.stc) td.append(h("span", { class: "note-line" }, h("span", { class: "tag stc" }, `STC ${r.stc}`)));
    return td;
  }
  function levelCell(r) {
    const book = cache.books[r.rulebook];
    if (r.kind === "elected") return h("td", { class: "lvl" }, h("strong", null, lvl(book, r.level)), " ", h("span", { class: "was", title: "level before the election" }, lvl(book, r.electedFrom)));
    return h("td", { class: "lvl" }, lvl(book, r.level));
  }
  function fromCell(r) {
    const book = cache.books[r.rulebook];
    if (!book || SPECIAL.includes(r.level) || !r.section) return h("td", { class: "lvl" });
    let v = null; try { v = CB.versionAt(book, r.section, r.level); } catch (e) { /* unknown level */ }
    if (!v) return h("td", { class: "lvl" }, h("span", { class: "muted" }, "not in force"));
    if (v.seq == null) return h("td", { class: "lvl" }, h("span", { class: "muted", title: "Only current text is loaded for this rulebook" }, "current text only"));
    return h("td", { class: "lvl" }, `${lvl(book, v.amendment)}${v.effective ? `, ${v.effective}` : ""}`);
  }
  function regTable(rows, owner, extra) {
    const tb = h("tbody");
    for (const r of rows) {
      if (r.kind === "missing") {
        tb.append(h("tr", { class: "k-missing" }, h("td", { colspan: extra ? 7 : 6 }, tag("missing"), ` ${r.note}. The sections of this block appear once the rulebook is built.`)));
        continue;
      }
      tb.append(h("tr", { class: `k-${r.kind}`, "data-section": r.section, "data-rulebook": r.rulebook, "data-search": `${r.section} ${r.heading || ""}`.toLowerCase() },
        sectionCell(r, ctxFor(r, owner)), h("td", null, r.heading || ""), levelCell(r), fromCell(r),
        h("td", null, tag(r.kind)), notesCell(r), extra ? h("td", { class: "act" }, extra(r)) : null));
    }
    return wrapTable(h("table", null,
      h("thead", null, h("tr", null, ["Section", "Heading", "Level", "Text in force from", "Type", "Notes"].map((x) => h("th", { scope: "col" }, x)), extra ? h("th", { scope: "col" }, "Actions") : null)),
      tb));
  }
  function otherTable(rows) {
    return wrapTable(h("table", { class: "others" },
      h("thead", null, h("tr", null, ["Type", "Reference or title", "Sections", "Level", "Condition"].map((x) => h("th", { scope: "col" }, x)))),
      h("tbody", null, rows.map((r) => {
        const book = cache.books[r.rulebook];
        const secs = (r.sections || []).map((s, i) => [i ? ", " : "", book ? h("a", { href: libHref(r.rulebook, s, r.level || null, `${KIND_LABEL[r.kind]}: ${r.heading}`) }, s) : s]);
        return h("tr", { class: `k-${r.kind}` }, h("td", null, tag(r.kind)),
          h("td", null, r.note && r.note !== r.heading ? [h("strong", null, r.note), " "] : null, r.heading || "", r.stc ? [" ", h("span", { class: "tag stc" }, `STC ${r.stc}`)] : null),
          h("td", { class: "sec" }, secs, r.paragraphs && r.paragraphs.length ? ` ${r.paragraphs[0].paragraph}` : ""),
          h("td", { class: "lvl" }, r.level ? lvl(book, r.level) : ""),
          h("td", null, [r.condition, r.scope].filter(Boolean).join("; ")));
      }))));
  }
  function groupRows(rows) {
    const groups = [];
    const byKey = new Map();
    for (const r of rows) {
      const k = `${r.block}||${r.scope || ""}`;
      if (!byKey.has(k)) { const g = { block: r.block, scope: r.scope, rows: [] }; byKey.set(k, g); groups.push(g); }
      byKey.get(k).rows.push(r);
    }
    return groups;
  }
  function filterBox(container, id) {
    const input = h("input", { type: "search", id, placeholder: "Number or heading", "aria-label": "Filter sections" });
    const out = h("span", { class: "small muted", "aria-live": "polite" });
    input.addEventListener("input", () => {
      const t = input.value.trim().toLowerCase();
      let n = 0;
      container.querySelectorAll("tr[data-search]").forEach((tr) => { const show = !t || tr.dataset.search.includes(t); tr.classList.toggle("is-hidden", !show); if (show) n++; });
      out.textContent = t ? `${n} rows match` : "";
    });
    return h("div", { class: "row" }, h("label", { for: id }, "Filter"), input, out);
  }
  function basisView(rows, owner) {
    const regs = rows.filter((r) => isReg(r) || r.kind === "missing");
    const others = rows.filter((r) => NON_REG.includes(r.kind));
    const box = h("div", { class: "basis" });
    for (const g of groupRows(regs)) {
      const n = g.rows.filter((r) => r.section).length;
      box.append(h("details", { open: true, class: "group" },
        h("summary", null, g.block || "Basis", g.scope ? [" ", h("span", { class: "tag scope" }, g.scope)] : null, h("span", { class: "small muted" }, n ? ` ${n} sections` : "")),
        regTable(g.rows, owner)));
    }
    return [filterBox(box, "basis-filter"), box,
      others.length ? [h("h2", null, "Special conditions, ESFs, exemptions and references"), otherTable(others)] : null];
  }

  // ---------- markdown export ----------
  function download(name, text, type) {
    const blob = new Blob([text], { type: type || "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = h("a", { href: url, download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const ta = h("textarea", { style: "position:fixed;left:-9999px" }); ta.value = text; document.body.append(ta); ta.select();
      let ok = false; try { ok = document.execCommand("copy"); } catch (e2) { ok = false; } ta.remove(); return ok;
    }
  }
  function exportPanel(fileName, build, extras) {
    const withText = h("input", { type: "checkbox", id: "md-text", checked: true });
    const status = h("p", { class: "status", role: "status", id: "export-status" });
    const preview = h("textarea", { class: "md", id: "md-preview", readonly: true, "aria-label": "Markdown preview", hidden: true });
    return h("section", { class: "export" },
      h("h2", null, "Export"),
      h("div", { class: "row" },
        h("label", null, withText, " Include full text"),
        h("button", { type: "button", id: "md-download", onclick: () => { const md = build(withText.checked); download(fileName, md); status.textContent = `Downloaded ${fileName} (${Math.round(md.length / 1024)} KB).`; } }, "Download .md"),
        h("button", { type: "button", id: "md-copy", onclick: async () => { const ok = await copyText(build(withText.checked)); status.textContent = ok ? "Markdown copied." : "Copy failed: use Download instead."; } }, "Copy Markdown"),
        h("button", { type: "button", id: "md-preview-btn", onclick: () => { preview.value = build(withText.checked); preview.hidden = !preview.hidden; } }, "Preview"),
        extras || null),
      status, preview);
  }

  // ---------- TCDS ----------
  async function viewTcds(token, tcdsId, modelId) {
    setMain(loading("Loading TCDS and rulebooks (about 3 MB the first time)"));
    const [tcds] = await Promise.all([loadTcds(tcdsId), loadAllBooks()]);
    if (stale(token)) return;
    const missing = [...cache.missing].map(bookLabel);
    const head = [h("h1", null, `TCDS ${tcds.id}: ${tcds.title}`),
      h("p", { class: "small muted" }, `${tcds.authority} issue ${tcds.issue}, ${tcds.issue_date}. ${tcds.holder}. `, tcds.source ? `Source: ${tcds.source}.` : ""),
      missing.length ? h("p", { class: "notice" }, `Not loaded yet: ${missing.join(", ")}. Rows from it are marked.`) : null];
    const modelSel = h("select", { id: "model-pick", "aria-label": "Model", onchange: (e) => { location.hash = href(["tcds", tcds.id, e.target.value]); } },
      h("option", { value: "" }, "Choose a model"), tcds.models.map((mo) => h("option", { value: mo.id, selected: mo.id === modelId }, mo.name)));
    const modelsTable = wrapTable(h("table", null,
      h("thead", null, h("tr", null, ["Model", "TCCA approval", "Serials"].map((x) => h("th", { scope: "col" }, x)))),
      h("tbody", null, tcds.models.map((mo) => h("tr", { class: mo.id === modelId ? "k-override" : "" },
        h("td", null, h("a", { href: href(["tcds", tcds.id, mo.id]), "aria-current": mo.id === modelId ? "true" : null }, mo.name)),
        h("td", { class: "lvl" }, mo.approved || (mo.parent ? `see ${mo.parent}` : "")), h("td", null, mo.serials || ""))))));
    if (!modelId) {
      document.title = `TCDS ${tcds.id}: CertBasis`;
      setMain(head, h("h2", null, "Models"), modelsTable,
        tcds.notes ? [h("h2", null, "Notes"), h("ul", null, tcds.notes.map((n) => h("li", null, n)))] : null);
      return;
    }
    const model = tcds.models.find((x) => x.id === modelId);
    if (!model) { setMain(head, h("p", { class: "notice" }, `No model ${modelId} in ${tcds.id}.`), modelsTable); return; }
    document.title = `${model.name}: CertBasis`;
    const rows = CB.expandModel(tcds, modelId, cache.books);
    const owner = `${tcds.id} ${model.name} basis`;
    setMain(head,
      h("div", { class: "row" }, h("label", { for: "model-pick" }, "Model"), modelSel),
      h("h2", null, `${model.name}`),
      h("p", { class: "small muted" }, [model.approved ? `TCCA approval ${model.approved}` : null, model.faa_approved ? `FAA approval ${model.faa_approved}` : null, model.serials ? `S/N ${model.serials}` : null].filter(Boolean).join(". ")),
      model.scope_note ? h("p", { class: "info" }, model.scope_note) : null,
      h("p", { class: "small muted" }, "Click a section to read its text at the basis level. Levels n/a, deleted and replaced come from the TCDS exceptions."),
      basisView(rows, owner),
      exportPanel(`CertBasis-${tcds.id}-${model.id}.md`, (withText) => CB.toMarkdown(`TCDS ${tcds.id}, ${model.name}: certification basis`, rows, cache.books, { withText })),
      h("details", null, h("summary", null, "All models"), modelsTable));
  }

  // ---------- STC ----------
  async function viewStc(token, stcId) {
    setMain(loading("Loading project, TCDS and rulebooks (about 3 MB the first time)"));
    const stcs = await loadStcs();
    const stc = stcs[stcId];
    if (!stc) throw new Error(`No STC or project ${stcId} in the manifest`);
    const [tcds] = await Promise.all([loadTcds(stc.tcds), loadAllBooks()]);
    if (stale(token)) return;
    document.title = `${stc.id}: CertBasis`;
    if (stc.kind === "project") return projectView(stc, tcds, stcs);
    const rows = CB.expandStc(stc, tcds, cache.books);
    setMain(h("h1", null, `STC ${stc.id}: ${stc.title}`),
      h("p", { class: "small muted" }, [stc.holder, stc.approval_date ? `approved ${stc.approval_date}` : null, stc.eligible_serials ? `eligible S/N ${stc.eligible_serials}` : null].filter(Boolean).join(". ")),
      stc.source ? h("p", { class: "small muted" }, `Source: ${stc.source}.`) : null,
      stc.notes ? h("ul", { class: "small" }, stc.notes.map((n) => h("li", null, n))) : null,
      h("p", { class: "small muted" }, `Base: ${tcds.id} Model ${stc.base_model}. Rows tagged STC ${stc.id} come from the STC itself.`),
      basisView(rows, `STC ${stc.id} basis`),
      exportPanel(`CertBasis-${stc.id}.md`, (withText) => CB.toMarkdown(`STC ${stc.id}: ${stc.title}`, rows, cache.books, { withText })));
  }

  const LISTS = [
    ["exceptions", "Exceptions"],
    ["special_conditions", "Special conditions"],
    ["exemptions", "Exemptions"],
    ["additional_regulations", "Additional regulations (for example operating rules)"],
  ];
  function freshState(stc) {
    const a = stc.applicable_sections || {};
    const book = a.rulebook || "14cfr-27";
    return {
      version: 1,
      selected: [],
      applicable: (a.sections || []).map((s) => (s.includes("|") ? s : `${book}|${s}`)),
      seed: (a.sections || []).map((s) => (s.includes("|") ? s : `${book}|${s}`)),
      confirmed: !!a.status && !/^draft/i.test(a.status),
      elections: (stc.elections || []).map((e) => ({ ...e })),
      exceptions: [...(stc.exceptions || [])], special_conditions: [...(stc.special_conditions || [])],
      exemptions: [...(stc.exemptions || [])], additional_regulations: [...(stc.additional_regulations || [])],
    };
  }
  function stateFromImport(stc, data) {
    const s = freshState({ ...stc, ...data });
    if (Array.isArray(data.selected_models)) s.selected = data.selected_models;
    if (data.applicable_sections && Array.isArray(data.applicable_sections.seed)) s.seed = data.applicable_sections.seed;
    return s;
  }

  function projectView(stc, tcds, stcs) {
    const KEY = `certbasis.project.${stc.id}`;
    let st = storeGet(KEY);
    if (!st || st.version !== 1) st = freshState(stc);
    const save = () => storeSet(KEY, st);
    const mainRows = CB.rowsFor(stc.main, tcds, cache.books, stcs);
    const mainRegs = mainRows.filter(isReg);
    const candidates = [];
    const seen = new Set();
    for (const r of mainRegs) { const k = rkey(r); if (!seen.has(k)) { seen.add(k); candidates.push(r); } }
    const modelRowsCache = {};
    const rowsOfModel = (m) => (modelRowsCache[m] = modelRowsCache[m] || CB.rowsFor({ model: m }, tcds, cache.books, stcs));
    const projRows = () => CB.applyElections(mainRows, st.elections);
    const appSet = () => new Set(st.applicable);
    const scopedRows = () => {
      const rows = projRows();
      if (!st.applicable.length) return rows;
      const a = appSet();
      return rows.filter((r) => !isReg(r) || a.has(rkey(r)));
    };
    const owner = `${stc.id} (${stc.main.label})`;

    // containers
    const cmpBox = h("div", { id: "stc-compare" });
    const basisBox = h("div", { id: "stc-basis" });
    const electBox = h("div", { id: "stc-elect" });
    const listsBox = h("div", { id: "stc-lists" });
    const draftNote = h("p", { id: "draft-note" });
    const pickCount = h("span", { class: "small muted", "aria-live": "polite" });
    const refresh = () => { save(); renderDraftNote(); renderCompare(); renderBasis(); renderElect(); renderLists(); pickCount.textContent = `${st.applicable.length} checked`; };

    function fmtLevels(s) {
      const book = cache.books["14cfr-27"];
      return s.split("; ").map((tok) => { const m = tok.match(/^(\S+)( \[.*\])?$/); if (!m) return tok; try { return lvl(book, m[1]) + (m[2] || ""); } catch (e) { return tok; } }).join("; ");
    }

    // applicability
    const modelBoxes = h("div", { class: "models", role: "group", "aria-label": "Other models" }, stc.selectable.map((s) =>
      h("label", null, h("input", { type: "checkbox", value: s.model, "data-model": s.model, checked: st.selected.includes(s.model),
        onchange: (e) => { st.selected = stc.selectable.map((x) => x.model).filter((m) => m === e.target.value ? e.target.checked : st.selected.includes(m)); refresh(); } }), s.label)));
    const diffOnly = h("input", { type: "checkbox", id: "diff-only", onchange: () => renderCompare() });
    function renderCompare() {
      const keys = st.applicable.length ? st.applicable : [];
      cmpBox.replaceChildren();
      if (!st.selected.length) { put(cmpBox, h("p", { class: "muted" }, "Tick one or more models to compare them with the main model.")); return; }
      if (!keys.length) { put(cmpBox, h("p", { class: "muted" }, "Check applicable sections below to compare levels.")); return; }
      const main = projRows();
      const cols = st.selected.map((m) => ({ m, label: (stc.selectable.find((x) => x.model === m) || {}).label || m, cmp: CB.compareRows(main, rowsOfModel(m), keys) }));
      const summary = cols.map((c) => `${c.label}: ${c.cmp.filter((x) => x.differs).length} of ${keys.length} sections differ`).join(". ");
      const byKey = new Map(candidates.map((r) => [rkey(r), r]));
      const tb = h("tbody", null, keys.map((k, i) => {
        const anyDiff = cols.some((c) => c.cmp[i].differs);
        if (diffOnly.checked && !anyDiff) return null;
        const [rb, sec] = k.split("|");
        const r = byKey.get(k);
        return h("tr", { "data-key": k, class: anyDiff ? "has-diff" : "" },
          h("td", { class: "sec" }, cache.books[rb] ? h("a", { href: libHref(rb, sec) }, sec) : sec),
          h("td", null, r ? r.heading : ""),
          h("td", { class: "lvl" }, fmtLevels(cols[0].cmp[i].levelA)),
          cols.map((c) => h("td", { class: `lvl${c.cmp[i].differs ? " differs" : ""}`, "data-model": c.m }, fmtLevels(c.cmp[i].levelB), c.cmp[i].differs ? h("span", { class: "small" }, " (differs)") : null)));
      }));
      const anyMissing = st.selected.some((m) => rowsOfModel(m).some((r) => r.missingBook));
      put(cmpBox, h("p", { class: "small", id: "cmp-summary" }, summary + "."),
        anyMissing ? h("p", { class: "notice small" }, "CAR 6 is not loaded yet, so sections covered by CAR 6 show as not in basis for the 206L models.") : null,
        wrapTable(h("table", { id: "cmp-table" },
          h("thead", null, h("tr", null, h("th", { scope: "col" }, "Section"), h("th", { scope: "col" }, "Heading"), h("th", { scope: "col" }, stc.main.label),
            cols.map((c) => h("th", { scope: "col" }, c.label)))), tb)));
    }

    // applicable sections picker
    const pickFilter = h("input", { type: "search", id: "pick-filter", placeholder: "Number or heading", "aria-label": "Filter the main model's sections" });
    const onlyChecked = h("input", { type: "checkbox", id: "pick-only" });
    const picker = h("div", { class: "picker", id: "picker" });
    function renderPicker() {
      const a = appSet(), seed = new Set(st.seed);
      picker.replaceChildren(...candidates.map((r) => {
        const k = rkey(r);
        return h("label", { "data-search": `${r.section} ${r.heading}`.toLowerCase(), "data-key": k },
          h("input", { type: "checkbox", value: k, checked: a.has(k), onchange: (e) => {
            const set = appSet(); if (e.target.checked) set.add(k); else set.delete(k);
            st.applicable = candidates.map(rkey).filter((x) => set.has(x)); refresh();
          } }),
          h("span", { class: "sid" }, r.section), h("span", { class: "grow" }, r.heading || ""),
          seed.has(k) && !st.confirmed ? h("span", { class: "tag draft" }, "draft, not confirmed") : null,
          h("span", { class: "small muted" }, lvl(cache.books[r.rulebook], r.level)));
      }));
      applyPickFilter();
    }
    function applyPickFilter() {
      const t = pickFilter.value.trim().toLowerCase();
      picker.querySelectorAll("label").forEach((l) => {
        const cb = l.querySelector("input");
        const show = (!t || l.dataset.search.includes(t)) && (!onlyChecked.checked || cb.checked);
        l.classList.toggle("is-hidden", !show);
      });
    }
    pickFilter.addEventListener("input", applyPickFilter);
    onlyChecked.addEventListener("change", applyPickFilter);
    function renderDraftNote() {
      const st0 = (stc.applicable_sections || {}).status;
      draftNote.className = st.confirmed ? "info small" : "notice small";
      draftNote.textContent = st.confirmed ? "Applicable section list marked as confirmed in this browser." : `Draft, not confirmed. ${st0 || ""}`;
    }
    const confirmBox = h("input", { type: "checkbox", id: "confirm-list", checked: st.confirmed, onchange: (e) => { st.confirmed = e.target.checked; renderPicker(); refresh(); } });

    // basis table with actions
    function actions(r) {
      const book = cache.books[r.rulebook];
      if (!book || !book.sections[r.section]) return null;
      const vs = book.sections[r.section].versions;
      let cur = null; try { cur = SPECIAL.includes(r.level) ? null : CB.versionAt(book, r.section, r.level); } catch (e) { cur = null; }
      const sel = h("select", { "aria-label": `Compare ${r.section} with another level`, class: "cmp-level", disabled: !cur,
        onchange: (e) => { if (e.target.value) location.hash = diffHref(r.rulebook, r.section, r.level, e.target.value, `What would change for ${stc.id}: ${r.section} at ${lvl(book, r.level)} (project level, left) against ${lvl(book, e.target.value)} (right).`); } },
        h("option", { value: "" }, "Compare with"),
        vs.filter((v) => !cur || v.amendment !== cur.amendment).map((v) => h("option", { value: v.amendment }, `${lvl(book, v.amendment)}${v.effective ? `, ${v.effective}` : ""}`)));
      return h("div", { class: "row", style: "margin:0" },
        h("button", { type: "button", class: "elect-btn", "data-section": r.section, onclick: () => { openElect(rkey(r)); } }, r.kind === "elected" ? "Change election" : "Elect"), sel);
    }
    function renderBasis() {
      const rows = scopedRows();
      const regs = rows.filter(isReg);
      const others = rows.filter((r) => NON_REG.includes(r.kind));
      basisBox.replaceChildren(); put(basisBox,
        h("p", { class: "small muted" }, st.applicable.length ? `${regs.length} applicable sections of the main model basis, at the project level. Elected rows show the new level and the original struck through.` : "No sections checked: the whole main model basis is shown."),
        regTable(regs, owner, actions),
        others.length ? [h("h3", null, "Special conditions, ESFs and references of the main model"), otherTable(others)] : null);
    }

    // elections
    const elSec = h("select", { id: "el-section", "aria-label": "Section" });
    const elLvl = h("select", { id: "el-level", "aria-label": "Elected level" });
    const elReason = h("input", { type: "text", id: "el-reason", placeholder: "for example: slope of longitudinal stability negative in level flight, elect to an earlier amendment" });
    const elMsg = h("span", { class: "small muted", role: "status" });
    function fillLevels() {
      const [rb, sec] = elSec.value.split("|");
      const book = cache.books[rb];
      const base = mainRows.find((r) => rkey(r) === elSec.value && isReg(r));
      let cur = null; try { cur = base && !SPECIAL.includes(base.level) ? CB.versionAt(book, sec, base.level) : null; } catch (e) { cur = null; }
      const ex = st.elections.find((e) => `${e.rulebook}|${e.section}` === elSec.value);
      elLvl.replaceChildren(...(book && book.sections[sec] ? CB.levelsOf(book, sec) : []).map((v) =>
        h("option", { value: v.amendment, selected: ex ? ex.level === v.amendment : false },
          `${lvl(book, v.amendment)}${v.effective ? `, ${v.effective}` : ""}${cur && cur.amendment === v.amendment ? " (basis text)" : ""}`)));
      elMsg.textContent = base ? `Basis level: ${lvl(book, base.level)}.` : "";
      if (ex) elReason.value = ex.reason || "";
    }
    elSec.addEventListener("change", () => { elReason.value = ""; fillLevels(); });
    function openElect(k) {
      elSec.value = k; elReason.value = ""; fillLevels();
      electBox.scrollIntoView({ block: "start" }); elLvl.focus();
    }
    function renderElect() {
      const keep = elSec.value;
      const keys = st.applicable.length ? st.applicable : candidates.map(rkey);
      const byKey = new Map(candidates.map((r) => [rkey(r), r]));
      elSec.replaceChildren(...keys.map((k) => { const r = byKey.get(k); return h("option", { value: k }, `${k.split("|")[1]} ${r ? r.heading : ""}`); }));
      if (keep && keys.includes(keep)) elSec.value = keep;
      fillLevels();
      const list = h("tbody", null, st.elections.map((e, i) => {
        const book = cache.books[e.rulebook];
        const base = mainRows.find((r) => r.rulebook === e.rulebook && r.section === e.section && isReg(r));
        return h("tr", { class: "k-elected" }, h("td", { class: "sec" }, h("a", { href: libHref(e.rulebook, e.section, e.level) }, e.section)),
          h("td", { class: "lvl" }, base ? lvl(book, base.level) : "not in basis"), h("td", { class: "lvl" }, h("strong", null, lvl(book, e.level))),
          h("td", null, e.reason || ""),
          h("td", null, base && !SPECIAL.includes(base.level) ? h("a", { href: diffHref(e.rulebook, e.section, base.level, e.level, `Election for ${stc.id}: basis level (left) against elected level (right).`) }, "Compare") : null, " ",
            h("button", { type: "button", onclick: () => { st.elections.splice(i, 1); refresh(); } }, "Remove")));
      }));
      electList.replaceChildren(st.elections.length ? wrapTable(h("table", { id: "elections" },
        h("thead", null, h("tr", null, ["Section", "Basis level", "Elected level", "Reason", ""].map((x) => h("th", { scope: "col" }, x)))), list)) : h("p", { class: "muted small" }, "No elections yet."));
    }
    const electList = h("div");
    const electForm = h("form", { class: "row", id: "elect-form", onsubmit: (ev) => {
      ev.preventDefault();
      const [rb, sec] = elSec.value.split("|");
      if (!sec || !elLvl.value) return;
      st.elections = st.elections.filter((e) => !(e.rulebook === rb && e.section === sec));
      st.elections.push({ rulebook: rb, section: sec, level: elLvl.value, reason: elReason.value.trim() });
      elReason.value = ""; refresh(); elMsg.textContent = `Election saved for ${sec}.`;
    } },
      h("label", { class: "field" }, "Section", elSec), h("label", { class: "field" }, "Level", elLvl),
      h("label", { class: "field grow" }, "Reason", elReason), h("button", { type: "submit", class: "primary" }, "Save election"), elMsg);
    electBox.append(electForm, electList);

    // free lists
    function renderLists() {
      listsBox.replaceChildren(...LISTS.map(([key, title]) => {
        const items = st[key];
        const ref = h("input", { type: "text", "aria-label": `${title}: reference`, placeholder: "Reference" });
        const ttl = h("input", { type: "text", "aria-label": `${title}: title`, placeholder: "Title", class: "grow" });
        const note = h("input", { type: "text", "aria-label": `${title}: note`, placeholder: "Note", class: "grow" });
        return h("section", { class: "list", "data-list": key }, h("h3", null, title),
          items.length ? wrapTable(h("table", null, h("thead", null, h("tr", null, ["Reference", "Title", "Note", ""].map((x) => h("th", { scope: "col" }, x)))),
            h("tbody", null, items.map((it, i) => h("tr", null, h("td", null, it.ref || ""), h("td", null, it.title || ""), h("td", null, it.note || ""),
              h("td", null, h("button", { type: "button", onclick: () => { items.splice(i, 1); refresh(); } }, "Remove"))))))) : h("p", { class: "small muted" }, "None yet."),
          h("form", { class: "row", onsubmit: (ev) => {
            ev.preventDefault();
            if (!ref.value.trim() && !ttl.value.trim()) return;
            items.push({ ref: ref.value.trim(), title: ttl.value.trim(), note: note.value.trim() }); refresh();
          } }, ref, ttl, note, h("button", { type: "submit" }, "Add")));
      }));
    }

    // export
    function buildMd(withText) {
      const rows = scopedRows();
      let md = CB.toMarkdown(`${stc.id}: ${stc.title}`, rows, cache.books, { withText });
      const book = cache.books["14cfr-27"];
      const extra = ["", "## Project", "",
        `Main model: ${stc.main.label}. TCDS ${stc.tcds}. ${stc.certification_plan ? `Certification plan ${stc.certification_plan}.` : ""}`,
        "", `Applicable sections: ${st.applicable.length ? `${st.applicable.length} checked` : "none checked, whole basis listed"}${st.confirmed ? "" : " (draft, not confirmed)"}.`];
      if (st.elections.length) {
        extra.push("", "### Elections", "", "| Section | Basis level | Elected level | Reason |", "|---|---|---|---|");
        for (const e of st.elections) {
          const base = mainRows.find((r) => r.rulebook === e.rulebook && r.section === e.section && isReg(r));
          extra.push(`| ${e.section} | ${base ? lvl(book, base.level) : "not in basis"} | ${lvl(cache.books[e.rulebook], e.level)} | ${(e.reason || "").replace(/\|/g, "/")} |`);
        }
      }
      if (st.selected.length && st.applicable.length) {
        const labels = st.selected.map((m) => (stc.selectable.find((x) => x.model === m) || {}).label || m);
        const cmps = st.selected.map((m) => CB.compareRows(projRows(), rowsOfModel(m), st.applicable));
        extra.push("", "### Applicability", "", `| Section | ${stc.main.label} | ${labels.join(" | ")} |`, `|---|---|${labels.map(() => "---").join("|")}|`);
        st.applicable.forEach((k, i) => extra.push(`| ${k.split("|")[1]} | ${fmtLevels(cmps[0][i].levelA)} | ${cmps.map((c) => (c[i].differs ? `**${fmtLevels(c[i].levelB)}**` : fmtLevels(c[i].levelB))).join(" | ")} |`));
        extra.push("", "Bold: differs from the main model.");
      }
      for (const [key, title] of LISTS) {
        if (!st[key].length) continue;
        extra.push("", `### ${title}`, "");
        for (const it of st[key]) extra.push(`- ${[it.ref ? `**${it.ref}**` : null, it.title, it.note].filter(Boolean).join(", ")}`);
      }
      // keep the project block ahead of the full text
      const cut = md.indexOf("\n## Text\n");
      return cut >= 0 ? md.slice(0, cut) + extra.join("\n") + "\n" + md.slice(cut) : md + extra.join("\n") + "\n";
    }
    function exportJson() {
      const out = JSON.parse(JSON.stringify(stc));
      out.applicable_sections = { ...(stc.applicable_sections || {}),
        status: st.confirmed ? `confirmed in CertBasis UI ${new Date().toISOString().slice(0, 10)}` : (stc.applicable_sections || {}).status || "draft",
        rulebook: "14cfr-27",
        sections: st.applicable.map((k) => (k.startsWith("14cfr-27|") ? k.slice(9) : k)) };
      out.elections = st.elections;
      for (const [key] of LISTS) out[key] = st[key];
      out.selected_models = st.selected;
      download(`${stc.id}.json`, JSON.stringify(out, null, 1) + "\n", "application/json");
      jsonMsg.textContent = `Downloaded ${stc.id}.json. Hand it to JARVIS to commit as data/stc/${stc.id}.json.`;
    }
    const jsonMsg = h("p", { class: "status", role: "status", id: "json-status" });
    const fileIn = h("input", { type: "file", id: "import-json", accept: ".json,application/json", class: "small", onchange: async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        if (data.id && data.id !== stc.id) throw new Error(`file is for ${data.id}, not ${stc.id}`);
        st = stateFromImport(stc, data);
        confirmBox.checked = st.confirmed;
        modelBoxes.querySelectorAll("input").forEach((cb) => { cb.checked = st.selected.includes(cb.value); });
        renderPicker(); refresh(); jsonMsg.textContent = `Imported ${f.name}.`;
      } catch (err) { jsonMsg.textContent = `Import failed: ${err.message}`; }
      e.target.value = "";
    } });
    const resetBtn = h("button", { type: "button", onclick: () => {
      if (!window.confirm("Reset the project to the data file? Your changes in this browser will be lost.")) return;
      storeDel(KEY); st = freshState(stc); confirmBox.checked = st.confirmed;
      modelBoxes.querySelectorAll("input").forEach((cb) => { cb.checked = false; });
      renderPicker(); refresh(); jsonMsg.textContent = "Reset to the data file.";
    } }, "Reset to data file");

    setMain(
      h("h1", null, `${stc.id}: ${stc.title}`),
      h("p", { class: "small muted" }, [stc.applicant, stc.certification_plan ? `Certification plan ${stc.certification_plan}` : null, `TCDS ${stc.tcds}`].filter(Boolean).join(". ") + "."),
      stc.notes ? h("ul", { class: "small" }, stc.notes.map((n) => h("li", null, n))) : null,
      cache.missing.size ? h("p", { class: "notice small" }, `Not loaded yet: ${[...cache.missing].map(bookLabel).join(", ")}.`) : null,
      h("p", { class: "small muted" }, save() ? "Changes are kept in this browser. Use Export JSON to keep a copy." : "This browser does not keep changes: use Export JSON."),

      h("h2", null, "Applicability"),
      h("p", null, "Main model: ", h("strong", { id: "main-model" }, stc.main.label), "."),
      h("p", { class: "small muted" }, "Tick other models to compare their level for each applicable section with the main model. Differences are highlighted."),
      modelBoxes,
      h("div", { class: "row" }, h("label", null, diffOnly, " Show differences only")),
      cmpBox,

      h("h2", null, "Applicable sections"),
      draftNote,
      h("div", { class: "row" }, h("label", null, confirmBox, " I have confirmed this list"), pickCount),
      h("div", { class: "row" }, h("label", { for: "pick-filter" }, "Find"), pickFilter, h("label", null, onlyChecked, " Checked only"),
        h("button", { type: "button", onclick: () => { st.applicable = [...st.seed]; renderPicker(); refresh(); } }, "Reset to draft list"),
        h("button", { type: "button", onclick: () => { st.applicable = []; renderPicker(); refresh(); } }, "Clear all")),
      picker,

      h("h2", null, "Project basis"),
      basisBox,

      h("h2", { id: "elections-head" }, "Elections"),
      h("p", { class: "small muted" }, "Elect an earlier or later amendment for a section and record why. The basis table shows elected rows with the original level."),
      electBox,

      h("h2", null, "Project lists"),
      listsBox,

      exportPanel(`CertBasis-${stc.id}.md`, buildMd,
        [h("button", { type: "button", id: "json-export", onclick: exportJson }, "Export JSON"),
          h("label", { for: "import-json", class: "small" }, "Import JSON"), fileIn, resetBtn]),
      jsonMsg);
    renderPicker();
    refresh();
  }

  window.addEventListener("hashchange", route);
  route();
})();
