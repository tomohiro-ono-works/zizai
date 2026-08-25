from __future__ import annotations

import json
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

import pytest


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
PYTHON = Path(sys.executable)
GOAL_PATH = REPOSITORY_ROOT / "tests" / "fixtures" / "task012" / "frontend-boundary-goal.json"

pytestmark = [pytest.mark.static_analysis]


class AssetParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.references: list[tuple[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        normalized_attrs = dict(attrs)
        for attribute in ("src", "href"):
            value = normalized_attrs.get(attribute)
            if value:
                self.references.append((tag, value))


@pytest.fixture(scope="module")
def goal() -> dict:
    return json.loads(GOAL_PATH.read_text(encoding="utf-8"))


def test_apps_gui_directory_exists_as_the_relocated_frontend_root(goal: dict) -> None:
    gui_root = REPOSITORY_ROOT / goal["gui_root"]

    assert gui_root.is_dir(), f"approved apps/gui frontend root is missing: {gui_root}"


def test_root_static_directory_is_absent_after_relocation(goal: dict) -> None:
    retired_root = REPOSITORY_ROOT / goal["retired_gui_root"]

    assert not retired_root.exists(), f"retired root static/ still exists: {retired_root}"


@pytest.mark.parametrize("entry_name", ["home.html", "dataflow.html", "settings.html"])
def test_three_frontend_entries_are_served_from_apps_gui(entry_name: str, goal: dict) -> None:
    assert entry_name in goal["web_entries"]
    entry_path = REPOSITORY_ROOT / goal["gui_root"] / entry_name

    assert entry_path.is_file(), f"frontend entry is missing under apps/gui: {entry_path}"


def test_all_99_current_frontend_assets_relocate_to_apps_gui_with_identical_relative_paths(
    goal: dict,
) -> None:
    assert len(goal["assets"]) == goal["expected_asset_count"]
    gui_root = REPOSITORY_ROOT / goal["gui_root"]

    missing = [
        relative_asset
        for relative_asset in goal["assets"]
        if not (gui_root / relative_asset).is_file()
    ]

    assert missing == [], f"assets did not relocate to apps/gui: {missing}"


def test_desktop_entrypoint_resolves_the_relocated_home_html_path(goal: dict) -> None:
    result = subprocess.run(
        [
            str(PYTHON),
            "-c",
            "import zizai\nprint(zizai.HOME_HTML_PATH.relative_to(zizai.BASE_DIR).as_posix())",
        ],
        cwd=REPOSITORY_ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
        timeout=30,
    )

    assert result.returncode == 0, f"import zizai failed in a fresh process: {result.stderr.strip()}"
    resolved_relative_path = result.stdout.strip().splitlines()[-1]

    assert resolved_relative_path == goal["host_entry"]["html_relative_path"], (
        f"zizai.py still resolves the pre-migration static/ entry path: {resolved_relative_path}"
    )


def test_apps_gui_entries_resolve_all_local_asset_references_within_apps_gui(goal: dict) -> None:
    gui_root = REPOSITORY_ROOT / goal["gui_root"]
    missing_entries: list[str] = []
    missing_assets: list[str] = []

    for entry_name in goal["web_entries"]:
        entry_path = gui_root / entry_name
        if not entry_path.is_file():
            missing_entries.append(entry_name)
            continue

        parser = AssetParser()
        parser.feed(entry_path.read_text(encoding="utf-8"))
        for _tag, raw_reference in parser.references:
            parsed = urlparse(raw_reference)
            if parsed.scheme or raw_reference.startswith(("#", "data:")):
                continue
            target = (entry_path.parent / parsed.path).resolve()
            if gui_root not in target.parents and target != gui_root:
                missing_assets.append(f"outside apps/gui: {entry_name}:{raw_reference}")
            elif not target.is_file():
                missing_assets.append(f"missing: {entry_name}:{raw_reference}")

    assert missing_entries == [], f"cannot verify local asset resolution, entries are missing: {missing_entries}"
    assert missing_assets == []
