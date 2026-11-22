/* Senet rules engine. GERM-DEV-0031.
 *
 * Every rule that scholars disagree on is a parameter of a rule set, so each
 * published reconstruction is one object in RULESETS (senet-rulesets.js).
 * The engine knows nothing about the page: it runs in the browser and under
 * Node (tests and the playability simulation).
 *
 * Board: squares 1..30, read as a boustrophedon path
 *   row 1:  1 -> 10   (left to right)
 *   row 2: 20 <- 11   (right to left)
 *   row 3: 21 -> 30   (left to right)
 * Square 31 means "borne off". Square 0 means "not yet entered".
 * Players: 0 (cones) and 1 (spools).
 *
 * Rule set fields (all required unless marked optional):
 *   pieces        pieces per player
 *   start         'alternate' (pieces alternate on squares 1..2n) | 'offboard'
 *   lot           'sticks' (4 two-sided sticks, count light faces) | 'd4' (1..4 even)
 *   zero          value of a sticks throw with no light face
 *   extra         throw values that give another throw
 *   extraSquares  (opt) landing on these squares gives another throw
 *   enterOn       (opt) throws that may enter a piece; default any
 *   enterAt       (opt) 'throw' (enter on square = throw) | 1 (always square 1)
 *   capture       'swap' | 'rear' (struck piece to rearmost empty square) |
 *                 'remove' (struck piece leaves the game) | 'none' (no landing on a piece)
 *   protectPairs  a piece next to a friend on the path cannot be struck
 *   blockRun      (opt) this many friends in a row cannot be passed
 *   safe          squares where a piece cannot be struck
 *   mustStop26    every piece must land exactly on 26 before going on
 *   water         effect of landing on 27: 'to15' | 'rear' | 'reserve' | 'none'
 *   offFrom       lowest square a piece may bear off from
 *   exactOff      bearing off needs the exact throw to reach square 31
 *   anyOffFrom30  (opt) a piece on 30 bears off on any throw
 *   allHomeToBearOff (opt) all own pieces must be at or beyond offFrom
 *   backward      move a piece backward when no forward move exists
 *   noBackFrom    (opt) pieces on this square or beyond never move backward
 *   win           'allOff' (first to bear off all) | 'mostOff' (game ends when a
 *                 side has nothing left in play; most borne off wins)
 */
