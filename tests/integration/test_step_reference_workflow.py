from __future__ import annotations

import logging
from pathlib import Path

import pytest

from apps.core.workflow_engine import WorkflowEngine


pytestmark = [pytest.mark.integration]


def test_canonical_step_reference_runs_through_the_loop_workflow(tmp_path: Path) -> None:
    config = {
        "metadata": {"mode": "dataflow", "name": "Canonical loop reference"},
        "variables": {"start": []},
        "steps": [
            {
                "step_id": "step1",
                "connector": "PythonConnector",
                "action": "execute_python",
                "params": {
                    "env_path": "default",
                    "script": (
                        "import pandas as pd\n"
                        "def main():\n"
                        "    return pd.DataFrame([{'customer_id': 1}, {'customer_id': 2}])\n"
                    ),
                },
                "output_variable": "step1",
            },
            {
                "step_id": "step2",
                "connector": "WindowsConnector",
                "action": "loop_tasks",
                "params": {"source_step_id": "step1", "max_iterations": 30},
                "output_variable": "step2",
            },
        ],
        "flows": {
            "edges": [
                {"from": "START", "to": "step1", "order": 1, "kind": "primary"},
                {"from": "step1", "to": "step2", "order": 1, "kind": "primary"},
            ]
        },
    }
    logger = logging.getLogger("test.task033.loop_workflow")
    logger.addHandler(logging.NullHandler())

    report = WorkflowEngine(logger).run_flow_from_config(
        config,
        flow_path=str(tmp_path / "wrapped-loop.zizd"),
    )

    assert report["status"] == "success"
    assert [step["status"] for step in report["steps"]] == ["success", "success"]
    assert report["steps"][1]["result"] == [{"customer_id": 1}, {"customer_id": 2}]
