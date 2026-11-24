/* Dump random positions from the JavaScript engine for the Python parity test.
 * Usage: node sweep/parity_dump.js > cases.json   (run from the project folder)
 * Each case: a rule set, a position, a throw, the legal moves, the result of
 * every legal move, and the 'normal' and 'hard' computer choices.
 */
'use strict';
const S = require('../senet-rulesets.js');
const RULE_KEYS = ['pieces', 'start', 'lot', 'zero', 'extra', 'extraSquares', 'enterOn', 'enterAt',
  'capture', 'protectPairs', 'blockRun', 'safe', 'mustStop26', 'water', 'offFrom', 'exactOff',
  'anyOffFrom30', 'allHomeToBearOff', 'backward', 'noBackFrom', 'win'];
const rng = S.mulberry32(20261124);
const pick = a => a[Math.floor(rng() * a.length)];

function randomRules() {
  const capture = pick(['none', 'swap', 'rear', 'remove']);
  return {
    pieces: pick([5, 7]), start: pick(['alternate', 'offboard']), lot: 'sticks', zero: pick([5, 6]),
    extra: pick([[], [1, 4, 5], [1, 4, 6]]), extraSquares: pick([[], [15, 26]]),
    capture, protectPairs: capture !== 'none' && rng() < 0.5, blockRun: pick([0, 3]),
    safe: pick([[], [26, 28, 29, 30]]), mustStop26: rng() < 0.5,
    water: pick(['none', 'to15', 'rear', 'reserve']), offFrom: pick([21, 26]),
    exactOff: rng() < 0.5, anyOffFrom30: rng() < 0.5, allHomeToBearOff: rng() < 0.5,
    backward: rng() < 0.5, noBackFrom: pick([0, 28]), win: pick(['allOff', 'mostOff'])
  };
}

function strip(rs) {
  const o = {};
  for (const k of RULE_KEYS) if (rs[k] !== undefined) o[k] = rs[k];
  return o;
}

function randomState(rs) {
  const st = S.newGame(rs, rng() < 0.5 ? 0 : 1);
  st.board.fill(-1); st.reserve = [0, 0]; st.off = [0, 0]; st.lost = [0, 0];
  for (const p of [0, 1]) {
    for (let i = 0; i < rs.pieces; i++) {
      const r = rng();
      if (r < 0.12) st.reserve[p]++;
      else if (r < 0.2) st.off[p]++;
      else {
        for (let tries = 0; tries < 50; tries++) {
          // Bias towards the end of the board, where the special rules live.
          const s = rng() < 0.4 ? 21 + Math.floor(rng() * 10) : 1 + Math.floor(rng() * 30);
          if (st.board[s] === -1) { st.board[s] = p; break; }
        }
      }
    }
  }
  return st;
}

const cases = [];
const named = Object.keys(S.RULESETS).map(k => strip(S.RULESETS[k]));
for (let i = 0; i < 3000; i++) {
  const rs = i < 1000 ? named[i % named.length] : randomRules();
  const st = randomState(rs);
  const lights = rs.lot === 'd4' ? 1 + Math.floor(rng() * 4) : Math.floor(rng() * 5);
  const t = S.throwValue(lights, rs);
  const moves = S.legalMoves(st, st.turn, t, rs);
  const results = moves.map(m => {
    const r = S.applyMove(st, m, rs);
    return { board: r.state.board, reserve: r.state.reserve, off: r.state.off, lost: r.state.lost, winner: r.state.winner, events: r.events };
  });
  const normal = S.chooseMove(st, t, rs, 'normal');
  const hard = i % 5 === 0 ? S.chooseMove(st, t, rs, 'hard') : null;
  cases.push({
    rs, state: { board: st.board, reserve: st.reserve, off: st.off, lost: st.lost, turn: st.turn },
    t, moves: moves.map(m => [m.from, m.to, m.dir]), results,
    normal: normal ? [normal.from, normal.to, normal.dir] : null,
    hard: hard ? [hard.from, hard.to, hard.dir] : null,
    extra: S.extraThrow(t, rs, moves[0] || null),
    evaluate: S.evaluate(st, st.turn, rs)
  });
}
process.stdout.write(JSON.stringify(cases));
