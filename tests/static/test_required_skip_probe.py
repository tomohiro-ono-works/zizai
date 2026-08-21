from __future__ import annotations

import os

import pytest


@pytest.mark.static_analysis
@pytest.mark.risk_ci_001
def test_required_gate_skip_probe() -> None:
    if os.environ.get("ZIZAI_TEST_FORCE_REQUIRED_SKIP") == "1":
        pytest.skip("forced skip used only by the verification runner self-test")
