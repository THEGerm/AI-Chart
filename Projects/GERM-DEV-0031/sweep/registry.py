"""Results registry for the sweep. GERM-DEV-0031.

Durable record: plain CSV files in results/, one per session, committed and
pushed after every session. A row is written and flushed to disk the moment
its configuration finishes, so a session cut short loses at most the
configurations still running.

results/manifest.json   what this sweep is: factors, game counts, seed and the
                        hashes of the code and the space. The runner refuses to
                        add rows made by different code or a different space.
results/session-NNN.csv the rows of session NNN
results/registry.sqlite query copy, rebuilt from the CSVs at any time (not committed)
"""
from __future__ import annotations

import csv
import glob
import hashlib
import json
import os
import sqlite3
from datetime import datetime, timezone

import space

HERE = os.path.dirname(os.path.abspath(__file__))
RESULTS = os.path.join(HERE, 'results')
MANIFEST = os.path.join(RESULTS, 'manifest.json')
CODE_FILES = ('senet.py', 'sim.py', 'space.py')

METRICS = ['n_balance', 'n_skill', 'completion', 'timeouts', 'throws', 'first_win', 'cones_win', 'balance',
           'pass_rate', 'decision_rate', 'options', 'hits', 'lead_changes', 'decisiveness', 'drama',
           'skill', 'skill_completion', 'seconds']
COLUMNS = ['config_id'] + list(space.FACTORS) + METRICS + ['space_hash', 'code_hash', 'session', 'finished_utc']


def code_hash() -> str:
    h = hashlib.sha256()
    for f in CODE_FILES:
        with open(os.path.join(HERE, f), 'rb') as fh:
            h.update(fh.read())
    return h.hexdigest()[:12]


def now_utc() -> str:
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def load_manifest() -> dict | None:
    if not os.path.exists(MANIFEST):
        return None
    with open(MANIFEST) as fh:
        return json.load(fh)


def write_manifest(n_balance: int, n_skill: int, seed: int) -> dict:
    os.makedirs(RESULTS, exist_ok=True)
    if os.path.exists(MANIFEST):
        raise SystemExit('manifest.json exists: this sweep is already set up. Delete it only to start a new sweep.')
    m = dict(project='GERM-DEV-0031', created_utc=now_utc(), n_configs=space.N_CONFIGS,
             n_balance=n_balance, n_skill=n_skill, base_seed=seed,
             space_hash=space.space_hash(), code_hash=code_hash(),
             factors={k: list(v) for k, v in space.FACTORS.items()},
             max_throws=__import__('sim').MAX_THROWS)
    with open(MANIFEST, 'w') as fh:
        json.dump(m, fh, indent=2)
        fh.write('\n')
    return m


def check_code(m: dict) -> None:
    """Refuse to mix results from different code or a different space."""
    if m['code_hash'] != code_hash() or m['space_hash'] != space.space_hash():
        raise SystemExit(
            f"Code or space changed since the manifest (manifest {m['code_hash']}/{m['space_hash']}, "
            f"now {code_hash()}/{space.space_hash()}). Results would not be comparable. "
            'Revert the change, or start a new sweep.')


def session_files() -> list:
    return sorted(glob.glob(os.path.join(RESULTS, 'session-*.csv')))


def read_rows() -> list:
    rows = []
    for f in session_files():
        with open(f, newline='') as fh:
            rows.extend(csv.DictReader(fh))
    return rows


def done_ids() -> set:
    return {r['config_id'] for r in read_rows()}


def next_session() -> int:
    nums = [int(os.path.basename(f)[8:11]) for f in session_files()]
    return (max(nums) + 1) if nums else 1


class SessionWriter:
    """Appends rows to results/session-NNN.csv, flushing each to disk."""

    def __init__(self, session: int):
        self.session = session
        self.path = os.path.join(RESULTS, f'session-{session:03d}.csv')
        new = not os.path.exists(self.path)
        self.fh = open(self.path, 'a', newline='')
        self.w = csv.DictWriter(self.fh, fieldnames=COLUMNS)
        if new:
            self.w.writeheader()
            self._sync()
        self.m = load_manifest()

    def _sync(self):
        self.fh.flush()
        os.fsync(self.fh.fileno())

    def write(self, cfg: dict, res: dict) -> None:
        row = {'config_id': res['config_id']}
        row.update({k: cfg[k] for k in space.FACTORS})
        row.update({k: res[k] for k in METRICS})
        row.update(space_hash=self.m['space_hash'], code_hash=self.m['code_hash'],
                   session=self.session, finished_utc=now_utc())
        self.w.writerow(row)
        self._sync()

    def close(self):
        self.fh.close()


def build_sqlite() -> str:
    """Rebuild results/registry.sqlite from the CSVs. Returns its path."""
    path = os.path.join(RESULTS, 'registry.sqlite')
    if os.path.exists(path):
        os.remove(path)
    con = sqlite3.connect(path)
    cols = ', '.join(f'"{c}"' for c in COLUMNS)
    con.execute(f'CREATE TABLE results ({cols})')
    rows = read_rows()
    con.executemany(f'INSERT INTO results VALUES ({", ".join("?" * len(COLUMNS))})',
                    [[r.get(c) for c in COLUMNS] for r in rows])
    con.commit()
    con.close()
    return path
