# Senet rule sweep (GERM-DEV-0031)

The sweep plays every combination of the rules the evidence leaves open and measures what each combination does to the game. It answers two questions from `research.md`: which unknown rules change the game most, and how much of each version is luck.

Python 3, standard library only. Run everything from this folder.

## Files

| File | What |
|---|---|
| `senet.py` | Rules engine and computer players, a port of `../senet-engine.js` |
| `space.py` | The 12 factors and their levels: 14,336 configurations |
| `sim.py` | Plays the games for one configuration and computes the metrics |
| `run.py` | `init`, `dry`, `session`, `status` |
| `registry.py` | The results registry: CSV per session, manifest, SQLite copy |
| `sanity.py` | Six checks, run after every session |
| `test_parity.py`, `parity_dump.js` | The Python engine against the JavaScript engine, 3,000 positions |
| `results/` | `manifest.json`, `session-NNN.csv`, `dryrun.json`, `sanity-latest.json` |

## Factors

Each factor is a gap from `research.md` section 3. Levels follow the published reconstructions.

| Factor | Levels |
|---|---|
| zero (gap 1) | no light face moves 5 or 6 |
| extra (gap 2) | no extra throws, or tab-style extra throws on 1, 4 and the zero value |
| pieces (gap 3) | 5 or 7 a side |
| start (gap 4) | alternating on squares 1 to 2n, or off the board and entering on the throw |
| capture (gap 6) | none, swap, send to the rearmost empty square, remove from the game |
| protect (gap 7) | two in a row cannot be struck (only with capture) |
| block (gap 7) | three in a row cannot be passed |
| stop26 (gap 9) | every piece must land on 26 |
| water (gap 10) | none, back to 15, to the rearmost empty square, off the board |
| backward (gap 8) | forced backward move when no forward move exists |
| bearoff (gap 12) | exact throw from 26 to 30, or any throw from row 3 once all pieces are home |
| safe | squares 26, 28, 29 and 30 safe from capture |

## Metrics

Per configuration: 200 games of the normal computer against itself, and 200 of the normal computer against a random mover. Seats and first throw alternate.

| Metric | Meaning |
|---|---|
| completion | share of games finished within 3,000 throws |
| throws | mean throws per finished game |
| first_win | win rate of the side that throws first (0.5 is fair) |
| cones_win | win rate of cones, the side that starts behind |
| pass_rate | share of throws with no legal move |
| decision_rate | share of throws with two or more legal moves |
| options | mean legal moves when there is at least one |
| hits | captures per game |
| lead_changes | changes of leader per game, by race count |
| skill | win rate of the normal computer against the random mover |

## Runbook: one session

The container is temporary. Results are safe only once pushed, so every session ends with a push.

```bash
cd Projects/GERM-DEV-0031/sweep
git pull                                  # pick up the last session's results
python3 run.py status                     # progress and time left
python3 run.py session --budget-min 20    # runs, then stops by itself
python3 sanity.py                         # all six checks must pass
git add results && git commit -m "Senet sweep: session NNN" && git push
```

- A row is written and synced to disk as each configuration finishes, so an interrupted session keeps its rows.
- The runner stops starting new configurations when the slowest likely one would overrun the budget.
- Configurations run in a fixed shuffled order, so a partial sweep is a random sample of the whole space and can be analysed early.
- The manifest records the code and space hashes. If either changes, the runner refuses to add rows, because the results would no longer be comparable.

## Estimate

From `results/dryrun.json` (96 configurations, stratified by pieces and capture, 4 workers): about 5 seconds a configuration, 19.7 CPU hours, **5.5 hours of wall time** (90% band 4.1 to 6.9), about **18 sessions of 20 minutes**.
