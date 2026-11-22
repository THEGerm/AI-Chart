/* Playability simulation for each rule set. GERM-DEV-0031, step 5.
 * Usage: node tests/playability.js [gamesPerRuleset]
 * Metrics, per rule set, computer against computer:
 *   finish    share of games that end within 3000 throws
 *   throws    mean throws per game (length)
 *   p1st      win rate of the side that throws first (balance; 50% is fair)
 *   cones     win rate of cones, both sides starting equally often (seat balance)
 *   pass      share of throws with no legal move
 *   choice    share of throws with 2 or more legal moves (decisions)
 *   options   mean legal moves when there is at least one
 *   hits      captures per game
 *   skill     win rate of 'normal' against 'random' (does play matter?)
 */
'use strict';
const S = require('../senet-rulesets.js');
const N = Number(process.argv[2] || 400);

function run(rs, levels, n, seed) {
  const rng = S.mulberry32(seed);
  const out = { finish: 0, throws: 0, startWin: 0, cones: 0, passes: 0, hits: 0, wins: [0, 0], options: 0, decided: 0, throwsWithMove: 0 };
  for (let i = 0; i < n; i++) {
    const starter = i % 2;
    // Swap which seat gets which level every other pair, so seat and level do not confound.
    const lv = (Math.floor(i / 2) % 2) ? [levels[1], levels[0]] : levels;
    const r = sim(rs, lv, starter, rng);
    if (r.winner >= 0) {
      out.finish++;
      if (r.winner === starter) out.startWin++;
      if (r.winner === 0) out.cones++;
      out.wins[lv[r.winner] === levels[0] ? 0 : 1]++;
    }
    out.throws += r.throws; out.passes += r.passes; out.hits += r.hits;
    out.options += r.optSum; out.decided += r.decided; out.throwsWithMove += r.withMove;
  }
  return out;
}

function sim(rs, levels, starter, rng) {
  let st = S.newGame(rs, starter);
  let throws = 0, passes = 0, hits = 0, optSum = 0, decided = 0, withMove = 0;
  while (st.winner < 0 && throws < 3000) {
    const t = S.throwValue(S.throwLot(rs, rng).lights, rs);
    throws++;
    const lm = S.legalMoves(st, st.turn, t, rs);
    if (!lm.length) { passes++; st = S.endTurn(st, t, rs, null); continue; }
    withMove++; optSum += lm.length; if (lm.length > 1) decided++;
    const m = S.chooseMove(st, t, rs, levels[st.turn], rng);
    const r = S.applyMove(st, m, rs);
    if (r.events.some(e => e === 'swap' || e === 'removed' || e.indexOf('hit') === 0)) hits++;
    st = S.endTurn(r.state, t, rs, m);
  }
  return { winner: st.winner, throws, passes, hits, optSum, decided, withMove };
}

const pct = x => (100 * x).toFixed(1) + '%';
console.log('Games per rule set: ' + N + ' (balance), ' + N + ' (skill)\n');
console.log('| Rule set | Finish | Throws | First player wins | Cones win | Pass | Decision throws | Options | Hits/game | Normal beats random |');
console.log('|---|---|---|---|---|---|---|---|---|---|');
for (const k of Object.keys(S.RULESETS)) {
  const rs = S.RULESETS[k];
  const a = run(rs, ['normal', 'normal'], N, 11);
  const b = run(rs, ['normal', 'random'], N, 23);
  console.log('| ' + rs.short + ' | ' + pct(a.finish / N) + ' | ' + (a.throws / N).toFixed(0) + ' | ' + pct(a.startWin / a.finish) +
    ' | ' + pct(a.cones / a.finish) + ' | ' + pct(a.passes / a.throws) + ' | ' + pct(a.decided / a.throws) +
    ' | ' + (a.options / a.throwsWithMove).toFixed(2) + ' | ' + (a.hits / N).toFixed(1) + ' | ' + pct(b.wins[0] / b.finish) + ' |');
}
