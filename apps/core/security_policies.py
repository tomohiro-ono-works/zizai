from __future__ import annotations

import ipaddress
import logging
import re
from pathlib import Path
from urllib.parse import urlparse

import yaml

from apps.core.repository_layout import resolve_repository_layout


BASE_DIR = Path(__file__).resolve().parents[2]

WEB_TARGET_ALLOWED_SCHEMES = frozenset({"http", "https"})
_DOMAIN_LABEL_PATTERN = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$")
_IPV4_LIKE_LABEL_PATTERN = re.compile(r"^(?:0x[0-9a-f]+|[0-9]+)$")

logger = logging.getLogger(__name__)


def load_security_policies(base_dir: str | Path | None = None):
    root = Path(base_dir).resolve() if base_dir else BASE_DIR
    policy_path = resolve_repository_layout(root).source_config_root / "security_policies.yml"
    if not policy_path.exists():
        return {
            "loaded": False,
            "path": "",
            "version": 1,
            "apis": {"profiles": {}},
            "web": {"allowlist": [], "invalid_entry_count": 0},
        }

    with policy_path.open("r", encoding="utf-8") as fh:
        raw = yaml.safe_load(fh) or {}

    if not isinstance(raw, dict):
        raise ValueError("security_policies.yml は辞書形式である必要があります。")

    return {
        "loaded": True,
        "path": "",
        "version": int(raw.get("version") or 1),
        "apis": _normalize_apis(raw.get("apis")),
        "web": _normalize_allowlist(raw.get("web")),
    }


def _normalize_apis(value):
    profiles = {}
    if isinstance(value, dict):
        raw_profiles = value.get("profiles")
        if isinstance(raw_profiles, dict):
            for name, item in raw_profiles.items():
                if not isinstance(item, dict):
                    continue
                profiles[str(name)] = {
                    "base_url": str(item.get("base_url") or ""),
                    "timeout_sec": int(item.get("timeout_sec") or 30),
                    "certificate": _normalize_certificate(item.get("certificate")),
                }
    return {"profiles": profiles}


def _normalize_certificate(value):
    if not isinstance(value, dict):
        return None
    provider = str(value.get("provider") or "").strip()
    if not provider:
        return None
    return {
        "provider": provider,
        "store_location": str(value.get("store_location") or ""),
        "store_name": str(value.get("store_name") or ""),
        "subject_contains": str(value.get("subject_contains") or ""),
    }


def _canonicalize_dns_hostname(hostname: str) -> str:
    host = str(hostname or "").strip().lower()
    if host.endswith("."):
        host = host[:-1]
    if not host or host.endswith("."):
        raise ValueError("host is empty or has multiple trailing dots")
    if host == "localhost" or host.endswith(".localhost"):
        raise ValueError("localhost is not supported")

    try:
        ipaddress.ip_address(host)
    except ValueError:
        pass
    else:
        raise ValueError("IP address is not supported")

    raw_labels = host.split(".")
    if len(raw_labels) < 2:
        raise ValueError("single-label host is not supported")
    if all(_IPV4_LIKE_LABEL_PATTERN.fullmatch(label) for label in raw_labels):
        raise ValueError("IPv4-like host is not supported")

    try:
        canonical = host.encode("idna").decode("ascii").lower()
    except UnicodeError as error:
        raise ValueError("host IDN conversion failed") from error

    if len(canonical) > 253:
        raise ValueError("host is too long")
    for label in canonical.split("."):
        if not _DOMAIN_LABEL_PATTERN.fullmatch(label):
            raise ValueError("host contains an invalid DNS label")
        if label.startswith("xn--"):
            try:
                decoded = label.encode("ascii").decode("idna")
                if decoded.encode("idna").decode("ascii").lower() != label:
                    raise UnicodeError("punycode round-trip mismatch")
            except UnicodeError as error:
                raise ValueError("host contains invalid punycode") from error
    return canonical


