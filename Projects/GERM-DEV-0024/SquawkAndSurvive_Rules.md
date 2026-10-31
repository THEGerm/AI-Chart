# Squawk & Survive: Requirements and Rules

**Tagline:** Can you survive one week as a gull?
**Audience:** Ages 9 to 99. Easy to learn, light on reading, fun to replay.
**Source of truth:** `SeagullSurvival.html` (single-file, vanilla HTML/CSS/JS).

---

## 1. Concept

The player is a young gull whose parents have stopped feeding it. Over 7 days the player scavenges, schems, and builds a reputation. The game is built on 10 survival principles (see Section 9), and every action is tagged with the principle it teaches.

---

## 2. Objective

- **Win:** End Day 7 with **Flock Rep 55 or higher** AND **Confidence 55 or higher**. Title earned: Colony Alpha.
- **Survive (partial):** Finish Day 7 alive without meeting both thresholds.
- **Lose:** Hunger or Energy reaches 0 at any point.

---

## 3. Game Structure

- **7 days**, **3 actions per day** (21 turns total).
- Each action is one of:
  - A location action (choose a location, then choose an action there)
  - The **Preen & Rest** button (available anywhere, costs 1 action slot)
- **Night phase** (after the 3rd action of each day):
  - Energy is set to 80 if it is below 80 (never reduced).
  - Hunger drops by 5.
  - If Hunger hits 0 overnight, the game ends.
- Day 7's night phase triggers the final win/survive check.

---

## 4. Stats

All stats are clamped between 0 and 100.

| Stat | Start | Purpose |
|---|---|---|
| **Hunger** | 60 | Food level. 0 means starvation (loss). |
| **Confidence** | 20 | Win condition (needs 55). Raised by bold actions. |
| **Flock Rep** | 10 | Win condition (needs 55). Raised by social and team actions. |
| **Energy** | 80 | Cost of acting. 0 means collapse (loss). |

---

## 5. Action Resolution

1. Every action has fixed effects on the four stats.
2. Some actions have a **success rate**. Roll once: success applies the listed effects, failure applies the **failure penalty** instead.
3. Actions with no success rate always succeed.
4. **Failure penalty (all actions):** Hunger -3, Confidence -8, Energy -10, Flock Rep 0.
5. Success rates are capped at **95%** after species bonuses.
6. After each action, a **random event** may fire (see Section 8).
7. Loss conditions are checked after every action (including events).

---

## 6. Species

Chosen at the start. Each action is tagged `humanTheft`, `boatTheft`, or `survival`, and species modifiers apply by tag.

| Species | Human theft | Boat theft | Survival | Other |
|---|---|---|---|---|
| **Ring-billed Gull** | +20% success | none | none | Specialist at chip trucks, parking lots, parks |
| **Herring Gull** | +10% success | +10% success | +10% success | -25% energy cost on action energy losses (the survivability pick) |
| **Laughing Gull** | none | +20% success | none | +25% Hunger gained on successful boat/waterfront theft |

**Notes**
- Success bonuses only affect actions that have a success rate.
- Herring energy discount applies to the action's own energy cost (including failure penalties). It does not modify random event effects.
- Laughing Gull food bonus applies only to successful `boatTheft` actions.
- Boosted actions display "(species bonus)" next to their success rate.

---

## 7. Locations and Actions

**Effects format:** Hunger / Confidence / Flock Rep / Energy.
**Type key:** H = humanTheft, B = boatTheft, S = survival.
**#** = survival principle taught.

### Chip Truck
| Action | # | Type | Success | Effects |
|---|---|---|---|---|
| Observe peak stupidity hours | 2 | S | Always | -5 / +5 / +2 / -5 |
| Dive-bomb a tourist's fries | 5 | H | 70% | +20 / +15 / +5 / -15 |
| Run a flock distraction play | 6 | S | Always | +15 / +10 / +15 / -20 |
| Swipe from an outdoor table | 5 | H | 65% | +18 / +12 / +3 / -10 |
| Raid the condiment station scraps | 1 | H | Always | +8 / +4 / +1 / -6 |

