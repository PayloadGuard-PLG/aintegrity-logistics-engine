# verification/crosshair_contracts.py
#
# Module-level PEP 316 contract functions for Crosshair symbolic verification.
# These are NOT test functions — they are verified by crosshair check via CLI.
#
# Run directly:  crosshair check verification.crosshair_contracts
# Run via pytest: pytest tests/proofs/ -m proof -v --timeout=30
#
# Properties:
#   p5_gain_nonneg        : budget > 0 ∧ mult > 0 → gain ≥ 0
#   p6_gain_bounded       : gain ≤ STAT_CAP − start_stat
#   p8_gain_mono_budget   : budget₁ ≥ budget₂ ≥ 0 → gain(budget₁) ≥ gain(budget₂)
#   p9_gain_mono_mult     : mult₁ ≥ mult₂ > 0 → gain(mult₁) ≥ gain(mult₂)
#   p16_decay_nonneg      : apply_season_decay never produces negative stats
#   p17_decay_mono_levels : more levels → lower or equal stat values

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from verification.engine_pure import stat_gain_from_budget, apply_season_decay, apply_intervention
from verification.constants_pure import STAT_CAP


def p5_gain_nonneg(start_stat: float, budget: float, mult: float) -> None:
    """
    pre: 0.0 <= start_stat <= 9999.0
    pre: budget > 0.0
    pre: mult > 0.0
    """
    result = stat_gain_from_budget(start_stat, budget, mult)
    assert result >= 0.0, f"P5 violated: gain={result}"


def p6_gain_bounded(start_stat: float, budget: float, mult: float) -> None:
    """
    pre: 0.0 <= start_stat <= 9999.0
    pre: budget >= 0.0
    pre: mult > 0.0
    """
    result = stat_gain_from_budget(start_stat, budget, mult)
    assert result <= STAT_CAP - start_stat, f"P6 violated: gain={result}"


def p8_gain_mono_budget(start_stat: float, budget1: float, budget2: float, mult: float) -> None:
    """
    pre: 0.0 <= start_stat <= 9999.0
    pre: budget1 >= budget2 >= 0.0
    pre: mult > 0.0
    """
    g1 = stat_gain_from_budget(start_stat, budget1, mult)
    g2 = stat_gain_from_budget(start_stat, budget2, mult)
    assert g1 >= g2, f"P8 violated: gain({budget1})={g1} < gain({budget2})={g2}"


def p9_gain_mono_mult(start_stat: float, budget: float, mult1: float, mult2: float) -> None:
    """
    pre: 0.0 <= start_stat <= 9999.0
    pre: mult1 >= mult2 > 0.0
    pre: budget >= 0.0
    """
    g1 = stat_gain_from_budget(start_stat, budget, mult1)
    g2 = stat_gain_from_budget(start_stat, budget, mult2)
    assert g1 >= g2, f"P9 violated: gain(mult={mult1})={g1} < gain(mult={mult2})={g2}"


def p16_decay_nonneg(values: list, levels: int, decay_per: float) -> None:
    """
    pre: len(values) <= 15
    pre: all(0.0 <= v <= 10000.0 for v in values)
    pre: 0 <= levels <= 10
    pre: 0.0 <= decay_per <= 100.0
    """
    result = apply_season_decay(values, levels, decay_per)
    for i, v in enumerate(result):
        assert v >= 0.0, f"P16 violated: stat[{i}]={v} < 0"


def p17_decay_mono_levels(values: list, levels1: int, levels2: int, decay_per: float) -> None:
    """
    pre: len(values) <= 15
    pre: all(0.0 <= v <= 10000.0 for v in values)
    pre: levels1 >= levels2 >= 0
    pre: 0.0 <= decay_per <= 100.0
    """
    after1 = apply_season_decay(values, levels1, decay_per)
    after2 = apply_season_decay(values, levels2, decay_per)
    for i in range(len(values)):
        assert after1[i] <= after2[i], (
            f"P17 violated at index {i}: levels={levels1} gives {after1[i]}"
            f" > levels={levels2} gives {after2[i]}"
        )


# ── P20: apply_intervention monotone (result ≥ metrics) ──────────────────────

def p20_intervention_monotone(
    key: str,
    current_val: float,
    cap_val: float,
    intervention_type: str,
    target_pct: float,
) -> None:
    """
    pre: 0.0 <= current_val <= cap_val
    pre: 0.0 <= target_pct <= 1.0
    pre: intervention_type in ('partial-reset', 'full-reset', 'restore-to-fraction')
    """
    metrics = {key: current_val}
    domain_cap = {key: cap_val}
    result = apply_intervention(metrics, intervention_type, target_pct, [key], domain_cap)
    assert result[key] >= current_val, (
        f"P20 violated: result[{key}]={result[key]} < before={current_val}"
    )


# ── P21: apply_intervention bounded by cap ────────────────────────────────────

def p21_intervention_bounded(
    key: str,
    current_val: float,
    cap_val: float,
    intervention_type: str,
    target_pct: float,
) -> None:
    """
    pre: 0.0 <= current_val <= cap_val
    pre: 0.0 <= target_pct <= 1.0
    pre: intervention_type in ('partial-reset', 'full-reset', 'restore-to-fraction')
    """
    metrics = {key: current_val}
    domain_cap = {key: cap_val}
    result = apply_intervention(metrics, intervention_type, target_pct, [key], domain_cap)
    assert result[key] <= cap_val, (
        f"P21 violated: result[{key}]={result[key]} > cap={cap_val}"
    )
