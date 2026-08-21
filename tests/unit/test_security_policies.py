from __future__ import annotations

from pathlib import Path

import pytest

from core.security_policies import is_web_target_allowed, load_security_policies


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
FIXTURE_ROOT = REPOSITORY_ROOT / "tests" / "fixtures" / "config"

pytestmark = [pytest.mark.unit, pytest.mark.risk_config_001]


def test_valid_policy_loads_expected_contract() -> None:
    policies = load_security_policies(FIXTURE_ROOT / "valid")

    assert policies["loaded"] is True
    assert policies["version"] == 1
    assert len(policies["apis"]["profiles"]) == 1
    assert len(policies["web"]["allowlist"]) == 2


def test_invalid_policy_shape_is_rejected() -> None:
    with pytest.raises(ValueError, match="辞書形式"):
        load_security_policies(FIXTURE_ROOT / "invalid-policy")


def test_missing_policy_has_empty_safe_defaults(tmp_path: Path) -> None:
    policies = load_security_policies(tmp_path)

    assert policies["loaded"] is False
    assert policies["apis"]["profiles"] == {}
    assert policies["web"]["allowlist"] == []


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        ("https://example.com/allowed/orders", True),
        ("http://sub.example.com/anything", True),
        ("https://example.net/allowed/orders", False),
        ("https://example.com/other", False),
        ("ftp://example.com/allowed/orders", False),
        ("file://example.com/allowed/orders", False),
    ],
)
def test_web_allowlist_requires_http_scheme_domain_and_path(url: str, expected: bool) -> None:
    assert is_web_target_allowed(url, FIXTURE_ROOT / "valid") is expected
