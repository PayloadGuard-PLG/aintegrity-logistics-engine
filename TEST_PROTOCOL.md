# AIntegrity Squad Optimiser — Field Test Protocol

Manual test guide for Termux builds. Complete each section in order.
Save screenshots alongside results — filename reference in every scan row.

---

## SESSION HEADER

Complete once per test session before any tab tests.

| Field | Value |
|---|---|
| Date | |
| Build / OTA commit | |
| Device | |
| Android version | |
| DB state | Fresh install / Existing / Wiped |
| Player count in squad | |
| Notes | |

---

## 1. SANITY — APP LOAD & DB

Run at session start and again at session end.

| Check | Pass | Fail | Notes |
|---|---|---|---|
| App loads without crash | | | |
| No `has no column named new_role` error | | | |
| Squad tab shows players | | | |
| Tier labels show T0–T6 (not None/Rare/Elite etc.) | | | |
| Edit Player opens without crash | | | |
| Edit Player saves without crash | | | |
| App survives background → foreground | | | |
| Drills tab loads | | | |
| Coaches tab loads | | | |

---

## 2. SQUAD TAB — PLAYER CARD

One row per player tested. Add rows as needed.

| Player | Roles detected | Tier | OVR | White stats correct | Grey stats correct | Notes |
|---|---|---|---|---|---|---|
| | | | | Y / N | Y / N | |
| | | | | Y / N | Y / N | |
| | | | | Y / N | Y / N | |
| | | | | Y / N | Y / N | |

**Role detection edge case** — multi-role token (e.g. `DL ML AML` on one line):

| Player | Roles shown in game | Roles detected by app | All split correctly |
|---|---|---|---|
| | | | Y / N |
| | | | Y / N |

**Stat column ordering** — does DEF / ATT / PHY column order match the Edit Player screen?

| Player | Coaches tab order matches Edit Player | Notes |
|---|---|---|
| | Y / N | |
| | Y / N | |

---

## 3. COACH SCAN CHAIN

### 3a. Session Header

| Field | Value |
|---|---|
| Player used for all scans | |
| Player roles | |
| Player tier | |
| Player age | |
| Player talent | |

### 3b. Scan Matrix

One row per image scanned. Every scan needs a saved screenshot — note filename in the Image column.

| # | Image | Coach type expected | Coach type read | Category expected | Category read | Multiplier in image | Multiplier read | Match |
|---|---|---|---|---|---|---|---|---|
| 01 | | Focused | | Defending | | | | Y / N |
| 02 | | Focused | | Attacking | | | | Y / N |
| 03 | | Standard | | Defending | | | | Y / N |
| 04 | | Standard | | Attacking | | | | Y / N |
| 05 | | Standard | | Physical | | | | Y / N |
| 06 | | Standard | | Safeguard | | | | Y / N |
| 07 | | Extensive | | any | | | | Y / N |
| 08 | | — | | — | | — | — | REJECTED |
| 09 | | — | | — | | — | — | REJECTED |

Row 08–09: non-coach images (squad screen, drill screen). Expected result: `SCAN REJECTED`.

### 3c. Stat Resolution — Per Scan

Complete for each scan that was not rejected.

| # | Stats in COACH BOOSTS | Count | Expected count | Out-of-category stats present | Scan status line (exact) |
|---|---|---|---|---|---|
| 01 | | | 1–2 | Y / N | |
| 02 | | | 1–2 | Y / N | |
| 03 | | | ~5 | Y / N | |
| 04 | | | ~5 | Y / N | |
| 05 | | | ~5 | Y / N | |
| 06 | | | ~5 | Y / N | |
| 07 | | | >5 ok | Y / N | |

**Expected stat lists per category (Standard coach):**

| Category | Expected stats |
|---|---|
| Defending | TACKLING · MARKING · POSITIONING · HEADING · BRAVERY |
| Attacking | PASSING · DRIBBLING · CROSSING · SHOOTING · FINISHING |
| Physical | FITNESS · STRENGTH · AGGRESSION · SPEED · CREATIVITY |
| Safeguard | REFLEXES · AGILITY · ANTICIPATION · RUSHING OUT · COMMUNICATION |

### 3d. Multiplier Misread Log

Only complete if a multiplier did not match. Note where the wrong value appears in the image.

| # | Image | Value in image | Value read | Wrong value location in image | Notes |
|---|---|---|---|---|---|
| | | | | | |
| | | | | | |

---

## 4. COACHES TAB — PROJECTION

One row per projection run. Run at least one per coach category.

| # | Player | Sessions entered | Scanned stats | OVR before | OVR after | OVR gain | Gains only on scanned stats | Notes |
|---|---|---|---|---|---|---|---|---|
| 01 | | | | | | | Y / N | |
| 02 | | | | | | | Y / N | |
| 03 | | | | | | | Y / N | |
| 04 | | | | | | | Y / N | |

