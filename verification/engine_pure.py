# verification/engine_pure.py
#
# Pure Python specification of src/engine/engineMath.ts.
#
# Rules:
#   - No imports from the TypeScript engine or React Native
#   - Pure functions only — no side effects, no I/O
#   - PEP 316 docstring contracts on each function
#   - Must stay in sync with engineMath.ts; a divergence caught by a failing proof is a bug
#
# Crosshair uses these docstring contracts for symbolic verification.
# Z3 proofs in tests/proofs/test_z3_properties.py reason about these functions abstractly.
# Dafny proofs in verification/dafny/ prove the algorithmic properties machine-checked.

import math

from .constants_pure import (
    COST_CURVE_BASE, COST_CURVE_DECAY,
    BASE_RESOURCES_PER_CYCLE, CYCLE_BUDGET_DECAY,
    SECONDARY_METRIC_WEIGHT,
    MATURITY_MULTS, EFFICIENCY_CLASS_MULTS,
    THRESHOLD_DECAY_FACTOR, THRESHOLD_CCI_INCREMENT,
    BOOST_MULTIPLIER,
    METRIC_COUNT, CCI_DIVISOR_SCALE,
    CAPACITY_CEILING,
    INTENSITY_MULTS, SUPPORT_DRAIN_REDUCTION, BASE_DRAIN_PER_CYCLE,
    READINESS_PER_RESTORATION, METRIC_CAP,
    _MATURITY_KEYS_SORTED,
)


# ── Stage 1: Cost curve ──────────────────────────────────────────────────────

def cost_at_metric(metric: float) -> float:
    """
    pre: math.isfinite(metric)
    post: __return__ > 0.0
    """
    return COST_CURVE_BASE * math.exp(metric / COST_CURVE_DECAY)


# ── Stage 2a: Maturity multiplier ────────────────────────────────────────────

def maturity_multiplier(maturity_index: float) -> float:
    """
    pre: math.isfinite(maturity_index)
    post: 0.0 <= __return__ <= 1.1
    """
    ages = _MATURITY_KEYS_SORTED
    if maturity_index <= ages[0]:
        return MATURITY_MULTS[str(ages[0])]
    for i in range(len(ages) - 1):
        a0, a1 = ages[i], ages[i + 1]
        if a0 <= maturity_index <= a1:
            t  = (maturity_index - a0) / (a1 - a0)
            v0 = MATURITY_MULTS[str(a0)]
            v1 = MATURITY_MULTS[str(a1)]
            return round(v0 + t * (v1 - v0), 4)
    return MATURITY_MULTS[str(ages[-1])]


# ── Stage 2b: Efficiency class multiplier ────────────────────────────────────

def efficiency_class_multiplier(efficiency_class: str) -> float:
    """
    post: __return__ > 0.0
    """
    return EFFICIENCY_CLASS_MULTS.get(efficiency_class, 1.0)


# ── Stage 2c: Metric weight (primary vs secondary) ───────────────────────────

def metric_weight_multiplier(is_primary: bool) -> float:
    """
    post: 0.0 < __return__ <= 1.0
    post: (not is_primary) == (__return__ < 1.0)
    """
    return 1.0 if is_primary else SECONDARY_METRIC_WEIGHT


# ── Stage 2d: Threshold decay ────────────────────────────────────────────────

def thresholds_crossed_from_cci_gain(session_cci_gain: float) -> int:
    """
    pre: session_cci_gain >= 0.0
    post: __return__ >= 0
    """
    return int(math.floor(session_cci_gain / THRESHOLD_CCI_INCREMENT))


def threshold_decay_multiplier(thresholds_crossed: int) -> float:
    """
    pre: thresholds_crossed >= 0
    post: 0.0 < __return__ <= 1.0
    """
    return THRESHOLD_DECAY_FACTOR ** thresholds_crossed


# ── Stage 3: Combined multiplier ─────────────────────────────────────────────

def combined_multiplier(
    maturity_index: float,
    efficiency_class: str,
    is_primary: bool,
    thresholds_crossed: int,
    boost_active: bool,
    cycle_intensity_mult: float,
) -> float:
    """
    pre: thresholds_crossed >= 0
    pre: cycle_intensity_mult > 0.0
    post: __return__ > 0.0
    """
    mm = maturity_multiplier(maturity_index)
    em = efficiency_class_multiplier(efficiency_class)
    wm = metric_weight_multiplier(is_primary)
    td = threshold_decay_multiplier(thresholds_crossed)
    bm = BOOST_MULTIPLIER if boost_active else 1.0
    return mm * em * wm * td * bm * cycle_intensity_mult


# ── Stage 4a: Investment budget per metric ───────────────────────────────────

def investment_budget_per_metric(cycles: float, num_metrics: int) -> float:
    """
    pre: cycles >= 0.0
    pre: num_metrics >= 0
    post: __return__ >= 0.0
    post: (cycles == 0.0 or num_metrics == 0) == (__return__ == 0.0)
    """
    if num_metrics <= 0:
        return 0.0
    decay = CYCLE_BUDGET_DECAY
    if decay >= 1.0 or cycles <= 0.0:
        effective = cycles
    else:
        effective = (1.0 - decay ** cycles) / (1.0 - decay)
    return effective * BASE_RESOURCES_PER_CYCLE / num_metrics


