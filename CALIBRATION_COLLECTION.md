# Calibration Data Collection

Fill in each section. Leave blank if unknown. Once complete, hand back to Claude.

---

## How to use this

Each test has a working baseline — either back-calculated from game data or a community-researched
starting point. The goal is to confirm or correct that baseline with real game observations.

For each test: screenshot player card **before** the session, run the coach, screenshot **after**.
Record the exact stat numbers from the card. Approximate is useless — exact only.

---

## TEST 1 — Age 21–23 multiplier (baseline: 0.85 — needs game data to confirm or correct)

**What to do:** Pick any player aged 21, 22, or 23. Run any Standard or Extensive coach session.
Screenshot player card before and after. Record exact stat values for at least one white stat.

| Field | Value |
|---|---|
| Player name | |
| Player age | |
| Player talent (from edit screen) | |
| Player tier | |
| Coach type (Standard / Extensive / Focused) | |
| Coach category (Attacking / Defending / Physical / Safeguard / Goalkeeping) | |
| Coach multiplier (×4, ×10, ×20 etc.) | |
| Stat name | |
| Stat value BEFORE | |
| Stat value AFTER | |
| Is this stat white for this player? (yes/no) | |
| Stat name 2 (optional) | |
| Stat value BEFORE 2 | |
| Stat value AFTER 2 | |
| Is stat 2 white? | |
| Notes | |

---

## TEST 2 — Prentice Reward Coach ×4 (baseline: ageMult 0.85, Reward Coach budget = Standard)

**What to do:** Run Prentice's Reward Coach ×4 (MARKING, POSITIONING, AGGRESSION).
Screenshot player card before and after. Record all three stat values.

| Field | Value |
|---|---|
| Player name | Prentice |
| Player age | 22 |
| Player talent | Normal |
| MARKING before | |
| MARKING after | |
| POSITIONING before | |
| POSITIONING after | |
| AGGRESSION before | |
| AGGRESSION after | |
| Coach shown as Standard or Reward Coach? | |
| Multiplier shown | |
| Notes | |

---

## TEST 3 — Age 24–25 multiplier (baseline: 0.72 — needs game data to confirm or correct)

**What to do:** Use the age-24 DMC player already in the DB.
Run any coach session with visible gain ranges, or record before/after stats.

| Field | Value |
|---|---|
| Player name | |
| Player age | |
| Player talent | |
| Player tier | |
| Coach type | |
| Coach category | |
| Coach multiplier | |
| Stat name | |
| Stat value BEFORE | |
| Stat value AFTER | |
| Is this stat white? | |
| Stat name 2 (optional) | |
| Stat value BEFORE 2 | |
| Stat value AFTER 2 | |
| Is stat 2 white? | |
| Notes | |

---

## TEST 4 — Dallas re-validation (Obs A/B calibration check)

**What to do:** Run Standard Safeguard ×4 on Dallas. Screenshot player card before and after.
Record all 5 DEF stats. This re-checks whether the original Sprint 31 Dallas observations used correct stat values.

| Field | Value |
|---|---|
| Player name | Dallas |
| Player age | |
| Player talent | Normal |
| Player tier | |
| Coach type | Standard Safeguard |
| Coach multiplier | ×4 |
| TACKLING before | |
| TACKLING after | |
| MARKING before | |
| MARKING after | |
| POSITIONING before | |
| POSITIONING after | |
| HEADING before | |
| HEADING after | |
| BRAVERY before | |
| BRAVERY after | |
| Notes | |

---

## TEST 5 — Slow talent second data point (baseline: 0.47 — single player only, needs confirmation)

**What to do:** Any player with Slow talent. Run any coach session.
Record before/after for at least one white stat.
LJDark Leo (GK, Age 18, Slow) is the only data point — a second player confirms or corrects it.

| Field | Value |
|---|---|
| Player name | |
| Player age | |
| Player talent | Slow (confirm from edit screen) |
| Player tier | |
| Coach type | |
| Coach category | |
| Coach multiplier | |
| Stat name | |
| Stat value BEFORE | |
| Stat value AFTER | |
| Is this stat white? | |
| Notes | |

---

## TEST 6 — ×N scaling (linear vs geometric decay)

**What to do:** Same player, same stat, two coach runs back to back.
First run: note the stat gain. Second run: note the stat gain.
Ideally ×4 then ×20 on the same stat, or ×10 then ×10.
The question: does doubling the multiplier double the gain, or does it plateau?

| Field | Value |
|---|---|
| Player name | |
| Player age | |
| Player talent | |
| Coach type | |
| Coach category | |
| Coach multiplier — RUN 1 | |
| Stat name — RUN 1 | |
| Stat BEFORE — RUN 1 | |
| Stat AFTER — RUN 1 | |
| Coach multiplier — RUN 2 | |
| Stat name — RUN 2 | |
| Stat BEFORE — RUN 2 | |
| Stat AFTER — RUN 2 | |
| Notes | |

---

## TEST 7 — Fast talent multiplier (baseline: 1.25 — needs game data to confirm or correct)

**What to do:** Find a player confirmed as Fast talent (shown on edit screen as "Fast").
Run any coach session on a white stat. Record exact before/after.
Compare against a Normal player of the same age running the same session if possible.

| Field | Value |
|---|---|
| Player name | |
| Player age | |
| Player talent (confirm from edit screen, exact text) | Fast |
| Player tier | |
| Coach type | |
| Coach category | |
| Coach multiplier | |
| Stat name | |
| Stat value BEFORE | |
| Stat value AFTER | |
| Is this stat white? | |
| Notes | |

---

## TEST 8 — Fastest talent multiplier (baseline: 1.5 — needs game data to confirm or correct)

**What to do:** Find a player confirmed as Fastest talent (edit screen shows "Fastest").
Same as Test 7 — one white stat, before/after.

| Field | Value |
|---|---|
| Player name | |
| Player age | |
| Player talent (confirm from edit screen, exact text) | Fastest |
| Player tier | |
| Coach type | |
| Coach category | |
| Coach multiplier | |
| Stat name | |
| Stat value BEFORE | |
| Stat value AFTER | |
| Is this stat white? | |
| Notes | |

---

## TEST 9 — Average talent multiplier (baseline: 1.1 — needs game data to confirm or correct)

**What to do:** Find a player confirmed as Average talent (edit screen shows "Average").

| Field | Value |
|---|---|
| Player name | |
| Player age | |
| Player talent (confirm from edit screen, exact text) | Average |
| Player tier | |
| Coach type | |
| Coach category | |
| Coach multiplier | |
| Stat name | |
| Stat value BEFORE | |
| Stat value AFTER | |
| Is this stat white? | |
| Notes | |

---

## TEST 10 — Seasonal decay rate (baseline: 20% — needs before/after season scan)

**What to do:** Find a player you have stats for at the END of a season.
Screenshot their player card. After the season resets, screenshot again immediately.
Record every stat before and after. This tells us the exact decay per stat.

We need to know:
- Does white stat decay differ from grey stat decay?
- Is it exactly 20% or approximate?
- Does the tier bonus portion survive the reset?

| Field | Value |
|---|---|
| Player name | |
| Player age | |
| Player tier | |
| Player roles | |
| Screenshot timing (end of season / start of next) | |
| STAT NAME | BEFORE | AFTER |
| (fill one row per stat) | | |
| Notes | |

---

## Anything else

Space for observations that don't fit the tests above — unusual gains, unexpected results, anything that looked wrong in the app projection vs what the game showed.

| Observation | Value |
|---|---|
| | |
| | |
| | |