### Parking Lot
| Action | # | Type | Success | Effects |
|---|---|---|---|---|
| Patrol the asphalt kingdom | 1 | H | Always | +10 / +5 / 0 / -10 |
| Shadow the crows | 8 | S | Always | +8 / +3 / +8 / -8 |
| Psychologically destroy a small child | 5 | H | 78% | +12 / +20 / +5 / -10 |
| Raid the drive-thru trash bin | 1 | H | 72% | +22 / +8 / +2 / -12 |
| Stalk an open car window | 3 | H | 55% | +15 / +18 / +4 / -12 |

### Waterfront
| Action | # | Type | Success | Effects |
|---|---|---|---|---|
| Work the fishing boats | 1 | B | Always | +15 / +5 / 0 / -10 |
| Alert the colony to a big haul | 10 | S | Always | +8 / +5 / +20 / -10 |
| Study the tourist boat schedule | 2 | S | Always | -5 / +8 / +5 / -5 |
| Rob a fisherman's bait bucket | 5 | B | 60% | +22 / +15 / +6 / -15 |
| Swoop a tour boat deck mid-lunch | 3 | B | 68% | +18 / +12 / +5 / -12 |
| Walk the tideline for crustaceans | 1 | B | Always | +12 / +3 / 0 / -6 |

### City Park
| Action | # | Type | Success | Effects |
|---|---|---|---|---|
| Patiently stalk a family picnic | 3 | H | Always | +12 / +10 / +5 / -5 |
| Assemble the squad for a swarm | 7 | S | Always | +18 / +8 / +12 / -15 |
| Map the picnicker feeding windows | 2 | S | Always | -3 / +7 / +3 / -5 |
| Snatch a jogger's energy bar | 5 | H | 62% | +14 / +14 / +4 / -10 |
| Dominate the old-lady bread pile | 5 | H | Always | +16 / +10 / +3 / -8 |
| Raid a toddler's abandoned snack cup | 1 | H | 80% | +10 / +8 / +1 / -6 |

### The Landfill
| Action | # | Type | Success | Effects |
|---|---|---|---|---|
| Full-commit aggressive dive | 3 | S | 60% | +25 / +15 / -5 / -25 |
| Broadcast a major find to the colony | 10 | S | Always | +12 / +5 / +18 / -12 |
| Claim a premium garbage zone | 1 | S | 65% | +15 / +12 / +5 / -15 |
| Intercept a fresh truck delivery | 3 | S | 55% | +28 / +18 / +8 / -20 |
| Pick the edges while others fight | 3 | S | Always | +10 / +3 / 0 / -5 |

### The Roost
| Action | # | Type | Success | Effects |
|---|---|---|---|---|
| Negotiate with the elder gulls | 4 | S | Always | -5 / +10 / +20 / -8 |
| Recruit reliable flockmates | 7 | S | Always | -5 / +8 / +15 / -10 |
| Study the pecking order | 4 | S | Always | -3 / +6 / +10 / -5 |

### Preen & Rest (any time)
- Effects: Hunger -3, Confidence +2, Flock Rep 0, **Energy +25**.
- Costs 1 of the 3 daily action slots.
- Represents principle #9 (Keep your balance).

---

## 8. Random Events

- **Chance:** 22% after a location action, 15% after Preen.
- Effects are applied on top of the action's result and are not modified by species.
- Event pool (12):

| Event | Effects (Hunger / Conf / Rep / Energy) |
|---|---|
| Toddler hurls ice cream cone | +15 / +10 / 0 / 0 |
| Dog chases you 200 metres | 0 / -5 / 0 / -15 |
| Raccoon tips a garbage can | +12 / 0 / +5 / 0 |
| Another gull steals your fish | -10 / -8 / 0 / 0 |
| Photographer offers a chip | +8 / +12 / 0 / 0 |
| Storm front rolling in | -5 / 0 / 0 / -15 |
| Dropped birthday cake | +25 / +5 / 0 / 0 |
| Pigeon shows you a food spot | +5 / 0 / +8 / 0 |
| Tangled in kite string | 0 / -10 / 0 / -10 |
| Elder gull teaches a squawk | 0 / +5 / +10 / 0 |
| Tourist drops a hot dog | +18 / +7 / 0 / 0 |
| Wedding charcuterie board | +20 / 0 / +5 / 0 |

