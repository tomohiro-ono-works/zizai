from __future__ import annotations

import json
import logging
import os
from pathlib import Path
import subprocess

import duckdb
import pytest
import yaml

from apps.core.workflow_engine import WorkflowEngine
from apps.desktop.bridge import BridgeRuntime


pytestmark = [pytest.mark.integration, pytest.mark.risk_conn_002]


def build_python_duckdb_flow(db_path: Path) -> dict:
    return {
        "metadata": {"mode": "dataflow", "name": "Python to DuckDB"},
        "variables": {"start": []},
        "steps": [
            {
                "step_id": "python_step",
                "connector": "PythonConnector",
                "action": "execute_python",
                "params": {
                    "env_path": "default",
                    "script": (
                        "import pandas as pd\n"
                        "def main():\n"
                        "    return pd.DataFrame([{'name': 'alpha', 'count': 1}])\n"
                    ),
                },
                "output_variable": "python_result",
            },
            {
                "step_id": "duckdb_step",
                "connector": "DuckConnector",
                "action": "create_table",
                "params": {
                    "db_file": str(db_path),
                    "input_data": "python_result",
                    "table_name": "items",
                },
                "output_variable": "duckdb_result",
            },
        ],
        "flows": {},
    }


def test_python_dataframe_flows_through_workflow_engine_into_duckdb(tmp_path: Path) -> None:
    db_path = tmp_path / "workflow.duckdb"
    config = build_python_duckdb_flow(db_path)
    logger = logging.getLogger("test.task032.python_duckdb")
    logger.addHandler(logging.NullHandler())

    report = WorkflowEngine(logger).run_flow_from_config(
        config,
        flow_path=str(tmp_path / "python-to-duckdb.zizd"),
    )

    assert report["status"] == "success"
    assert [step["status"] for step in report["steps"]] == ["success", "success"]
    with duckdb.connect(str(db_path)) as connection:
        assert connection.execute("SELECT name, count FROM items").fetchall() == [("alpha", 1)]


@pytest.mark.skipif(os.name != "nt", reason="bin/ziz.bat is the Windows CLI entry point")
def test_ziz_bat_runs_python_to_duckdb_flow(tmp_path: Path) -> None:
    repository_root = Path(__file__).resolve().parents[2]
    db_path = tmp_path / "cli.duckdb"
    flow_path = tmp_path / "python-to-duckdb.zizd"
    flow_path.write_text(
        yaml.safe_dump(build_python_duckdb_flow(db_path), allow_unicode=True, sort_keys=False),
        encoding="utf-8",
    )
    command = subprocess.list2cmdline([str(repository_root / "bin" / "ziz.bat"), str(flow_path)])

    completed = subprocess.run(
        command,
        cwd=repository_root,
        shell=True,
        check=False,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )

    assert completed.returncode == 0, completed.stdout + completed.stderr
    with duckdb.connect(str(db_path)) as connection:
        assert connection.execute("SELECT name, count FROM items").fetchall() == [("alpha", 1)]


def test_desktop_bridge_runs_python_to_duckdb_flow(tmp_path: Path) -> None:
    db_path = tmp_path / "desktop-bridge.duckdb"
    runtime = BridgeRuntime(tmp_path)
    request = json.dumps(
        {
            "v": "1.0",
            "kind": "cmd",
            "id": "task032-desktop-smoke",
            "type": "flow.run",
            "ts": "2026-09-15T00:00:00+09:00",
            "payload": {
                "workspace_tab_id": "task032-tab",
                "mode": "dataflow",
                "flow": build_python_duckdb_flow(db_path),
            },
        }
    )

    response = runtime.handle_message(request)

    assert "error" not in response
    run_id = response["payload"]["run_id"]
    worker = runtime.runs[run_id]["thread"]
    worker.join(timeout=15)
    assert not worker.is_alive()
    assert runtime.runs[run_id]["status"] == "success"
    with duckdb.connect(str(db_path)) as connection:
        assert connection.execute("SELECT name, count FROM items").fetchall() == [("alpha", 1)]
