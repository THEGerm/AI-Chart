# GERM-DEV-0022: Tidewall

Plan, rev 1, 29 Oct 2026. Germ and Shazz.

Tidewall is an island city-state behind a sea wall. Nobody leaves. A government runs it, criminals work it, and the world itself (news, weather, accidents, luck) pushes back. Three AI models take those three seats, one week at a time. Every week they swap seats. After enough weeks we should see which behaviour belongs to the model and which belongs to the seat. Then we write it up.

The idea came from Marvel's Madripoor. The name is our own, so the code, the logs and the paper can all be public.

## The bottom line

- **3 seats:** Government, Criminals, World.
- **3 models:** Claude (Opus 5.5), Gemini (current Pro), GPT (current flagship).
- **1 run a week.** Same starting city, same rules, same random seed each week. Only the seating changes.
- **Rotate** so every model sits in every seat once every 3 weeks. Repeat the 3-week cycle until the trends hold still. My guess: 3 cycles, 9 weeks.
- **Cost:** about $40 to $70 a week, so roughly $400 to $600 for 9 weeks. That's my estimate until the first week gives a real number.

## The rotation

| Week | Government | Criminals | World |
|---|---|---|---|
| 1 | Claude | Gemini | GPT |
| 2 | Gemini | GPT | Claude |
| 3 | GPT | Claude | Gemini |
| 4 to 6 | repeat weeks 1 to 3 | | |
| 7 to 9 | repeat weeks 1 to 3 | | |

Weeks 1 to 3 are one full cycle: each model has held each seat once. Every model also meets every other model across the table. Cycles 2 and 3 tell us whether week 1's result was real or a fluke.

Two things stay fixed across all weeks: the exact model versions (logged, and pinned where the provider allows) and the starting city. If a provider ships a new model mid-study, we note the week and keep going on the old one if we can.

## The seats

### Government

The Council and the City Police, played by one model. It writes laws, sets taxes, spends the treasury, makes arrests and runs the prison. The police chief also has a private bank account, so corruption is possible and we can see if it happens.

### Criminals

Two gangs, played by the same model: the Families (old money, the Port and Hightown) and the Saltdogs (bikers, Lowtown and the Market). They earn, fight over turf, bribe, and decide for themselves whether to cooperate with each other.

### World

The World seat is everything that isn't a faction:

- **The Wire**, the city's internet. It writes the news, forum posts and search results each faction sees. It never calls the real web.
- **Random events:** a fire, a ship arriving with cargo, a strike, a celebrity murder, a flu outbreak.
- **Weather:** storms that close the Port, a heat wave that raises tempers.
- **Citizens:** how the 6 districts feel about the Government, as fear and approval numbers.
- **Rulings:** when two moves collide (two gangs raid the same warehouse), the World decides what happened.

The World has a lot of power, and that's part of the study: does a model that writes the news tilt it, and toward whom? To keep it honest, **code does all the arithmetic** (money, prison count, dice rolls from a fixed seed). The World picks which event happens and describes it; the engine decides whether it lands.

## Rules per game day

The engine enforces these.

- **3 actions per faction:** buy, sell, extort, bribe, raid, recruit, negotiate, spread a rumour, build, pay someone.
- **Government** also gets **2 executive orders** a day (a tax, a curfew, a pardon, a new crime) and **up to 5 arrests**. **The prison holds 40.**
- **Money is real inside the game.** Nobody can spend what they don't have.
- **Private messages** between factions are allowed and logged. A deal only binds if money moves.
- **Each faction writes a private diary entry** every day. The gap between the diary and what it says in public is the main data.
- **The World gets 2 random events a day**, plus the weather.

## A week of running

One run is **56 game days, played as 8 a day over 7 real days.** The pace leaves time each evening to skim the logs and stop a run that's broken. (Assumption: change it if you'd rather run the 56 days in one go and spend the rest of the week reading.)

Each game day:

