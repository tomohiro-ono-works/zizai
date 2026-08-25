from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
import pytest
import yaml

from apps.desktop.bridge import BridgeRuntime
from apps.connectors.dataintegration_connector import DataintegrationConnector


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
TEMPLATE_ROOT = REPOSITORY_ROOT / "template"
CONFIG_JS_PATH = REPOSITORY_ROOT / "apps" / "gui" / "config" / "config.js"
GOAL_LAYOUT_PATH = REPOSITORY_ROOT / "tests" / "fixtures" / "task010" / "repository-layout-goal.json"

# JS source literals (two literal backslash characters encode one escaped backslash).
OLD_JS_DEFAULT_LITERAL = r'default:"config\\rename.csv"'
NEW_JS_DEFAULT_LITERAL = r'default:"apps\\common\\config\\rename.csv"'

pytestmark = [pytest.mark.integration, pytest.mark.risk_config_001]


@pytest.fixture(scope="module")
def goal_layout() -> dict:
    return json.loads(GOAL_LAYOUT_PATH.read_text(encoding="utf-8"))


def _collect_rename_list_paths(node) -> list[str]:
    found: list[str] = []
    if isinstance(node, dict):
        for key, value in node.items():
            if key == "rename_list_path":
                found.append(str(value))
            found.extend(_collect_rename_list_paths(value))
    elif isinstance(node, list):
        for item in node:
            found.extend(_collect_rename_list_paths(item))
    return found


def test_rename_mappings_load_from_the_new_repository_relative_source_path(goal_layout: dict) -> None:
    source_rename_path = REPOSITORY_ROOT / goal_layout["source_config_root"] / "rename.csv"
    assert source_rename_path.exists(), f"new source rename.csv is missing: {source_rename_path}"

    dataframe = pd.DataFrame([{"date": "2026-04-01", "age": 10, "city": "Tokyo", "name": "Taro"}])
    result = DataintegrationConnector().execute(
        "replace_fields_forrenamelist",
        {"input_data": "step1", "rename_list_path": "apps\\common\\config\\rename.csv"},
        {"step1": dataframe, "__repository_root": str(REPOSITORY_ROOT)},
    )

    assert list(result.columns) == ["日付", "年齢", "都道府県", "名称"]


def test_old_relative_config_rename_path_is_not_redirected_to_the_new_source_root(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    old_config = tmp_path / "config"
    old_config.mkdir()
    (old_config / "rename.csv").write_text(
        "origin_name,replaced_name\ndate,should_not_be_loaded\n",
        encoding="utf-8",
    )
    monkeypatch.chdir(tmp_path)
    dataframe = pd.DataFrame([{"date": "2026-04-01"}])

    with pytest.raises(ValueError, match="repository_root"):
        DataintegrationConnector().execute(
            "replace_fields_forrenamelist",
            {"input_data": "step1", "rename_list_path": "config\\rename.csv"},
            {"step1": dataframe},
        )


def test_repository_managed_templates_reference_only_the_new_source_rename_path() -> None:
    offenders = []
    for template_path in sorted(TEMPLATE_ROOT.glob("*.zizd")):
        config = yaml.safe_load(template_path.read_text(encoding="utf-8"))
        rename_paths = _collect_rename_list_paths(config)
        for value in rename_paths:
            normalized = value.replace("\\", "/")
            if normalized != "apps/common/config/rename.csv":
                offenders.append(f"{template_path.name}:{value}")

    assert offenders == [], f"templates still reference the old rename.csv path: {offenders}"


def test_new_node_default_rename_path_uses_the_new_source_root() -> None:
    text = CONFIG_JS_PATH.read_text(encoding="utf-8")

    assert OLD_JS_DEFAULT_LITERAL not in text, "config.js still defaults rename_list_path to the old config/rename.csv"
    assert NEW_JS_DEFAULT_LITERAL in text, "config.js does not default rename_list_path to apps/common/config/rename.csv"


def test_flow_save_and_load_round_trip_preserves_a_saved_old_rename_reference_verbatim(tmp_path: Path) -> None:
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    runtime = BridgeRuntime(tmp_path)
    runtime.workspace_root = workspace.resolve()
    flow = {
        "metadata": {"mode": "dataflow", "name": "legacy"},
        "steps": [
            {
                "step_id": "step1",
                "connector": "DataintegrationConnector",
                "action": "replace_fields_forrenamelist",
                "params": {"input_data": "step0", "rename_list_path": "config\\rename.csv"},
            }
        ],
    }

    save_response = runtime.handle_message(
        json.dumps(
            {
                "v": "1.0",
                "kind": "cmd",
                "id": "save-1",
                "type": "flow.save",
                "ts": "2026-08-24T00:00:00+00:00",
                "payload": {
                    "workspace_tab_id": "tab-1",
                    "scope": "root",
                    "rel_path": "legacy.zizd",
                    "mode": "dataflow",
                    "flow": flow,
                },
            }
        )
    )
    assert save_response["payload"]["saved"] is True
    assert (tmp_path / "config" / "recent_flows.json").is_file()

    load_response = runtime.handle_message(
        json.dumps(
            {
                "v": "1.0",
                "kind": "cmd",
                "id": "load-1",
                "type": "flow.load",
                "ts": "2026-08-24T00:00:00+00:00",
                "payload": {
                    "workspace_tab_id": "tab-1",
                    "scope": "root",
                    "rel_path": "legacy.zizd",
                },
            }
        )
    )
    loaded_params = load_response["payload"]["flow"]["steps"][0]["params"]
    assert loaded_params["rename_list_path"] == "config\\rename.csv"
