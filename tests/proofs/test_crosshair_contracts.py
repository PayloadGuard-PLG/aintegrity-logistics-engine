# tests/proofs/test_crosshair_contracts.py
#
# Crosshair symbolic contract verification for the Squad Optimiser engine.
# Properties P5, P6, P8, P9, P16, P17.
#
# Uses the crosshair CLI via subprocess rather than the internal Python API
# (AnalysisOptions), which is unstable across crosshair-tool releases.
# Contract functions live in verification/crosshair_contracts.py.
#
# Run with:  pytest tests/proofs/ -m proof -v --timeout=30
#            (requires: pip install crosshair-tool)

import subprocess
import sys
import os
import pytest

pytestmark = pytest.mark.proof

_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

try:
    import crosshair
    _CROSSHAIR_AVAILABLE = True
except ImportError:
    _CROSSHAIR_AVAILABLE = False

_skip = pytest.mark.skipif(not _CROSSHAIR_AVAILABLE, reason="crosshair-tool not installed")


def _verify(fn_name: str, timeout: int = 10) -> list:
    """Call crosshair check on the named contract function; return violations."""
    result = subprocess.run(
        [sys.executable, '-m', 'crosshair', 'check',
         f'verification.crosshair_contracts.{fn_name}',
         f'--per_condition_timeout={timeout}'],
        capture_output=True, text=True, timeout=25,
        cwd=_REPO_ROOT,
    )
    if result.returncode == 0:
        return []
    return [result.stdout + result.stderr]


# ── P5: gain ≥ 0 ──────────────────────────────────────────────────────────────

@_skip
def test_p5_gain_nonnegative():
    """P5: budget > 0 ∧ mult > 0 → stat_gain_from_budget ≥ 0."""
    violations = _verify('p5_gain_nonneg')
    assert not violations, f"P5 counterexample:\n{violations[0]}"


# ── P6: gain ≤ STAT_CAP − start_stat ─────────────────────────────────────────

@_skip
def test_p6_gain_bounded():
    """P6: stat_gain_from_budget ≤ STAT_CAP − start_stat."""
    violations = _verify('p6_gain_bounded')
    assert not violations, f"P6 counterexample:\n{violations[0]}"


# ── P8: gain monotone in budget ───────────────────────────────────────────────

@_skip
def test_p8_gain_monotone_in_budget():
    """P8: budget₁ ≥ budget₂ ≥ 0 → gain(budget₁) ≥ gain(budget₂)."""
    violations = _verify('p8_gain_mono_budget')
    assert not violations, f"P8 counterexample:\n{violations[0]}"


# ── P9: gain monotone in mult ─────────────────────────────────────────────────

@_skip
def test_p9_gain_monotone_in_mult():
    """P9: mult₁ ≥ mult₂ > 0 → gain(mult₁) ≥ gain(mult₂)."""
    violations = _verify('p9_gain_mono_mult')
    assert not violations, f"P9 counterexample:\n{violations[0]}"


# ── P16: season decay never produces negative stats ───────────────────────────

@_skip
def test_p16_decay_non_negative():
    """P16: apply_season_decay never produces negative stat values."""
    violations = _verify('p16_decay_nonneg')
    assert not violations, f"P16 counterexample:\n{violations[0]}"


# ── P17: decay is non-increasing in levels ────────────────────────────────────

@_skip
def test_p17_decay_non_increasing_in_levels():
    """P17: more levels → lower or equal stat values."""
    violations = _verify('p17_decay_mono_levels')
    assert not violations, f"P17 counterexample:\n{violations[0]}"


# ── P20: apply_intervention monotone (result ≥ before) ───────────────────────

@_skip
def test_p20_intervention_monotone():
    """P20: apply_intervention never decreases a metric below its current value."""
    violations = _verify('p20_intervention_monotone')
    assert not violations, f"P20 counterexample:\n{violations[0]}"


# ── P21: apply_intervention bounded by domain cap ────────────────────────────

@_skip
def test_p21_intervention_bounded():
    """P21: apply_intervention never exceeds the domain cap for any affected metric."""
    violations = _verify('p21_intervention_bounded')
    assert not violations, f"P21 counterexample:\n{violations[0]}"
