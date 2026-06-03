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
    apply_season_decay,
    coach_budget_per_stat,
    combined_multiplier,
    condition_drain_pct,
    is_training_locked,
    ovr_from_stats,
    stat_gain_from_budget,
)
from verification.constants_pure import (
    COND_LEVEL_MULTS,
    FAN_COND_REDUCTION,
    TALENT_MULTS,
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

_TALENTS    = list(TALENT_MULTS.keys())
_INTENSITIES = list(COND_LEVEL_MULTS.keys())

s_sessions   = st.floats(min_value=0.0,  max_value=200.0,    allow_nan=False, allow_infinity=False)
s_num_stats  = st.integers(min_value=1, max_value=15)
s_stat       = st.floats(min_value=0.0,  max_value=9999.0,   allow_nan=False, allow_infinity=False)
s_budget     = st.floats(min_value=0.0,  max_value=500_000.0, allow_nan=False, allow_infinity=False)
s_mult       = st.floats(min_value=0.01, max_value=10.0,     allow_nan=False, allow_infinity=False)
s_age        = st.floats(min_value=17.0, max_value=31.0,     allow_nan=False, allow_infinity=False)
s_talent     = st.sampled_from(_TALENTS)
s_stars      = st.integers(min_value=0, max_value=20)
s_drill_mult = st.floats(min_value=0.01, max_value=5.0,      allow_nan=False, allow_infinity=False)
s_stat_list  = st.lists(s_stat, min_size=1, max_size=15)
s_levels     = st.integers(min_value=0, max_value=10)
s_decay      = st.floats(min_value=0.0,  max_value=100.0,    allow_nan=False, allow_infinity=False)
s_base_ovr   = st.floats(min_value=0.0,  max_value=300.0,    allow_nan=False, allow_infinity=False)
s_fan        = st.integers(min_value=0, max_value=len(FAN_COND_REDUCTION) - 1)
s_intensity  = st.sampled_from(_INTENSITIES)


# ── Tests ──────────────────────────────────────────────────────────────────────

@pytest.mark.proof
@given(s_sessions, s_num_stats)
@settings(max_examples=200, deadline=None)
def test_coach_budget_per_stat(sessions: float, num_stats: int) -> None:
    py = coach_budget_per_stat(sessions, num_stats)
    ts = _ts('coachBudgetPerStat', [sessions, num_stats])
    assert _eq(py, ts), f'coachBudgetPerStat({sessions}, {num_stats}): py={py} ts={ts}'


@pytest.mark.proof
@given(s_stat, s_budget, s_mult)
@settings(max_examples=200)
def test_stat_gain_from_budget(start_stat: float, budget: float, mult: float) -> None:
    py = stat_gain_from_budget(start_stat, budget, mult)
    ts = _ts('statGainFromBudget', [start_stat, budget, mult])
    assert _eq(py, ts), f'statGainFromBudget({start_stat}, {budget}, {mult}): py={py} ts={ts}'


@pytest.mark.proof
@given(s_stat_list)
@settings(max_examples=200)
def test_ovr_from_stats(stat_values: list[float]) -> None:
    py = ovr_from_stats(stat_values)
    ts = _ts('ovrFromStats', [stat_values])
    assert py == ts, f'ovrFromStats({stat_values}): py={py} ts={ts}'


@pytest.mark.proof
@given(s_age, s_talent, st.booleans(), s_stars, st.booleans(), s_drill_mult)
@settings(max_examples=200)
def test_combined_multiplier(
    age: float, talent: str, is_white: bool,
    stars_gained: int, twox_ad: bool, drill_level_mult: float,
) -> None:
    py = combined_multiplier(age, talent, is_white, stars_gained, twox_ad, drill_level_mult)
    ts = _ts('combinedMultiplier', [{
        'age': age, 'talent': talent, 'isWhite': is_white,
        'starsGained': stars_gained, 'twoxAd': twox_ad,
        'drillLevelMult': drill_level_mult,
    }])
    assert _eq(py, ts), (
        f'combinedMultiplier(age={age}, talent={talent}, isWhite={is_white}, '
        f'stars={stars_gained}, twox={twox_ad}, drill={drill_level_mult}): py={py} ts={ts}'
    )


@pytest.mark.proof
@given(s_stat_list, s_levels, s_decay)
@settings(max_examples=200)
def test_apply_season_decay(stat_values: list[float], levels: int, decay_per_level: float) -> None:
    py = apply_season_decay(stat_values, levels, decay_per_level)
    ts = _ts('applySeasonDecay', [stat_values, levels, decay_per_level])
    assert len(py) == len(ts), f'length mismatch: {len(py)} vs {len(ts)}'
    for i, (p, t) in enumerate(zip(py, ts)):
        assert _eq(p, t), f'applySeasonDecay[{i}] (levels={levels}, decay={decay_per_level}): py={p} ts={t}'


@pytest.mark.proof
@given(s_base_ovr)
@settings(max_examples=200)
def test_is_training_locked(base_ovr: float) -> None:
    py = is_training_locked(base_ovr)
    ts = _ts('isTrainingLocked', [base_ovr])
    assert py == ts, f'isTrainingLocked({base_ovr}): py={py} ts={ts}'


@pytest.mark.proof
@given(s_intensity, s_fan)
@settings(max_examples=200)
def test_condition_drain_pct(drill_intensity: str, fan_level: int) -> None:
    py = condition_drain_pct(drill_intensity, fan_level)
    ts = _ts('conditionDrainPct', [drill_intensity, fan_level])
    assert _eq(py, ts), f'conditionDrainPct({drill_intensity!r}, {fan_level}): py={py} ts={ts}'