**Bottom table check** — after PROJECT, scan the full projected table:

| # | Stats showing +gain | Any +gain on a stat NOT in COACH BOOSTS | Notes |
|---|---|---|---|
| 01 | | Y / N | |
| 02 | | Y / N | |
| 03 | | Y / N | |

---

## 5. CAPTURE SCREEN — STAT CONSISTENCY

Scan the same image in both Coaches tab and Capture screen. They must resolve identical stat lists.

| # | Image | Coaches tab stats | Capture screen stats | Lists match | Gain lo–hi values populated |
|---|---|---|---|---|---|
| 01 | | | | Y / N | Y / N |
| 02 | | | | Y / N | Y / N |
| 03 | | | | Y / N | Y / N |

**Player-selected vs no player selected:**

| # | Player selected | Stats resolved | Count | Notes |
|---|---|---|---|---|
| 01 | Yes — [name] | | | |
| 02 | No | | | |

---

## 6. DRILLS TAB

### 6a. Intensity × Fan Level Drain

Record actual drain shown vs expected. Flag any that deviate by more than 0.1%.

| Drill | Intensity | Fan level | Drain shown | Expected drain | Match |
|---|---|---|---|---|---|
| | Very Easy | L0 | | 0.675% | Y / N |
| | Very Easy | L4 | | ZERO (0.375%) | Y / N |
| | Easy | L0 | | 1.35% | Y / N |
| | Easy | L4 | | 0.75% | Y / N |
| | Medium | L0 | | 2.025% | Y / N |
| | Medium | L4 | | 1.125% | Y / N |
| | Hard | L0 | | 2.70% | Y / N |
| | Hard | L4 | | 1.50% | Y / N |
| | Very Hard | L0 | | 3.375% | Y / N |
| | Very Hard | L4 | | 1.875% | Y / N |

### 6b. Drill Intensity Filter

| Filter selected | Drills shown match intensity | Any drills missing | Any wrong intensity showing |
|---|---|---|---|
| Very Easy | Y / N | | |
| Easy | Y / N | | |
| Medium | Y / N | | |
| Hard | Y / N | | |
| Very Hard | Y / N | | |

---

## 7. UNCONFIRMED DATA — ACTIVE COLLECTION

These are open calibration gaps. Record observations from live game screenshots or in-app projection comparisons.

### 7a. Age Penalty on Training Rate

Find two players with the same talent tier and roughly the same stat value. Project the same coach with the same sessions on each. If gains differ, the age penalty formula can be reverse-engineered.

| Player | Age | Talent | Stat | Stat value | Sessions | Projected gain | Notes |
|---|---|---|---|---|---|---|---|
| | | | | | | | |
| | | | | | | | |
| | | | | | | | |

Observed penalty (gain difference between oldest and youngest): ___

### 7b. XP Cost Curve Above Stat 100

Project gains for the same stat at different base values. Identifies where the cost curve steepens.

| Player | Stat | Stat value | Sessions | Projected gain | Notes |
|---|---|---|---|---|---|
| | | < 100 | | | |
| | | 100–130 | | | |
| | | 130–160 | | | |
| | | 160–179 | | | |
| | | ≥ 180 | | LOCKED expected | |

### 7c. Talent Tier Multipliers

Same player role, same stat, same stat value — vary only talent tier.

| Player | Talent | Stat | Stat value | Sessions | Projected gain |
|---|---|---|---|---|---|
| | Fastest | | | | |
| | Fast | | | | |
| | Average | | | | |
| | Normal | | | | |
| | Slow | | | | |

Observed ratios vs Normal (Normal = ×1.0): Fastest ___ · Fast ___ · Average ___  · Slow ___

### 7d. Extensive Coach — Stat Count Beyond 5

| Image | Total highlighted stats in screenshot | Total shown in COACH BOOSTS | All accounted for | Notes |
|---|---|---|---|---|
| | | | Y / N | |
| | | | Y / N | |

---

## 8. UNEXPECTED BEHAVIOUR LOG

One row per issue observed. Screenshot reference required for any scan-related issue.

| # | Tab / Screen | Action taken | Expected | Actual | Image | Player | Coach |
|---|---|---|---|---|---|---|---|
| 01 | | | | | | | |
| 02 | | | | | | | |
| 03 | | | | | | | |
| 04 | | | | | | | |
| 05 | | | | | | | |

---

## 9. SESSION CLOSE

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Sanity checklist re-run (section 1) | | | |
| No new crashes introduced | | | |
| DB intact after all operations | | | |
| Overall coach scan chain: working | | | |
| Overall projection: working | | | |

**Summary — items to feed back for next sprint:**

1.
2.
3.
4.
5.
