from __future__ import annotations

import importlib.util
import subprocess
from pathlib import Path

import pytest


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
REMOTE_SAFE_GATE_PATH = REPOSITORY_ROOT / ".github" / "scripts" / "remote_safe_gate.py"


def load_remote_safe_gate():
    spec = importlib.util.spec_from_file_location("remote_safe_gate", REMOTE_SAFE_GATE_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def run_git(root: Path, *arguments: str) -> str:
    result = subprocess.run(
        ["git", *arguments],
        cwd=root,
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=True,
    )
    return result.stdout.strip()


def initialize_fixture_repository(root: Path, initial_text: str = "safe\n") -> str:
    run_git(root, "init", "--quiet")
    (root / "tracked.txt").write_text(initial_text, encoding="utf-8")
    run_git(root, "add", "tracked.txt")
    run_git(
        root,
        "-c",
        "user.name=Remote Safe Gate Fixture",
        "-c",
        "user.email=gate@users.noreply.github.com",
        "commit",
        "--quiet",
        "-m",
        "baseline",
    )
    return run_git(root, "rev-parse", "HEAD")


def commit_fixture_file(root: Path, relative_path: str, text: str, message: str) -> str:
    path = root / relative_path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    run_git(root, "add", relative_path)
    run_git(
        root,
        "-c",
        "user.name=Remote Safe Gate Fixture",
        "-c",
        "user.email=gate@users.noreply.github.com",
        "commit",
        "--quiet",
        "-m",
        message,
    )
    return run_git(root, "rev-parse", "HEAD")


def is_ignored(path: str) -> bool:
    result = subprocess.run(
        ["git", "check-ignore", "--quiet", "--no-index", path],
        cwd=REPOSITORY_ROOT,
        check=False,
    )
    return result.returncode == 0


@pytest.mark.static_analysis
@pytest.mark.risk_ci_001
@pytest.mark.parametrize(
    "path",
    [
        "tests/run-verification.ps1",
        "tests/unit/example.py",
        "tests/manual/manual-ui-result.schema.json",
        ".github/workflows/migration-verification.yml",
        ".github/scripts/remote_safe_gate.py",
    ],
)
def test_canonical_verification_source_is_not_ignored(path: str) -> None:
    assert not is_ignored(path), f"canonical source is ignored: {path}"


@pytest.mark.static_analysis
@pytest.mark.risk_ci_001
@pytest.mark.parametrize(
    "path",
    [
        "tests/unit/__pycache__/example.cpython-311.pyc",
        "tests/playwright/node_modules/example/package.json",
        "tests/playwright/results/result.json",
        "tests/playwright/artifacts/screenshot.png",
        "tests/results/manual/evidence.png",
        "tests/ui_analysis/report.md",
        "tests/preview.html",
        "results/manual/RISK-UI-001.json",
        ".github/workflows/playwright.yml",
    ],
)
def test_generated_and_historical_artifacts_remain_ignored(path: str) -> None:
    assert is_ignored(path), f"artifact is not ignored: {path}"


@pytest.mark.static_analysis
@pytest.mark.risk_ci_001
def test_remote_safe_gate_classifies_pass_review_and_fail_without_retaining_values() -> None:
    gate = load_remote_safe_gate()
    personal_email = "developer" + "@" + "sample.invalid"
    personal_path = "C:" + "\\Users\\sample-user\\workspace"
    credential = "gh" + "p_" + "A" * 36

    assert gate.classify_findings(gate.scan_text("repository/path/file.txt", "safe.txt")) == "PASS"
    assert gate.classify_findings(gate.scan_text(personal_email, "review.txt")) == "REVIEW"
    assert gate.classify_findings(gate.scan_text(personal_path, "path.txt")) == "FAIL"

    findings = gate.scan_text(credential, "secret.txt")
    assert gate.classify_findings(findings) == "FAIL"
    report = gate.render_report(findings)
    assert credential not in report
    assert "secret.txt" in report
    assert "credential" in report


@pytest.mark.static_analysis
@pytest.mark.risk_ci_001
def test_remote_safe_gate_can_disable_privacy_checks_for_historical_tree_scan() -> None:
    gate = load_remote_safe_gate()
    personal_path = "C:" + "\\Users\\historical-user\\workspace"
    credential = "AK" + "IA" + "A" * 16

    assert gate.scan_text(personal_path, "historical.txt", include_privacy=False) == []
    findings = gate.scan_text(credential, "historical-secret.txt", include_privacy=False)
    assert gate.classify_findings(findings) == "FAIL"


@pytest.mark.static_analysis
@pytest.mark.risk_ci_001
def test_remote_safe_gate_distinguishes_example_and_non_example_credential_urls() -> None:
    gate = load_remote_safe_gate()
    example_url = "https://" + "user" + ":" + "pass" + "@example.com/"
    credential_url = "https://" + "deploy" + ":" + "a-long-private-value" + "@service.invalid/"

    assert gate.scan_text(example_url, "fixture.txt", include_privacy=False) == []
    findings = gate.scan_text(credential_url, "config.txt", include_privacy=False)
    assert gate.classify_findings(findings) == "FAIL"


@pytest.mark.static_analysis
@pytest.mark.risk_ci_001
def test_remote_safe_gate_normal_mode_allows_pre_baseline_privacy(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    gate = load_remote_safe_gate()
    push_base = initialize_fixture_repository(tmp_path)
    personal_path = "C:" + "\\Users\\historical-user\\workspace"
    personal_email = "historical-user" + "@" + "sample.invalid"
    baseline = commit_fixture_file(
        tmp_path,
        "historical-path.txt",
        f"{personal_path}\n{personal_email}\n",
        "historical privacy",
    )

    exit_code = gate.main(
        ["--root", str(tmp_path), "--push-base", push_base, "--baseline", baseline]
    )
    output = capsys.readouterr().out

    assert exit_code == 0
    assert "Remote Safe Gate: PASS" in output
    assert personal_path not in output
    assert personal_email not in output


@pytest.mark.static_analysis
@pytest.mark.risk_ci_001
def test_remote_safe_gate_normal_mode_rejects_pre_baseline_credentials_after_removal(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    gate = load_remote_safe_gate()
    push_base = initialize_fixture_repository(tmp_path)
    credential = "gh" + "p_" + "A" * 36
    baseline = commit_fixture_file(
        tmp_path,
        "historical-secret.txt",
        credential,
        "historical credential",
    )
    run_git(tmp_path, "rm", "historical-secret.txt")
    run_git(
        tmp_path,
        "-c",
        "user.name=Remote Safe Gate Fixture",
        "-c",
        "user.email=gate@users.noreply.github.com",
        "commit",
        "--quiet",
        "-m",
        "remove historical credential",
    )

    exit_code = gate.main(
        ["--root", str(tmp_path), "--push-base", push_base, "--baseline", baseline]
    )
    output = capsys.readouterr().out

    assert exit_code == 1
    assert "credential" in output
    assert credential not in output


@pytest.mark.static_analysis
@pytest.mark.risk_ci_001
def test_remote_safe_gate_normal_mode_rejects_post_baseline_privacy(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    gate = load_remote_safe_gate()
    baseline = initialize_fixture_repository(tmp_path)
    personal_path = "C:" + "\\Users\\new-user\\workspace"
    commit_fixture_file(tmp_path, "new-path.txt", personal_path, "new privacy")

    exit_code = gate.main(
        ["--root", str(tmp_path), "--push-base", baseline, "--baseline", baseline]
    )
    output = capsys.readouterr().out

    assert exit_code == 1
    assert "personal-path" in output
    assert "push:" in output
    assert personal_path not in output


@pytest.mark.static_analysis
@pytest.mark.risk_ci_001
def test_remote_safe_gate_normal_mode_fails_when_baseline_cannot_be_resolved(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    gate = load_remote_safe_gate()
    push_base = initialize_fixture_repository(tmp_path)

    exit_code = gate.main(
        [
            "--root",
            str(tmp_path),
            "--push-base",
            push_base,
            "--baseline",
            "baseline-does-not-exist",
        ]
    )
    output = capsys.readouterr().out

    assert exit_code == 1
    assert "gate-error" in output
    assert "baseline-does-not-exist" not in output


@pytest.mark.static_analysis
@pytest.mark.risk_ci_001
def test_remote_safe_gate_normal_mode_covers_working_staged_untracked_and_push(
    tmp_path: Path,
) -> None:
    gate = load_remote_safe_gate()
    baseline = initialize_fixture_repository(tmp_path)

    email = "developer" + "@" + "sample.invalid"
    personal_path = "C:" + "\\Users\\sample-user\\workspace"
    credential = "gh" + "p_" + "A" * 36
    (tmp_path / "tracked.txt").write_text(email, encoding="utf-8")
    (tmp_path / "staged.txt").write_text(personal_path, encoding="utf-8")
    run_git(tmp_path, "add", "staged.txt")
    (tmp_path / "untracked.txt").write_text(credential, encoding="utf-8")

    findings = gate.run_normal(tmp_path, baseline, baseline)
    sources = {finding.source.split(":", 1)[0] for finding in findings}
    assert {"working-tree", "staged", "untracked"}.issubset(sources)
    assert gate.classify_findings(findings) == "FAIL"

    run_git(tmp_path, "add", "tracked.txt")
    run_git(
        tmp_path,
        "-c",
        "user.name=Remote Safe Gate Fixture",
        "-c",
        "user.email=gate@users.noreply.github.com",
        "commit",
        "--quiet",
        "-m",
        "push candidate",
    )
    findings = gate.run_normal(tmp_path, baseline, baseline)
    assert any(finding.source.startswith("push:") for finding in findings)


@pytest.mark.static_analysis
@pytest.mark.risk_ci_001
def test_remote_safe_gate_audit_does_not_reject_pre_baseline_privacy(tmp_path: Path) -> None:
    gate = load_remote_safe_gate()
    historical_path = "C:" + "\\Users\\historical-user\\workspace"
    baseline = initialize_fixture_repository(tmp_path, historical_path)

    assert gate.classify_findings(gate.run_audit(tmp_path, baseline, all_history_secrets=False)) == "PASS"

    new_path = "C:" + "\\Users\\new-user\\workspace"
    (tmp_path / "new-path.txt").write_text(new_path, encoding="utf-8")
    run_git(tmp_path, "add", "new-path.txt")
    run_git(
        tmp_path,
        "-c",
        "user.name=Remote Safe Gate Fixture",
        "-c",
        "user.email=gate@users.noreply.github.com",
        "commit",
        "--quiet",
        "-m",
        "new privacy value",
    )

    findings = gate.run_audit(tmp_path, baseline, all_history_secrets=False)
    assert gate.classify_findings(findings) == "FAIL"
    assert any(finding.source.startswith("baseline-audit:") for finding in findings)


@pytest.mark.static_analysis
@pytest.mark.risk_ci_001
@pytest.mark.parametrize(
    ("path", "expected"),
    [
        (".claude/settings.local.json", True),
        (".claude/settings.json", False),
        (".obsidian/workspace.json", True),
        (".obsidian/app.json", False),
        (".playwright-mcp/profile/state.json", True),
        (".env", True),
        (".env.local", True),
        (".env.example", False),
        (".env.test.example", False),
        ("tmp_staged_files_release.txt", True),
    ],
)
def test_local_only_ignore_boundary_is_minimal(path: str, expected: bool) -> None:
    assert is_ignored(path) is expected
