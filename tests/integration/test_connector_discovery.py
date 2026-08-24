from __future__ import annotations

import importlib
import inspect
import json
import logging
import pkgutil
import socket
from pathlib import Path

import pytest

import apps.connectors
from apps.core.base_connector import BaseConnector
from apps.core.workflow_engine import WorkflowEngine


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
INVENTORY_PATH = REPOSITORY_ROOT / "tests" / "fixtures" / "contracts" / "connector-inventory.json"

pytestmark = [pytest.mark.integration, pytest.mark.risk_conn_001]


def test_inventory_resolves_one_connector_class_without_execution(monkeypatch: pytest.MonkeyPatch) -> None:
    def deny_network(*_args, **_kwargs):
        raise AssertionError("connector discovery attempted a network connection")

    monkeypatch.setattr(socket.socket, "connect", deny_network)
    inventory = json.loads(INVENTORY_PATH.read_text(encoding="utf-8"))["connectors"]
    engine = WorkflowEngine(logging.getLogger("test.connector-discovery"))
    resolved = []

    for expected in inventory:
        connector_class = engine._get_connector_class(expected["module"])
        module = importlib.import_module(f"apps.connectors.{expected['module']}")
        subclasses = [
            value
            for _, value in inspect.getmembers(module, inspect.isclass)
            if value is not BaseConnector and issubclass(value, BaseConnector)
        ]
        resolved.append(
            {
                "module": connector_class.__module__.rsplit(".", 1)[-1],
                "class": connector_class.__name__,
            }
        )
        assert subclasses == [connector_class]
        assert not isinstance(connector_class, BaseConnector)

    assert resolved == inventory
    assert engine._load_connector_by_class_name_scan("MissingConnector") == (None, None)


def test_apps_connectors_module_set_is_exactly_the_inventory() -> None:
    inventory_modules = {
        entry["module"]
        for entry in json.loads(INVENTORY_PATH.read_text(encoding="utf-8"))["connectors"]
    }
    package_path = Path(apps.connectors.__file__).parent
    discovered_modules = {
        module_name
        for _, module_name, is_pkg in pkgutil.iter_modules([str(package_path)])
        if not is_pkg and module_name != "__init__"
    }

    assert discovered_modules == inventory_modules
