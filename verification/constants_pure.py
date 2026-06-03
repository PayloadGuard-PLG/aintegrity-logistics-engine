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

# Cost curve
COST_CURVE_BASE: float  = float(_p['costCurveBase'])   # 2.94
COST_CURVE_DECAY: float = float(_p['costCurveDecay'])  # 47

# Cycle budget
BASE_RESOURCES_PER_CYCLE: float  = float(_p['baseResourcesPerCycle'])  # 676
CYCLE_BUDGET_DECAY: float        = float(_p.get('cycleBudgetDecay', 1.0))
CONDITIONING_RESOURCE_FACTOR: float = float(_p.get('conditioningResourceFactor', 0.3))

# Multipliers
SECONDARY_METRIC_WEIGHT: float = float(_p['secondaryMetricWeight'])  # 0.22

MATURITY_MULTS: dict[str, float] = {
    str(k): float(v) for k, v in _p['maturityMultipliers'].items()
}
EFFICIENCY_CLASS_MULTS: dict[str, float] = {
    k: float(v) for k, v in _p['efficiencyClassMultipliers'].items()
}

THRESHOLD_DECAY_FACTOR: float  = float(_p['thresholdDecayFactor'])  # 0.85
THRESHOLD_CCI_INCREMENT: float = float(_p['thresholdCciIncrement'])  # 20
BOOST_MULTIPLIER: float        = float(_p['boostMultiplier'])        # 2.0

# CCI formula
METRIC_COUNT: int      = int(_p['metricCount'])      # 10
CCI_DIVISOR_SCALE: int = int(_p['cciDivisorScale'])  # 1

# Stage system
STAGE_METRIC_ADDITIONS: dict[str, int] = {
    k: int(v) for k, v in _p['stageMetricAdditions'].items()
}

# Investment lock
CAPACITY_CEILING: int = int(_p['capacityCeiling'])  # 180

# Readiness system
INTENSITY_MULTS: dict[str, float] = {
    k: float(v) for k, v in _p['intensityMultipliers'].items()
}
SUPPORT_DRAIN_REDUCTION: list[float] = [float(v) for v in _p['supportDrainReduction']]
BASE_DRAIN_PER_CYCLE: float  = float(_p['baseDrainPerCycle'])    # 0.75
ZERO_DRAIN_THRESHOLD: float  = float(_p['zeroDrainThreshold'])   # 0.38
READINESS_PER_RESTORATION: float = float(_p['readinessPerRestoration'])  # 15

# Metric cap
METRIC_CAP: float = float(_p['metricCap'])  # 9999

# Periodic degradation
PERIODIC_DEGRADATION: float = float(_p.get('periodicDegradationPerStage', 20.0))  # 20

# Derived: sorted maturity breakpoints (ascending)
_MATURITY_KEYS_SORTED: list[int] = sorted(int(a) for a in MATURITY_MULTS)
MATURITY_MIN: int = _MATURITY_KEYS_SORTED[0]   # lowest defined maturity index
MATURITY_MAX: int = _MATURITY_KEYS_SORTED[-1]  # highest defined maturity index

# Efficiency class ordering (Degraded → Class-A, strictly increasing mult)
EFFICIENCY_CLASS_ORDER: list[str] = ['Degraded', 'Standard', 'Class-A']


# ── Constant provenance accessor (Phase B5) ───────────────────────────────────

def load_constant_meta(key: str) -> dict | None:
    return _p.get(f'{key}_meta')