def canonicalize_web_allowlist_domain(value) -> str:
    text = str(value or "").strip()
    if not text:
        raise ValueError("domain is required")
    if text.startswith("//"):
        raise ValueError("scheme-relative URL is not supported")

    has_url_scheme = "://" in text
    parsed = urlparse(text if has_url_scheme else f"//{text}")
    if has_url_scheme and (parsed.scheme or "").lower() not in WEB_TARGET_ALLOWED_SCHEMES:
        raise ValueError("URL scheme must be http or https")
    if parsed.username is not None or parsed.password is not None:
        raise ValueError("userinfo is not supported")
    try:
        explicit_port = parsed.port
    except ValueError as error:
        raise ValueError("port is invalid or not supported") from error
    if explicit_port is not None or str(parsed.netloc or "").endswith(":"):
        raise ValueError("port is not supported")

    try:
        parsed_hostname = parsed.hostname
    except ValueError as error:
        raise ValueError("host is invalid") from error
    host = str(parsed_hostname or "").strip()
    wildcard = host.startswith("*.")
    if wildcard:
        host = host[2:]
    canonical_host = _canonicalize_dns_hostname(host)
    return f"*.{canonical_host}" if wildcard else canonical_host


def _log_invalid_allowlist_entry(index: int, reason: str) -> None:
    logger.warning(
        "invalid web allowlist entry index=%s ignored reason=%s",
        index,
        str(reason or "validation failed"),
    )


def _normalize_path_prefixes(item):
    if "path_prefixes" not in item:
        return ["/"]
    prefixes = item["path_prefixes"]
    if not isinstance(prefixes, list) or not prefixes:
        raise ValueError("path_prefixes must be a non-empty list when provided")
    for prefix in prefixes:
        if not isinstance(prefix, str) or not prefix:
            raise ValueError("path_prefixes must contain only non-empty strings")
    return list(prefixes)


def _normalize_allowlist(value):
    rules_by_domain = {}
    invalid_entry_count = 0
    if isinstance(value, dict):
        raw_items = value.get("allowlist")
        if isinstance(raw_items, list):
            for index, item in enumerate(raw_items):
                if not isinstance(item, dict):
                    invalid_entry_count += 1
                    _log_invalid_allowlist_entry(index, "entry must be a mapping")
                    continue
                try:
                    domain = canonicalize_web_allowlist_domain(item.get("domain"))
                    prefixes = _normalize_path_prefixes(item)
                except ValueError as error:
                    invalid_entry_count += 1
                    _log_invalid_allowlist_entry(index, str(error))
                    continue
                rule = rules_by_domain.setdefault(domain, {"domain": domain, "path_prefixes": []})
                for prefix in prefixes:
                    if prefix not in rule["path_prefixes"]:
                        rule["path_prefixes"].append(prefix)
    return {
        "allowlist": list(rules_by_domain.values()),
        "invalid_entry_count": invalid_entry_count,
    }


def get_api_profile(profile_name: str, base_dir: str | Path | None = None):
    policies = load_security_policies(base_dir=base_dir)
    profiles = policies.get("apis", {}).get("profiles", {})
    return profiles.get(str(profile_name or "").strip())


def is_web_target_allowed(url: str, base_dir: str | Path | None = None):
    try:
        policies = load_security_policies(base_dir=base_dir)
    except (OSError, ValueError, yaml.YAMLError):
        return False
    allowlist = policies.get("web", {}).get("allowlist", [])
    parsed = urlparse(str(url or ""))
    if (parsed.scheme or "").lower() not in WEB_TARGET_ALLOWED_SCHEMES:
        return False
    try:
        domain = _canonicalize_dns_hostname(parsed.hostname or "")
    except ValueError:
        return False
    path = parsed.path or "/"
    for rule in allowlist:
        rule_domain = str(rule.get("domain") or "")
        if rule_domain.startswith("*."):
            wildcard_suffix = rule_domain[2:]
            suffix = f".{wildcard_suffix}"
            if not domain.endswith(suffix):
                continue
            subdomain = domain[: -len(suffix)]
            if not subdomain or "." in subdomain:
                continue
        elif domain != rule_domain:
            continue
        for prefix in rule.get("path_prefixes", ["/"]):
            if path.startswith(prefix):
                return True
    return False


def is_rpa_target_allowed(url: str, base_dir: str | Path | None = None):
    return is_web_target_allowed(url, base_dir=base_dir)
