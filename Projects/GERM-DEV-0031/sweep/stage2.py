"""Stage 2: the named rule sets at 2,000 games each. GERM-DEV-0031.

  python3 stage2.py [--games 2000] [--workers 4] [--seed 52]

Rule sets: every one in the web app (../senet-rulesets.js), read through
Node so the test plays exactly what the app plays: Minimal, Kendall,
Jequier, Bell, Piccione, and the Germain Rules (Fate, Contest, Master).

Three sets of games per rule set, each with starts alternated:
  balance  normal against normal
  skill    normal against a random mover (the first-stage skill measure)
  hard     hard (one-ply expectimax) against normal: the next rung of the
           skill ladder; above 0.5 means looking ahead pays

Writes results/stage2.json and prints a Markdown table. Pass marks for the
Germain Rules (stage2-candidates.md): completion 100%, the 99th percentile
of game length bounded, balance near 1, skill near 0.5 for Fate and rising
from Contest to Master (names as swapped on 2026-11-25).
"""
from __future__ import annotations

import argparse
import json
import math
import os
import random
import statistics
import subprocess
from multiprocessing import Pool

import registry
import senet
import sim

HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.dirname(HERE)
OUT = os.path.join(HERE, 'results', 'stage2.json')


def app_rulesets() -> dict:
    keys = list(senet.DEFAULTS)
    code = ("const S=require('./senet-rulesets.js');const K=%s;const o={};"
            "for(const k in S.RULESETS){const r=S.RULESETS[k];const x={};for(const f of K)if(r[f]!==undefined)x[f]=r[f];"
            "o[k]={short:r.short,rs:x};}process.stdout.write(JSON.stringify(o));") % json.dumps(keys)
    out = subprocess.run(['node', '-e', code], cwd=PROJECT, capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def pct(xs, p):
    xs = sorted(xs)
    return xs[min(len(xs) - 1, int(math.ceil(p * len(xs))) - 1)] if xs else None


def ci95(k, n):
    """Half-width of the 95% interval on a proportion."""
    return 1.96 * math.sqrt(max(k / n * (1 - k / n), 1e-12) / n) if n else None


def run_set(job):
    key, short, rsd, n, seed = job
    rs = senet.ruleset(**rsd)
    fin = cones = first = 0
    throws, decisions, all_throws, hits, drama = [], 0, 0, 0, []
    for i in range(n):
        g = sim.play(rs, ('normal', 'normal'), i % 2, random.Random(sim._seed(key + '|bal', i, seed)), track=True)
        all_throws += g['throws']
        decisions += g['decisions']
        hits += g['hits']
        if g['winner'] >= 0:
            fin += 1
            throws.append(g['throws'])
            cones += g['winner'] == 0
            first += g['winner'] == i % 2
            drama.append(g['drama'])

    def ladder(levels, tag):
        wins = done = 0
        for i in range(n):
            strong = (i // 2) % 2  # seat of the stronger player, swapped every other pair
            lv = levels if strong == 0 else (levels[1], levels[0])
            g = sim.play(rs, lv, i % 2, random.Random(sim._seed(key + '|' + tag, i, seed)))
            if g['winner'] >= 0:
                done += 1
                wins += g['winner'] == strong
        return wins, done

    sw, sd = ladder(('normal', 'random'), 'skl')
    hw, hd = ladder(('hard', 'normal'), 'hrd')
    spools = fin - cones
    return key, dict(
        short=short, games=n, completion=fin / n,
        throws_mean=statistics.mean(throws) if throws else None,
        throws_p99=pct(throws, 0.99), throws_max=max(throws) if throws else None,
        cones_win=cones / fin if fin else None, first_win=first / fin if fin else None,
        balance=1 - abs(cones - spools) / n, balance_ci=ci95(cones, fin),
        decision_rate=decisions / all_throws if all_throws else None,
        hits=hits / n, drama=statistics.mean(drama) if drama else None,
        skill=sw / sd if sd else None, skill_ci=ci95(sw, sd),
        hard=hw / hd if hd else None, hard_ci=ci95(hw, hd),
    )


def table(res):
    head = ('| Rule set | Finish | Throws | 99th pct | Longest | Cones win | Decisions | Hits | '
            'Skill (normal v random) | Look-ahead (hard v normal) |')
    lines = [head, '|' + '---|' * 10]
    for k, r in res.items():
        f = lambda x, d=1: '-' if x is None else f'{100 * x:.{d}f}%'
        lines.append(f"| {r['short']} | {f(r['completion'])} | {r['throws_mean']:.0f} | {r['throws_p99']} | "
                     f"{r['throws_max']} | {f(r['cones_win'])} | {f(r['decision_rate'])} | {r['hits']:.1f} | "
                     f"{f(r['skill'])} ± {100 * r['skill_ci']:.1f} | {f(r['hard'])} ± {100 * r['hard_ci']:.1f} |")
    return '\n'.join(lines)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--games', type=int, default=2000)
    ap.add_argument('--workers', type=int, default=os.cpu_count() or 1)
    ap.add_argument('--seed', type=int, default=52)
    a = ap.parse_args()
    sets = app_rulesets()
    jobs = [(k, v['short'], v['rs'], a.games, a.seed) for k, v in sets.items()]
    with Pool(a.workers) as pool:
        res = dict(pool.map(run_set, jobs))
    res = {k: res[k] for k in sets}
    out = dict(project='GERM-DEV-0031', stage=2, finished_utc=registry.now_utc(), games=a.games,
               seed=a.seed, max_throws=sim.MAX_THROWS, code_hash=registry.code_hash(), results=res)
    with open(OUT, 'w') as fh:
        json.dump(out, fh, indent=2)
        fh.write('\n')
    print(table(res))


if __name__ == '__main__':
    main()
