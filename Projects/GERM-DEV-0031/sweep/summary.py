"""Basic statistics of the sweep so far. GERM-DEV-0031.

  python3 summary.py [--session N]

Prints counts, the spread of each metric, and the mean of the key metrics
by factor level. First-stage figures (200 games a configuration): read
single configurations with care, and factor means with more confidence.
"""
from __future__ import annotations

import argparse
import statistics

import registry
import space

KEY = ['completion', 'throws', 'balance', 'cones_win', 'first_win', 'pass_rate',
       'decision_rate', 'hits', 'lead_changes', 'decisiveness', 'drama', 'skill']


def num(r, k):
    v = r.get(k)
    return None if v in ('', None) else float(v)


def spread(rows, k):
    xs = sorted(x for x in (num(r, k) for r in rows) if x is not None)
    if not xs:
        return '-'
    q = lambda p: xs[min(len(xs) - 1, int(p * len(xs)))]
    return f'{statistics.mean(xs):8.3f} {q(0.05):8.3f} {statistics.median(xs):8.3f} {q(0.95):8.3f}'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--session', type=int)
    a = ap.parse_args()
    rows = registry.read_rows()
    if a.session:
        rows = [r for r in rows if int(r['session']) == a.session]
    n = len(rows)
    print(f'Configurations: {n} of {space.N_CONFIGS} ({100 * n / space.N_CONFIGS:.1f}%)'
          + (f', session {a.session:03d}' if a.session else ', all sessions'))
    if not rows:
        return
    secs = [float(r['seconds']) for r in rows]
    print(f'Compute: {sum(secs) / 3600:.2f} CPU h, {statistics.mean(secs):.2f} s per configuration')
    print()
    print(f'{"metric":15} {"mean":>8} {"p5":>8} {"median":>8} {"p95":>8}')
    for k in KEY:
        print(f'{k:15} {spread(rows, k)}')
    print()
    tout = sum(1 for r in rows if num(r, 'completion') < 1)
    never = sum(1 for r in rows if num(r, 'completion') < 0.5)
    seat = sum(1 for r in rows if num(r, 'cones_win') is not None and abs(num(r, 'cones_win') - 0.5) > 0.1)
    luck = sum(1 for r in rows if num(r, 'skill') is not None and num(r, 'skill') < 0.6)
    print(f'With unfinished games: {tout} ({100 * tout / n:.1f}%); fewer than half finish: {never} ({100 * never / n:.1f}%)')
    print(f'Seat bias over 10 points (cones win <40% or >60%): {seat} ({100 * seat / n:.1f}%)')
    print(f'Near-pure luck (skill <0.60): {luck} ({100 * luck / n:.1f}%)')
    print()
    for f in space.FACTORS:
        levels = space.FACTORS[f]
        cells = []
        for lv in levels:
            sub = [r for r in rows if r[f] == str(lv)]
            if not sub:
                continue
            m = lambda k: statistics.mean(x for x in (num(r, k) for r in sub) if x is not None) if any(num(r, k) is not None for r in sub) else float('nan')
            cells.append(f'{str(lv)[:9]:>9}: n={len(sub):4d} compl {m("completion"):.2f} throws {m("throws"):5.0f} '
                         f'bal {m("balance"):.2f} skill {m("skill"):.2f}')
        print(f'{f}')
        for c in cells:
            print('   ' + c)


if __name__ == '__main__':
    main()
