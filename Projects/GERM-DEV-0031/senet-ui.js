/* Senet page controller. GERM-DEV-0031. */
(function () {
  'use strict';
  const S = window.Senet;
  const $ = id => document.getElementById(id);
  const NAMES = ['Cones', 'Spools'];

  /* ---------- Drawing ---------- */

  const G = '#6b4a2e';
  function svg(inner, cls, vb) {
    return '<svg class="' + cls + '" viewBox="' + (vb || '0 0 40 40') + '" aria-hidden="true">' + inner + '</svg>';
  }
  const nfr = x => '<g transform="translate(' + x + ',0)" stroke="' + G + '" stroke-width="1.6" fill="none">' +
    '<line x1="0" y1="8" x2="0" y2="22"/><line x1="-2.6" y1="13" x2="2.6" y2="13"/>' +
    '<ellipse cx="0" cy="27" rx="3.6" ry="5.2"/></g>';
  const bird = x => '<g transform="translate(' + x + ',0)" fill="' + G + '">' +
    '<ellipse cx="0" cy="22" rx="3.2" ry="6"/><circle cx="1.6" cy="13" r="2"/>' +
    '<path d="M3.3 12.6l3 .9-3 .8z"/><path d="M-1 27.5l-2.5 5M1 27.5l1.5 5" stroke="' + G + '" stroke-width="1"/>' +
    '<path d="M-3 18c-4 2-5 6-4 10l3-5z"/></g>';
  const man = x => '<g transform="translate(' + x + ',0)" fill="' + G + '">' +
    '<circle cx="0" cy="13" r="2.8"/><path d="M-3 17h5l1 8h5v4h-11z"/><path d="M2 18l5 3-1 1.5-5-2z"/></g>';
  const water = '<g stroke="' + G + '" stroke-width="1.6" fill="none">' +
    [12, 20, 28].map(y => '<path d="M5 ' + y + 'l3.75-2.5 3.75 2.5 3.75-2.5 3.75 2.5 3.75-2.5 3.75 2.5 3.75-2.5 3.75 2.5"/>').join('') + '</g>';
  const ankh = '<g stroke="' + G + '" stroke-width="2" fill="none"><ellipse cx="20" cy="11" rx="4.5" ry="6"/>' +
    '<line x1="11" y1="18.5" x2="29" y2="18.5"/><line x1="20" y1="17" x2="20" y2="35"/></g>';
  const sun = '<g fill="none" stroke="' + G + '" stroke-width="1.6"><circle cx="20" cy="20" r="8"/></g>' +
    '<circle cx="20" cy="20" r="2" fill="' + G + '"/>';
  const GLYPHS = {
    15: ankh,
    26: nfr(10) + nfr(20) + nfr(30),
    27: water,
    28: bird(10) + bird(20) + bird(30),
    29: man(13) + man(27),
    30: sun
  };
  const GLYPH_TITLE = {
    15: 'Square 15, the house of rebirth (ankh)',
    26: 'Square 26, nfr, the beautiful house',
    27: 'Square 27, the water',
    28: 'Square 28, three (three ba birds)',
    29: 'Square 29, two (two seated men)',
    30: 'Square 30, Re-Horakhty (one)'
  };

  function pieceSVG(p) {
    if (p === 0) {
      return svg('<path d="M20 5c2.3 0 3.4 1.8 3 3.8L29 33H11l6-24.2C16.6 6.8 17.7 5 20 5z" fill="var(--cone)" stroke="var(--cone2)" stroke-width="1.4"/>' +
        '<ellipse cx="20" cy="33.5" rx="9.5" ry="2.6" fill="var(--cone2)"/><ellipse cx="18" cy="12" rx="1.4" ry="4" fill="#fff4"/>', 'piece');
    }
    return svg('<ellipse cx="20" cy="33" rx="12" ry="3.4" fill="var(--spool2)"/>' +
      '<path d="M9 31c4-3 5-8 5-11s-1-6-5-8h22c-4 2-5 5-5 8s1 8 5 11z" fill="var(--spool)" stroke="#8b7653" stroke-width="1.2"/>' +
      '<ellipse cx="20" cy="11.5" rx="11.5" ry="3.6" fill="var(--spool)" stroke="#8b7653" stroke-width="1.2"/>' +
      '<rect x="12.5" y="25" width="15" height="3" rx="1.5" fill="var(--spool2)"/>', 'piece');
  }

  /* ---------- State ---------- */

  let rs, st, mode, human, phase, tv, moves, sel, last, busy, logN;

  function rsList() { return Object.keys(S.RULESETS).map(k => S.RULESETS[k]); }

  function squareAt(r, c) { return r === 0 ? c + 1 : r === 1 ? 20 - c : 21 + c; }

  function isHumanTurn() { return mode === 'human' || st.turn === human; }

  function log(msg) {
    const li = document.createElement('li');
    li.textContent = msg;
    $('log').appendChild(li);
    $('log').scrollTop = 1e9;
  }

  function sqName(s) { return s === 31 ? 'off the board' : s === 0 ? 'the start' : 'square ' + s; }

  /* ---------- Render ---------- */

  function buildBoard() {
    const b = $('board');
    b.innerHTML = '';
    for (let r = 0; r < 3; r++) for (let c = 0; c < 10; c++) {
      const s = squareAt(r, c);
      const el = document.createElement('button');
      el.className = 'sq';
      el.dataset.sq = s;
      el.setAttribute('role', 'gridcell');
      el.title = GLYPH_TITLE[s] || 'Square ' + s;
      el.addEventListener('click', () => clickSquare(s));
      b.appendChild(el);
    }
    $('tray0').addEventListener('click', () => clickTray(0));
    $('tray1').addEventListener('click', () => clickTray(1));
  }

  function render() {
    const fromSet = new Set(moves.map(m => m.from));
    const destSet = new Set(sel === null ? [] : moves.filter(m => m.from === sel).map(m => m.to));
    const showMoves = phase === 'move' && isHumanTurn() && !busy;
    document.querySelectorAll('.sq').forEach(el => {
      const s = Number(el.dataset.sq), p = st.board[s];
      let h = '<span class="num">' + s + '</span>';
      if (GLYPHS[s]) h += svg(GLYPHS[s], 'glyph');
      if (p >= 0) h += pieceSVG(p);
      el.innerHTML = h;
      el.classList.toggle('can', showMoves && fromSet.has(s) && sel === null);
      el.classList.toggle('sel', showMoves && sel === s);
      el.classList.toggle('dest', showMoves && destSet.has(s));
      el.classList.toggle('last', !!last && (last.from === s || last.to === s));
      let lab = 'Square ' + s + (GLYPH_TITLE[s] ? ', ' + GLYPH_TITLE[s].split(', ')[1] : '') +
        (p >= 0 ? ', ' + NAMES[p].toLowerCase().slice(0, -1) : ', empty');
      if (showMoves && fromSet.has(s) && sel === null) lab += ', can move';
      if (showMoves && destSet.has(s)) lab += ', move here';
      el.setAttribute('aria-label', lab);
    });
    for (const p of [0, 1]) {
      const t = $('tray' + p);
      let h = '<span class="lbl">' + NAMES[p] + (mode !== 'human' ? (p === human ? ' (you)' : ' (computer)') : '') + '</span>';
      if (st.reserve[p]) h += '<span class="lbl">to enter:</span>' + new Array(st.reserve[p]).fill(pieceSVG(p)).join('');
      h += '<span class="lbl">off: ' + st.off[p] + ' / ' + rs.pieces + '</span>' + new Array(st.off[p]).fill(pieceSVG(p)).join('');
      if (st.lost[p]) h += '<span class="lbl">struck out: ' + st.lost[p] + '</span>';
      t.innerHTML = h;
      const canEnter = showMoves && p === st.turn && fromSet.has(0) && sel === null;
      t.classList.toggle('can', canEnter);
      t.classList.toggle('dest', showMoves && p === st.turn && destSet.has(31));
    }
    $('throw').disabled = !(phase === 'throw' && isHumanTurn() && !busy);
    status();
  }

  function status() {
    const who = '<span class="who">' + pieceSVG(st.turn).replace('class="piece"', '') + NAMES[st.turn] + '</span>';
    let msg;
    if (phase === 'over') {
      const w = st.winner;
      msg = '<span class="who">' + pieceSVG(w).replace('class="piece"', '') + NAMES[w] + ' win.</span> ' +
        (mode === 'human' ? '' : (w === human ? 'You reached the end first.' : 'The computer reached the end first.')) +
        ' Press New game to play again.';
    } else if (phase === 'throw') {
      msg = who + (isHumanTurn() ? ' to throw. Press the throw button (or the space bar).' : ' (computer) is throwing.');
    } else if (phase === 'move') {
      if (!isHumanTurn()) msg = who + ' (computer) is thinking.';
      else if (sel === null) msg = who + ' threw ' + tv + '. Pick a highlighted piece' + (moves.some(m => m.from === 0) ? ' (or the start tray)' : '') + '.';
      else msg = who + ' threw ' + tv + '. Pick a green square' + (moves.some(m => m.from === sel && m.to === 31) ? ' (or your tray to bear off)' : '') + ', or another piece.';
    } else msg = '';
    $('status').innerHTML = msg;
  }

  function drawSticks(faces, anim) {
    const el = $('sticks');
    el.innerHTML = '';
    if (!faces) { el.innerHTML = '<div class="die' + (anim ? ' rolling' : '') + '">d4</div>'; return; }
    faces.forEach(f => {
      const d = document.createElement('div');
      d.className = 'stick' + (f ? '' : ' dark') + (anim ? ' rolling' : '');
      el.appendChild(d);
    });
  }

  function rulesPanel() {
    $('rulesource').innerHTML = '<p><b>' + rs.name + '.</b> ' + rs.source + '</p>';
    let h = '';
    rs.evidence.forEach(e => {
      h += '<tr><td><span class="tag ' + e.s + '">' + ({ E: 'Evidenced', I: 'Inferred', X: 'Invented' })[e.s] + '</span></td><td>' + e.rule + (e.note ? '<br><span class="tnote">' + e.note + '</span>' : '') + '</td></tr>';
    });
    $('evtable').innerHTML = h;
  }

  /* ---------- Flow ---------- */

  function newGame() {
    rs = S.RULESETS[$('rs').value];
    mode = $('mode').value;
    human = Number($('side').value);
    st = S.newGame(rs, rs.starter === 1 ? 1 : 0);
    phase = 'throw'; tv = null; moves = []; sel = null; last = null; busy = false; logN = 0;
    $('log').innerHTML = '';
    $('tval').innerHTML = '&nbsp;';
    $('tnote').textContent = '';
    drawSticks(rs.lot === 'd4' ? null : [1, 0, 1, 0], false);
    $('throw').textContent = rs.lot === 'd4' ? 'Roll the die' : 'Throw sticks';
    rulesPanel();
    log('New game, ' + rs.name + '. ' + NAMES[st.turn] + ' throw first.');
    render();
    maybeComputer();
  }

  function doThrow() {
    if (phase !== 'throw' || busy) return;
    const th = S.throwLot(rs);
    tv = S.throwValue(th.lights, rs);
    drawSticks(th.faces, true);
    $('tval').textContent = tv;
    const again = S.extraThrow(tv, rs, null);
    $('tnote').textContent = (th.faces ? th.lights + ' light side' + (th.lights === 1 ? '' : 's') + ' up' + (th.lights === 0 ? ' (all dark counts ' + rs.zero + ')' : '') : 'The die shows ' + tv) + (again ? '. Throws again after moving.' : '.');
    moves = S.legalMoves(st, st.turn, tv, rs);
    sel = null;
    if (moves.length === 0) {
      log(NAMES[st.turn] + ' threw ' + tv + ': no legal move.');
      phase = 'move';
      busy = true; render();
      setTimeout(() => { busy = false; finishTurn(); }, 900);
      return;
    }
    phase = 'move';
    // One legal move: preselect it, the human still confirms it.
    if (moves.length === 1 && isHumanTurn()) sel = moves[0].from;
    render();
    maybeComputer();
  }

  function play(m) {
    const p = st.turn;
    const r = S.applyMove(st, m, rs);
    let msg = NAMES[p] + ' threw ' + tv + ': ' + sqName(m.from) + ' to ' + sqName(m.to);
    if (m.dir < 0) msg += ' (backward, no forward move)';
    r.events.forEach(e => {
      const foe = NAMES[S.opp(p)].toLowerCase().slice(0, -1);
      if (e === 'swap') msg += ', swapping places with a ' + foe;
      if (e === 'removed') msg += ', striking a ' + foe + ' out of the game';
      if (e.indexOf('hit:') === 0) { const h = Number(e.slice(4)); msg += ', sending a ' + foe + (h ? ' back to square ' + h : ' back to the start'); }
      if (e.indexOf('water:') === 0) { const s = Number(e.slice(6)); msg += ', fell in the water' + (s ? ' and went back to square ' + s : ' and went back to the start'); }
    });
    log(msg + '.');
    st = r.state;
    last = m.to === 31 ? { from: m.from, to: -1 } : m;
    sel = null; moves = [];
    if (st.winner >= 0) { phase = 'over'; log(NAMES[st.winner] + ' win.'); render(); return; }
    finishTurn(m);
  }

  function finishTurn(m) {
    const again = S.extraThrow(tv, rs, m || null);
    st = S.endTurn(st, tv, rs, m || null);
    phase = 'throw';
    moves = []; sel = null;
    if (again) $('tnote').textContent = NAMES[st.turn] + ' throw again.';
    render();
    maybeComputer();
  }

  function maybeComputer() {
    if (phase === 'over' || isHumanTurn()) return;
    busy = true; render();
    setTimeout(() => {
      busy = false;
      if (phase === 'throw') { doThrow(); return; }
      if (phase === 'move' && moves.length) {
        const m = S.chooseMove(st, tv, rs, mode);
        busy = true; render();
        setTimeout(() => { busy = false; play(m); }, 450);
      }
    }, 700);
  }

  function clickSquare(s) {
    if (phase !== 'move' || !isHumanTurn() || busy) return;
    if (sel !== null) {
      const m = moves.find(x => x.from === sel && x.to === s);
      if (m) { play(m); return; }
    }
    if (moves.some(m => m.from === s)) { sel = s; render(); return; }
    sel = null; render();
  }

  function clickTray(p) {
    if (phase !== 'move' || !isHumanTurn() || busy || p !== st.turn) return;
    if (sel !== null) {
      const m = moves.find(x => x.from === sel && x.to === 31);
      if (m) { play(m); return; }
    }
    if (moves.some(m => m.from === 0)) { sel = 0; render(); }
  }

  /* ---------- Init ---------- */

  function init() {
    const sel0 = $('rs');
    rsList().forEach(r => {
      const o = document.createElement('option');
      o.value = r.id; o.textContent = r.short || r.name;
      sel0.appendChild(o);
    });
    sel0.value = 'kendall';
    $('about').innerHTML = window.SENET_ABOUT || '';
    buildBoard();
    $('new').addEventListener('click', newGame);
    $('rs').addEventListener('change', newGame);
    $('mode').addEventListener('change', newGame);
    $('side').addEventListener('change', newGame);
    $('throw').addEventListener('click', doThrow);
    $('nums').addEventListener('change', e => document.body.classList.toggle('shownums', e.target.checked));
    document.addEventListener('keydown', e => {
      if (e.code === 'Space' && e.target.tagName !== 'SELECT' && e.target.tagName !== 'BUTTON') { e.preventDefault(); if (isHumanTurn()) doThrow(); }
    });
    newGame();
  }
  init();
})();
