Technical Instruction Report: Resolving the Coach Budget Geometric Decay Bug


1. Bug Analysis and Mathematical Root Cause


Identify the "×N Anomaly"


During Sprint 34, forensic analysis of coaching session data revealed a critical breakdown in the linear XP scaling model. At high multipliers (×20, ×40, and ×114), the in-game stat gains plateau significantly. The legacy engine assumed a linear relationship (N \times baseXpPerSession), leading to aggressive over-projections for extensive coaching sessions. This "×N Anomaly" resulted in projection errors as high as +9 OVR for elite players.


Model Comparison: Linear vs. Geometric


The following comparison uses the Lewis MacGregor ×114 Extensive GK benchmark (Initial State: 145 OVR) to validate the shift to a decay-based budget.


Metric        Obsolete Linear Model        Validated Geometric Decay Model
Budget Logic        N \times baseXpPerSession        \sum Geometric Series (0.99 Decay)
MacGregor Projection        182 OVR        172 OVR
Actual Game Result        173 OVR        173 OVR
Error Margin        +9 OVR        -1 OVR
Status        DEPRECATED        CONFIRMED (Sprint 34)


The Geometric Formula


Effective session counts must now account for the 0.99 diminishing return constant. Calculate effectiveSessions using the following formula:


effectiveSessions = \frac{1 - 0.99^N}{1 - 0.99}


Where:


* N: Raw number of sessions (e.g., 114).
* 0.99: The confirmed sessionBudgetDecay constant.


2. Configuration Updates (profiles/game_2025.json)


Execute the following updates to the game profile. Note that K=55 is now obsolete; the engine requires K=47 to minimize the Coefficient of Variation (CV) across observed data points.


{
  "xpCostBase": 2.94,
  "xpCostDecayK": 47,
  "baseXpPerSession": 676,
  "sessionBudgetDecay": 0.99,
  "greyWeightMultiplier": 0.22,
  "starDecayPerSession": 0.85
}




Calibration Constraints:


* baseXpPerSession (bXPS): Must remain at 676. This is the anchor value for the geometric model.
* xpCostDecayK (K): Mandatory at 47. This value was re-fitted via a calibration solver to match Ricky Grant's 5-stat Standard Defending observations.


3. Logic Implementation Instructions


Update Engine Math (src/engine/engineMath.ts)


Modify the coachBudgetPerStat function. You must replace the linear sessions * baseXpPerSession logic with the geometric series sum for effectiveSessions.


Mandatory OVR Calculation: In qualityPctToOvr, enforce the use of Math.floor. Earlier sprint assumptions regarding Math.ceil were proven incorrect by the Grant T2→T3 integer-increment test. Using Math.floor is critical to preventing OVR +1 discrepancies in the UI.


Interface Definitions (src/types/resources.ts)


Update the GameProfile interface to include the optional sessionBudgetDecay: number property to support the new JSON configuration.


Deprecate and Cleanup


* Remove Scan-Ranges Bypass: Delete the (lo+hi)/2 averaging logic in app/(tabs)/coaches.tsx. This was a temporary shim used to mask mathematical inaccuracies. The engine must now rely purely on the geometric formula.
* Training Camp Sentinel: Implement a check for "TRAINING CAMP" text in the scanner. Since Training Camp uses an unconfirmed, subset-based budget, the engine must decline the projection and show a UI warning instead.


4. Termux Development Workflow


Maintain environmental stability by utilizing the "Two-Device Console" protocol:


1. Session 1 (Metro Bundler): Dedicated exclusively to running the Metro bundler.
2. Session 2 (Git/Ops): Used for git pull and file management.
3. Hot-Reload Protocol: The bundler will automatically detect file changes delivered via git pull in Session 2. Do not restart the app unless native dependencies are modified.


5. Safe Git & Deployment Protocol (Anti-OTA Measures)


EAS OTA Warning


Strict Restriction: Do not push code to the main branch. Any push to main triggers an immediate EAS Over-the-Air update, deploying unvalidated logic to production devices.


Branching and Documentation


* Target Branch: All code changes must be pushed to claude/test-connection-I2s8B.
* IP Leakage Prevention: You must scrub all code, comments, and documentation of source-game branded terms (e.g., do not use "Greens" or "Skill Drill"). Use generic vocabulary: "restorers," "Touch Training," etc.
* Session Close-Out: Both dev and main branches must have identical documentation at the end of every session. Update and commit the following 8 files to the dev branch before merging:
  1. DEVLOG.md
  2. CLAUDE.md
  3. HANDOVER.md
  4. README.md
  5. WHITEPAPER.md
  6. FORMULAS.md
  7. KNOWN_ISSUES.md
  8. ASSUMPTIONS.md
* Commit Discipline: PR titles are hard-limited to 256 characters by GitHub. Keep titles concise and move technical specifics to the PR body.


6. Post-Fix Validation and Calibration


Test Case - Lewis MacGregor


Verify the engine with the Extensive GK ×114 data point:


* Input: 145 OVR (T0 baseline).
* Requirement: The engine must project a gain resulting in 173 OVR (±1).


Secondary Validation: ×N Scaling


Execute Test 6 from the CALIBRATION_COLLECTION.md. Run back-to-back sessions (e.g., ×4 then ×20) on the same stat. Projection must show a 0.99 decay curve plateau rather than linear doubling.


Talent Tier Alert: Slow Talent


The Slow (0.47) multiplier is officially Invalidated. This value was an artifact of the linear model.


* Protocol: Treat all "Slow" projections as Unconfirmed.
* Verification: Only confirm "Slow" talent by checking the Personal Trainer tab in the in-game edit screen (ignore Playstyle icons). A new multiplier must be back-calculated only once a confirmed Slow player data point is available.