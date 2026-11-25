"""Senet rules engine, Python port of ../senet-engine.js. GERM-DEV-0031.

Same board, same rule-set fields, same move generation, same computer
players. tests/parity checks it move for move against the JavaScript engine,
so a result from the sweep describes the same game the web app plays.

Board: squares 1..30 on a boustrophedon path. 31 = borne off, 0 = not yet
entered. Players 0 (cones) and 1 (spools). Rule-set fields are documented
in ../senet-engine.js.

Standard library only.
"""
from __future__ import annotations

import random
from dataclasses import dataclass, field

# Four two-sided sticks, each assumed 50/50: P(n light faces) = C(4, n) / 16.
LIGHT_PROB = (1 / 16, 4 / 16, 6 / 16, 4 / 16, 1 / 16)

DEFAULTS = {
    'lot': 'sticks', 'zero': 5, 'extra': (), 'extraSquares': (), 'enterOn': None,
    'enterAt': 'throw', 'capture': 'swap', 'protectPairs': False, 'blockRun': 0,
    'safe': (), 'mustStop26': False, 'water': 'none', 'offFrom': 26,
    'exactOff': True, 'anyOffFrom30': False, 'allHomeToBearOff': False,
    'backward': False, 'noBackFrom': 0, 'win': 'allOff', 'start': 'alternate',
    'pieces': 5, 'forced': False,
}


def ruleset(**kw) -> dict:
    """A complete rule set: defaults overlaid with the given fields."""
    rs = dict(DEFAULTS)
    unknown = set(kw) - set(DEFAULTS)
    if unknown:
        raise KeyError(f'unknown rule fields: {sorted(unknown)}')
    rs.update(kw)
    for k in ('extra', 'extraSquares', 'safe'):
        rs[k] = tuple(rs[k] or ())
    if rs['enterOn'] is not None:
        rs['enterOn'] = tuple(rs['enterOn'])
    return rs


def opp(p: int) -> int:
    return 1 - p


def throw_value(lights: int, rs: dict) -> int:
    if rs['lot'] == 'd4':
        return lights
    return rs['zero'] if lights == 0 else lights


def value_dist(rs: dict) -> dict:
    if rs['lot'] == 'd4':
        return {1: 0.25, 2: 0.25, 3: 0.25, 4: 0.25}
    d: dict = {}
    for n in range(5):
        v = throw_value(n, rs)
        d[v] = d.get(v, 0.0) + LIGHT_PROB[n]
    # JavaScript iterates integer keys in ascending order; match it so float
    # sums, and so tie-breaks between equal moves, come out the same.
    return dict(sorted(d.items()))


@dataclass
class State:
    board: list
    reserve: list
    off: list
    lost: list = field(default_factory=lambda: [0, 0])
    turn: int = 0
    winner: int = -1
    move_count: int = 0

    def clone(self) -> 'State':
        return State(self.board[:], self.reserve[:], self.off[:], self.lost[:],
                     self.turn, self.winner, self.move_count)


def new_game(rs: dict, starter: int = 0) -> State:
    board = [-1] * 32
    reserve = [0, 0]
    if rs['start'] == 'alternate':
        for i in range(rs['pieces'] * 2):
            board[i + 1] = i % 2
    else:
        reserve = [rs['pieces'], rs['pieces']]
    return State(board, reserve, [0, 0], [0, 0], starter)


def is_protected(st: State, sq: int, owner: int, rs: dict) -> bool:
    if sq in rs['safe']:
        return True
    if not rs['protectPairs']:
        return False
    b = st.board
    return (sq > 1 and b[sq - 1] == owner) or (sq < 30 and b[sq + 1] == owner)


def blocked(st: State, a: int, b: int, owner: int, rs: dict) -> bool:
    """True if the squares strictly between a and b hold blockRun pieces of owner in a row."""
    need = rs['blockRun']
    if not need:
        return False
    lo, hi = min(a, b) + 1, max(a, b) - 1
    run = 0
    brd = st.board
    for s in range(lo, hi + 1):
        if 1 <= s <= 30 and brd[s] == owner:
            run += 1
            if run >= need:
                return True
        else:
            run = 0
    return False


