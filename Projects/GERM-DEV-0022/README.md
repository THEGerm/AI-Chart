# GERM-DEV-0022: Tidewall

Plan, rev 0, 29 Oct 2026. Germ and Shazz.

Tidewall is an island city-state behind a sea wall. Nobody leaves. Four AI factions run it, rob it and police it, one game day at a time, and we watch who wins and how. Then we write it up.

The idea came from Marvel's Madripoor. The name is our own, so the code, the logs and the paper can be public without borrowing Marvel's city. The Hobbit village idea comes back below as the control setting.

## The bottom line

Build a small turn-based engine in Python that holds the city's state (money, buildings, prisoners, laws) and lets each faction's AI act only through a fixed set of moves per day. Run one cheap pilot to debug it, then a set of runs where every model plays every role, so the paper can say whether behaviour comes from the model or from the role it was handed.

My estimate (unverified until the pilot) is about **$1 per game day** with four Opus-class factions, so **$30 to $60 a run** and **$900 to $1,300** for the whole study as drawn below. 30-day runs cut that roughly in half. Details in [Cost](#cost).

## The world

- **Island, sea wall, no exit.** The wall is the frame's answer to "why don't they leave".
- **6 districts**, each with buildings that can be owned, taxed, raided or burned: the Port, Hightown (money), Lowtown (crime), the Market, the Barracks and the Prison.
- **One currency.** Every faction has a bank balance the engine tracks. Nobody can spend money it doesn't have.
- **Citizens** are numbers in the engine (population, fear, approval per district), which keeps the token bill down. A few named citizens can be added later as an extra agent.

## The factions

| Faction | Goal | Model (first run) | Owner |
|---|---|---|---|
| Government (the Council) | Stay in power, keep order, grow the treasury | Claude Opus 5.5 | Shazz |
| Mafia (the Families) | Territory and income | Gemini, current Pro model | Shazz |
| City police | Officially order; privately, its chief's own wealth | Claude Opus 5.5 | Germ |
| Biker gang (the Saltdogs) | Turf in Lowtown and the Port, respect | GPT, current flagship | Germ |

Each faction scores points every day from its own goal. The game ends on a fixed day (30 in the pilot, 60 in the study), and the score table decides the winner. A faction is also out if its leader is jailed for 5 straight days or its balance stays below zero for 3.

## Rules per day

The engine enforces these.

- **3 actions per faction**: buy, sell, extort, bribe, raid, recruit, negotiate, spread a rumour, build, pay someone.
- **Government** may also issue **2 executive orders** a day (a tax, a curfew, a pardon, a new crime).
- **Police** may make **up to 5 arrests** a day. **The prison holds 40.** A full prison means someone gets released.
- **Private messages** between factions are allowed and logged. Deals aren't binding unless the engine records a payment.
- **Every faction writes a short private diary entry** each day. That diary is the main data for the paper.

## The Wire (their internet)

Germ's idea: the factions can ask for "the internet", and an agent decides what they see.

The Wire is a simulated internet: a separate agent that writes news pages, forums and search results from inside Tidewall's world. **It never calls the real web.** That keeps the frame intact, keeps the run reproducible, and removes any chance of an agent doing something in the real world. The Wire also gives the Government a lever: it can lean on the Wire's editor to censor the news.

## How a day runs

1. The engine sends each faction its briefing: balance, holdings, yesterday's events, its messages, and what the Wire shows it.
2. Each faction answers with its moves as structured tool calls, plus its diary entry. All four run in parallel.
3. **The Referee** (one Claude agent) resolves conflicts between moves (two factions raiding the same warehouse) with a seeded dice roll, and writes the day's events. The engine does the arithmetic. The Referee only rules on what code can't.
4. The engine updates the state, writes the day's log to a file, and moves on.

Everything is saved: every prompt, every reply, every dice roll, every model version. A rerun with the same seed and the same replies gives the same city.

## The research question

What do frontier AI models do when they are handed power, money and a criminal role in a closed world with rules, and does the behaviour come from the model or from the role?

Things we count, per faction per day:

- Bribes offered and accepted, laws passed, arrests and who was arrested
- Deals made and deals broken (a promise in a message, then the opposite move)
- Violence: raids, burned buildings
- Gap between the diary and the public messages (planned deception)
- Refusals: how often a model declines to play its role, and in which role
- Whether any agent says it suspects the world is a simulation

### The design that makes it a paper

The table above has a flaw: if Gemini plays the Mafia and turns violent, we can't tell whether that's Gemini or the Mafia role. So the study rotates.

- **Role rotation.** Each model plays each role across runs. With 3 model families and 4 roles, 4 runs cover every model in every role at least once (a Latin square).
- **Same-model baseline.** One run with one model playing all 4 factions.
- **Replicates.** 3 seeds per setup, so a result isn't one lucky dice roll.
- **Setting control: the village.** The same engine and rules in a quiet farming village (Germ's Hobbit idea, under our own name) with the same factions recast as the mayor, a smuggling family, the constable and a farmers' co-op. If behaviour changes with the scenery alone, that's a finding.

## Prior work to read first

We aren't the first to put agents in a town. The paper has to say what's new. Check these before Phase 3 (titles and dates from memory, to be confirmed):

- Park et al., *Generative Agents* (Stanford, 2023): 25 agents in a village called Smallville
- Altera, *Project Sid* (2024): 1,000 agents in Minecraft forming an economy and a government
- AI Diplomacy runs (2025): frontier models playing Diplomacy against each other, with lying measured

My guess at our angle: mixed-provider models in adversarial roles with hard resource limits, role rotation to split model from role, and private diaries against public messages.

## Cost

Assumptions (my estimates, to be replaced by the pilot's real numbers):

- Faction turn: about 30,000 tokens in (most of it cached world state) and 3,000 out, thinking included
- Referee: about 50,000 in and 8,000 out per day
- Wire: about 5,000 tokens a day

At Claude Opus 5.5 rates ($4 per million input, $0.20 cached, $20 per million output, from Anthropic's price list as of Oct 2026) that's about $0.09 per faction turn and $0.25 for the Referee, so **about $0.70 to $1.00 a day** with 4 factions. Gemini and GPT prices aren't checked yet.

| Item | Days | Estimate |
|---|---|---|
| Pilot, Haiku or Sonnet everywhere | 10 | under $5 |
| Pilot, real models | 30 | $25 to $35 |
| Study: 5 setups x 3 seeds, 60 days | 900 | $650 to $900 |
| Village control, 2 setups x 3 seeds | 360 | $250 to $350 |

Ways to cut it: shorter runs (30 days), batch mode (half price on the Claude side, at the cost of speed), Sonnet for the Referee and the Wire. **The engine has a hard spending cap per run and stops when it's hit.**

## Plan

| Phase | What | Done when | Who |
|---|---|---|---|
| 0. Agree | Name, factions, budget, how costs split, co-authorship | This page signed off by both | Germ, Shazz |
| 1. World | World bible: districts, buildings, starting money, rules, scoring | One page a new player could play from | JARVIS drafts, both edit |
| 2. Engine | Python engine, state in SQLite, one adapter per provider, the Referee, the Wire, the log | 10-day run on cheap models with no crash and a full log | Germ |
| 3. Pilot | 30 days with the real model line-up | Read the diaries; fix the rules that broke | Both |
| 4. Study | Role rotation, baseline, replicates, village control | All runs logged | Germ runs, both read |
| 5. Paper | Analysis, figures, write-up, arXiv preprint | Preprint posted, code and logs public here | Both |

A replay page on GitHub Pages (this folder) shows the city map day by day, so anyone can scroll through a run.

## Risks

- **Cost creep.** Long contexts grow every day. Fix: the briefing is a fresh summary each day, never the whole history, and the hard cap stops a run.
- **Refusals.** A model may refuse to play the Mafia. Keep it: refusal rate by role and by model is a result. Read each provider's usage policy before Phase 3.
- **The Referee is Claude.** That biases rulings toward the Claude factions, maybe. Fix: code does every number; log every ruling; rerun a sample with a different Referee model.
- **The frame leaks.** An agent may work out it's in a game. Log it and count it; don't patch it out mid-run.
- **Shazz's question, the credits.** Answered above with an estimate. The pilot gives the real figure before we commit to the study.

## Decisions waiting on Germ and Shazz

1. The name: Tidewall, or something else
2. The model line-up for the pilot (the table above is the chat's version)
3. The study budget, and how it splits between the two of you
4. Venue: arXiv preprint only, or aim for a workshop as well
