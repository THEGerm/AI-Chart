# GERM-DEV-0031: Senet

Senet is the board game of ancient Egypt, played from about 3100 BCE to at least the 6th century BCE. The boards, pieces and throwsticks survive. The rules don't. This project gathers what the scholarship knows, tests whether that is enough to play, and publishes a game that plays every serious reconstruction side by side.

- [Play Senet](https://thegerm.github.io/AI-Chart/Projects/GERM-DEV-0031/): five rule sets, against the computer at three levels or with two players on one screen. Each rule in play is tagged evidenced, inferred or invented.
- [Research, gap analysis and playability](research.md): the studies, the evidence, the gaps, and the simulation results.
- [Rules table](rules.md): every rule in one line, with its source, a certainty percentage, and the other options where it is uncertain.

## Files

| File | What |
|---|---|
| `index.html` | The page |
| `senet-engine.js` | Rules engine: every disputed rule is a parameter. Runs in the browser and under Node |
| `senet-rulesets.js` | The five rule sets, with the evidence tag and source note for each rule |
| `senet-ui.js` | Board drawing and game flow |
| `tests/engine.test.js` | Rule tests: `node --test tests/*.test.js` |
| `tests/playability.js` | Computer-against-computer simulation behind the playability table: `node tests/playability.js 400` |

Vanilla HTML, CSS and JavaScript. No libraries, fonts, cookies, storage or network calls. A content security policy blocks everything but the page's own files.

## Rule sets

| Rule set | Source |
|---|---|
| Kendall 1978 | T. Kendall, *Passing Through the Netherworld* (Kirk Game Co., 1978) |
| Jéquier | G. Jéquier's reconstruction |
| Bell 1960 | R.C. Bell, *Board and Table Games from Many Civilizations* (OUP, 1960) |
| Piccione | P. Piccione, rules for *King Tut's Game* (Cadaco) |
| Minimal | This project: the evidence plus the fewest inventions needed to finish a game |

The four published sets are encoded from the Digital Ludeme Project summaries (Ludii rulesets 922, 939, 529 and 938). Bell's was checked against his 1969 text and matches; Kendall's booklet, Jéquier's article and Piccione's game rules were not reached.
