# verification/multipliers_pure.py
#
# Pure Python specification of the multiplier chain.
# These functions mirror engineMath.ts stages 2a–2d and 3.
# Used by Z3 proofs (P10–P13) and Crosshair contracts.

from .constants_pure import (
    EFFICIENCY_CLASS_MULTS, EFFICIENCY_CLASS_ORDER, SECONDARY_METRIC_WEIGHT,
    MATURITY_MULTS, _MATURITY_KEYS_SORTED,
)
from .engine_pure import (
    maturity_multiplier,
    efficiency_class_multiplier,
    metric_weight_multiplier,
    threshold_decay_multiplier,
    combined_multiplier,
)


def efficiency_class_ordering_holds() -> bool:
    """
    Return True iff the efficiency class multipliers are strictly ordered
    Degraded < Standard < Class-A.
    P12 — used as a runtime check in Z3 proof setup.
    """
    mults = [EFFICIENCY_CLASS_MULTS[t] for t in EFFICIENCY_CLASS_ORDER]
    return all(mults[i] < mults[i + 1] for i in range(len(mults) - 1))


def secondary_lt_primary() -> bool:
    """
    Return True iff secondary metric weight < primary metric weight.
    P11 — used as a runtime check in Z3 proof setup.
    """
    return metric_weight_multiplier(False) < metric_weight_multiplier(True)


def maturity_multipliers_non_increasing() -> bool:
    """
    Return True iff maturity_multiplier is non-increasing over the defined maturity range.
    P13 — checks that higher maturity indices never yield higher multipliers than lower ones.
    """
    ages = _MATURITY_KEYS_SORTED
    for i in range(len(ages) - 1):
        if maturity_multiplier(float(ages[i])) < maturity_multiplier(float(ages[i + 1])):
            return False
    return True
