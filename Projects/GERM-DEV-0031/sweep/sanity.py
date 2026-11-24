"""Sanity checks for the sweep, run after every session. GERM-DEV-0031.

  python3 sanity.py [--quick]

1. Parity      the Python engine matches the JavaScript engine (3,000 cases).
2. Code        the code and the space still match the manifest.
3. Integrity   every row: known configuration, no duplicates, right hashes and
               game counts, values in range.
4. Logic       configurations without capture record no hits; all games finish
               or the shortfall is reported.
5. Determinism three recorded configurations, run again, give identical metrics.
6. Anchors     the five named rule sets, simulated in Python, agree with the
               JavaScript playability table within statistical tolerance.
               (--quick skips this one.)

Writes results/sanity-latest.json and exits non-zero on any failure.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import random
import subprocess
import sys

import registry
import sim
import space
import senet

HERE = registry.HERE
PROJECT = os.path.dirname(HERE)
FLOAT_METRICS = ['completion', 'timeouts', 'throws', 'first_win', 'cones_win', 'balance', 'pass_rate',
                 'decision_rate', 'options', 'hits', 'lead_changes', 'decisiveness', 'drama', 'skill',
                 'skill_completion']
UNIT = ['completion', 'timeouts', 'first_win', 'cones_win', 'balance', 'pass_rate', 'decision_rate',
        'lead_changes', 'decisiveness', 'drama', 'skill', 'skill_completion']


def check_parity():
    r = subprocess.run([sys.executable, '-m', 'unittest', '-q', os.path.join(HERE, 'test_parity.py')],
                       cwd=PROJECT, capture_output=True, text=True)
    return r.returncode == 0, (r.stderr.strip().splitlines() or ['?'])[-1]


def check_code(m):
    ok = m['code_hash'] == registry.code_hash() and m['space_hash'] == space.space_hash()
    return ok, f"manifest {m['code_hash']}/{m['space_hash']}, now {registry.code_hash()}/{space.space_hash()}"


def check_integrity(m, rows):
    valid = {space.config_id(c) for c in space.configs()}
    errs, seen = [], set()
    for r in rows:
        cid = r['config_id']
        if cid not in valid:
            errs.append(f'unknown config {cid}')
        if cid in seen:
            errs.append(f'duplicate {cid}')
        seen.add(cid)
        if r['code_hash'] != m['code_hash'] or r['space_hash'] != m['space_hash']:
            errs.append(f'hash mismatch {cid}')
        if int(r['n_balance']) != m['n_balance'] or int(r['n_skill']) != m['n_skill']:
            errs.append(f'game count {cid}')
        for k in UNIT:
            if r[k] not in ('', None) and not 0 <= float(r[k]) <= 1:
                errs.append(f'{k} out of range {cid}')
    return not errs, f'{len(rows)} rows; ' + ('; '.join(errs[:5]) if errs else 'clean')


def check_logic(rows):
    errs = [r['config_id'] for r in rows if r['capture'] == 'none' and float(r['hits']) != 0]
    unfinished = [r['config_id'] for r in rows if float(r['completion']) < 1]
    msg = f'{len(errs)} no-capture rows with hits; {len(unfinished)} configurations with unfinished games'
    return not errs, msg


def check_determinism(m, rows, k=3):
    if not rows:
        return True, 'no rows yet'
    pick = random.Random(len(rows)).sample(rows, min(k, len(rows)))
    by_id = {space.config_id(c): c for c in space.configs()}
    bad = []
    for r in pick:
        cfg = by_id[r['config_id']]
        res = sim.run_config(r['config_id'], space.to_ruleset(cfg), m['n_balance'], m['n_skill'], m['base_seed'])
        for key in FLOAT_METRICS:
            a, b = r[key], res[key]
            if (a in ('', None)) != (b is None) or (b is not None and not math.isclose(float(a), b, rel_tol=1e-9, abs_tol=1e-12)):
                bad.append(f"{r['config_id']} {key}")
    return not bad, f'{len(pick)} re-run; ' + ('; '.join(bad[:5]) if bad else 'identical')


def js_anchors():
    """The named rule sets from the web app, and its playability table."""
    keys = list(senet.DEFAULTS)
    code = ("const S=require('./senet-rulesets.js');const K=%s;const o={};"
            "for(const k in S.RULESETS){const r=S.RULESETS[k];const x={};for(const f of K)if(r[f]!==undefined)x[f]=r[f];"
            "o[k]={short:r.short,rs:x};}process.stdout.write(JSON.stringify(o));") % json.dumps(keys)
    sets = json.loads(subprocess.run(['node', '-e', code], cwd=PROJECT, capture_output=True, text=True, check=True).stdout)
    table = subprocess.run(['node', 'tests/playability.js', '400'], cwd=PROJECT, capture_output=True, text=True, check=True).stdout
    js = {}
    for line in table.splitlines():
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if len(cells) == 10 and cells[1].endswith('%') and cells[0] != 'Rule set':
            pct = lambda s: float(s.rstrip('%')) / 100
            js[cells[0]] = dict(throws=float(cells[2]), first_win=pct(cells[3]), cones_win=pct(cells[4]),
                                pass_rate=pct(cells[5]), skill=pct(cells[9]))
    return sets, js


def check_anchors(n=400):
    sets, js = js_anchors()
    se = math.sqrt(2 * 0.25 / n)
    bad, lines = [], []
    for k, v in sets.items():
        rs = senet.ruleset(**v['rs'])
        res = sim.run_config('anchor-' + k, rs, n, n, 2026)
        ref = js.get(v['short'])
        if not ref:
            bad.append(f'{k}: no JS row')
            continue
        diffs = {m: res[m] - ref[m] for m in ('first_win', 'cones_win', 'pass_rate', 'skill')}
        rel_throws = abs(res['throws'] - ref['throws']) / ref['throws']
        ok = all(abs(d) <= 3.5 * se for d in diffs.values()) and rel_throws <= 0.10
        lines.append(f"{k}: throws {res['throws']:.0f} vs {ref['throws']:.0f}, "
                     + ', '.join(f'{m} {res[m]:.3f} vs {ref[m]:.3f}' for m in diffs) + ('' if ok else '  <-- outside tolerance'))
        if not ok:
            bad.append(k)
    return not bad, lines


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--quick', action='store_true', help='skip the anchor simulation')
    a = ap.parse_args()
    m = registry.load_manifest()
    if not m:
        sys.exit('No manifest. Run: python3 run.py init')
    rows = registry.read_rows()
    report, ok_all = {}, True
    checks = [('parity', check_parity), ('code', lambda: check_code(m)),
              ('integrity', lambda: check_integrity(m, rows)), ('logic', lambda: check_logic(rows)),
              ('determinism', lambda: check_determinism(m, rows))]
    if not a.quick:
        checks.append(('anchors', check_anchors))
    for name, fn in checks:
        ok, detail = fn()
        ok_all &= ok
        report[name] = {'ok': ok, 'detail': detail}
        print(f"{'PASS' if ok else 'FAIL'}  {name}: " + (detail if isinstance(detail, str) else ''))
        if not isinstance(detail, str):
            for line in detail:
                print('      ' + line)
    report['rows'] = len(rows)
    report['date_utc'] = registry.now_utc()
    with open(os.path.join(registry.RESULTS, 'sanity-latest.json'), 'w') as fh:
        json.dump(report, fh, indent=2)
        fh.write('\n')
    sys.exit(0 if ok_all else 1)


if __name__ == '__main__':
    main()
