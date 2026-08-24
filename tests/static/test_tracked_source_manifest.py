from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = (
    REPOSITORY_ROOT / "tests" / "fixtures" / "contracts" / "tracked-test-sources.json"
)


def load_manifest() -> dict[str, object]:
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def tracked_verification_sources() -> list[str]:
    result = subprocess.run(
        [
            "git",
            "ls-files",
            "--cached",
            "--",
            "pytest.ini",
            "tests",
            ".github/workflows/migration-verification.yml",
            "apps/common/contracts/bridge/protocol-v1.json",
        ],
        cwd=REPOSITORY_ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=True,
    )
    return sorted(line.strip().replace("\\", "/") for line in result.stdout.splitlines())


@pytest.mark.static_analysis
@pytest.mark.risk_ci_001
def test_manifest_entries_exist_and_are_unique() -> None:
    manifest = load_manifest()
    sources = manifest["canonical_sources"]

    assert isinstance(sources, list)
    assert len(sources) == len(set(sources))
    assert sources == sorted(sources)
    assert all((REPOSITORY_ROOT / source).is_file() for source in sources)


@pytest.mark.static_analysis
@pytest.mark.risk_ci_001
def test_git_tracks_exactly_the_canonical_verification_sources() -> None:
    manifest = load_manifest()

    assert tracked_verification_sources() == manifest["canonical_sources"]


@pytest.mark.static_analysis
@pytest.mark.risk_ci_001
def test_tracked_verification_sources_exclude_generated_artifacts() -> None:
    manifest = load_manifest()
    path_fragments = manifest["generated_path_fragments"]
    extensions = manifest["generated_extensions"]

    for source in tracked_verification_sources():
        normalized = f"/{source.lower()}"
        assert not any(fragment in normalized for fragment in path_fragments), source
        assert not any(normalized.endswith(extension) for extension in extensions), source
