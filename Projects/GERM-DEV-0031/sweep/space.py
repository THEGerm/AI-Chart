"""The sweep's parameter space. GERM-DEV-0031.

Each factor is one rule the evidence leaves open (research.md, section 3).
Its levels are the choices the published reconstructions make. The board,
the path and the four sticks are evidenced and stay fixed.

Coverage (independent review, 2026-11-24, against Ludii's Senet.lud):
- Jequier (Ludii 939, as the app encodes it) and Minimal are grid points.
- Kendall (922) and Piccione (938) are approximated only. Not covered:
  Kendall's bear-off tail (any throw from 30, no backward move from 28 to 30),
  his banked throws and his choices on 27; Piccione's entry on a 1 onto
  square 1, extra throws on landing on 15 and 26, extra throw on 5 only, and
  split throws. The engine cannot bank or split throws, so decision_rate,
  options and skill run low for those two rule sets.
- Bell (529) is off the grid: a die, 10 pieces, most borne off wins.
The named rule sets themselves are checked by sanity.py (anchors).

Hybrid levels no publication uses, kept as labelled inventions:
- capture=remove with the race win: the engine ends a game with removal when
  either side has nothing left in play, survivors counting as borne off.
- block without protect: the front piece of a triple can still be struck.

Rule-free duplicates are skipped: protect and safe change nothing when
nothing can be captured, so capture=none keeps both False.

Factor           Gap  Levels
zero             1    5 (Kendall, Piccione) | 6 (Jequier, tab)
extra            2    none | tab-style (1, 4 and the zero value)
pieces           3    5 (New Kingdom) | 7 (Old Kingdom)
start            4    alternate on squares 1..2n | off board, enter on the throw
capture          6    none | swap | send to rearmost empty square | remove from game
protect          7    two in a row cannot be struck (only when capture is on)
block            7    three in a row cannot be passed
stop26           9    every piece must land on 26
water            10   none | back to 15 | rearmost empty square | off the board
backward         8    forced backward move when no forward move
bearoff          12   exact throw from 26 to 30 | any throw from row 3, all pieces home
safe             9-12 squares 26, 28, 29, 30 safe from capture

13,312 configurations: 2*2*2*2 * 2*2*4*2*2 * (2 + 3*2*2), since capture=none
keeps protect and safe False.
"""
from __future__ import annotations

import hashlib
import itertools
import json

import senet

FACTORS = {
    'zero': (5, 6),
    'extra': ('none', 'tab'),
    'pieces': (5, 7),
    'start': ('alternate', 'offboard'),
    'capture': ('none', 'swap', 'rear', 'remove'),
    'protect': (False, True),
    'block': (False, True),
    'stop26': (False, True),
    'water': ('none', 'to15', 'rear', 'reserve'),
    'backward': (False, True),
    'bearoff': ('exact26', 'row3'),
    'safe': (False, True),
}

ABBR = {
    'zero': 'z', 'extra': 'x', 'pieces': 'p', 'start': 's', 'capture': 'c', 'protect': 'pr',
    'block': 'b', 'stop26': 'm', 'water': 'w', 'backward': 'bk', 'bearoff': 'o', 'safe': 'sf',
}


def _short(v) -> str:
    if isinstance(v, bool):
        return '1' if v else '0'
    return str(v)


def config_id(cfg: dict) -> str:
    """Readable, stable key, e.g. z5-xtab-p7-salternate-cswap-pr1-..."""
    return '-'.join(ABBR[k] + _short(cfg[k]) for k in FACTORS)


def configs():
    """Every valid configuration, in a fixed order. Protection is only a
    distinct level when pieces can be struck, so capture=none keeps protect=False."""
    keys = list(FACTORS)
    for combo in itertools.product(*(FACTORS[k] for k in keys)):
        cfg = dict(zip(keys, combo))
        if cfg['capture'] == 'none' and (cfg['protect'] or cfg['safe']):
            continue
        yield cfg


def to_ruleset(cfg: dict) -> dict:
    """Configuration to an engine rule set."""
    extra = (1, 4, cfg['zero']) if cfg['extra'] == 'tab' else ()
    rs = dict(
        pieces=cfg['pieces'], start=cfg['start'], lot='sticks', zero=cfg['zero'], extra=extra,
        capture=cfg['capture'], protectPairs=cfg['protect'], blockRun=3 if cfg['block'] else 0,
        safe=(26, 28, 29, 30) if cfg['safe'] else (), mustStop26=cfg['stop26'],
        water=cfg['water'], backward=cfg['backward'], win='allOff',
    )
    if cfg['bearoff'] == 'exact26':
        rs.update(offFrom=26, exactOff=True)
    else:
        rs.update(offFrom=21, exactOff=False, allHomeToBearOff=True)
    return senet.ruleset(**rs)


def space_hash() -> str:
    """Fingerprint of the factor definitions; stored with every result row."""
    return hashlib.sha256(json.dumps(FACTORS, sort_keys=True).encode()).hexdigest()[:12]


N_CONFIGS = sum(1 for _ in configs())
