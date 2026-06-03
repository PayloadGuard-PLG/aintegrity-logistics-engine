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
    C0, K,
    BASE_XPS, SESSION_BUDGET_DECAY,
    GREY_MULT,
    AGE_TABLE, TALENT_MULTS,
    STAR_DECAY, STAR_OVR_THRESHOLD,
    TWOX_AD_MULT,
    TOTAL_ATTRS, OVR_DIVISOR,
    MAX_BASE_OVR,
    COND_LEVEL_MULTS, FAN_COND_REDUCTION, BASE_LOSS_PER_DRILL,
    CONDITION_PER_RESTORER, STAT_CAP,
    _AGE_KEYS_SORTED,
)


# ── Stage 1: XP cost curve ───────────────────────────────────────────────────

def xp_cost_at_stat(stat: float) -> float:
    """
    pre: math.isfinite(stat)
    post: __return__ > 0.0
    """
    return C0 * math.exp(stat / K)


# ── Stage 2a: Age multiplier ─────────────────────────────────────────────────

def age_multiplier(age: float) -> float:
    """
    pre: math.isfinite(age)
    post: 0.0 <= __return__ <= 1.1
    """
    ages = _AGE_KEYS_SORTED
    if age <= ages[0]:
        return AGE_TABLE[str(ages[0])]
    for i in range(len(ages) - 1):
        a0, a1 = ages[i], ages[i + 1]
        if a0 <= age <= a1:
            t  = (age - a0) / (a1 - a0)
            v0 = AGE_TABLE[str(a0)]
            v1 = AGE_TABLE[str(a1)]
            return round(v0 + t * (v1 - v0), 4)
    return AGE_TABLE[str(ages[-1])]


# ── Stage 2b: Talent multiplier ──────────────────────────────────────────────

def talent_multiplier(talent: str) -> float:
    """
    post: __return__ > 0.0
    """
    return TALENT_MULTS.get(talent, 1.0)


# ── Stage 2c: Grey stat weight ───────────────────────────────────────────────

def grey_multiplier(is_white: bool) -> float:
    """
    post: 0.0 < __return__ <= 1.0
    post: (not is_white) == (__return__ < 1.0)
    """
    return 1.0 if is_white else GREY_MULT


# ── Stage 2d: Star decay ─────────────────────────────────────────────────────

def stars_gained_from_ovr_gain(session_ovr_gain: float) -> int:
    """
    pre: session_ovr_gain >= 0.0
    post: __return__ >= 0
    """
    return int(math.floor(session_ovr_gain / STAR_OVR_THRESHOLD))


def star_decay_multiplier(stars_gained: int) -> float:
    """
    pre: stars_gained >= 0
    post: 0.0 < __return__ <= 1.0
    """
    return STAR_DECAY ** stars_gained


# ── Stage 3: Combined multiplier ─────────────────────────────────────────────

def combined_multiplier(
    age: float,
    talent: str,
    is_white: bool,
    stars_gained: int,
    twox_ad: bool,
    drill_level_mult: float,
) -> float:
    """
    pre: stars_gained >= 0
    pre: drill_level_mult > 0.0
    post: __return__ > 0.0
    """
    am = age_multiplier(age)
    tm = talent_multiplier(talent)
    gm = grey_multiplier(is_white)
    sm = star_decay_multiplier(stars_gained)
    ad = TWOX_AD_MULT if twox_ad else 1.0
    return am * tm * gm * sm * ad * drill_level_mult


# ── Stage 4a: Coach budget per stat ─────────────────────────────────────────

def coach_budget_per_stat(sessions: float, num_stats: int) -> float:
    """
    pre: sessions >= 0.0
    pre: num_stats >= 0
    post: __return__ >= 0.0
    post: (sessions == 0.0 or num_stats == 0) == (__return__ == 0.0)
    """
    if num_stats <= 0:
        return 0.0
    decay = SESSION_BUDGET_DECAY
    if decay >= 1.0 or sessions <= 0.0:
        effective = sessions
    else:
        effective = (1.0 - decay ** sessions) / (1.0 - decay)
    return effective * BASE_XPS / num_stats


# ── Stage 5: Stat gain from budget ───────────────────────────────────────────

def stat_gain_from_budget(start_stat: float, budget: float, mult: float) -> float:
    """
    pre: start_stat >= 0.0
    pre: budget >= 0.0
    pre: mult >= 0.0
    post: __return__ >= 0.0
    post: __return__ <= STAT_CAP - start_stat
    """
    if mult <= 0.0 or budget <= 0.0:
        return 0.0
    remaining = budget
    gain      = 0.0
    current   = start_stat
    while remaining > 0.0 and current < STAT_CAP:
        cost = xp_cost_at_stat(current) / mult
        if not math.isfinite(cost) or cost <= 0.0:
            break
        if cost > remaining:
            gain += remaining / cost
            break
        remaining -= cost
        gain      += 1.0
        current   += 1.0
    return gain


# ── Stage 6: OVR formula ─────────────────────────────────────────────────────

def ovr_from_stats(stat_values: list[float]) -> int:
    """
    pre: len(stat_values) >= 0
    post: __return__ >= 0
    """
    if not stat_values:
        return 0
    return math.floor(sum(stat_values) / (TOTAL_ATTRS * OVR_DIVISOR))


# ── Season decay ─────────────────────────────────────────────────────────────

def apply_season_decay(
    stat_values: list[float],
    levels_promoted: int,
    decay_per_level: float,
) -> list[float]:
    """
    pre: levels_promoted >= 0
    pre: decay_per_level >= 0.0
    pre: all(v >= 0.0 for v in stat_values)
    post: len(__return__) == len(stat_values)
    post: all(v >= 0.0 for v in __return__)
    post: all(__return__[i] <= stat_values[i] for i in range(len(stat_values)))
    """
    drop = decay_per_level * levels_promoted
    return [max(0.0, v - drop) for v in stat_values]


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


# ── Training lock ─────────────────────────────────────────────────────────────

def is_training_locked(base_ovr: float) -> bool:
    """
    post: __return__ == (base_ovr >= MAX_BASE_OVR)
    """
    return base_ovr >= MAX_BASE_OVR


# ── Condition drain ───────────────────────────────────────────────────────────

def condition_drain_pct(drill_intensity: str, fan_level: int) -> float:
    """
    pre: 0 <= fan_level < len(FAN_COND_REDUCTION)
    post: __return__ >= 0.0
    """
    int_mult = COND_LEVEL_MULTS.get(drill_intensity, 1.0)
    fan_red  = FAN_COND_REDUCTION[fan_level]
    return BASE_LOSS_PER_DRILL * int_mult * (1.0 - fan_red / 100.0)