# ── Stage 4b: Conditioning budget per metric ─────────────────────────────────

def conditioning_budget_per_metric(cycles: float, num_metrics: int) -> float:
    """
    pre: cycles >= 0.0
    pre: num_metrics >= 0
    post: __return__ >= 0.0
    """
    if num_metrics <= 0:
        return 0.0
    from .constants_pure import CONDITIONING_RESOURCE_FACTOR
    return (cycles * BASE_RESOURCES_PER_CYCLE * CONDITIONING_RESOURCE_FACTOR) / num_metrics


# ── Stage 5: Metric gain from budget ─────────────────────────────────────────

def metric_gain_from_budget(start_metric: float, budget: float, mult: float) -> float:
    """
    pre: start_metric >= 0.0
    pre: budget >= 0.0
    pre: mult >= 0.0
    post: __return__ >= 0.0
    post: __return__ <= METRIC_CAP - start_metric
    """
    if mult <= 0.0 or budget <= 0.0:
        return 0.0
    remaining = budget
    gain      = 0.0
    current   = start_metric
    while remaining > 0.0 and current < METRIC_CAP:
        cost = cost_at_metric(current) / mult
        if not math.isfinite(cost) or cost <= 0.0:
            break
        if cost > remaining:
            gain += remaining / cost
            break
        remaining -= cost
        gain      += 1.0
        current   += 1.0
    return gain


# ── Stage 6: CCI formula ─────────────────────────────────────────────────────

def cci_from_metrics(metric_values: list[float]) -> int:
    """
    pre: len(metric_values) >= 0
    post: __return__ >= 0
    """
    if not metric_values:
        return 0
    return math.floor(sum(metric_values) / (METRIC_COUNT * CCI_DIVISOR_SCALE))


# ── Periodic degradation ─────────────────────────────────────────────────────

def apply_periodic_degradation(
    metric_values: list[float],
    period_count: int,
    degradation_per_period: float,
) -> list[float]:
    """
    pre: period_count >= 0
    pre: degradation_per_period >= 0.0
    pre: all(v >= 0.0 for v in metric_values)
    post: len(__return__) == len(metric_values)
    post: all(v >= 0.0 for v in __return__)
    post: all(__return__[i] <= metric_values[i] for i in range(len(metric_values)))
    """
    drop = degradation_per_period * period_count
    return [max(0.0, v - drop) for v in metric_values]


# ── Intervention (Phase B2) ──────────────────────────────────────────────────

def apply_intervention(
    metrics: dict[str, float],
    intervention_type: str,
    target_pct: float,
    affected_metrics: list[str],
    domain_cap: dict[str, float],
) -> dict[str, float]:
    """
    pre: 0.0 <= target_pct <= 1.0
    pre: all(v >= 0.0 for v in metrics.values())
    pre: all(v >= 0.0 for v in domain_cap.values())
    post: all(__return__[k] >= metrics.get(k, 0.0) for k in affected_metrics)
    post: all(__return__[k] <= domain_cap.get(k, __return__[k]) for k in affected_metrics)
    """
    result = dict(metrics)
    for key in affected_metrics:
        current = metrics.get(key, 0.0)
        cap = domain_cap.get(key, current)
        if intervention_type == 'full-reset':
            target = cap
        else:
            target = min(cap, current + (cap - current) * target_pct)
        result[key] = min(cap, max(current, target))
    return result


# ── Uncertainty propagation (Phase B4) ───────────────────────────────────────

def propagate_uncertainty(
    estimate: float,
    sensitivity_c0: float,
    sensitivity_k: float,
    var_c0: float,
    var_k: float,
) -> dict:
    """
    pre: var_c0 >= 0.0
    pre: var_k >= 0.0
    post: __return__['variance'] >= 0.0
    post: __return__['estimate'] == estimate
    post: __return__['ci95_lo'] <= __return__['estimate']
    post: __return__['ci95_hi'] >= __return__['estimate']
    """
    variance = sensitivity_c0 ** 2 * var_c0 + sensitivity_k ** 2 * var_k
    sd       = math.sqrt(max(0.0, variance))
    return {
        'estimate': estimate,
        'variance': variance,
        'ci95_lo':  estimate - 1.96 * sd,
        'ci95_hi':  estimate + 1.96 * sd,
    }


# ── Investment lock ───────────────────────────────────────────────────────────

def is_investment_locked(base_cci: float) -> bool:
    """
    post: __return__ == (base_cci >= CAPACITY_CEILING)
    """
    return base_cci >= CAPACITY_CEILING


# ── Readiness drain ───────────────────────────────────────────────────────────

def readiness_drain_pct(cycle_intensity: str, support_level: int) -> float:
    """
    pre: 0 <= support_level < len(SUPPORT_DRAIN_REDUCTION)
    post: __return__ >= 0.0
    """
    int_mult = INTENSITY_MULTS.get(cycle_intensity, 1.0)
    fan_red  = SUPPORT_DRAIN_REDUCTION[support_level]
    return BASE_DRAIN_PER_CYCLE * int_mult * (1.0 - fan_red / 100.0)
