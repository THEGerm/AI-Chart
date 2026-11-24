"""Play the games for one configuration and compute its metrics. GERM-DEV-0031.

Metrics follow the self-play measures of the Digital Ludeme Project
(Browne et al. 2019, arXiv 1905.13516), adapted to a race game:

completion      share of games that finish within MAX_THROWS throws
throws          mean throws per finished game (duration)
first_win       win rate of the side that throws first (advantage; 0.5 is fair)
cones_win       win rate of cones, starts alternated (seat balance)
pass_rate       share of throws with no legal move
decision_rate   share of throws with two or more legal moves
options         mean legal moves when there is at least one (branching)
hits            captures per game
lead_changes    mean changes of the leader per game, leader by race count (drama)
skill           win rate of the 'normal' computer against a random mover

Balance games are normal against normal; skill games are normal against
random, with seats and first throw alternated.
"""
from __future__ import annotations

import hashlib
import random
import time

import senet

MAX_THROWS = 3000


def _seed(cid: str, tag: str, i: int, base: int) -> int:
    h = hashlib.sha256(f'{base}|{cid}|{tag}|{i}'.encode()).digest()
    return int.from_bytes(h[:8], 'big')


def _race(st: senet.State, p: int) -> int:
    """Race count: squares covered; a borne-off piece counts 31."""
    v = st.off[p] * 31
    b = st.board
    for s in range(1, 31):
        if b[s] == p:
            v += s
    return v


def play(rs: dict, levels: tuple, starter: int, rng: random.Random) -> dict:
    st = senet.new_game(rs, starter)
    throws = passes = decisions = opt_sum = with_move = hits = lead_changes = 0
    leader = 0
    while st.winner < 0 and throws < MAX_THROWS:
        t = senet.throw_value(senet.throw_lot(rs, rng), rs)
        throws += 1
        lm = senet.legal_moves(st, st.turn, t, rs)
        if not lm:
            passes += 1
            st = senet.end_turn(st, t, rs, None)
            continue
        with_move += 1
        opt_sum += len(lm)
        if len(lm) > 1:
            decisions += 1
        m = senet.choose_move(st, t, rs, levels[st.turn], rng)
        st, ev = senet.apply_move(st, m, rs)
        if any(e in ('swap', 'removed') or e.startswith('hit') for e in ev):
            hits += 1
        d = _race(st, 0) - _race(st, 1)
        now = (d > 0) - (d < 0)
        if now and leader and now != leader:
            lead_changes += 1
        if now:
            leader = now
        st = senet.end_turn(st, t, rs, m)
    return dict(winner=st.winner, throws=throws, passes=passes, decisions=decisions,
                opt_sum=opt_sum, with_move=with_move, hits=hits, lead_changes=lead_changes)


def run_config(cid: str, rs: dict, n_balance: int, n_skill: int, base_seed: int) -> dict:
    """All games for one configuration. Deterministic for a given seed."""
    t0 = time.perf_counter()
    fin = first = cones = 0
    throws_fin = passes = decisions = opt_sum = with_move = hits = leads = all_throws = 0
    for i in range(n_balance):
        rng = random.Random(_seed(cid, 'bal', i, base_seed))
        starter = i % 2
        g = play(rs, ('normal', 'normal'), starter, rng)
        all_throws += g['throws']
        passes += g['passes']; decisions += g['decisions']; opt_sum += g['opt_sum']
        with_move += g['with_move']; hits += g['hits']; leads += g['lead_changes']
        if g['winner'] >= 0:
            fin += 1
            throws_fin += g['throws']
            first += g['winner'] == starter
            cones += g['winner'] == 0
    skill_wins = skill_fin = 0
    for i in range(n_skill):
        rng = random.Random(_seed(cid, 'skl', i, base_seed))
        starter = i % 2
        normal_seat = (i // 2) % 2
        levels = ('normal', 'random') if normal_seat == 0 else ('random', 'normal')
        g = play(rs, levels, starter, rng)
        if g['winner'] >= 0:
            skill_fin += 1
            skill_wins += g['winner'] == normal_seat
    nb = max(n_balance, 1)
    return dict(
        config_id=cid, n_balance=n_balance, n_skill=n_skill,
        completion=fin / nb,
        throws=(throws_fin / fin) if fin else None,
        first_win=(first / fin) if fin else None,
        cones_win=(cones / fin) if fin else None,
        pass_rate=passes / all_throws if all_throws else None,
        decision_rate=decisions / all_throws if all_throws else None,
        options=opt_sum / with_move if with_move else None,
        hits=hits / nb,
        lead_changes=leads / nb,
        skill=(skill_wins / skill_fin) if skill_fin else None,
        skill_completion=skill_fin / max(n_skill, 1),
        seconds=round(time.perf_counter() - t0, 3),
    )