def pieces_before(st: State, p: int, sq: int) -> int:
    n = st.reserve[p]
    for s in range(1, sq):
        if st.board[s] == p:
            n += 1
    return n


def target_ok(st: State, p: int, frm: int, to: int, rs: dict) -> bool:
    o = 1 - p
    b = st.board
    if to < 1 or to > 30:
        return False
    if b[to] == p:
        return False
    if b[to] == o:
        if rs['capture'] == 'none':
            return False
        if is_protected(st, to, o, rs):
            return False
    if blocked(st, frm, to, o, rs):
        return False
    return True


def forward_moves(st: State, p: int, t: int, rs: dict) -> list:
    res = []
    if st.reserve[p] > 0 and (rs['enterOn'] is None or t in rs['enterOn']):
        to = 1 if rs['enterAt'] == 1 else t
        if target_ok(st, p, 0, to, rs):
            res.append((0, to, 1))
    for s in range(1, 31):
        if st.board[s] != p:
            continue
        to = s + t
        if rs['mustStop26'] and s < 26 and to > 26:
            continue
        if to >= 31:
            if s < rs['offFrom']:
                continue
            exact_ok = to == 31 or not rs['exactOff'] or (rs['anyOffFrom30'] and s == 30)
            if not exact_ok:
                continue
            if rs['allHomeToBearOff'] and pieces_before(st, p, rs['offFrom']) > 0:
                continue
            if blocked(st, s, 31, 1 - p, rs):
                continue
            res.append((s, 31, 1))
            continue
        if target_ok(st, p, s, to, rs):
            res.append((s, to, 1))
    return res


def backward_moves(st: State, p: int, t: int, rs: dict) -> list:
    res = []
    for s in range(1, 31):
        if st.board[s] != p:
            continue
        if rs['noBackFrom'] and s >= rs['noBackFrom']:
            continue
        to = s - t
        if target_ok(st, p, s, to, rs):
            res.append((s, to, -1))
    return res


def legal_moves(st: State, p: int, t: int, rs: dict) -> list:
    """Moves as (from, to, dir) tuples, in the JavaScript engine's order."""
    m = forward_moves(st, p, t, rs)
    if not m and rs['backward']:
        m = backward_moves(st, p, t, rs)
    # Moves are generated rearmost first (reserve, then square 1 upward).
    if rs['forced'] and len(m) > 1:
        m = [m[0]]
    return m


def _nearest_free_down(b: list, sq: int) -> int:
    for s in range(sq, 0, -1):
        if b[s] == -1:
            return s
    for s in range(sq + 1, 31):
        if b[s] == -1:
            return s
    return -1


def _rearmost_free(b: list) -> int:
    for s in range(1, 31):
        if b[s] == -1:
            return s
    return -1


def in_play(st: State, p: int) -> int:
    n = st.reserve[p]
    for s in range(1, 31):
        if st.board[s] == p:
            n += 1
    return n


def apply_move(st0: State, mv: tuple, rs: dict):
    """Returns (state, events). Events as in the JavaScript engine."""
    st = st0.clone()
    b = st.board
    p = st.turn
    o = 1 - p
    frm, to, _ = mv
    ev = []
    if frm == 0:
        st.reserve[p] -= 1
    else:
        b[frm] = -1
    if to == 31:
        st.off[p] += 1
        ev.append('off')
    else:
        if b[to] == o:
            b[to] = -1
            cap = rs['capture']
            if cap == 'swap':
                if frm == 0:
                    st.reserve[o] += 1
                else:
                    b[frm] = o
                ev.append('swap')
            elif cap == 'rear':
                b[to] = p
                s = _rearmost_free(b)
                if s == -1:
                    st.reserve[o] += 1
                else:
                    b[s] = o
                ev.append('hit:%d' % (0 if s == -1 else s))
            elif cap == 'remove':
                st.lost[o] += 1
                ev.append('removed')
            elif cap == 'to15':
                b[to] = p
                s = _nearest_free_down(b, 15) if to > 15 else -1
                if s == -1:
                    st.reserve[o] += 1
                else:
                    b[s] = o
                ev.append('hit:%d' % (0 if s == -1 else s))
        b[to] = p
        if to == 27 and rs['water'] != 'none':
            b[27] = -1
            s = -1
            if rs['water'] == 'to15':
                s = _nearest_free_down(b, 15)
            elif rs['water'] == 'rear':
                s = _rearmost_free(b)
            if s == -1:
                st.reserve[p] += 1
            else:
                b[s] = p
            ev.append('water:%d' % (0 if s == -1 else s))
    st.move_count += 1
    # With removal, a side that has lost a piece can never bear all of them
    # off, so the game ends when either side has nothing left in play.
    if rs['win'] == 'mostOff' or rs['capture'] == 'remove':
        if in_play(st, p) == 0 or in_play(st, o) == 0:
            sp = st.off[p] + in_play(st, p)
            so = st.off[o] + in_play(st, o)
            st.winner = p if sp > so else (o if so > sp else p)
            ev.append('win')
    elif st.off[p] == rs['pieces']:
        st.winner = p
        ev.append('win')
    return st, ev


