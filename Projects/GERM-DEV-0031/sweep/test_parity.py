"""Parity test: the Python engine against the JavaScript engine. GERM-DEV-0031.

Runs sweep/parity_dump.js under Node (3,000 random positions: 1,000 from the
five named rule sets, 2,000 from random rule combinations) and checks, case
by case: legal moves, the full result of every move, the extra-throw rule,
the static evaluation, and the 'normal' and 'hard' computer choices.

Run from the project folder:  python3 -m unittest sweep/test_parity.py
"""
import json
import os
import subprocess
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import senet  # noqa: E402

PROJECT = os.path.dirname(HERE)


def load_cases():
    out = subprocess.run(['node', os.path.join(HERE, 'parity_dump.js')], cwd=PROJECT,
                         capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


class Parity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cases = load_cases()

    def test_case_count(self):
        self.assertEqual(len(self.cases), 3000)

    def test_every_case(self):
        fails = []
        for i, c in enumerate(self.cases):
            rs = senet.ruleset(**c['rs'])
            s = c['state']
            st = senet.State(s['board'][:], s['reserve'][:], s['off'][:], s['lost'][:], s['turn'])
            t = c['t']
            moves = [tuple(m) for m in senet.legal_moves(st, st.turn, t, rs)]
            if moves != [tuple(m) for m in c['moves']]:
                fails.append((i, 'moves', moves, c['moves']))
                continue
            for m, r in zip(moves, c['results']):
                ns, ev = senet.apply_move(st, m, rs)
                got = {'board': ns.board, 'reserve': ns.reserve, 'off': ns.off, 'lost': ns.lost,
                       'winner': ns.winner, 'events': ev}
                if got != r:
                    fails.append((i, 'apply', m))
                    break
            if senet.extra_throw(t, rs, moves[0] if moves else None) != c['extra']:
                fails.append((i, 'extra'))
            if abs(senet.evaluate(st, st.turn, rs) - c['evaluate']) > 1e-6:
                fails.append((i, 'evaluate', senet.evaluate(st, st.turn, rs), c['evaluate']))
            n = senet.choose_move(st, t, rs, 'normal', None)
            if (list(n) if n else None) != c['normal']:
                fails.append((i, 'normal', n, c['normal']))
            if c['hard'] is not None:
                h = senet.choose_move(st, t, rs, 'hard', None)
                if list(h) != c['hard']:
                    fails.append((i, 'hard', h, c['hard']))
        self.assertEqual(fails[:10], [], f'{len(fails)} mismatches')


if __name__ == '__main__':
    unittest.main()
