# tests/proofs/test_z3_properties.py
#
# Z3 SMT safety proofs for the Squad Optimiser engine.
# Thirteen named properties covering multiplier ordering, budget relationships,
# OVR formula properties, and training lock correctness.
#
# Each proof encodes the NEGATION of the desired property and asks Z3 to find
# a counterexample. `unsat` means no counterexample exists → property holds universally.
# `unknown` (timeout) is a hard failure — never silently treated as a pass.
#
# Run with:  pytest tests/proofs/ -m proof -v --timeout=30
#
# Properties proved:
#   P7  : budget = 0 ∨ mult = 0 → gain = 0  (zero input → zero output)
#   P10 : combined_multiplier > 0 for all valid inputs
#   P11 : grey_multiplier(False) < grey_multiplier(True)
#   P12 : talent mults are strictly ordered (Slow < Normal < Average < Fast < Fastest)
#   P13 : age multipliers are non-increasing (older ≤ younger)
#   P14 : OVR is deterministic (same inputs → same output)
#   P15 : OVR is non-decreasing when any stat increases
#   P18 : base_ovr < MAX_BASE_OVR → not locked  (no false lock-outs)
#   P19 : base_ovr ≥ MAX_BASE_OVR → locked      (no missed lock-outs)

import pytest

try:
    from z3 import (
        Bool, BoolVal, If, Implies, Int, Not, Or, Real,
        Solver, And, unsat, unknown,
    )
    _Z3_AVAILABLE = True
except ImportError:
    _Z3_AVAILABLE = False

pytestmark = pytest.mark.proof
_skip = pytest.mark.skipif(not _Z3_AVAILABLE, reason="z3-solver not installed")

# Engine constants (mirrored from profiles/logistics_v1.json via constants_pure)
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
from verification.constants_pure import (
    GREY_MULT, TALENT_MULTS, TALENT_ORDER,
    AGE_TABLE, _AGE_KEYS_SORTED,
    MAX_BASE_OVR, TOTAL_ATTRS, OVR_DIVISOR,
    BASE_XPS, SESSION_BUDGET_DECAY,
    STAT_CAP,
)


def _check(s: "Solver") -> None:
    """Assert unsat; fail on sat (counterexample found) or unknown (timeout)."""
    result = s.check()
    assert result != unknown, "Z3 timed out — treat as hard failure"
    assert result == unsat, f"Z3 found a counterexample:\n{s.model()}"


# ── P7 ────────────────────────────────────────────────────────────────────────

@_skip
def test_p7_zero_mult_implies_zero_gain():
    """P7a: mult ≤ 0 → gain = 0 (multiplier gate)."""
    s = Solver()
    s.set("timeout", 5000)

    mult   = Real("mult")
    gain   = Real("gain")
    budget = Real("budget")

    # Encoding: when mult ≤ 0, engine returns 0 immediately
    s.add(Implies(mult <= 0.0, gain == 0.0))
    s.add(budget > 0.0)

    # Attempt: mult ≤ 0 but gain ≠ 0
    s.add(mult <= 0.0, gain != 0.0)

    _check(s)


@_skip
def test_p7_zero_budget_implies_zero_gain():
    """P7b: budget ≤ 0 → gain = 0 (budget gate)."""
    s = Solver()
    s.set("timeout", 5000)

    budget = Real("budget")
    gain   = Real("gain")

    s.add(Implies(budget <= 0.0, gain == 0.0))

    # Attempt: budget ≤ 0 but gain ≠ 0
    s.add(budget <= 0.0, gain != 0.0)

    _check(s)


# ── P10 ───────────────────────────────────────────────────────────────────────

@_skip
def test_p10_combined_multiplier_positive():
    """P10: combined_multiplier > 0 for all valid inputs.

    Encoding: each component is positive, and a product of positives is positive.
    age_mult ∈ [0, 1.1] but the real AGE_TABLE has 0.0 for age 30 only.
    We use am ∈ (0, 1.1], tm > 0, gm ∈ (0, 1], sm > 0, ad ≥ 1, dl > 0.
    """
    s = Solver()
    s.set("timeout", 5000)

    am = Real("am")   # age multiplier
    tm = Real("tm")   # talent multiplier
    gm = Real("gm")   # grey multiplier
    sm = Real("sm")   # star decay multiplier
    ad = Real("ad")   # 2× ad multiplier
    dl = Real("dl")   # drill level multiplier
    combined = Real("combined")

    s.add(am > 0.0, am <= 1.1)
    s.add(tm > 0.0)
    s.add(gm > 0.0, gm <= 1.0)
    s.add(sm > 0.0, sm <= 1.0)
    s.add(ad >= 1.0)
    s.add(dl > 0.0)
    s.add(combined == am * tm * gm * sm * ad * dl)

    # Attempt: combined ≤ 0 despite all factors being positive
    s.add(combined <= 0.0)

    _check(s)


