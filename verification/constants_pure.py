# verification/constants_pure.py
#
# Single source of truth for engine constants used in verification.
# Loaded from profiles/logistics_v1.json so the proofs always use the live values.
# Any constant change that breaks a proof is caught by CI before reaching main.

import json
import os

_PROFILE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    'profiles', 'logistics_v1.json',
)

with open(_PROFILE_PATH) as _f:
    _p = json.load(_f)

# XP cost curve
C0: float = float(_p['xpCostBase'])        # 2.94
K: float  = float(_p['xpCostDecayK'])      # 47

# Session budget
BASE_XPS: float             = float(_p['baseXpPerSession'])   # 676
SESSION_BUDGET_DECAY: float = float(_p['sessionBudgetDecay']) # 0.99
DRILL_XP_FACTOR: float      = float(_p.get('drillXpFactor', 0.3))

# Multipliers
GREY_MULT: float = float(_p['greyWeightMultiplier'])  # 0.22

AGE_TABLE: dict[str, float] = {
    str(k): float(v) for k, v in _p['ageTable'].items()
}
TALENT_MULTS: dict[str, float] = {
    k: float(v) for k, v in _p['talentMultipliers'].items()
}

STAR_DECAY: float         = float(_p['starDecayPerSession'])  # 0.85
STAR_OVR_THRESHOLD: float = float(_p['starOvrThreshold'])     # 20
TWOX_AD_MULT: float       = float(_p['twoxAdMultiplier'])     # 2.0

# OVR formula
TOTAL_ATTRS: int  = int(_p['totalAttributeCount'])  # 15
OVR_DIVISOR: int  = int(_p['qualityOvrDivisor'])    # 1

# Tier system
TIER_ADDITIONS: dict[str, int] = {
    k: int(v) for k, v in _p['tierAttrAdditions'].items()
}

# Training lock
MAX_BASE_OVR: int = int(_p['maxBaseOvr'])  # 180

# Condition system
COND_LEVEL_MULTS: dict[str, float] = {
    k: float(v) for k, v in _p['condLevelMultipliers'].items()
}
FAN_COND_REDUCTION: list[float] = [float(v) for v in _p['fanClubCondReduction']]
BASE_LOSS_PER_DRILL: float  = float(_p['baseLossPerDrill'])    # 0.75
ZERO_DRAIN_THRESHOLD: float = float(_p['zeroDrainThreshold'])  # 0.38
CONDITION_PER_RESTORER: float = float(_p['conditionPerRestorer'])  # 15

# Stat cap
STAT_CAP: float = float(_p['statCap'])  # 9999

# Season decay
SEASON_DECAY_PER_LEVEL: float = float(_p['seasonDecayPerLevel'])  # 20

# Derived: sorted age breakpoints (ascending)
_AGE_KEYS_SORTED: list[int] = sorted(int(a) for a in AGE_TABLE)
AGE_MIN: int = _AGE_KEYS_SORTED[0]   # 17
AGE_MAX: int = _AGE_KEYS_SORTED[-1]  # 30

# Efficiency class ordering (Degraded → Class-A, strictly increasing mult)
TALENT_ORDER: list[str] = ['Degraded', 'Standard', 'Class-A']


# ── Constant provenance accessor (Phase B5) ───────────────────────────────────

def load_constant_meta(key: str) -> dict | None:
    return _p.get(f'{key}_meta')