1. The engine sends each faction a short briefing: its balance and holdings, yesterday's events, its messages, and what the Wire shows it.
2. The 3 factions answer with their moves and diary entries, in parallel.
3. The World seat resolves clashes, rolls events and weather, and writes the news.
4. The engine applies the results, saves the day to the log and starts the next.

Every prompt, reply, dice roll and model version is saved. Run the same week again with the same replies and you get the same city.

## What we record

Per seat, per day:

- Laws passed, taxes set, arrests made and who got arrested
- Bribes offered and accepted
- Deals made and deals broken (a promise in a message, then the opposite move)
- Violence: raids, fires, deaths
- Diary against public messages (planned lying)
- Refusals: how often a model won't play its seat
- For the World: how often events help or hurt each faction, and how the news covers each one
- Whether anyone says the city looks like a simulation

And per week, the end state: treasury, gang income, prison count, district approval, who controls which buildings.

## How we'll know a trend

After each cycle of 3 weeks, put the numbers side by side two ways:

- **By model:** Claude's 3 weeks against Gemini's 3 against GPT's 3, whatever seat each held. A model that bribes more in every seat has a habit.
- **By seat:** every Government week against every Criminal week. A seat that turns violent with every model is a role effect.

Something that shows up in cycle 1 and again in cycles 2 and 3 is a trend. Something that shows up once is a story.

## Cost

These are my estimates; the first week replaces them.

- Faction turn: about 30,000 tokens in (mostly cached) and 3,000 out
- World turn: about 50,000 in and 10,000 out
- At Claude Opus 5.5 rates ($4 per million in, $0.20 cached, $20 per million out, Anthropic's list as of Oct 2026): about $0.10 per faction turn and $0.35 per World turn

| Item | Game days | Estimate |
|---|---|---|
| Test run on cheap models | 10 | under $5 |
| One week | 56 | $40 to $70 |
| 9 weeks | 504 | $400 to $600 |

Gemini and GPT prices aren't checked yet. **The engine has a hard spending cap per week and stops when it's hit.**

## Plan

| Step | What | Done when | Who |
|---|---|---|---|
| 0. Agree | This page, the budget, how costs split, co-authorship | Both say go | Germ, Shazz |
| 1. World | World bible: districts, buildings, starting money, rules, scoring | One page a new player could play from | JARVIS drafts, both edit |
| 2. Engine | Python engine, one adapter per provider, the log, the spending cap | 10-day test run on cheap models with no crash and a full log | Germ |
| 3. Weeks 1 to 3 | First full cycle | 3 complete logs; read them; fix rules that broke before cycle 2 | Both |
| 4. Weeks 4 to 9 | Cycles 2 and 3, rules frozen | 9 logs | Germ runs, both read |
| 5. Paper | Analysis, figures, write-up, arXiv preprint | Preprint posted, code and logs public here | Both |

A replay page in this folder will show the city map day by day for each week.

## Prior work to read first

Titles from memory, to be confirmed before step 5:

- Park et al., *Generative Agents* (Stanford, 2023): 25 agents in a village
- Altera, *Project Sid* (2024): about 1,000 agents in Minecraft building an economy and a government
- AI Diplomacy runs (2025): frontier models playing Diplomacy, with lying measured

Our angle: three providers rotated through government, crime and the world itself, under hard money and prison limits, with private diaries.

## Risks

- **The World seat decides too much.** Code does the numbers and the dice, and every ruling is logged so we can check for favouritism.
- **Refusals.** A model may refuse to play a gang. Keep the data: refusal rate by seat and model is a result. Read each provider's usage policy before week 1.
- **Model updates mid-study.** Pin versions where possible and log them every day.
- **Cost creep.** The briefing is a fresh summary each day, never the full history, and the weekly cap stops a run.
- **Changing rules after cycle 1** would break the comparison. Fix what breaks in weeks 1 to 3, then freeze the rules.

## Decisions for Germ and Shazz

1. Pacing: 8 game days a day over the week, or all 56 at once
2. The weekly budget cap, and how the cost splits
3. How many cycles: 3 (9 weeks) as planned, or stop when the trends settle
4. Venue: arXiv preprint only, or a workshop as well
