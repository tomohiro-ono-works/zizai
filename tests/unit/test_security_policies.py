from __future__ import annotations

import json
from pathlib import Path

import pytest
import yaml

from apps.core.security_policies import (
    canonicalize_web_allowlist_domain,
    is_web_target_allowed,
    load_security_policies,
)


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
FIXTURE_ROOT = REPOSITORY_ROOT / "tests" / "fixtures" / "config"
EXTERNAL_URL_CASES_PATH = REPOSITORY_ROOT / "tests" / "fixtures" / "security" / "external-url-cases.json"
EXTERNAL_URL_CASES = json.loads(EXTERNAL_URL_CASES_PATH.read_text(encoding="utf-8"))["cases"]
SOURCE_POLICY_PATH = REPOSITORY_ROOT / "apps" / "common" / "config" / "security_policies.yml"

pytestmark = [pytest.mark.unit, pytest.mark.risk_config_001]


def _write_policy(root: Path, allowlist: list) -> None:
    config_dir = root / "apps" / "common" / "config"
    config_dir.mkdir(parents=True, exist_ok=True)
    (config_dir / "security_policies.yml").write_text(
        yaml.safe_dump(
            {"version": 1, "web": {"allowlist": allowlist}},
            allow_unicode=True,
            sort_keys=False,
        ),
        encoding="utf-8",
    )


def test_valid_policy_loads_expected_contract() -> None:
    policies = load_security_policies(FIXTURE_ROOT / "valid")

    assert policies["loaded"] is True
    assert policies["version"] == 1
    assert len(policies["apis"]["profiles"]) == 1
    assert len(policies["web"]["allowlist"]) == 2
    assert policies["web"]["invalid_entry_count"] == 0


def test_source_allowlist_domains_are_stored_in_canonical_form() -> None:
    raw = yaml.safe_load(SOURCE_POLICY_PATH.read_text(encoding="utf-8"))
    domains = [item["domain"] for item in raw["web"]["allowlist"]]

    assert domains == [canonicalize_web_allowlist_domain(domain) for domain in domains]


def test_invalid_policy_shape_is_rejected() -> None:
    with pytest.raises(ValueError, match="辞書形式"):
        load_security_policies(FIXTURE_ROOT / "invalid-policy")


def test_missing_policy_has_empty_safe_defaults(tmp_path: Path) -> None:
    policies = load_security_policies(tmp_path)

    assert policies["loaded"] is False
    assert policies["apis"]["profiles"] == {}
    assert policies["web"]["allowlist"] == []
    assert policies["web"]["invalid_entry_count"] == 0


def test_allowlist_load_canonicalizes_domains_and_merges_duplicate_paths(tmp_path: Path) -> None:
    _write_policy(
        tmp_path,
        [
            {"domain": "https://NOTE.COM/path?a=1#x", "path_prefixes": ["/articles", "/articles"]},
            {"domain": "note.com./", "path_prefixes": ["/about"]},
            {"domain": "*.EXAMPLE.COM./", "path_prefixes": ["/"]},
            {"domain": "例え.テスト.", "path_prefixes": ["/docs"]},
        ],
    )

    policies = load_security_policies(tmp_path)

    assert policies["web"] == {
        "allowlist": [
            {"domain": "note.com", "path_prefixes": ["/articles", "/about"]},
            {"domain": "*.example.com", "path_prefixes": ["/"]},
            {"domain": "xn--r8jz45g.xn--zckzah", "path_prefixes": ["/docs"]},
        ],
        "invalid_entry_count": 0,
    }


def test_exact_and_single_level_wildcard_rules_do_not_expand_to_other_hosts(tmp_path: Path) -> None:
    _write_policy(
        tmp_path,
        [
            {"domain": "example.com", "path_prefixes": ["/exact/"]},
            {"domain": "*.example.com", "path_prefixes": ["/sub/"]},
        ],
    )

    assert is_web_target_allowed("https://example.com/exact/page", tmp_path) is True
    assert is_web_target_allowed("https://example.com./exact/page", tmp_path) is True
    assert is_web_target_allowed("https://example.com:8443/exact/page", tmp_path) is True
    assert is_web_target_allowed("https://www.example.com/exact/page", tmp_path) is False
    assert is_web_target_allowed("https://example.com/sub/page", tmp_path) is False
    assert is_web_target_allowed("https://a.example.com/sub/page", tmp_path) is True
    assert is_web_target_allowed("https://b.example.com/sub/page", tmp_path) is True
    assert is_web_target_allowed("https://a.b.example.com/sub/page", tmp_path) is False
    assert is_web_target_allowed("https://evil-example.com/sub/page", tmp_path) is False


def test_idn_entry_and_target_share_the_same_ascii_hostname(tmp_path: Path) -> None:
    _write_policy(tmp_path, [{"domain": "例え.テスト", "path_prefixes": ["/allowed/"]}])

    assert is_web_target_allowed("https://例え.テスト/allowed/page", tmp_path) is True
    assert is_web_target_allowed("https://xn--r8jz45g.xn--zckzah/allowed/page", tmp_path) is True