---

## 9. The 10 Survival Principles

Each action carries a `#` tag. A collapsible in-game "Survival Guide" lists all ten.

1. **Promote yourself.** Seek your own food.
2. **Accelerate your learning.** Observe humans at chip trucks and waterfronts.
3. **Match strategy to situation.** Landfill is aggressive, park is patient.
4. **Negotiate success.** Learn the pecking order from dominant gulls.
5. **Secure early wins.** Snatch something visible.
6. **Achieve alignment.** Sync dives and squawks with the flock.
7. **Build your team.** Form a crew that answers your alarm calls.
8. **Create coalitions.** Share space with crows and pigeons.
9. **Keep your balance.** Preen, rest, conserve heat (Preen button).
10. **Expedite everyone.** Squawk to share big finds with the colony.

---

## 10. Ranks

Rank is the highest tier where **both** Flock Rep and Confidence meet the minimums.

| Rank | Min Rep | Min Conf |
|---|---|---|
| Lost Chick | 0 | 0 |
| Scrappy Fledgling | 15 | 10 |
| Park Regular | 25 | 20 |
| Dock Veteran | 35 | 35 |
| Flock Lieutenant | 45 | 45 |
| Colony Alpha | 55 | 55 |

---

## 11. UI and Flow Requirements

### Screens
1. **Intro:** Title, tagline, premise, name input, win condition, "Pick Your Species" button.
2. **Species select:** Three cards (description + bonus). Start button disabled until one is chosen.
3. **Play screen:** Header (name, species), Day badge, Action counter (1 to 3), Rank badge, Alpha progress bar, four stat bars, Survival Guide toggle, Preen button, location grid, action list, activity log.
4. **End screens:** Won, Survived, or Dead (starved or collapsed), each with summary stats and a replay button.

### Behavior
- **Name input:** Starts empty. Player can fully delete and retype. If left blank, the name defaults to "Gary" when the game starts.
- **Result panel:** After each action, a panel shows success or setback, the story text, and any random event.
- **Reading time:** Each result panel stays on screen for **5.6 seconds** before play resumes. The night panel shows for an additional **5.2 seconds**.
- **Input lock:** All buttons are disabled while a result is displaying.
- **Night panel:** A distinct purple "Nightfall" message between days.
- **Activity log:** Scrollable, keeps the latest 25 entries.
- **Replay:** Resets all state, including name and species.

### Layout and Accessibility
- Responsive: stats and location grids collapse to two columns under 480px wide.
- Large tap targets (mobile-first).
- Readable contrast on all panels.
- Plain, age-neutral language with humor that works for kids and adults.

---

## 12. Technical Requirements

- **Delivery:** One self-contained `.html` file. No build step, no frameworks.
- **Dependencies:** Google Fonts only (Fredoka One, Nunito). Falls back to system cursive and sans-serif.
- **Storage:** None. No localStorage, no network calls. All state lives in memory.
- **Stack:** Vanilla HTML, CSS, JavaScript.
- **Compatibility:** Any modern browser, desktop or mobile.

---

## 13. Balance Notes

- Start Hunger 60 and Energy 80 give a safe opening but punish passive play.
- Reaching 55/55 in 21 turns requires mixing high-reputation actions (Roost, colony calls) with confidence builders (theft, aggressive dives).
- Energy is the main constraint: heavy actions (-20 to -25) should be paired with Preen or saved for the start of a day after night regen.
- Species nudge strategy, not outcome. Ring-billed rewards land-based theft, Laughing rewards waterfront play, Herring rewards sustained aggression.
