"""Sweep runner. GERM-DEV-0031.

  python3 run.py init [--balance 200] [--skill 200] [--seed 31]   set up the sweep (once)
  python3 run.py dry [--sample 96] [--workers 4]                    time a sample, estimate the total
  python3 run.py session [--budget-min 20] [--workers 4]            run one session, then stop
  python3 run.py status                                             progress and time left
  python3 run.py relock --reason TEXT [--k 24]                     accept a code change once stored rows reproduce

Sessions are resumable: each finished configuration is written to
results/session-NNN.csv at once, and the next session skips everything
already recorded. Configurations run in a fixed shuffled order, so the
results of any partial run are an unbiased sample of the whole space.
After each session: python3 sanity.py, then commit and push results/.
"""
from __future__ import annotations

import argparse
import json
import os
import random
import statistics
import sys
import time
from concurrent.futures import FIRST_COMPLETED, ProcessPoolExecutor, wait

import registry
import sim
import space

ORDER_SEED = 20261124


def ordered_configs() -> list:
    cs = list(space.configs())
    random.Random(ORDER_SEED).shuffle(cs)
    return cs


def _work(args):
    cfg, n_bal, n_skl, seed = args
    cid = space.config_id(cfg)
    return cfg, sim.run_config(cid, space.to_ruleset(cfg), n_bal, n_skl, seed)


def cmd_init(a):
    m = registry.write_manifest(a.balance, a.skill, a.seed)
    print(json.dumps({k: m[k] for k in ('n_configs', 'n_balance', 'n_skill', 'base_seed', 'code_hash', 'space_hash')}, indent=2))


