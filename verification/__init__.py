# verification/ — pure Python specifications and formal proof infrastructure.
#
# This package contains:
#   constants_pure.py  — constants loaded from profiles/game_2025.json
#   engine_pure.py     — pure Python re-expression of src/engine/engineMath.ts
#   multipliers_pure.py — pure Python spec of the multiplier chain
#   dafny/             — machine-checked Dafny proofs
#
# These modules are NOT imported at runtime. They exist for Z3 SMT proofs,
# Crosshair symbolic contract testing, and Dafny verification only.
