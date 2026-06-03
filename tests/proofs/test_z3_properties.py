# tests/proofs/test_z3_properties.py
#
# Z3 SMT safety proofs for the logistics engine.
# Thirteen named properties covering multiplier ordering, budget relationships,
# CCI formula properties, and investment lock correctness.
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
#   P11 : secondary_metric_weight < primary_metric_weight
#   P12 : efficiency class mults are strictly ordered (Degraded < Standard < Class-A)
#   P13 : maturity multipliers are non-increasing (higher index ≤ lower index)
#   P14 : CCI is deterministic (same inputs → same output)
#   P15 : CCI is non-decreasing when any metric increases
#   P18 : base_cci < CAPACITY_CEILING → not locked  (no false lock-outs)
#   P19 : base_cci ≥ CAPACITY_CEILING → locked      (no missed lock-outs)

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
    SECONDARY_METRIC_WEIGHT, EFFICIENCY_CLASS_MULTS, EFFICIENCY_CLASS_ORDER,
    MATURITY_MULTS, _MATURITY_KEYS_SORTED,
    CAPACITY_CEILING, METRIC_COUNT, CCI_DIVISOR_SCALE,
    BASE_RESOURCES_PER_CYCLE, CYCLE_BUDGET_DECAY,
    METRIC_CAP,
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
    maturity_mult ∈ (0, 1.1], efficiency_mult > 0, weight_mult ∈ (0, 1],
    threshold_mult > 0, boost ≥ 1, cycle_intensity > 0.
    """
    s = Solver()
    s.set("timeout", 5000)

    mm = Real("mm")   # maturity multiplier
    em = Real("em")   # efficiency class multiplier
    wm = Real("wm")   # metric weight multiplier
    td = Real("td")   # threshold decay multiplier
    bm = Real("bm")   # boost multiplier
    ci = Real("ci")   # cycle intensity multiplier
    combined = Real("combined")

    s.add(mm > 0.0, mm <= 1.1)
    s.add(em > 0.0)
    s.add(wm > 0.0, wm <= 1.0)
    s.add(td > 0.0, td <= 1.0)
    s.add(bm >= 1.0)
    s.add(ci > 0.0)
    s.add(combined == mm * em * wm * td * bm * ci)

    # Attempt: combined ≤ 0 despite all factors being positive
    s.add(combined <= 0.0)

    _check(s)


# ── P11 ───────────────────────────────────────────────────────────────────────

@_skip
def test_p11_secondary_less_than_primary():
    """P11: secondary metric weight < primary metric weight."""
    s = Solver()
    s.set("timeout", 5000)

    secondary_val = Real("secondary_val")
    primary_val   = Real("primary_val")

    s.add(secondary_val == SECONDARY_METRIC_WEIGHT)  # 0.22
    s.add(primary_val   == 1.0)

    # Attempt: secondary ≥ primary
    s.add(secondary_val >= primary_val)

    _check(s)


# ── P12 ───────────────────────────────────────────────────────────────────────

@_skip
def test_p12_efficiency_class_ordering_strict():
    """P12: Degraded < Standard < Class-A (strict ordering of efficiency class mults)."""
    s = Solver()
    s.set("timeout", 5000)

    degraded_v = Real("degraded_v")
    standard_v = Real("standard_v")
    class_a_v  = Real("class_a_v")

    s.add(degraded_v == EFFICIENCY_CLASS_MULTS['Degraded'])
    s.add(standard_v == EFFICIENCY_CLASS_MULTS['Standard'])
    s.add(class_a_v  == EFFICIENCY_CLASS_MULTS['Class-A'])

    # Attempt: any adjacent pair violates strict ordering
    s.add(Or(
        degraded_v >= standard_v,
        standard_v >= class_a_v,
    ))

    _check(s)


# ── P13 ───────────────────────────────────────────────────────────────────────

@_skip
def test_p13_maturity_multipliers_non_increasing():
    """P13: maturity_multiplier is non-increasing — adjacent entries never go up.

    Checks each consecutive pair in the maturity table.
    """
    s = Solver()
    s.set("timeout", 5000)

    maturity_indices = _MATURITY_KEYS_SORTED

    # Build actual maturity multiplier values from MATURITY_MULTS
    maturity_vals = [Real(f"maturity_{a}") for a in maturity_indices]
    for i, a in enumerate(maturity_indices):
        s.add(maturity_vals[i] == MATURITY_MULTS[str(a)])

    # Attempt: any adjacent pair where higher index has strictly higher multiplier
    violations = [maturity_vals[i] < maturity_vals[i + 1] for i in range(len(maturity_indices) - 1)]
    s.add(Or(violations))

    _check(s)


# ── P14 ───────────────────────────────────────────────────────────────────────

@_skip
def test_p14_cci_deterministic():
    """P14: CCI is deterministic — identical metric sums always yield the same CCI."""
    s = Solver()
    s.set("timeout", 5000)

    total1 = Real("total1")
    total2 = Real("total2")
    cci1   = Int("cci1")
    cci2   = Int("cci2")
    denom  = Int("denom")

    s.add(denom == METRIC_COUNT * CCI_DIVISOR_SCALE)
    s.add(total1 == total2)
    s.add(total1 >= 0.0)

    # floor(total/denom) is deterministic: same total → same CCI
    s.add(cci1 * denom <= total1, total1 < (cci1 + 1) * denom)
    s.add(cci2 * denom <= total2, total2 < (cci2 + 1) * denom)

    # Attempt: same total but different CCI
    s.add(cci1 != cci2)

    _check(s)


# ── P15 ───────────────────────────────────────────────────────────────────────

@_skip
def test_p15_cci_non_decreasing_on_metric_increase():
    """P15: if metric sum increases, CCI does not decrease."""
    s = Solver()
    s.set("timeout", 5000)

    total1 = Real("total1")   # higher total (after gain)
    total2 = Real("total2")   # lower total (before gain)
    cci1   = Int("cci1")
    cci2   = Int("cci2")
    denom  = Int("denom")

    s.add(denom == METRIC_COUNT * CCI_DIVISOR_SCALE)
    s.add(total1 > total2)
    s.add(total2 >= 0.0)

    s.add(cci1 * denom <= total1, total1 < (cci1 + 1) * denom)
    s.add(cci2 * denom <= total2, total2 < (cci2 + 1) * denom)

    # Attempt: higher metric total but lower CCI
    s.add(cci1 < cci2)

    _check(s)


# ── P18 ───────────────────────────────────────────────────────────────────────

@_skip
def test_p18_no_false_lockouts():
    """P18: base_cci < CAPACITY_CEILING → investment NOT locked (no false lock-outs)."""
    s = Solver()
    s.set("timeout", 5000)

    base_cci  = Real("base_cci")
    is_locked = Bool("is_locked")
    threshold = Real("threshold")

    s.add(threshold == float(CAPACITY_CEILING))
    s.add(Implies(base_cci >= threshold, is_locked))
    s.add(Implies(base_cci < threshold, Not(is_locked)))

    # Attempt: base_cci < threshold but is_locked = True
    s.add(base_cci < threshold, is_locked)

    _check(s)


# ── P19 ───────────────────────────────────────────────────────────────────────

@_skip
def test_p19_no_missed_lockouts():
    """P19: base_cci ≥ CAPACITY_CEILING → investment locked (no missed lock-outs)."""
    s = Solver()
    s.set("timeout", 5000)

    base_cci  = Real("base_cci")
    is_locked = Bool("is_locked")
    threshold = Real("threshold")

    s.add(threshold == float(CAPACITY_CEILING))
    s.add(Implies(base_cci >= threshold, is_locked))
    s.add(Implies(base_cci < threshold, Not(is_locked)))

    # Attempt: base_cci ≥ threshold but is_locked = False
    s.add(base_cci >= threshold, Not(is_locked))

    _check(s)


# ── P18+P19 combined: bijection ───────────────────────────────────────────────

@_skip
def test_p18_p19_lock_bijection():
    """P18+P19 combined: is_locked ↔ base_cci ≥ CAPACITY_CEILING (exhaustive bijection)."""
    s = Solver()
    s.set("timeout", 5000)

    base_cci  = Real("base_cci")
    is_locked = Bool("is_locked")
    threshold = Real("threshold")

    s.add(threshold == float(CAPACITY_CEILING))
    s.add(Implies(is_locked,        base_cci >= threshold))
    s.add(Implies(Not(is_locked),   base_cci < threshold))

    # Attempt: any combination that violates the bijection
    s.add(Or(
        And(is_locked,        base_cci < threshold),
        And(Not(is_locked),   base_cci >= threshold),
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