def extra_throw(t: int, rs: dict, mv) -> bool:
    if t in rs['extra']:
        return True
    return bool(mv and mv[1] in rs['extraSquares'])


def end_turn(st: State, t: int, rs: dict, mv) -> State:
    if st.winner >= 0:
        return st
    if not extra_throw(t, rs, mv):
        st.turn = 1 - st.turn
    return st


# ---------- Computer players (same heuristic as the web app) ----------

def evaluate(st: State, p: int, rs: dict, dist: dict | None = None) -> float:
    o = 1 - p
    b = st.board
    if st.winner == p:
        return 1e6
    if st.winner == o:
        return -1e6
    if dist is None:
        dist = value_dist(rs)
    cap = rs['capture']

    def side(q: int) -> float:
        r = 1 - q
        v = st.off[q] * 36 - st.lost[q] * 30
        for s in range(1, 31):
            if b[s] != q:
                continue
            v += s
            if s >= 26:
                v += 2
            prot = is_protected(st, s, q, rs)
            if s < 26 and prot:
                v += 1.5
            if not prot and cap != 'none':
                risk = 0.0
                for k, pk in dist.items():
                    frm = s - k
                    if frm >= 1 and b[frm] == r and not blocked(st, frm, s, q, rs):
                        risk += pk
                if cap == 'remove':
                    loss = 30
                elif cap == 'rear':
                    loss = s
                elif cap == 'to15':
                    loss = s - 15 if s > 15 else s
                else:
                    loss = max(4, s * 0.45)
                v -= risk * loss
        return v

    return side(p) - side(o)


def choose_move(st: State, t: int, rs: dict, level: str, rng: random.Random):
    p = st.turn
    moves = legal_moves(st, p, t, rs)
    if not moves:
        return None
    if len(moves) == 1:
        return moves[0]
    if level == 'random':
        return moves[int(rng.random() * len(moves))]
    dist = value_dist(rs)
    scored = []
    for m in moves:
        after, _ = apply_move(st, m, rs)
        if level == 'hard' and after.winner < 0 and not extra_throw(t, rs, m):
            after.turn = 1 - p
            v = 0.0
            for k, pk in dist.items():
                om = legal_moves(after, after.turn, k, rs)
                if not om:
                    worst = evaluate(after, p, rs, dist)
                else:
                    worst = min(evaluate(apply_move(after, m2, rs)[0], p, rs, dist) for m2 in om)
                v += pk * worst
        else:
            v = evaluate(after, p, rs, dist)
        scored.append((m, v))
    scored.sort(key=lambda mv: -mv[1])  # stable, like Array.prototype.sort
    if level == 'easy':
        k = min(len(scored), 3)
        return scored[int(rng.random() * k)][0]
    return scored[0][0]


def throw_lot(rs: dict, rng: random.Random) -> int:
    """Returns the number of light faces (sticks) or the die value (d4)."""
    if rs['lot'] == 'd4':
        return 1 + int(rng.random() * 4)
    return sum(1 for _ in range(4) if rng.random() < 0.5)
