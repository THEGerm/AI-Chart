"""Play the games for one configuration and compute its metrics. GERM-DEV-0031.

Metrics follow the self-play measures of the Digital Ludeme Project
(Browne et al. 2019, arXiv 1905.13516) as implemented in Ludii's
Evaluation/src/metrics (Balance.java, Completion.java, LeadChange.java,
DecisivenessMoves.java, DecisivenessThreshold.java), adapted to a race game.
Where Ludii uses a state evaluation, this sweep uses the race count (squares
covered, 31 per borne-off piece, as a share of the maximum): a proxy, and
labelled as one.

completion      share of balance games with a winner within MAX_THROWS throws (Ludii Completion)
timeouts        share of balance games that hit MAX_THROWS
throws          mean throws per finished game (duration, in throws, not Ludii turns)
first_win       win rate of the side that throws first, over finished games (advantage)
cones_win       win rate of cones, over finished games, starts alternated (seat balance)
balance         1 - |cones wins - spools wins| / games, a timeout counting half to each (Ludii Balance)
pass_rate       share of throws with no legal move
decision_rate   share of throws with two or more legal moves
options         mean legal moves over throws with at least one (Ludii's branching factor
                averages over all states; no-move throws are left out here)
hits            captures per game
lead_changes    changes of race leader per move (Ludii LeadChange: changes / moves)
decisiveness    share of a game's moves before the winner passes, for good, the best race
                share the loser ever reached (proxy for Ludii DecisivenessMoves)
drama           mean race deficit of the eventual winner over the moves it trails, 0 if it
                never trails (proxy for Ludii Drama)
skill           win rate of the 'normal' computer against a random mover: the bottom rung of
                a skill ladder only, a lower bound on the skill in the rules

Balance games are normal against normal; skill games are normal against
random, with seats and first throw alternated. Seeds depend on the game
index only, so every configuration sees the same throw stream for game i:
common random numbers, which cut the noise in comparisons between configurations.
"""
from __future__ import annotations

import hashlib
import random
import time

import senet

MAX_THROWS = 3000


def _seed(tag: str, i: int, base: int) -> int:
    h = hashlib.sha256(f'{base}|{tag}|{i}'.encode()).digest()
    return int.from_bytes(h[:8], 'big')


def _race(st: senet.State, p: int) -> int:
    """Race count: squares covered; a borne-off piece counts 31."""
    v = st.off[p] * 31
    b = st.board
    for s in range(1, 31):
        if b[s] == p:
            v += s
    return v


def play(rs: dict, levels: tuple, starter: int, rng: random.Random, track: bool = False) -> dict:
    st = senet.new_game(rs, starter)
    full = 31 * rs['pieces']
    throws = passes = decisions = opt_sum = with_move = hits = lead_changes = moves = 0
    leader = 0
    trace = [] if track else None
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
        moves += 1
        if any(e in ('swap', 'removed') or e.startswith('hit') for e in ev):
            hits += 1
        r0, r1 = _race(st, 0), _race(st, 1)
        if track:
            trace.append((r0 / full, r1 / full))
        d = r0 - r1
        now = (d > 0) - (d < 0)
        if now and leader and now != leader:
            lead_changes += 1
        if now:
            leader = now
        st = senet.end_turn(st, t, rs, m)
    g = dict(winner=st.winner, throws=throws, passes=passes, decisions=decisions, opt_sum=opt_sum,
             with_move=with_move, hits=hits, lead_changes=lead_changes, moves=moves,
             decisiveness=None, drama=None)
    if track and st.winner >= 0 and trace:
        w, lo = st.winner, 1 - st.winner
        threshold = max(x[lo] for x in trace)
        # First move from which the winner stays above the loser's best.
        k = len(trace)
        for j in range(len(trace) - 1, -1, -1):
            if trace[j][w] > threshold:
                k = j
            else:
                break
        g['decisiveness'] = k / len(trace)
        behind = [x[lo] - x[w] for x in trace if x[w] < x[lo]]
        g['drama'] = (sum(behind) / len(behind)) if behind else 0.0
    return g


def run_config(cid: str, rs: dict, n_balance: int, n_skill: int, base_seed: int) -> dict:
    """All games for one configuration. Deterministic for a given seed."""
    t0 = time.perf_counter()
    fin = first = cones = spools = timeouts = 0
    throws_fin = passes = decisions = opt_sum = with_move = hits = all_throws = 0
    lc_rate = 0.0
    dec_sum = drama_sum = 0.0
    for i in range(n_balance):
        rng = random.Random(_seed('bal', i, base_seed))
        starter = i % 2
        g = play(rs, ('normal', 'normal'), starter, rng, track=True)
        all_throws += g['throws']
        passes += g['passes']; decisions += g['decisions']; opt_sum += g['opt_sum']
        with_move += g['with_move']; hits += g['hits']
        lc_rate += g['lead_changes'] / g['moves'] if g['moves'] else 0.0
        if g['winner'] >= 0:
            fin += 1
            throws_fin += g['throws']
            first += g['winner'] == starter
            cones += g['winner'] == 0
            spools += g['winner'] == 1
            dec_sum += g['decisiveness']
            drama_sum += g['drama']
        else:
            timeouts += 1
    skill_wins = skill_fin = 0
    for i in range(n_skill):
        rng = random.Random(_seed('skl', i, base_seed))
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
        timeouts=timeouts / nb,
        throws=(throws_fin / fin) if fin else None,
        first_win=(first / fin) if fin else None,
        cones_win=(cones / fin) if fin else None,
        balance=1 - abs(cones - spools) / nb,
        pass_rate=passes / all_throws if all_throws else None,
        decision_rate=decisions / all_throws if all_throws else None,
        options=opt_sum / with_move if with_move else None,
        hits=hits / nb,
        lead_changes=lc_rate / nb,
        decisiveness=(dec_sum / fin) if fin else None,
        drama=(drama_sum / fin) if fin else None,
        skill=(skill_wins / skill_fin) if skill_fin else None,
        skill_completion=skill_fin / max(n_skill, 1),
        seconds=round(time.perf_counter() - t0, 3),
    )
