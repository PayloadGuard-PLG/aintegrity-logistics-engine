# verification/multipliers_pure.py
#
# Pure Python specification of the multiplier chain.
# These functions mirror engineMath.ts stages 2a–2d and 3.
# Used by Z3 proofs (P10–P13) and Crosshair contracts.

from .constants_pure import (
    TALENT_MULTS, TALENT_ORDER, GREY_MULT, AGE_TABLE,
    _AGE_KEYS_SORTED,
)
from .engine_pure import (
    age_multiplier,
    talent_multiplier,
    grey_multiplier,
    star_decay_multiplier,
    combined_multiplier,
)


def talent_ordering_holds() -> bool:
    """
    Return True iff the talent multipliers are strictly ordered
    Slow < Normal < Average < Fast < Fastest.
    P12 — used as a runtime check in Z3 proof setup.
    """
    mults = [TALENT_MULTS[t] for t in TALENT_ORDER]
    return all(mults[i] < mults[i + 1] for i in range(len(mults) - 1))


def grey_lt_white() -> bool:
    """
    Return True iff grey multiplier < white multiplier.
    P11 — used as a runtime check in Z3 proof setup.
    """
    return grey_multiplier(False) < grey_multiplier(True)


def age_multipliers_non_increasing() -> bool:
    """
    Return True iff age_multiplier is non-increasing over the defined age range.
    P13 — checks that older ages never yield higher multipliers than younger ones.
    """
    ages = _AGE_KEYS_SORTED
    for i in range(len(ages) - 1):
        if age_multiplier(float(ages[i])) < age_multiplier(float(ages[i + 1])):
            return False
    return True
