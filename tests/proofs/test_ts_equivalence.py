# tests/proofs/test_ts_equivalence.py
#
# Differential fuzzing: Python spec (engine_pure.py) vs TypeScript engine (engineMath.ts).
# Hypothesis generates random valid inputs; for each, both implementations are called and
# their outputs compared to within ε = 1e-10.
#
# A divergence means the Python spec has drifted from the TypeScript implementation.
# This closes Gap 3: there is no static formal proof of equivalence between the two
# languages, so continuous symbolic sampling is the next-best assurance.
#
# Architecture: a single persistent `npx tsx verification/run_ts.ts` subprocess is started
# at module load and reused across all test cases to avoid the Node.js startup cost.
# Each call is a JSON line written to stdin and a JSON line read from stdout.
#
# Run: pytest tests/proofs/test_ts_equivalence.py -m proof -v
# Requires: Node.js 20+, tsx (installed via npm ci)

import atexit
import json
import subprocess
import sys
from typing import Any

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

sys.path.insert(0, '.')

from verification.engine_pure import (
    apply_periodic_degradation,
    investment_budget_per_metric,
    combined_multiplier,
    readiness_drain_pct,
    is_investment_locked,
    cci_from_metrics,
    metric_gain_from_budget,
)
from verification.constants_pure import (
    INTENSITY_MULTS,
    SUPPORT_DRAIN_REDUCTION,
    EFFICIENCY_CLASS_MULTS,
)

# ── Persistent subprocess ──────────────────────────────────────────────────────

_RUNNER   = 'verification/run_ts.ts'
_EPS      = 1e-10
_proc: subprocess.Popen | None = None


def _runner() -> subprocess.Popen:
    global _proc
    if _proc is None or _proc.poll() is not None:
        _proc = subprocess.Popen(
            ['npx', 'tsx', _RUNNER],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE,
            text=True, bufsize=1,
        )
        atexit.register(_stop_runner)
    return _proc


def _stop_runner() -> None:
    global _proc
    if _proc and _proc.poll() is None:
        try:
            _proc.stdin.close()
            _proc.wait(timeout=5)
        except Exception:
            _proc.kill()


def _ts(fn: str, args: Any) -> Any:
    proc = _runner()
    proc.stdin.write(json.dumps({'fn': fn, 'args': args}) + '\n')
    proc.stdin.flush()
    line = proc.stdout.readline()
    parsed = json.loads(line)
    if 'error' in parsed:
        raise RuntimeError(f'TS runner error for {fn}: {parsed["error"]}')
    return parsed['result']


def _eq(a: float, b: float) -> bool:
    return abs(a - b) <= _EPS


# ── Input strategies ───────────────────────────────────────────────────────────

_EFFICIENCY_CLASSES = list(EFFICIENCY_CLASS_MULTS.keys())
_INTENSITIES        = list(INTENSITY_MULTS.keys())

s_cycles           = st.floats(min_value=0.0,  max_value=200.0,    allow_nan=False, allow_infinity=False)
s_num_metrics      = st.integers(min_value=1, max_value=15)
s_metric           = st.floats(min_value=0.0,  max_value=9999.0,   allow_nan=False, allow_infinity=False)
s_budget           = st.floats(min_value=0.0,  max_value=500_000.0, allow_nan=False, allow_infinity=False)
s_mult             = st.floats(min_value=0.01, max_value=10.0,     allow_nan=False, allow_infinity=False)
s_maturity_index   = st.floats(min_value=17.0, max_value=31.0,     allow_nan=False, allow_infinity=False)
s_efficiency_class = st.sampled_from(_EFFICIENCY_CLASSES)
s_thresholds       = st.integers(min_value=0, max_value=20)
s_cycle_mult       = st.floats(min_value=0.01, max_value=5.0,      allow_nan=False, allow_infinity=False)
s_metric_list      = st.lists(s_metric, min_size=1, max_size=15)
s_periods          = st.integers(min_value=0, max_value=10)
s_degradation      = st.floats(min_value=0.0,  max_value=100.0,    allow_nan=False, allow_infinity=False)
s_base_cci         = st.floats(min_value=0.0,  max_value=300.0,    allow_nan=False, allow_infinity=False)
s_support          = st.integers(min_value=0, max_value=len(SUPPORT_DRAIN_REDUCTION) - 1)
s_intensity        = st.sampled_from(_INTENSITIES)


