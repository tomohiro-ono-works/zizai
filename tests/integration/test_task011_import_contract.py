from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
PYTHON = Path(sys.executable)
GOAL_PATH = REPOSITORY_ROOT / "tests" / "fixtures" / "task011" / "python-responsibility-goal.json"

pytestmark = [pytest.mark.integration]


@pytest.fixture(scope="module")
def goal() -> dict:
    return json.loads(GOAL_PATH.read_text(encoding="utf-8"))


def run_script(script: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [str(PYTHON), "-c", script],
        cwd=REPOSITORY_ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
        timeout=30,
    )


@pytest.mark.risk_path_001
@pytest.mark.parametrize(
    ("target_id", "submodule"),
    [
        ("desktop", "apps.desktop.host"),
        ("desktop", "apps.desktop.bridge"),
        ("cli", "apps.cli.main"),
        ("core", "apps.core.workflow_engine"),
        ("connectors", "apps.connectors.csv_connector"),
    ],
)
def test_each_relocated_responsibility_package_imports_in_a_fresh_process(
    target_id: str, submodule: str, goal: dict
) -> None:
    import_path = goal["target_packages"][target_id]["import_path"]
    assert submodule == import_path or submodule.startswith(f"{import_path}."), (
        f"{submodule} is not part of the approved {target_id} package {import_path}"
    )

    result = run_script(f"import {submodule}")

    assert result.returncode == 0, (
        f"{submodule} did not import cleanly in a fresh process: {result.stderr.strip()}"
    )


@pytest.mark.risk_path_001
@pytest.mark.parametrize(
    "legacy_module",
    ["app.main", "app.gui.bridge", "core.workflow_engine", "connectors.base_connector"],
)
def test_relocated_legacy_modules_are_not_importable_in_a_fresh_process(legacy_module: str) -> None:
    result = run_script(f"import {legacy_module}")

    assert result.returncode != 0, f"legacy module unexpectedly remains importable: {legacy_module}"
    assert "ModuleNotFoundError" in result.stderr, result.stderr


@pytest.mark.risk_conn_002
def test_base_connector_resolves_from_apps_core_as_an_abstract_execute_contract_in_a_fresh_process(
    goal: dict,
) -> None:
    module_path = goal["base_connector_module"]
    class_name = goal["base_connector_class"]
    script = (
        "import inspect\n"
        f"from {module_path} import {class_name}\n"
        f"assert inspect.isabstract({class_name}), '{class_name} is not abstract'\n"
        f"signature = inspect.signature({class_name}.execute)\n"
        "assert list(signature.parameters) == ['self', 'action', 'params', 'context'], "
        "list(signature.parameters)\n"
    )
    result = run_script(script)

    assert result.returncode == 0, (
        f"BaseConnector is not resolvable as an abstract execute(action, params, context) "
        f"contract from {module_path}: {result.stderr.strip()}"
    )


@pytest.mark.risk_entry_001
def test_public_entrypoint_activates_only_the_relocated_application_packages_in_a_fresh_process(
    goal: dict,
) -> None:
    script = (
        "import json\n"
        "import sys\n"
        "import zizai\n"
        "print(json.dumps(sorted(sys.modules)))\n"
    )
    result = run_script(script)

    assert result.returncode == 0, f"import zizai failed in a fresh process: {result.stderr.strip()}"

    imported_modules = set(json.loads(result.stdout.strip().splitlines()[-1]))

    required_prefixes = [
        goal["target_packages"]["desktop"]["import_path"],
        goal["target_packages"]["cli"]["import_path"],
    ]
    for required_prefix in required_prefixes:
        assert any(
            module_name == required_prefix or module_name.startswith(f"{required_prefix}.")
            for module_name in imported_modules
        ), f"zizai.py did not activate the approved package at runtime: {required_prefix}"

    forbidden_prefixes = goal["retired_packages"]
    offenders = sorted(
        module_name
        for module_name in imported_modules
        if any(
            module_name == forbidden_prefix or module_name.startswith(f"{forbidden_prefix}.")
            for forbidden_prefix in forbidden_prefixes
        )
    )
    assert offenders == [], f"zizai.py still activates legacy modules at runtime: {offenders}"
