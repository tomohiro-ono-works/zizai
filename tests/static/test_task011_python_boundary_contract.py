from __future__ import annotations

import json
import re
from pathlib import Path

import pytest


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
GOAL_PATH = REPOSITORY_ROOT / "tests" / "fixtures" / "task011" / "python-responsibility-goal.json"
CONNECTOR_INVENTORY_PATH = REPOSITORY_ROOT / "tests" / "fixtures" / "contracts" / "connector-inventory.json"

pytestmark = [pytest.mark.static_analysis]


@pytest.fixture(scope="module")
def goal() -> dict:
    return json.loads(GOAL_PATH.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def connector_modules() -> list[str]:
    inventory = json.loads(CONNECTOR_INVENTORY_PATH.read_text(encoding="utf-8"))["connectors"]
    return [entry["module"] for entry in inventory]


@pytest.mark.risk_path_001
@pytest.mark.parametrize("responsibility", ["desktop", "cli", "core", "connectors"])
def test_each_approved_python_responsibility_has_its_own_target_package(responsibility: str, goal: dict) -> None:
    target_path = REPOSITORY_ROOT / goal["target_packages"][responsibility]["path"]

    assert target_path.is_dir(), f"approved {responsibility} package is missing: {target_path}"


@pytest.mark.risk_path_001
@pytest.mark.parametrize("retired_package", ["app", "core", "connectors"])
def test_old_application_package_sources_are_absent_after_relocation(retired_package: str, goal: dict) -> None:
    assert retired_package in goal["retired_packages"]
    old_path = REPOSITORY_ROOT / retired_package

    python_sources = sorted(
        path.relative_to(REPOSITORY_ROOT)
        for pattern in ("*.py", "*.pyc")
        for path in old_path.rglob(pattern)
    )
    assert python_sources == [], f"retired package still has Python sources: {python_sources}"


@pytest.mark.risk_conn_002
def test_base_connector_is_defined_by_the_relocated_core_package(goal: dict) -> None:
    base_connector_path = REPOSITORY_ROOT / "apps" / "core" / "base_connector.py"

    assert base_connector_path.is_file(), f"BaseConnector is not defined under apps/core: {base_connector_path}"
    source = base_connector_path.read_text(encoding="utf-8")
    assert re.search(rf"class\s+{goal['base_connector_class']}\b", source), (
        "apps/core/base_connector.py does not define the BaseConnector class"
    )


@pytest.mark.risk_conn_001
def test_core_package_has_no_static_import_of_qt_frontend_or_concrete_connectors(
    goal: dict, connector_modules: list[str]
) -> None:
    core_root = REPOSITORY_ROOT / goal["target_packages"]["core"]["path"]
    assert core_root.is_dir(), f"apps/core package is missing: {core_root}"

    forbidden_tokens = list(goal["core_forbidden_import_tokens"])
    forbidden_tokens += [f"apps.connectors.{module}" for module in connector_modules]

    offenders = []
    for python_file in sorted(core_root.rglob("*.py")):
        source = python_file.read_text(encoding="utf-8")
        for token in forbidden_tokens:
            if token in source:
                offenders.append(f"{python_file.relative_to(REPOSITORY_ROOT)}:{token}")

    assert offenders == [], f"apps/core still references forbidden imports: {offenders}"


@pytest.mark.risk_entry_001
def test_root_entrypoint_files_stay_the_public_cli_contract_and_reference_relocated_packages(goal: dict) -> None:
    for relative_path in goal["public_entrypoints"]:
        entrypoint_path = REPOSITORY_ROOT / relative_path
        assert entrypoint_path.is_file(), f"public entrypoint is missing: {entrypoint_path}"

    zizai_source = (REPOSITORY_ROOT / "zizai.py").read_text(encoding="utf-8")
    assert 'if __name__ == "__main__":' in zizai_source

    desktop_import_path = goal["target_packages"]["desktop"]["import_path"]
    cli_import_path = goal["target_packages"]["cli"]["import_path"]
    assert f"import {desktop_import_path}" in zizai_source or f"from {desktop_import_path}" in zizai_source, (
        "zizai.py does not import the relocated apps.desktop responsibility"
    )
    assert f"import {cli_import_path}" in zizai_source or f"from {cli_import_path}" in zizai_source, (
        "zizai.py does not import the relocated apps.cli responsibility"
    )
    assert "from app.gui.host" not in zizai_source, "zizai.py still imports the retired app.gui.host module"
    assert "from app.main" not in zizai_source, "zizai.py still imports the retired app.main module"


@pytest.mark.risk_bridge_001
def test_bridge_contract_is_a_language_neutral_json_file_under_apps_common_contracts_bridge(goal: dict) -> None:
    bridge_contract = goal["bridge_contract"]
    bridge_contract_path = REPOSITORY_ROOT / bridge_contract["path"]

    assert bridge_contract_path.is_file(), f"bridge contract JSON file is missing: {bridge_contract_path}"
    assert bridge_contract_path.suffix == ".json", "bridge contract must be a language-neutral JSON file"

    contract = json.loads(bridge_contract_path.read_text(encoding="utf-8"))

    assert contract["version"] == bridge_contract["version"], "bridge contract version does not match 1.0"
    assert len(contract["commands"]) == bridge_contract["command_count"], (
        f"bridge contract does not define {bridge_contract['command_count']} commands"
    )
    assert len(contract["events"]) == bridge_contract["event_count"], (
        f"bridge contract does not define {bridge_contract['event_count']} events"
    )
