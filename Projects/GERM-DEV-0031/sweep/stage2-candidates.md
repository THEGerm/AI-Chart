# Stage 2 candidate: the Germain Rules

The Germain Rules (named for the paper, Germain et al.) are a rule set that replaces the invented rules with the smallest rules the evidence suggests, never loops forever, and works with skill switched off. To be built and tested after the first-stage sweep ends, since engine changes would stop the running sweep from accepting rows.

## Rules

| Gap | Rule | Basis |
|---|---|---|
| Throw value | Count the light sides, 1 to 4; none up scores 5 | "Playing five" caption (ḥꜥb 5) |
| Extra throws | None | No evidence; the sweep shows throw scoring barely changes results |
| Entry | Pieces start off the board and enter on the square equal to the throw | zbi̯, "send out (the piece)", Old Kingdom caption |
| Capture | Landing on a lone enemy piece takes it. The struck piece goes back to 15 if it had passed 15, otherwise off the board to re-enter | "Taken away", "capturing in senet"; 15 is the "house of repeating life" |
| Protection, blockade | None (Master version: two side by side cannot be struck) | Modern rules |
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
| Contest | Free choice of piece | Two-player tomb scenes |
| Master | Contest, plus two pieces side by side cannot be struck | Keen players |

## Why every game ends

No backward moves; a struck piece falls back no further than 15 once past it; no rule requires all pieces home before leaving; every exit has a fixed chance on every throw. Progress only moves forward, apart from bounded setbacks, so a game ends with probability 1.

## Engine work

- New capture mode: struck piece to 15 if past it, else off the board.
- New computer level `forced`: move the rearmost piece that can move.
- Both added to the JavaScript and Python engines together, with parity cases.

## Test

2,000 games each for Germain Rules Fate, Contest and Master, beside Kendall, Jéquier, Piccione and Minimal. Pass marks: completion 100%; the longest games bounded (report the 99th percentile); balance near 0.5. Skill should be near 0.5 for Fate and rise from Contest to Master.