(function (root) {
  'use strict';

  // Four two-sided throwsticks, each assumed 50/50. P(n light) = C(4,n)/16.
  const LIGHT_PROB = [1 / 16, 4 / 16, 6 / 16, 4 / 16, 1 / 16];

  const RULESETS = {};

  function opp(p) { return p === 0 ? 1 : 0; }

  function throwValue(lights, rs) {
    if (rs.lot === 'd4') return lights; // lights holds the die value
    return lights === 0 ? rs.zero : lights;
  }

  // Probability of each move value: {value: p}
  function valueDist(rs) {
    if (rs.lot === 'd4') return { 1: 0.25, 2: 0.25, 3: 0.25, 4: 0.25 };
    const d = {};
    for (let n = 0; n <= 4; n++) {
      const v = throwValue(n, rs);
      d[v] = (d[v] || 0) + LIGHT_PROB[n];
    }
    return d;
  }

  function newGame(rs, starter) {
    const board = new Array(32).fill(-1);
    const reserve = [0, 0];
    if (rs.start === 'alternate') {
      for (let i = 0; i < rs.pieces * 2; i++) board[i + 1] = i % 2;
    } else {
      reserve[0] = rs.pieces; reserve[1] = rs.pieces;
    }
    return {
      board, reserve, off: [0, 0], lost: [0, 0],
      turn: starter === undefined ? 0 : starter,
      winner: -1, moveCount: 0
    };
  }

  function clone(st) {
    return {
      board: st.board.slice(), reserve: st.reserve.slice(), off: st.off.slice(),
      lost: st.lost.slice(), turn: st.turn, winner: st.winner, moveCount: st.moveCount
    };
  }

  function isProtected(st, sq, owner, rs) {
    if (rs.safe && rs.safe.indexOf(sq) >= 0) return true;
    if (!rs.protectPairs) return false;
    const b = st.board;
    return (sq > 1 && b[sq - 1] === owner) || (sq < 30 && b[sq + 1] === owner);
  }

  // True if squares strictly between a and b hold blockRun consecutive pieces of owner.
  function blocked(st, a, b, owner, rs) {
    if (!rs.blockRun) return false;
    const lo = Math.min(a, b) + 1, hi = Math.max(a, b) - 1;
    let run = 0;
    for (let s = lo; s <= hi; s++) {
      if (s >= 1 && s <= 30 && st.board[s] === owner) { run++; if (run >= rs.blockRun) return true; }
      else run = 0;
    }
    return false;
  }

  function piecesBefore(st, p, sq) {
    let n = st.reserve[p];
    for (let s = 1; s < sq; s++) if (st.board[s] === p) n++;
    return n;
  }

  function targetOK(st, p, from, to, rs) {
    const o = opp(p), b = st.board;
    if (to < 1 || to > 30) return false;
    if (b[to] === p) return false;
    if (b[to] === o) {
      if (rs.capture === 'none') return false;
      if (isProtected(st, to, o, rs)) return false;
    }
    if (blocked(st, from, to, o, rs)) return false;
    return true;
  }

  function forwardMoves(st, p, t, rs) {
    const res = [];
    if (st.reserve[p] > 0 && (!rs.enterOn || rs.enterOn.indexOf(t) >= 0)) {
      const to = rs.enterAt === 1 ? 1 : t;
      if (targetOK(st, p, 0, to, rs)) res.push({ from: 0, to, dir: 1 });
    }
    for (let s = 1; s <= 30; s++) {
      if (st.board[s] !== p) continue;
      const to = s + t;
      if (rs.mustStop26 && s < 26 && to > 26) continue;
      if (to >= 31) {
        if (s < rs.offFrom) continue;
        const exactOK = to === 31 || !rs.exactOff || (rs.anyOffFrom30 && s === 30);
        if (!exactOK) continue;
        if (rs.allHomeToBearOff && piecesBefore(st, p, rs.offFrom) > 0) continue;
        if (blocked(st, s, 31, opp(p), rs)) continue;
        res.push({ from: s, to: 31, dir: 1 });
        continue;
      }
      if (targetOK(st, p, s, to, rs)) res.push({ from: s, to, dir: 1 });
    }
    return res;
  }

  function backwardMoves(st, p, t, rs) {
    const res = [];
    for (let s = 1; s <= 30; s++) {
      if (st.board[s] !== p) continue;
      if (rs.noBackFrom && s >= rs.noBackFrom) continue;
      const to = s - t;
      if (targetOK(st, p, s, to, rs)) res.push({ from: s, to, dir: -1 });
    }
    return res;
  }

  function legalMoves(st, p, t, rs) {
    const f = forwardMoves(st, p, t, rs);
    if (f.length || !rs.backward) return f;
    return backwardMoves(st, p, t, rs);
  }

  function nearestFreeDown(b, sq) {
    for (let s = sq; s >= 1; s--) if (b[s] === -1) return s;
    for (let s = sq + 1; s <= 30; s++) if (b[s] === -1) return s;
    return -1;
  }
  function rearmostFree(b) {
    for (let s = 1; s <= 30; s++) if (b[s] === -1) return s;
    return -1;
  }

  function inPlay(st, p) {
    let n = st.reserve[p];
    for (let s = 1; s <= 30; s++) if (st.board[s] === p) n++;
    return n;
  }

  // Apply a move; returns {state, events[]}. Events: 'off', 'swap', 'hit:N',
  // 'removed', 'water:N' (N = square sent to, 0 = back to start), 'win'.
  function applyMove(st0, mv, rs) {
    const st = clone(st0), b = st.board, p = st.turn, o = opp(p);
    const ev = [];
    if (mv.from === 0) st.reserve[p]--; else b[mv.from] = -1;
    if (mv.to === 31) {
      st.off[p]++; ev.push('off');
    } else {
      if (b[mv.to] === o) {
        b[mv.to] = -1;
        if (rs.capture === 'swap') {
          if (mv.from === 0) st.reserve[o]++; else b[mv.from] = o;
          ev.push('swap');
        } else if (rs.capture === 'rear') {
          b[mv.to] = p; // hold the square while finding the rearmost one
          const s = rearmostFree(b);
          if (s === -1) st.reserve[o]++; else b[s] = o;
          ev.push('hit:' + (s === -1 ? 0 : s));
        } else if (rs.capture === 'remove') {
          st.lost[o]++; ev.push('removed');
        }
      }
      b[mv.to] = p;
      if (mv.to === 27 && rs.water !== 'none') {
        b[27] = -1;
        let s = -1;
        if (rs.water === 'to15') s = nearestFreeDown(b, 15);
        else if (rs.water === 'rear') s = rearmostFree(b);
        if (s === -1) st.reserve[p]++; else b[s] = p;
        ev.push('water:' + (s === -1 ? 0 : s));
      }
    }
    st.moveCount++;
    if (rs.win === 'mostOff') {
      if (inPlay(st, p) === 0 || inPlay(st, o) === 0) {
        // Pieces still in play are unopposed, so they count as borne off.
        const sp = st.off[p] + inPlay(st, p), so = st.off[o] + inPlay(st, o);
        st.winner = sp > so ? p : so > sp ? o : p;
        ev.push('win');
      }
    } else if (st.off[p] === rs.pieces) { st.winner = p; ev.push('win'); }
    else if (rs.capture === 'remove' && st.off[o] + st.lost[o] === rs.pieces) { st.winner = p; ev.push('win'); }
    return { state: st, events: ev };
  }

  function extraThrow(t, rs, mv) {
    if (rs.extra.indexOf(t) >= 0) return true;
    return !!(mv && rs.extraSquares && rs.extraSquares.indexOf(mv.to) >= 0);
  }

  function endTurn(st, t, rs, mv) {
    if (st.winner >= 0) return st;
    if (!extraThrow(t, rs, mv)) st.turn = opp(st.turn);
    return st;
  }

  /* ---------- Computer player ---------- */

  function evaluate(st, p, rs) {
    const o = opp(p), b = st.board;
    if (st.winner === p) return 1e6;
    if (st.winner === o) return -1e6;
    const dist = valueDist(rs);
    function side(q) {
      const r = opp(q);
      let v = st.off[q] * 36 - st.lost[q] * 30;
      for (let s = 1; s <= 30; s++) {
        if (b[s] !== q) continue;
        v += s;
        if (s >= 26) v += 2;
        const prot = isProtected(st, s, q, rs);
        if (s < 26 && prot) v += 1.5;
        if (!prot && rs.capture !== 'none') {
          let risk = 0;
          for (const k in dist) {
            const from = s - Number(k);
            if (from >= 1 && b[from] === r && !blocked(st, from, s, q, rs)) risk += dist[k];
          }
          const loss = rs.capture === 'remove' ? 30 : rs.capture === 'rear' ? s : Math.max(4, s * 0.45);
          v -= risk * loss;
        }
      }
      return v;
    }
    return side(p) - side(o);
  }

  function chooseMove(st, t, rs, level, rng) {
    rng = rng || Math.random;
    const p = st.turn;
    const moves = legalMoves(st, p, t, rs);
    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0];
    if (level === 'random') return moves[Math.floor(rng() * moves.length)];
    const scored = moves.map(m => {
      const after = applyMove(st, m, rs).state;
      let v;
      if (level === 'hard' && after.winner < 0 && !extraThrow(t, rs, m)) {
        after.turn = opp(p);
        const dist = valueDist(rs);
        v = 0;
        for (const k in dist) {
          const om = legalMoves(after, after.turn, Number(k), rs);
          let worst;
          if (om.length === 0) worst = evaluate(after, p, rs);
          else {
            worst = Infinity;
            for (const m2 of om) {
              const e = evaluate(applyMove(after, m2, rs).state, p, rs);
              if (e < worst) worst = e;
            }
          }
          v += dist[k] * worst;
        }
      } else {
        v = evaluate(after, p, rs);
      }
      return { m, v };
    });
    scored.sort((a, b) => b.v - a.v);
    if (level === 'easy') {
      const k = Math.min(scored.length, 3);
      return scored[Math.floor(rng() * k)].m;
    }
    return scored[0].m;
  }

  // Returns {faces[4] (sticks) | null, lights}. For 'd4', lights is the die value.
  function throwLot(rs, rng) {
    rng = rng || Math.random;
    if (rs && rs.lot === 'd4') return { faces: null, lights: 1 + Math.floor(rng() * 4) };
    const faces = [0, 0, 0, 0].map(() => (rng() < 0.5 ? 1 : 0));
    return { faces, lights: faces.reduce((a, b) => a + b, 0) };
  }

  // One full game, computer against computer. Returns stats.
  function simulate(rs, opts) {
    opts = opts || {};
    const rng = opts.rng || Math.random;
    const levels = opts.levels || ['normal', 'normal'];
    let st = newGame(rs, opts.starter || 0);
    let throws = 0, passes = 0, hits = 0, waters = 0, backs = 0, choiceSum = 0, choiceN = 0;
    const maxThrows = opts.maxThrows || 3000;
    while (st.winner < 0 && throws < maxThrows) {
      const t = throwValue(throwLot(rs, rng).lights, rs);
      throws++;
      const lm = legalMoves(st, st.turn, t, rs);
      if (lm.length) { choiceSum += lm.length; choiceN++; }
      const m = chooseMove(st, t, rs, levels[st.turn], rng);
      if (!m) { passes++; st = endTurn(st, t, rs, null); continue; }
      if (m.dir < 0) backs++;
      const r = applyMove(st, m, rs);
      if (r.events.some(e => e === 'swap' || e === 'removed' || e.indexOf('hit') === 0)) hits++;
      if (r.events.some(e => e.indexOf('water') === 0)) waters++;
      st = endTurn(r.state, t, rs, m);
    }
    return {
      winner: st.winner, throws, passes, hits, waters, backs,
      moves: st.moveCount, choices: choiceN ? choiceSum / choiceN : 0,
      margin: st.winner >= 0 ? Math.abs(st.off[0] - st.off[1]) : 0
    };
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  const api = {
    RULESETS, LIGHT_PROB, opp, throwValue, valueDist, newGame, clone,
    legalMoves, applyMove, endTurn, extraThrow, evaluate, chooseMove,
    throwLot, simulate, mulberry32, isProtected, inPlay
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Senet = api;
})(typeof window !== 'undefined' ? window : globalThis);