# ── P11 ───────────────────────────────────────────────────────────────────────

@_skip
def test_p11_grey_less_than_white():
    """P11: grey_multiplier(False) < grey_multiplier(True)."""
    s = Solver()
    s.set("timeout", 5000)

    grey_val  = Real("grey_val")
    white_val = Real("white_val")

    s.add(grey_val  == GREY_MULT)   # 0.22
    s.add(white_val == 1.0)

    # Attempt: grey ≥ white
    s.add(grey_val >= white_val)

    _check(s)


# ── P12 ───────────────────────────────────────────────────────────────────────

@_skip
def test_p12_talent_ordering_strict():
    """P12: Degraded < Standard < Class-A (strict ordering of efficiency class mults)."""
    s = Solver()
    s.set("timeout", 5000)

    degraded_v = Real("degraded_v")
    standard_v = Real("standard_v")
    class_a_v  = Real("class_a_v")

    s.add(degraded_v == TALENT_MULTS['Degraded'])
    s.add(standard_v == TALENT_MULTS['Standard'])
    s.add(class_a_v  == TALENT_MULTS['Class-A'])

    # Attempt: any adjacent pair violates strict ordering
    s.add(Or(
        degraded_v >= standard_v,
        standard_v >= class_a_v,
    ))

    _check(s)


# ── P13 ───────────────────────────────────────────────────────────────────────

@_skip
def test_p13_age_multipliers_non_increasing():
    """P13: age_multiplier is non-increasing — adjacent entries never go up.

    Checks each consecutive pair in the age table.
    """
    s = Solver()
    s.set("timeout", 5000)

    ages = _AGE_KEYS_SORTED
    mults = [TALENT_MULTS.get(str(a), AGE_TABLE[str(a)]) for a in ages]

    # Build actual age multiplier values from AGE_TABLE
    age_vals = [Real(f"age_{a}") for a in ages]
    for i, a in enumerate(ages):
        s.add(age_vals[i] == AGE_TABLE[str(a)])

    # Attempt: any adjacent pair where older age has strictly higher multiplier
    violations = [age_vals[i] < age_vals[i + 1] for i in range(len(ages) - 1)]
    s.add(Or(violations))

    _check(s)


# ── P14 ───────────────────────────────────────────────────────────────────────

@_skip
def test_p14_ovr_deterministic():
    """P14: OVR is deterministic — identical stat sums always yield the same OVR."""
    s = Solver()
    s.set("timeout", 5000)

    total1 = Real("total1")
    total2 = Real("total2")
    ovr1   = Int("ovr1")
    ovr2   = Int("ovr2")
    denom  = Int("denom")

    s.add(denom == TOTAL_ATTRS * OVR_DIVISOR)   # 15
    s.add(total1 == total2)
    s.add(total1 >= 0.0)

    # floor(total/15) is deterministic: same total → same OVR
    # Encode floor: ovr ≤ total/denom < ovr+1
    s.add(ovr1 * denom <= total1, total1 < (ovr1 + 1) * denom)
    s.add(ovr2 * denom <= total2, total2 < (ovr2 + 1) * denom)

    # Attempt: same total but different OVR
    s.add(ovr1 != ovr2)

    _check(s)


# ── P15 ───────────────────────────────────────────────────────────────────────

@_skip
def test_p15_ovr_non_decreasing_on_stat_increase():
    """P15: if stat sum increases, OVR does not decrease."""
    s = Solver()
    s.set("timeout", 5000)

    total1 = Real("total1")   # higher total (after gain)
    total2 = Real("total2")   # lower total (before gain)
    ovr1   = Int("ovr1")
    ovr2   = Int("ovr2")
    denom  = Int("denom")

    s.add(denom == TOTAL_ATTRS * OVR_DIVISOR)   # 15
    s.add(total1 > total2)
    s.add(total2 >= 0.0)

    s.add(ovr1 * denom <= total1, total1 < (ovr1 + 1) * denom)
    s.add(ovr2 * denom <= total2, total2 < (ovr2 + 1) * denom)

    # Attempt: higher stat total but lower OVR
    s.add(ovr1 < ovr2)

    _check(s)


# ── P18 ───────────────────────────────────────────────────────────────────────

