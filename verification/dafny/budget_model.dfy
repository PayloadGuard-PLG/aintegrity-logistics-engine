// verification/dafny/budget_model.dfy
//
// Machine-checked proofs of the geometric session budget model.
// Corresponds to P1–P4 from the verification spec.
//
// Budget formula (from engineMath.ts :: coachBudgetPerStat):
//   effectiveSessions = (1 - decay^N) / (1 - decay)   when 0 < decay < 1, N > 0
//   budget = effectiveSessions × baseXps / numStats
//
// EffSessions is defined here as the equivalent geometric sum Σ_{k=0}^{N-1} decay^k.
// The two forms are mathematically identical; the recursive form avoids symbolic
// division, which Z3's quantifier-free nonlinear real arithmetic cannot discharge.
//
// Tool:   Dafny 4.x — discharges VCs via Boogie + Z3
// Verify: dafny verify verification/dafny/budget_model.dfy
//
// Citation: K.R.M. Leino. Dafny: An Automatic Program Verifier for Functional
//           Correctness. LPAR-16, LNCS 6355, pp. 348–370. Springer, 2010.

// ── Real-valued power (decay^n) ───────────────────────────────────────────────

ghost function RealPow(base: real, n: nat): real
    decreases n
{
    if n == 0 then 1.0 else base * RealPow(base, n - 1)
}

// Lemma: RealPow(base, n) > 0 when base > 0
lemma RealPowPositive(base: real, n: nat)
    requires base > 0.0
    ensures  RealPow(base, n) > 0.0
    decreases n
{
    if n > 0 { RealPowPositive(base, n - 1); }
}

// Lemma: 0 < base < 1 → 0 < base^n < 1  (for n ≥ 1)
lemma RealPowInUnit(base: real, n: nat)
    requires 0.0 < base < 1.0
    requires n >= 1
    ensures  0.0 < RealPow(base, n) < 1.0
    decreases n
{
    if n == 1 {
        assert RealPow(base, 1) == base * RealPow(base, 0);
        assert RealPow(base, 0) == 1.0;
    } else {
        RealPowInUnit(base, n - 1);
        var prev := RealPow(base, n - 1);
        assert RealPow(base, n) == base * prev;
    }
}

// Lemma: 0 < base < 1 → base^(n+1) < base^n  (strictly decreasing)
lemma RealPowDecreasing(base: real, n: nat)
    requires 0.0 < base < 1.0
    ensures  RealPow(base, n + 1) < RealPow(base, n)
{
    RealPowPositive(base, n);
    assert RealPow(base, n + 1) == base * RealPow(base, n);
}

// ── Effective sessions ─────────────────────────────────────────────────────────
// Geometric sum: Σ_{k=0}^{n-1} decay^k  (= (1 - decay^n) / (1 - decay))
// Defined recursively to avoid symbolic division in proofs.

ghost function EffSessions(decay: real, n: nat): real
    requires 0.0 < decay < 1.0
    decreases n
{
    if n == 0 then 0.0
    else RealPow(decay, n - 1) + EffSessions(decay, n - 1)
}

// ── P4: sessions = 0 → effectiveSessions = 0 → budget = 0 ─────────────────────
lemma P4_ZeroSessionsZeroBudget(decay: real)
    requires 0.0 < decay < 1.0
    ensures  EffSessions(decay, 0) == 0.0
{ }

// ── P1: sessions ≥ 1 → effectiveSessions > 0 → budget > 0 ─────────────────────
lemma P1_PositiveBudget(decay: real, n: nat)
    requires 0.0 < decay < 1.0
    requires n >= 1
    ensures  EffSessions(decay, n) > 0.0
{
    RealPowPositive(decay, n - 1);
    if n > 1 { P1_PositiveBudget(decay, n - 1); }
}

// ── P2: sessions₁ > sessions₂ → effectiveSessions₁ > effectiveSessions₂ ────────
// (Monotonicity — more sessions = strictly more effective sessions = more budget)
lemma P2_Monotone(decay: real, n1: nat, n2: nat)
    requires 0.0 < decay < 1.0
    requires n1 > n2
    ensures  EffSessions(decay, n1) > EffSessions(decay, n2)
    decreases n1 - n2
{
    if n2 == 0 {
        P1_PositiveBudget(decay, n1);
        P4_ZeroSessionsZeroBudget(decay);
    } else {
        if n1 == n2 + 1 {
            P2_OneStep(decay, n2);
        } else {
            P2_Monotone(decay, n1 - 1, n2);
            P2_OneStep(decay, n1 - 1);
        }
    }
}

// EffSessions(n+1) = RealPow(decay,n) + EffSessions(n) > EffSessions(n)
// since RealPow(decay,n) > 0 (decay > 0).
lemma P2_OneStep(decay: real, n: nat)
    requires 0.0 < decay < 1.0
    ensures  EffSessions(decay, n + 1) > EffSessions(decay, n)
{
    RealPowPositive(decay, n);
}

// Edge case: one step from 0
lemma P2_OneStepFromZero(decay: real)
    requires 0.0 < decay < 1.0
    ensures  EffSessions(decay, 1) > EffSessions(decay, 0)
{
    P2_OneStep(decay, 0);
}

// ── P3: effectiveSessions ≤ sessions (geometric ≤ linear) ─────────────────────
lemma P3_GeomLeqLinear(decay: real, n: nat)
    requires 0.0 < decay < 1.0
    ensures  EffSessions(decay, n) <= n as real
    decreases n
{
    if n == 0 {
        // EffSessions(decay, 0) == 0.0 == 0 as real
    } else {
        P3_GeomLeqLinear(decay, n - 1);
        // EffSessions(n) = RealPow(decay, n-1) + EffSessions(n-1)
        //   <= 1.0 + (n-1 as real) = n as real
        // Need: RealPow(decay, n-1) <= 1.0
        if n == 1 {
            assert RealPow(decay, 0) == 1.0;
        } else {
            RealPowInUnit(decay, n - 1);
        }
    }
}

// Identity: EffSessions(n+1) = EffSessions(n) + decay^n
// Trivially true from the recursive definition (addition is commutative).
lemma P3_StepIdentity(decay: real, n: nat)
    requires 0.0 < decay < 1.0
    ensures  EffSessions(decay, n + 1) == EffSessions(decay, n) + RealPow(decay, n)
{ }