# ── Tests ──────────────────────────────────────────────────────────────────────

@pytest.mark.proof
@given(s_cycles, s_num_metrics)
@settings(max_examples=200, deadline=None)
def test_investment_budget_per_metric(cycles: float, num_metrics: int) -> None:
    py = investment_budget_per_metric(cycles, num_metrics)
    ts = _ts('investmentBudgetPerMetric', [cycles, num_metrics])
    assert _eq(py, ts), f'investmentBudgetPerMetric({cycles}, {num_metrics}): py={py} ts={ts}'


@pytest.mark.proof
@given(s_metric, s_budget, s_mult)
@settings(max_examples=200)
def test_metric_gain_from_budget(start_metric: float, budget: float, mult: float) -> None:
    py = metric_gain_from_budget(start_metric, budget, mult)
    ts = _ts('metricGainFromBudget', [start_metric, budget, mult])
    assert _eq(py, ts), f'metricGainFromBudget({start_metric}, {budget}, {mult}): py={py} ts={ts}'


@pytest.mark.proof
@given(s_metric_list)
@settings(max_examples=200)
def test_cci_from_metrics(metric_values: list[float]) -> None:
    py = cci_from_metrics(metric_values)
    ts = _ts('cciFromMetrics', [metric_values])
    assert py == ts, f'cciFromMetrics({metric_values}): py={py} ts={ts}'


@pytest.mark.proof
@given(s_maturity_index, s_efficiency_class, st.booleans(), s_thresholds, st.booleans(), s_cycle_mult)
@settings(max_examples=200)
def test_combined_multiplier(
    maturity_index: float, efficiency_class: str, is_primary: bool,
    thresholds_crossed: int, boost_active: bool, cycle_intensity_mult: float,
) -> None:
    py = combined_multiplier(maturity_index, efficiency_class, is_primary, thresholds_crossed, boost_active, cycle_intensity_mult)
    ts = _ts('combinedMultiplier', [{
        'maturityIndex': maturity_index, 'efficiencyClass': efficiency_class,
        'isPrimary': is_primary, 'thresholdsCrossed': thresholds_crossed,
        'boostActive': boost_active, 'cycleIntensityMult': cycle_intensity_mult,
    }])
    assert _eq(py, ts), (
        f'combinedMultiplier(maturity={maturity_index}, class={efficiency_class}, '
        f'isPrimary={is_primary}, thresholds={thresholds_crossed}, '
        f'boost={boost_active}, cycleIntensity={cycle_intensity_mult}): py={py} ts={ts}'
    )


@pytest.mark.proof
@given(s_metric_list, s_periods, s_degradation)
@settings(max_examples=200)
def test_apply_periodic_degradation(metric_values: list[float], periods: int, degradation_per_period: float) -> None:
    py = apply_periodic_degradation(metric_values, periods, degradation_per_period)
    ts = _ts('applyPeriodicDegradation', [metric_values, periods, degradation_per_period])
    assert len(py) == len(ts), f'length mismatch: {len(py)} vs {len(ts)}'
    for i, (p, t) in enumerate(zip(py, ts)):
        assert _eq(p, t), f'applyPeriodicDegradation[{i}] (periods={periods}, degradation={degradation_per_period}): py={p} ts={t}'


@pytest.mark.proof
@given(s_base_cci)
@settings(max_examples=200)
def test_is_investment_locked(base_cci: float) -> None:
    py = is_investment_locked(base_cci)
    ts = _ts('isInvestmentLocked', [base_cci])
    assert py == ts, f'isInvestmentLocked({base_cci}): py={py} ts={ts}'


@pytest.mark.proof
@given(s_intensity, s_support)
@settings(max_examples=200)
def test_readiness_drain_pct(cycle_intensity: str, support_level: int) -> None:
    py = readiness_drain_pct(cycle_intensity, support_level)
    ts = _ts('readinessDrainPct', [cycle_intensity, support_level])
    assert _eq(py, ts), f'readinessDrainPct({cycle_intensity!r}, {support_level}): py={py} ts={ts}'