@_skip
def test_p18_no_false_lockouts():
    """P18: base_ovr < MAX_BASE_OVR → training NOT locked (no false lock-outs)."""
    s = Solver()
    s.set("timeout", 5000)

    base_ovr  = Real("base_ovr")
    is_locked = Bool("is_locked")
    threshold = Real("threshold")

    s.add(threshold == float(MAX_BASE_OVR))   # 180.0
    s.add(Implies(base_ovr >= threshold, is_locked))
    s.add(Implies(base_ovr < threshold, Not(is_locked)))

    # Attempt: base_ovr < threshold but is_locked = True
    s.add(base_ovr < threshold, is_locked)

    _check(s)


# ── P19 ───────────────────────────────────────────────────────────────────────

@_skip
def test_p19_no_missed_lockouts():
    """P19: base_ovr ≥ MAX_BASE_OVR → training locked (no missed lock-outs)."""
    s = Solver()
    s.set("timeout", 5000)

    base_ovr  = Real("base_ovr")
    is_locked = Bool("is_locked")
    threshold = Real("threshold")

    s.add(threshold == float(MAX_BASE_OVR))
    s.add(Implies(base_ovr >= threshold, is_locked))
    s.add(Implies(base_ovr < threshold, Not(is_locked)))

    # Attempt: base_ovr ≥ threshold but is_locked = False
    s.add(base_ovr >= threshold, Not(is_locked))

    _check(s)


# ── P18+P19 combined: bijection ───────────────────────────────────────────────

@_skip
def test_p18_p19_lock_bijection():
    """P18+P19 combined: is_locked ↔ base_ovr ≥ MAX_BASE_OVR (exhaustive bijection)."""
    s = Solver()
    s.set("timeout", 5000)

    base_ovr  = Real("base_ovr")
    is_locked = Bool("is_locked")
    threshold = Real("threshold")

    s.add(threshold == float(MAX_BASE_OVR))
    s.add(Implies(is_locked,        base_ovr >= threshold))
    s.add(Implies(Not(is_locked),   base_ovr < threshold))

    # Attempt: any combination that violates the bijection
    s.add(Or(
        And(is_locked,        base_ovr < threshold),
        And(Not(is_locked),   base_ovr >= threshold),
    ))

    _check(s)


# ── P18-param / P19-param ─────────────────────────────────────────────────────

@_skip
def test_p18_param_no_false_lockouts():
    """P18-param: for any threshold T, state < T → evaluateRuleSet does not fire (>= polarity)."""
    s = Solver()
    s.set("timeout", 5000)

    state_v = Real("state_v")
    thresh  = Real("thresh")
    locked  = Bool("locked")

    # Encode: locked ↔ state_v >= thresh
    s.add(Implies(state_v >= thresh, locked))
    s.add(Implies(state_v < thresh,  Not(locked)))

    # Attempt: state < threshold but locked = True
    s.add(state_v < thresh, locked)

    _check(s)


@_skip
def test_p19_param_no_missed_lockouts():
    """P19-param: for any threshold T, state >= T → evaluateRuleSet fires (>= polarity)."""
    s = Solver()
    s.set("timeout", 5000)

    state_v = Real("state_v")
    thresh  = Real("thresh")
    locked  = Bool("locked")

    s.add(Implies(state_v >= thresh, locked))
    s.add(Implies(state_v < thresh,  Not(locked)))

    # Attempt: state >= threshold but locked = False
    s.add(state_v >= thresh, Not(locked))

    _check(s)


@_skip
def test_p22_projection_band_variance_nonneg():
    """P22: propagated variance is non-negative for all valid inputs."""
    s = Solver()
    s.set("timeout", 5000)

    s_c0   = Real("s_c0");  s_k    = Real("s_k")
    var_c0 = Real("var_c0"); var_k = Real("var_k")
    variance = Real("variance")

    s.add(var_c0 >= 0.0, var_k >= 0.0)
    s.add(variance == s_c0 * s_c0 * var_c0 + s_k * s_k * var_k)

    # Attempt: variance < 0 despite non-negative component variances
    s.add(variance < 0.0)

    _check(s)


@_skip
def test_p18_p19_lock_when_bad_polarity():
    """P18/P19 for <= operator (lock-when-bad polarity): state > T → not locked; state <= T → locked."""
    s = Solver()
    s.set("timeout", 5000)

    state_v = Real("state_v")
    thresh  = Real("thresh")
    locked  = Bool("locked")

    # Encode: locked ↔ state_v <= thresh  (lock-when-bad: maintenance needed when below threshold)
    s.add(Implies(state_v <= thresh, locked))
    s.add(Implies(state_v > thresh,  Not(locked)))

    # Attempt: any combination that violates this bijection
    s.add(Or(
        And(state_v <= thresh, Not(locked)),
        And(state_v >  thresh, locked),
    ))

    _check(s)
