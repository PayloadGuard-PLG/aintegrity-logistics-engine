# AIntegrity Squad Optimiser — UI Design Reference

This file documents visual/aesthetic decisions and which files own them.
Its purpose is to let you safely tweak the look of any screen without accidentally
touching logic, math, or data files.

---

## Safe-to-edit: visual-only files

The files below contain **no math, no formulas, no game constants**.
Changing them cannot break OVR projection, drill calculations, or scanner output.

| File | What it owns |
|---|---|
| `src/constants/theme.ts` | All colours, font families, surface levels |
| `src/components/atoms/MonoLabel.tsx` | Monospace label atom (size, weight, spacing) |
| `src/components/atoms/Chip.tsx` | Pill/chip button appearance |
| `src/components/atoms/OvrMovement.tsx` | OVR from→to display block |
| `src/components/AppHeader.tsx` | Top header bar layout |

---

## Colour palette (`src/constants/theme.ts`)

```
bg        #000000    page background
surface   #0a0a0c    card background
surface2  #111114    card header background
surface3  #16171c    input background

hairline  rgba(255,255,255,0.10)   subtle divider
hairline2 rgba(255,255,255,0.22)   card border
hairline3 rgba(255,255,255,0.38)   prominent border

ink       #f4f4f5    primary text
inkSec    #c8c8d2    secondary text
inkMuted  #909099    de-emphasised text
inkGhost  #52525c    placeholder / ghost text

steelLight #9eb0d4   accent blue — drills, headers, links
hot        #e8b466   amber — warnings, tier, toggles ON
pos        #7eb89a   green — positive delta, affordable
neg        #c4756a   red — negative delta, errors
```

### Drill-type colour coding

Used in Plan tab (SESSIONS card left-bar, SAVED PRESETS tags) and Drills tab chips.
Implemented in `drillTypeColor()` helper inside `app/(tabs)/plan.tsx` and `app/(tabs)/drills.tsx`.

| Drill type | Colour | Hex |
|---|---|---|
| Attack | `theme.steelLight` | `#9eb0d4` |
| Defence | — | `#86c5d6` |
| Possession | — | `#a78bfa` |
| Physical | `theme.hot` | `#e8b466` |

### Tier colours (`TIER_COLORS` in `theme.ts`)

| Tier | Hex |
|---|---|
| T0 (None) | `#6b7280` grey |
| T1 (Rare) | `#60a5fa` blue |
| T2 (Elite) | `#34d399` green |
| T3 (Stellar) | `#22d3ee` cyan |
| T4 (Master) | `#a78bfa` purple |
| T5 (Epic) | `#fb923c` orange |
| T6 (Legendary) | `#fbbf24` gold |

---

## Card anatomy (shared pattern)

Every card in the app follows this visual structure:

```
┌── card border (hairline2) ─────────────────────────────┐
│ ▌ CARD TITLE         (surface2 header, MonoLabel)       │
├─────────────────────────────────────────────────────────┤
│  body content                                           │
│  ...                                                    │
│  [optional footer: ADD / LOAD / APPLY button]           │
└─────────────────────────────────────────────────────────┘
```

The **left colour bar** in the header (3 × 12 px `View`) communicates category:
- `theme.steelLight` — informational / drill / neutral
- `theme.hot`        — tier upgrade / premium toggle active
- `theme.pos`        — restorer / positive resource

---

## Per-screen aesthetic owners

### `app/(tabs)/plan.tsx`

Layout: ScrollView with section tab-bar (DRILLS / RESOURCES / TIER / TEAM PLAY).

**Visual-only items you can change freely:**
- Padding values on any card, row, or button
- Font sizes inside any card
- The `letterSpacing` and `fontWeight` on MonoLabel/Text nodes
- The card left-bar colour mapping
- The coloured indicator bar width/height in the SESSIONS drill rows (`width: 3, height: 14`)
- Section tab-bar height and text sizing
- OVR MOVEMENT block layout (the `from → to` display at the top)

**Do NOT change:**
- `drillRows` state structure (`DrillSession[]`) — used by `planPlayerInvestment()`
- `project()` function body — calls `planPlayerInvestment()` and `computeOvrFromStats()`
- `fixtureWindow` / `restorersBridge` / `teamPlayPlan` `useMemo` bodies
- The `drillPresetService.getAll()` / `.delete()` calls
- `useFocusEffect` hook (reloads presets on focus)

### `app/(tabs)/drills.tsx`

Drill browser and preset creator.

**Visual-only items you can change freely:**
- Drill card row padding/spacing
- Intensity badge styling
- Preset name input appearance
- Save button layout

**Do NOT change:**
- `drillPresetService.save()` call
- The `DRILL_LIST` data source
- Intensity filter logic

### `app/(tabs)/squad.tsx`

Squad list and player card display.

**Visual-only items you can change freely:**
- Player card row height, padding
- Role badge colours (as long as you keep the same `role` string labels)
- OVR font size in the list

**Do NOT change:**
- `computeOvrFromStats()` call
- `normaliseTier()` call
- Any property access on `Player` objects

### `app/player/new.tsx` and `app/player/[id].tsx`

Add Player / Edit Player screens.

**Visual-only items you can change freely:**
- `ROLE_GRID` cell sizing and gap
- Stat input row height/padding
- Role selection chip appearance
- Camera button layout

**Do NOT change:**
- `ROLE_GRID` array structure (adding/removing roles would affect `validateRoleAdjacency`)
- `isWhiteStat()` call for white vs grey colouring — the logic must stay tied to `roleWeights.ts`
- `playerService.save()` / `playerService.update()` calls
- The GK auto-inference block (detects REFLEXES present + TACKLING absent)

---

## Logic files — do not edit for UI reasons

These files contain all the math. Editing them for cosmetic reasons is always wrong.

| File | What it computes |
|---|---|
| `src/logic/ovrProjector.ts` | OVR projection chain: drills → tier → restorers |
| `src/logic/xpEngine.ts` | Stat gain per session (XP formula) |
| `src/logic/customCoachEngine.ts` | `predictCustomDrill` — per-stat coaching gain prediction wired to real XP engine |
| `src/logic/fixtureEngine.ts` | Fixture cycles, team play plan, restorer bridge |
| `src/logic/investmentEngine.ts` | Top-level plan orchestration |
| `src/logic/coachScanner.ts` | OCR → coach stat extraction |
| `src/logic/playerScanner.ts` | OCR → player card extraction |
| `src/utils/roleWeights.ts` | White/grey stat classification per role |
| `src/utils/math.ts` | Tier addition, cost, OVR helpers |
| `profiles/game_2025.json` | All game constants (multipliers, decay, caps) |
| `src/database/drillDatabase.ts` | Drill list (name, stats trained, intensity, type) |

---

## Fonts

```typescript
theme.mono    // 'Courier New' on iOS, 'monospace' on Android
theme.display // 'System' on iOS, 'sans-serif' on Android
```

`mono` is used for all labels, badges, numbers, and status text.
`display` is used for player names, drill names, and descriptive prose.

To change font families: edit `theme.ts` only. Do not hardcode font strings in screen files.

---

## Adding a new colour token

1. Add the hex to `src/constants/theme.ts` `theme` object.
2. Reference it as `theme.myNewToken` everywhere — never hardcode hex strings in screen files.
3. Exception: drill-type colours (`#86c5d6`, `#a78bfa`) are used directly in `drillTypeColor()` helpers because they are not general-purpose tokens and don't belong in the shared palette.
