from __future__ import annotations

import logging

import pandas as pd
import pytest

from apps.core.workflow_engine import WorkflowEngine


pytestmark = [pytest.mark.unit]


@pytest.fixture
def engine() -> WorkflowEngine:
    logger = logging.getLogger("test.task033.references")
    logger.addHandler(logging.NullHandler())
    return WorkflowEngine(logger)


@pytest.mark.parametrize("key", ["input_data", "input_data_rename", "source_step_id", "value_ref"])
def test_reference_only_parameters_keep_a_bare_context_key(
    engine: WorkflowEngine,
    key: str,
) -> None:
    engine.context = {"step2": pd.DataFrame([{"customer_id": 7}])}

    resolved = engine._resolve_step_params({key: "step2"})

    assert resolved == {key: "step2"}


@pytest.mark.parametrize("key", ["input_data", "input_data_rename", "source_step_id", "value_ref"])
@pytest.mark.parametrize("invalid_reference", ["{{step2}}", "${step2}", "{step2}", "{{step2.customer_id}}"])
def test_reference_only_parameters_reject_noncanonical_references(
    engine: WorkflowEngine,
    key: str,
    invalid_reference: str,
) -> None:
    engine.context = {"step2": pd.DataFrame([{"customer_id": 7}])}

    with pytest.raises(ValueError, match=key):
        engine._resolve_step_params({key: invalid_reference})


def test_regular_template_parameters_keep_nested_value_resolution(engine: WorkflowEngine) -> None:
    engine.context = {"step2": {"customer_id": 7}}

    resolved = engine._resolve_step_params({"value": "customer={{step2.customer_id}}"})

    assert resolved == {"value": "customer=7"}


def test_selenium_reference_parameters_reach_the_connector_as_bare_keys(
    engine: WorkflowEngine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: list[tuple[str, dict, dict]] = []

    class ControlledSeleniumConnector:
        def execute(self, action: str, params: dict, context: dict) -> str:
            captured.append((action, params, context))
            return "controlled"

    context = {
        "step1": pd.DataFrame([{"ziz_selenium_session_id": "session-1"}]),
        "customer_name": "Alice",
    }
    engine.context = context
    monkeypatch.setattr(engine, "_create_connector", lambda _name: ControlledSeleniumConnector())

    result = engine._execute_step(
        {
            "step_id": "step2",
            "connector": "SeleniumConnector",
            "action": "dom_action",
            "params": {
                "operation": "input",
                "source_step_id": "step1",
                "value_ref": "customer_name",
            },
        },
        context,
    )

    assert result == "controlled"
    assert captured == [
        (
            "dom_action",
            {"operation": "input", "source_step_id": "step1", "value_ref": "customer_name"},
            context,
        )
    ]
