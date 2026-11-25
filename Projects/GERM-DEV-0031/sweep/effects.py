"""Which open rules drive each result? GERM-DEV-0031.

  python3 effects.py [metric ...]

For each metric, the share of its variance across configurations that each
factor explains on its own (eta squared of the main effect), and the
strongest two-factor combinations. Every factor is an invented or inferred
rule (research.md section 3); the evidenced parts of the game are fixed.
So a large share means the result comes from that modern choice.
The certainty column repeats rules.md, for the rule the factor stands for.
"""
from __future__ import annotations

import itertools
import statistics
import sys

import registry
import space

# Certainty (rules.md) of the rule behind each factor, for reading the table.
CERTAINTY = {
    'zero': '20% (row 17)', 'extra': '5% (row 18)', 'pieces': '90% (row 11, by period)',
    'start': '35% (rows 20-21)', 'capture': 'exists 65%, mechanism 20% (rows 24-25)',
    'protect': '5% (row 26)', 'block': '15% (row 27)', 'stop26': '55% (row 29)',
    'water': '60% (row 30)', 'backward': '5% (row 28)', 'bearoff': '25-60% (rows 32-33)',
    'safe': 'invented (Jequier)',
}


def num(r, k):
    v = r.get(k)
    return None if v in ('', None) else float(v)


def eta2(rows, metric, factors):
    data = [(tuple(r[f] for f in factors), num(r, metric)) for r in rows]
    data = [(g, y) for g, y in data if y is not None]
    if len(data) < 3:
        return float('nan')
    ys = [y for _, y in data]
    grand = statistics.mean(ys)
    sst = sum((y - grand) ** 2 for y in ys)
    if sst == 0:
        return 0.0
    groups = {}
    for g, y in data:
        groups.setdefault(g, []).append(y)
    ssb = sum(len(v) * (statistics.mean(v) - grand) ** 2 for v in groups.values())
    return ssb / sst


def main():
    metrics = sys.argv[1:] or ['completion', 'skill', 'balance', 'throws', 'decision_rate']
    rows = registry.read_rows()
    print(f'{len(rows)} configurations. Share of variance explained by each factor alone (eta squared).')
    print()
    fs = list(space.FACTORS)
    print(f'{"factor":10} {"certainty of the rule":38} ' + ' '.join(f'{m[:11]:>11}' for m in metrics))
    for f in fs:
        print(f'{f:10} {CERTAINTY[f]:38} ' + ' '.join(f'{eta2(rows, m, [f]):11.2f}' for m in metrics))
    print()
    for m in metrics:
        pairs = sorted(((eta2(rows, m, [a, b]), a, b) for a, b in itertools.combinations(fs, 2)), reverse=True)[:3]
        print(f'{m}: strongest pairs ' + '; '.join(f'{a}+{b} {v:.2f}' for v, a, b in pairs))


if __name__ == '__main__':
    main()
