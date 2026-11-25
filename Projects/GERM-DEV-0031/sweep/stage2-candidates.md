# Stage 2 candidate: the Germain Rules

The Germain Rules (named for the paper, Germain et al.) are a rule set that replaces the invented rules with the smallest rules the evidence suggests, never loops forever, and works with skill switched off. Built and tested 2026-11-25, after the first-stage sweep ended. Results: `../research.md`, "Stage 2 test of the Germain Rules".

## Rules

| Gap | Rule | Basis |
|---|---|---|
| Throw value | Count the light sides, 1 to 4; none up scores 5 | "Playing five" caption (ḥꜥb 5) |
| Extra throws | None | No evidence; the sweep shows throw scoring barely changes results |
| Entry | Pieces start off the board and enter on the square equal to the throw | zbi̯, "send out (the piece)", Old Kingdom caption |
| Capture | Landing on a lone enemy piece takes it. The struck piece goes back to 15 if it had passed 15, otherwise off the board to re-enter | "Taken away", "capturing in senet"; 15 is the "house of repeating life" |
| Protection, blockade | None (Contest version: two side by side cannot be struck) | Modern rules |
| Backward moves | None | Modern rule |
| Square 26 | Every piece must stop on it | nfr mark; "hold him back from the per-nefer" (Turin 1775) |
| Square 27 | Back to 15 | Water mark; drowning text; house of repeating life |
| Leaving | From 26 on a 5, 28 on a 3, 29 on a 2, 30 on a 1, exact throws only | Marks "three", "two", Old Kingdom "one"; "knowing three and finding two" |
| Win | First to bear off all pieces | "Passing is mine"; "true of voice" |

Decisions, 2026-11-24: square 30 exits on an exact 1. Struck pieces that have not passed 15 go off the board and re-enter. The rule set is named the Germain Rules.

## Three versions

| Version | Decisions | Fits |
|---|---|---|
| Fate | Forced: the rearmost piece that can move must move | Solo and ritual play (Nefertari, Book of the Dead 17) |
| Contest | Free choice of piece; two pieces side by side cannot be struck | Two-player tomb scenes, a calmer game |
| Master | Free choice of piece; a lone piece can always be struck | Keen players |

Names swapped 2026-11-25, after the stage 2 test: the unprotected version is the harder game, so it is Master.

## Why every game ends

No backward moves; a struck piece falls back no further than 15 once past it; no rule requires all pieces home before leaving; every exit has a fixed chance on every throw. Progress only moves forward, apart from bounded setbacks, so a game ends with probability 1.

## Engine work

- New capture mode `to15`: a struck piece past 15 goes to 15, or the nearest free square below; otherwise off the board.
- New rule field `forced`: only the rearmost piece that can move may move. It is a rule, so it binds human players in the app too.
- Both added to the JavaScript and Python engines together, with parity cases and three rule tests. Rule sets `germain_fate`, `germain_contest` and `germain_master` are in the app.

## Test

2,000 games each for Germain Rules Fate, Contest and Master, beside Kendall, Jéquier, Piccione and Minimal. Pass marks: completion 100%; the longest games bounded (report the 99th percentile); balance near 0.5. Skill should be near 0.5 for Fate and rise from Contest to Master.

Outcome, 2026-11-25, names as swapped: completion 100% for all three; 99th percentile 512 (Fate), 281 (Contest) and 387 (Master) throws; cones win 49.3%, 51.4% and 48.7%; Fate skill 51.2%, which is chance. Skill did not rise with protection as designed: the unprotected version, now Master, has more skill than the protected one, now Contest (98.9% against 96.4% versus a random mover, 68.6% against 55.5% for look-ahead), because protecting pairs cuts hits from 70 a game to 19.
