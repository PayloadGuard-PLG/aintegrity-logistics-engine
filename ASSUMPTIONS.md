Assumption is the mother of all fuck ups, and every fuck up costs Steve money in credits and rewrites.

Stop doing it Claude. Ask him. Don't guess.

Fletcher — *"Good enough!.... Not my Tempo!!"*

---

## IP and Naming

Never reference the source application, its developer, or any of its branded terms — in code, comments, commit messages, or documentation. Steve provides numbers to validate math. That is all. The codebase uses its own vocabulary (see CLAUDE.md). When in doubt about a term, check CLAUDE.md or ask.

This applies to **comments** too. Do not add source-game drill names, item names, or feature names as code comments alongside their renamed equivalents. Comments like `// Shooting Technique` above a `Target Practice` entry are IP leakage. Write comments that describe behaviour, not origin.

---

## Git Discipline

Every sprint ends with a docs commit. No exceptions.

1. Docs commit (DEVLOG + CLAUDE.md + all other docs) goes to **dev branch first**.
2. Then push docs to **main** as well — both branches stay identical at end of session.
3. **Both branches must be identical at the end of every session.** If the session drops or the branch diverges, main is the fallback recovery point.
4. **Never push code to main directly.** main receives merges (or cherry-picks) from the dev branch only. Pushing code directly to main triggers a live EAS OTA field update — changes go straight to production devices.
5. **Dev branch:** `claude/test-connection-I2s8B`. All development work goes here.
6. **Docs scope:** DEVLOG.md · CLAUDE.md · HANDOVER.md · README.md · WHITEPAPER.md · FORMULAS.md · KNOWN_ISSUES.md · ASSUMPTIONS.md — all must be updated to reflect the current sprint before session close.
7. Two device console sessions for development: the hot-reload server on one, git on the other. Pull in the git session — the bundler picks up file changes and reloads without restart.
8. **PR title max 256 characters.** GitHub hard-limits PR titles to 256 chars. Keep titles concise — one short phrase covering the sprint theme. Put detail in the PR body, not the title.

## Role Constraints

When adding or correcting white/grey stat assignments, always verify against the game card screenshot:

- "Key attributes for this player are highlighted" — highlighted stats = white (essential)
- Every role has exactly 15 stats total (essential + secondary = 15)
- Multi-role players use the **union** of all roles' essential lists for white stats
- After changing `ROLE_CONSTRAINTS` in `roleWeights.ts`, update `FORMULAS.md` and `HANDOVER.md` role tables and `CLAUDE.md` Role-Based Stat Whiteness section

## Calibration

When Steve provides before/after stats from a game session:

1. **Do not guess** the effective values — back-calculate from actual data
2. For `drillXpFactor`: needs a controlled drill-only run (no tier, no coach) with known cycles and all 15 stats recorded before and after
3. For `baseXpPerSession`: current value is **676** (in `profiles/game_2025.json`). Do not change without empirical evidence — back-calculated from Grant ×40 Standard Defending with all 5 stats within game range.
4. For talent multipliers: Normal (×1.0) confirmed for Grant, Rogers, McGinty; Slow (×0.47) **INVALIDATED Sprint 34** — derived from linear budget, geometric budget shows LJDark Leo is consistent with Normal; no confirmed Slow data point; Fastest/Fast/Average still community estimates — do not cite any of these as confirmed

## Sprint 34 Open Questions

1. **drillXpFactor** — `0.3` is provisional. Before relying on drill projections in Results, run a controlled drill-only session (no tier, no coach) and record before/after stats to back-calculate the true value.
2. **Garry McCluskey talent** — assumed Normal in seeds and projections. Creativity underprediction (+5.8 engine vs +7–10 actual) suggests Fast (×1.25) may be correct. Confirm from Personal Trainer tab on the edit screen (explicit Fastest/Fast/Average/Normal/Slow label — NOT the Playstyle icon).
3. **King Alfie talent** — Unknown. Confirm from edit screen Personal Trainer tab.
4. **Fastest/Fast talent** — still community estimates (×1.5/×1.25). Once a confirmed Fast player is identified, back-calculate from a clean white-stat coach observation under the geometric budget model.
5. **Training Camp budget formula** — observe which stats show gain arrows across multiple Training Camp scans. Is it always 3-of-5, or variable?
6. **Slow talent — no confirmed data point** — Slow (0.47) is **invalidated**. It was derived from LJDark Leo ×114 using the linear budget. With geometric budget, LJDark Leo's result is consistent with Normal (1.0). LJDark Leo's actual talent is unknown — check Personal Trainer tab. Once a confirmed-Slow player is identified, run an Extensive coach scan with game ranges visible and back-calculate under the geometric formula.
7. **Brandon Prentice Reward Coach ×4** — engine projects +15.4 MARKING / +15.1 POSITIONING / +11.6 AGGRESSION. Compare vs actual game result to validate ageMult=0.85 for age 22.
8. **ageMult=0.72 bracket (age 25)** — age 24 confirmed from Garry McCluskey. Age 25 shares the bracket (assumed, not yet validated from a separate 25-year-old data point).