def test_invalid_entries_are_excluded_without_disabling_valid_entries(
    tmp_path: Path,
    caplog: pytest.LogCaptureFixture,
) -> None:
    _write_policy(
        tmp_path,
        [
            {"domain": "valid.example", "path_prefixes": ["/allowed/"]},
            {"domain": "localhost"},
            {"domain": "localhost."},
            {"domain": "127.0.0.1"},
            {"domain": "[2001:db8::1]"},
            {"domain": "https://valid.example:443/path"},
            {"domain": "https://user@valid.example/path"},
            {"domain": "ftp://valid.example/path"},
            {"domain": "bad..example.com"},
            {"domain": "intranet"},
            {"path_prefixes": ["/"]},
            "not-a-mapping",
        ],
    )

    with caplog.at_level("WARNING", logger="apps.core.security_policies"):
        policies = load_security_policies(tmp_path)

    assert policies["web"] == {
        "allowlist": [{"domain": "valid.example", "path_prefixes": ["/allowed/"]}],
        "invalid_entry_count": 11,
    }
    assert sum("invalid web allowlist entry index=" in record.message for record in caplog.records) == 11
    assert is_web_target_allowed("https://valid.example/allowed/page", tmp_path) is True
    assert is_web_target_allowed("https://localhost/", tmp_path) is False
    assert is_web_target_allowed("https://127.0.0.1/", tmp_path) is False
    assert is_web_target_allowed("https://[2001:db8::1]/", tmp_path) is False


def test_omitted_path_prefixes_keeps_the_default_root_prefix(tmp_path: Path) -> None:
    _write_policy(tmp_path, [{"domain": "example.com"}])

    policies = load_security_policies(tmp_path)

    assert policies["web"] == {
        "allowlist": [{"domain": "example.com", "path_prefixes": ["/"]}],
        "invalid_entry_count": 0,
    }
    assert is_web_target_allowed("https://example.com/anything", tmp_path) is True


@pytest.mark.parametrize(
    "path_prefixes",
    [
        pytest.param("/admin", id="not-a-list"),
        pytest.param({"/admin": True}, id="mapping"),
        pytest.param([], id="empty-list"),
        pytest.param(None, id="explicit-null"),
        pytest.param(["/admin", 123], id="non-string-element"),
        pytest.param(["/admin", None], id="null-element"),
        pytest.param(["/admin", ""], id="empty-string-element"),
    ],
)
def test_explicit_malformed_path_prefixes_excludes_entry_without_broadening(
    tmp_path: Path,
    caplog: pytest.LogCaptureFixture,
    path_prefixes,
) -> None:
    _write_policy(tmp_path, [{"domain": "example.com", "path_prefixes": path_prefixes}])

    with caplog.at_level("WARNING", logger="apps.core.security_policies"):
        policies = load_security_policies(tmp_path)

    assert policies["web"] == {"allowlist": [], "invalid_entry_count": 1}
    assert sum("invalid web allowlist entry index=" in record.message for record in caplog.records) == 1
    assert all("example.com" not in record.message for record in caplog.records)
    assert all("/admin" not in record.message for record in caplog.records)
    assert is_web_target_allowed("https://example.com/admin", tmp_path) is False
    assert is_web_target_allowed("https://example.com/secret/page", tmp_path) is False


def test_invalid_duplicate_entry_does_not_mutate_the_valid_rule(
    tmp_path: Path,
    caplog: pytest.LogCaptureFixture,
) -> None:
    _write_policy(
        tmp_path,
        [
            {"domain": "example.com", "path_prefixes": ["/allowed/"]},
            {"domain": "EXAMPLE.COM.", "path_prefixes": "/admin"},
            {"domain": "https://example.com/", "path_prefixes": []},
        ],
    )

    with caplog.at_level("WARNING", logger="apps.core.security_policies"):
        policies = load_security_policies(tmp_path)

    assert policies["web"] == {
        "allowlist": [{"domain": "example.com", "path_prefixes": ["/allowed/"]}],
        "invalid_entry_count": 2,
    }
    assert is_web_target_allowed("https://example.com/allowed/page", tmp_path) is True
    assert is_web_target_allowed("https://example.com/admin", tmp_path) is False
    assert is_web_target_allowed("https://example.com/other", tmp_path) is False


def test_invalid_entry_does_not_create_a_rule_for_a_later_valid_duplicate(tmp_path: Path) -> None:
    _write_policy(
        tmp_path,
        [
            {"domain": "example.com", "path_prefixes": []},
            {"domain": "example.com", "path_prefixes": ["/allowed/"]},
        ],
    )

    policies = load_security_policies(tmp_path)

    assert policies["web"] == {
        "allowlist": [{"domain": "example.com", "path_prefixes": ["/allowed/"]}],
        "invalid_entry_count": 1,
    }
    assert is_web_target_allowed("https://example.com/allowed/page", tmp_path) is True
    assert is_web_target_allowed("https://example.com/other", tmp_path) is False


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        ("https://example.com/allowed/orders", True),
        ("http://sub.example.com/anything", True),
        ("https://example.net/allowed/orders", False),
        ("https://example.com/other", False),
        ("ftp://example.com/allowed/orders", False),
        ("file://example.com/allowed/orders", False),
        ("data:text/html,example.com/allowed/orders", False),
        ("blob:https://example.com/allowed/orders", False),
        ("example.com/allowed/orders", False),
    ],
)
def test_web_allowlist_requires_http_scheme_domain_and_path(url: str, expected: bool) -> None:
    assert is_web_target_allowed(url, FIXTURE_ROOT / "valid") is expected


@pytest.mark.risk_ext_001
@pytest.mark.parametrize("case", EXTERNAL_URL_CASES, ids=[case["url"] for case in EXTERNAL_URL_CASES])
def test_external_url_fixture_cases_match_policy_decision(case: dict) -> None:
    assert is_web_target_allowed(case["url"], FIXTURE_ROOT / "valid") is bool(case["accepted"])
