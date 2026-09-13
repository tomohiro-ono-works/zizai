from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path
from typing import Iterable, NamedTuple, Sequence


HISTORICAL_BASELINE = "8b66fe6"
MAX_TEXT_BYTES = 5 * 1024 * 1024


class Finding(NamedTuple):
    level: str
    kind: str
    source: str
    line: int


_CREDENTIAL_PATTERNS = (
    (
        "private-key",
        re.compile(r"-----BEGIN (?:RSA |DSA |EC |OPENSSH |PGP )?PRIVATE KEY-----"),
    ),
    (
        "credential-url",
        re.compile(
            r"[a-z][a-z0-9+.-]*://(?P<user>[^\s/:@]+):(?P<password>[^\s/@]+)@"
            r"(?P<host>[A-Za-z0-9.-]+)",
            re.I,
        ),
    ),
    ("credential", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}\b")),
    ("credential", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("credential", re.compile(r"\bAIza[0-9A-Za-z_-]{35}\b")),
    ("credential", re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{20,}\b")),
    (
        "credential",
        re.compile(
            r"(?i)\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|password|secret)"
            r"\s*[:=]\s*['\"]?[A-Za-z0-9_./+\-=]{20,}"
        ),
    ),
)

_PERSONAL_PATH_PATTERNS = (
    re.compile(
        r"(?i)\b[A-Z]:[\\/]+Users[\\/]+"
        r"(?!<[^>]+>|%USERNAME%|\{(?:user|username)\}|(?:user|username)[\\/])"
        r"[^\\/\s'\"<>]+[\\/]"
    ),
    re.compile(
        r"/Users/(?!<[^>]+>|\$\{?(?:USER|USERNAME)\}?/|\{(?:user|username)\}/)"
        r"[^/\s'\"<>]+/"
    ),
)

_EMAIL_PATTERN = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)


def scan_text(text: str, source: str, *, include_privacy: bool = True) -> list[Finding]:
    """Classify text without retaining or returning the matched value."""
    findings: list[Finding] = []
    for line_number, line in enumerate(text.splitlines(), start=1):
        for kind, pattern in _CREDENTIAL_PATTERNS:
            matches = list(pattern.finditer(line))
            if kind == "credential-url":
                matches = [match for match in matches if not _is_example_credential_url(match)]
            if matches:
                findings.append(Finding("FAIL", kind, source, line_number))

        if not include_privacy:
            continue

        if any(pattern.search(line) for pattern in _PERSONAL_PATH_PATTERNS):
            findings.append(Finding("FAIL", "personal-path", source, line_number))

        for match in _EMAIL_PATTERN.finditer(line):
            domain = match.group(0).rsplit("@", 1)[1].lower()
            if domain != "users.noreply.github.com":
                findings.append(Finding("REVIEW", "personal-email", source, line_number))
                break

    return _deduplicate(findings)


def _is_example_credential_url(match: re.Match[str]) -> bool:
    return (
        match.group("host").lower() in {"example.com", "example.org", "example.net"}
        and match.group("user").lower() in {"user", "username", "test"}
        and match.group("password").lower() in {"pass", "password", "test"}
    )


def classify_findings(findings: Iterable[Finding]) -> str:
    levels = {finding.level for finding in findings}
    if "FAIL" in levels:
        return "FAIL"
    if "REVIEW" in levels:
        return "REVIEW"
    return "PASS"


def render_report(findings: Iterable[Finding]) -> str:
    normalized = _deduplicate(findings)
    status = classify_findings(normalized)
    lines = [f"Remote Safe Gate: {status}"]
    for finding in normalized:
        lines.append(
            f"[{finding.level}] {finding.kind} at {finding.source}:{finding.line} "
            "(value redacted)"
        )
    return "\n".join(lines)


def _deduplicate(findings: Iterable[Finding]) -> list[Finding]:
    return sorted(set(findings), key=lambda item: (item.source, item.line, item.kind, item.level))


def _git(root: Path, *arguments: str) -> str:
    result = subprocess.run(
        ["git", *arguments],
        cwd=root,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        error = result.stderr.decode("utf-8", errors="replace").strip()
        raise RuntimeError(error or f"git {' '.join(arguments)} failed")
    return result.stdout.decode("utf-8", errors="replace")


def _read_text_candidate(path: Path) -> str | None:
    try:
        payload = path.read_bytes()
    except (OSError, PermissionError):
        return None
    if len(payload) > MAX_TEXT_BYTES or b"\x00" in payload:
        return None
    return payload.decode("utf-8", errors="replace")


def _scan_current_tracked_tree(root: Path) -> list[Finding]:
    findings: list[Finding] = []
    paths = _git(root, "ls-files", "-z").split("\0")
    for relative_path in paths:
        if not relative_path:
            continue
        text = _read_text_candidate(root / relative_path)
        if text is not None:
            findings.extend(
                scan_text(text, f"tracked:{relative_path}", include_privacy=False)
            )
    return findings


def _scan_patch(patch: str, source_prefix: str, *, include_privacy: bool = True) -> list[Finding]:
    findings: list[Finding] = []
    relative_path = "unknown"
    current_line = 0
    for line in patch.splitlines():
        if line.startswith("+++ b/"):
            relative_path = line[6:]
            continue
        if line.startswith("@@"):
            match = re.search(r"\+(\d+)", line)
            current_line = int(match.group(1)) if match else 0
            continue
        if line.startswith("+") and not line.startswith("+++"):
            added = scan_text(
                line[1:],
                f"{source_prefix}:{relative_path}",
                include_privacy=include_privacy,
            )
            findings.extend(
                Finding(item.level, item.kind, item.source, current_line or item.line)
                for item in added
            )
            current_line += 1
        elif line.startswith("-"):
            continue
        elif current_line:
            current_line += 1
    return findings


def _scan_untracked(root: Path) -> list[Finding]:
    findings: list[Finding] = []
    paths = _git(root, "ls-files", "--others", "--exclude-standard", "-z").split("\0")
    for relative_path in paths:
        if not relative_path:
            continue
        text = _read_text_candidate(root / relative_path)
        if text is not None:
            findings.extend(scan_text(text, f"untracked:{relative_path}"))
    return findings


def _commit_range(root: Path, revision_range: str) -> list[str]:
    return [line for line in _git(root, "rev-list", "--reverse", revision_range).splitlines() if line]


def _scan_commits(
    root: Path,
    commits: Sequence[str],
    *,
    include_privacy: bool,
    source_prefix: str,
) -> list[Finding]:
    findings: list[Finding] = []
    for commit in commits:
        patch = _git(root, "show", "--format=", "--no-ext-diff", "--unified=0", commit)
        findings.extend(
            _scan_patch(
                patch,
                f"{source_prefix}:{commit[:12]}",
                include_privacy=include_privacy,
            )
        )
    return findings


def _resolve_push_base(root: Path, explicit_base: str | None) -> str | None:
    if explicit_base:
        _git(root, "rev-parse", "--verify", f"{explicit_base}^{{commit}}")
        return explicit_base
    try:
        upstream = _git(
            root,
            "rev-parse",
            "--abbrev-ref",
            "--symbolic-full-name",
            "@{upstream}",
        ).strip()
    except RuntimeError:
        return None
    return _git(root, "merge-base", upstream, "HEAD").strip()


def run_normal(root: Path, push_base: str | None) -> list[Finding]:
    findings = _scan_current_tracked_tree(root)
    findings.extend(
        _scan_patch(_git(root, "diff", "--no-ext-diff", "--unified=0"), "working-tree")
    )
    findings.extend(
        _scan_patch(
            _git(root, "diff", "--cached", "--no-ext-diff", "--unified=0"),
            "staged",
        )
    )
    findings.extend(_scan_untracked(root))

    resolved_base = _resolve_push_base(root, push_base)
    if resolved_base is None:
        findings.append(Finding("REVIEW", "push-base-unresolved", "git", 0))
    else:
        commits = _commit_range(root, f"{resolved_base}..HEAD")
        findings.extend(
            _scan_commits(
                root,
                commits,
                include_privacy=True,
                source_prefix="push",
            )
        )
    return _deduplicate(findings)


def run_audit(root: Path, baseline: str, *, all_history_secrets: bool) -> list[Finding]:
    _git(root, "rev-parse", "--verify", f"{baseline}^{{commit}}")
    commits = _commit_range(root, f"{baseline}..HEAD")
    findings = _scan_commits(
        root,
        commits,
        include_privacy=True,
        source_prefix="baseline-audit",
    )
    findings.extend(_scan_current_tracked_tree(root))
    if all_history_secrets:
        all_commits = _commit_range(root, "--all")
        findings.extend(
            _scan_commits(
                root,
                all_commits,
                include_privacy=False,
                source_prefix="history-secret-audit",
            )
        )
    return _deduplicate(findings)


def _repository_root(candidate: str | None) -> Path:
    start = Path(candidate).resolve() if candidate else Path.cwd()
    return Path(_git(start, "rev-parse", "--show-toplevel").strip())


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Detect unsafe values before remote publication.")
    parser.add_argument("--mode", choices=("normal", "audit"), default="normal")
    parser.add_argument("--root", help="Repository path; defaults to the current repository.")
    parser.add_argument("--push-base", help="Commit already present on the destination remote.")
    parser.add_argument("--baseline", default=HISTORICAL_BASELINE)
    parser.add_argument(
        "--all-history-secrets",
        action="store_true",
        help="In audit mode, also inspect every commit for high-confidence credentials.",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    arguments = build_parser().parse_args(argv)
    try:
        root = _repository_root(arguments.root)
        if arguments.mode == "normal":
            findings = run_normal(root, arguments.push_base)
        else:
            findings = run_audit(
                root,
                arguments.baseline,
                all_history_secrets=arguments.all_history_secrets,
            )
    except (OSError, RuntimeError) as error:
        print("Remote Safe Gate: FAIL")
        print(f"[FAIL] gate-error at git:0 ({type(error).__name__}; details redacted)")
        return 1

    print(render_report(findings))
    status = classify_findings(findings)
    return {"PASS": 0, "FAIL": 1, "REVIEW": 2}[status]


if __name__ == "__main__":
    sys.exit(main())
