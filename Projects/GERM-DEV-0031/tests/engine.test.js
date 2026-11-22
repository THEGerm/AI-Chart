/* Rule tests for the Senet engine. Run: node --test tests/ */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const S = require('../senet-rulesets.js');
const R = S.RULESETS;

function empty(rs, turn) {
  const st = S.newGame(rs, turn || 0);
  st.board.fill(-1); st.reserve = [0, 0]; st.off = [0, 0]; st.lost = [0, 0];
  return st;
}
const has = (ms, from, to) => ms.some(m => m.from === from && m.to === to);

test('sticks: value distribution sums to 1 and 0 lights maps to zero value', () => {
  for (const k in R) {
    const d = S.valueDist(R[k]);
    const sum = Object.values(d).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1) < 1e-12, k);
  }
  assert.strictEqual(S.throwValue(0, R.kendall), 5);
  assert.strictEqual(S.throwValue(0, R.jequier), 6);
  assert.strictEqual(S.throwValue(3, R.kendall), 3);
});

test('starting layouts', () => {
  const k = S.newGame(R.kendall);
  assert.deepStrictEqual(k.board.slice(1, 15), [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1]);
  assert.strictEqual(k.board[15], -1);
  const p = S.newGame(R.piccione);
  assert.deepStrictEqual(p.reserve, [5, 5]);
});

test('kendall: swap with a lone enemy, not with a protected pair', () => {
  const rs = R.kendall, st = empty(rs);
  st.board[5] = 0; st.board[8] = 1;
  let ms = S.legalMoves(st, 0, 3, rs);
  assert.ok(has(ms, 5, 8));
  const r = S.applyMove(st, { from: 5, to: 8, dir: 1 }, rs);
  assert.strictEqual(r.state.board[8], 0);
  assert.strictEqual(r.state.board[5], 1);
  st.board[9] = 1; // pair 8-9
  ms = S.legalMoves(st, 0, 3, rs);
  assert.ok(!has(ms, 5, 8));
});

test('kendall: three in a row cannot be passed', () => {
  const rs = R.kendall, st = empty(rs);
  st.board[2] = 0; st.board[4] = 1; st.board[5] = 1; st.board[6] = 1;
  const ms = S.legalMoves(st, 0, 5, rs); // 2 -> 7 would jump the block
  assert.ok(!has(ms, 2, 7));
});

test('kendall: must stop on 26, water returns to 15, exact exits', () => {
  const rs = R.kendall, st = empty(rs);
  st.board[24] = 0;
  assert.ok(!has(S.legalMoves(st, 0, 3, rs), 24, 27));
  assert.ok(has(S.legalMoves(st, 0, 2, rs), 24, 26));
  st.board[24] = -1; st.board[26] = 0;
  const r = S.applyMove(st, { from: 26, to: 27, dir: 1 }, rs);
  assert.strictEqual(r.state.board[15], 0);
  assert.strictEqual(r.state.board[27], -1);
  assert.ok(has(S.legalMoves(st, 0, 5, rs), 26, 31));
  const st2 = empty(rs); st2.board[28] = 0;
  assert.ok(has(S.legalMoves(st2, 0, 3, rs), 28, 31));
  assert.ok(!has(S.legalMoves(st2, 0, 4, rs), 28, 31));
  const st3 = empty(rs); st3.board[30] = 0;
  assert.ok(has(S.legalMoves(st3, 0, 4, rs), 30, 31)); // any throw from 30
});

test('kendall: backward only when no forward move, never from 28 up', () => {
  const rs = R.kendall, st = empty(rs);
  st.board[10] = 0; st.board[12] = 1; st.board[13] = 1; // 10+2 and 10+3 land on a protected pair
  const ms = S.legalMoves(st, 0, 3, rs);
  assert.ok(has(ms, 10, 7));
  const st2 = empty(rs); st2.board[29] = 0; // a 4 cannot leave 29
  assert.strictEqual(S.legalMoves(st2, 0, 4, rs).length, 0);
});

test('extra throws on 1, 4, 5 in Kendall; on squares 15 and 26 in Piccione', () => {
  assert.ok(S.extraThrow(4, R.kendall, null));
  assert.ok(!S.extraThrow(2, R.kendall, null));
  assert.ok(S.extraThrow(2, R.piccione, { from: 13, to: 15 }));
  assert.ok(!S.extraThrow(2, R.piccione, { from: 11, to: 13 }));
});

test('piccione: enter only on a 1, no landing on any piece, water sends off board', () => {
  const rs = R.piccione, st = S.newGame(rs);
  assert.strictEqual(S.legalMoves(st, 0, 3, rs).filter(m => m.from === 0).length, 0);
  assert.ok(has(S.legalMoves(st, 0, 1, rs), 0, 1));
  const st2 = empty(rs); st2.board[5] = 0; st2.board[7] = 1;
  assert.ok(!has(S.legalMoves(st2, 0, 2, rs), 5, 7));
  const st3 = empty(rs); st3.board[25] = 0;
  const r = S.applyMove(st3, { from: 25, to: 27, dir: 1 }, rs);
  assert.strictEqual(r.state.reserve[0], 1);
});

test('jequier: struck piece goes to the rearmost empty square; bear off only from row 3 with all home', () => {
  const rs = R.jequier, st = empty(rs);
  st.board[1] = 0; st.board[10] = 0; st.board[13] = 1;
  const r = S.applyMove(st, { from: 10, to: 13, dir: 1 }, rs);
  assert.strictEqual(r.state.board[2], 1);
  const st2 = empty(rs); st2.board[29] = 0; st2.board[12] = 0;
  assert.ok(!has(S.legalMoves(st2, 0, 4, rs), 29, 31));
  st2.board[12] = -1; st2.board[22] = 0;
  assert.ok(has(S.legalMoves(st2, 0, 4, rs), 29, 31));
});

test('bell: struck piece leaves the game; marked squares are safe', () => {
  const rs = R.bell, st = empty(rs);
  st.board[3] = 0; st.board[5] = 1; st.board[15] = 1; st.board[12] = 0;
  const r = S.applyMove(st, { from: 3, to: 5, dir: 1 }, rs);
  assert.strictEqual(r.state.lost[1], 1);
  assert.ok(!has(S.legalMoves(st, 0, 3, rs), 12, 15));
});

test('minimal: no capture, forward only', () => {
  const rs = R.minimal, st = empty(rs);
  st.board[5] = 0; st.board[7] = 1;
  assert.strictEqual(S.legalMoves(st, 0, 2, rs).length, 0);
});

test('every rule set finishes 200 seeded computer games', () => {
  for (const k in R) {
    const rng = S.mulberry32(99);
    for (let i = 0; i < 200; i++) {
      const r = S.simulate(R[k], { rng, starter: i % 2 });
      assert.ok(r.winner >= 0, k + ' game ' + i + ' did not finish');
    }
  }
});