def cmd_dry(a):
    m = registry.load_manifest() or {'n_balance': a.balance, 'n_skill': a.skill, 'base_seed': 31}
    cs = list(space.configs())
    rng = random.Random(a.sample_seed)
    # Stratify on the slowest factors (pieces, capture) so the sample spans the space.
    strata = {}
    for c in cs:
        strata.setdefault((c['pieces'], c['capture']), []).append(c)
    per = max(1, a.sample // len(strata))
    sample = [c for k in sorted(strata, key=str) for c in rng.sample(strata[k], min(per, len(strata[k])))]
    weights = {k: len(v) / len(cs) for k, v in strata.items()}
    print(f'Dry run: {len(sample)} configurations, {m["n_balance"]} + {m["n_skill"]} games each, {a.workers} workers')
    t0 = time.perf_counter()
    secs = {}
    with ProcessPoolExecutor(a.workers) as ex:
        for cfg, res in ex.map(_work, [(c, m['n_balance'], m['n_skill'], m['base_seed']) for c in sample]):
            secs.setdefault((cfg['pieces'], cfg['capture']), []).append(res['seconds'])
    wall = time.perf_counter() - t0
    mean_cfg = sum(weights[k] * statistics.mean(v) for k, v in secs.items())
    # Rough 90% band from the spread of stratum means.
    sds = sum(weights[k] ** 2 * (statistics.pvariance(v) / len(v)) for k, v in secs.items()) ** 0.5
    total_cpu = mean_cfg * len(cs)
    eff = (sum(sum(v) for v in secs.values()) / wall) / a.workers  # parallel efficiency seen
    total_wall = total_cpu / (a.workers * eff)
    lo, hi = (mean_cfg - 1.645 * sds) * len(cs) / (a.workers * eff), (mean_cfg + 1.645 * sds) * len(cs) / (a.workers * eff)
    sessions = total_wall / (a.budget_min * 60 * 0.92)
    report = dict(
        date_utc=registry.now_utc(), sample=len(sample), workers=a.workers, sample_wall_s=round(wall, 1),
        mean_s_per_config=round(mean_cfg, 3), parallel_efficiency=round(eff, 2),
        total_cpu_h=round(total_cpu / 3600, 2), total_wall_h=round(total_wall / 3600, 2),
        total_wall_h_90pct=[round(lo / 3600, 2), round(hi / 3600, 2)],
        sessions_of_budget=round(sessions, 1), budget_min=a.budget_min,
        by_stratum_s={f'p{k[0]}-{k[1]}': round(statistics.mean(v), 3) for k, v in sorted(secs.items(), key=str)},
        n_balance=m['n_balance'], n_skill=m['n_skill'],
    )
    print(json.dumps(report, indent=2))
    os.makedirs(registry.RESULTS, exist_ok=True)
    with open(os.path.join(registry.RESULTS, 'dryrun.json'), 'w') as fh:
        json.dump(report, fh, indent=2)
        fh.write('\n')


def cmd_session(a):
    m = registry.load_manifest()
    if not m:
        sys.exit('No manifest. Run: python3 run.py init')
    registry.check_code(m)
    done = registry.done_ids()
    todo = [c for c in ordered_configs() if space.config_id(c) not in done]
    if not todo:
        print('Sweep complete: nothing left to run.')
        return
    sess = registry.next_session()
    writer = registry.SessionWriter(sess)
    budget = a.budget_min * 60
    t0 = time.perf_counter()
    durations = []
    n_done = 0
    it = iter(todo)
    print(f'Session {sess:03d}: {len(todo)} configurations left, budget {a.budget_min} min, {a.workers} workers')
    try:
        with ProcessPoolExecutor(a.workers) as ex:
            running = set()

            def can_start():
                # Stop starting new work when the slowest likely config would overrun the budget.
                margin = (max(durations[-200:]) if durations else 30) * 1.5
                return time.perf_counter() - t0 + margin < budget

            for _ in range(a.workers):
                c = next(it, None)
                if c is None:
                    break
                running.add(ex.submit(_work, (c, m['n_balance'], m['n_skill'], m['base_seed'])))
            while running:
                fin, running = wait(running, return_when=FIRST_COMPLETED)
                for f in fin:
                    cfg, res = f.result()
                    writer.write(cfg, res)
                    durations.append(res['seconds'])
                    n_done += 1
                    if n_done % 50 == 0:
                        el = time.perf_counter() - t0
                        print(f'  {n_done} done, {el / 60:.1f} min', flush=True)
                    if can_start():
                        c = next(it, None)
                        if c is not None:
                            running.add(ex.submit(_work, (c, m['n_balance'], m['n_skill'], m['base_seed'])))
    except KeyboardInterrupt:
        print('Interrupted: rows already written are kept.')
    finally:
        writer.close()
    el = time.perf_counter() - t0
    left = len(todo) - n_done
    print(f'Session {sess:03d} wrote {n_done} configurations in {el / 60:.1f} min; {left} left.')
    print(f'Next: python3 sanity.py, then commit and push {os.path.relpath(writer.path)}')


def cmd_status(a):
    m = registry.load_manifest()
    rows = registry.read_rows()
    n = len({r['config_id'] for r in rows})
    total = space.N_CONFIGS
    print(f'Manifest: {"yes" if m else "no"}; sessions: {len(registry.session_files())}; '
          f'configurations done: {n} / {total} ({100 * n / total:.1f}%)')
    if rows:
        mean_s = statistics.mean(float(r['seconds']) for r in rows)
        left_h = mean_s * (total - n) / (a.workers * 0.9) / 3600
        print(f'Mean {mean_s:.2f} s per configuration; about {left_h:.1f} h of wall time left at {a.workers} workers '
              f'({left_h * 60 / (a.budget_min * 0.92):.1f} sessions of {a.budget_min} min).')


def cmd_relock(a):
    """Accept a code change only if stored rows re-run under it reproduce exactly."""
    import json
    import sanity
    m = registry.load_manifest()
    old, new = registry.locked_hash(m), registry.code_hash()
    if old == new:
        print('Code unchanged since the lock; nothing to do.')
        return
    ok, msg = sanity.check_determinism(m, registry.read_rows(), k=a.k)
    print(msg)
    if not ok:
        raise SystemExit('Stored rows do not reproduce under the new code: not re-locked.')
    m.setdefault('code_relocks', []).append({'utc': registry.now_utc(), 'from': old, 'to': new,
                                             'reason': a.reason, 'check': msg})
    with open(registry.MANIFEST, 'w') as fh:
        json.dump(m, fh, indent=2)
        fh.write('\n')
    print(f'Re-locked {old} -> {new}.')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    p = sub.add_parser('init'); p.add_argument('--balance', type=int, default=200)
    p.add_argument('--skill', type=int, default=200); p.add_argument('--seed', type=int, default=31)
    p = sub.add_parser('dry'); p.add_argument('--sample', type=int, default=96)
    p.add_argument('--workers', type=int, default=os.cpu_count() or 1)
    p.add_argument('--budget-min', type=float, default=20); p.add_argument('--sample-seed', type=int, default=7)
    p.add_argument('--balance', type=int, default=200); p.add_argument('--skill', type=int, default=200)
    p = sub.add_parser('session'); p.add_argument('--budget-min', type=float, default=20)
    p.add_argument('--workers', type=int, default=os.cpu_count() or 1)
    p = sub.add_parser('status'); p.add_argument('--workers', type=int, default=os.cpu_count() or 1)
    p.add_argument('--budget-min', type=float, default=20)
    p = sub.add_parser('relock'); p.add_argument('--reason', required=True)
    p.add_argument('--k', type=int, default=24)
    a = ap.parse_args()
    {'init': cmd_init, 'dry': cmd_dry, 'session': cmd_session, 'status': cmd_status,
     'relock': cmd_relock}[a.cmd](a)


if __name__ == '__main__':
    main()
