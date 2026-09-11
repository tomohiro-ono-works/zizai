from __future__ import annotations

import json
from pathlib import Path

import pytest

from apps.desktop.bridge import BridgeRuntime


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
CATALOG_SAMPLES_PATH = REPOSITORY_ROOT / "apps" / "common" / "config" / "catalog_samples.json"

pytestmark = [pytest.mark.unit, pytest.mark.risk_config_001]


def _command(message_type: str, payload: dict | None = None) -> str:
    return json.dumps(
        {
            "v": "1.0",
            "kind": "cmd",
            "id": "catalog-samples-1",
            "type": message_type,
            "ts": "2026-09-01T00:00:00+00:00",
            "payload": payload or {},
        }
    )


def _write_catalog_samples(root: Path, data) -> None:
    config_dir = root / "apps" / "common" / "config"
    config_dir.mkdir(parents=True, exist_ok=True)
    (config_dir / "catalog_samples.json").write_text(json.dumps(data), encoding="utf-8")


def _write_catalog_samples_raw(root: Path, text: str) -> None:
    config_dir = root / "apps" / "common" / "config"
    config_dir.mkdir(parents=True, exist_ok=True)
    (config_dir / "catalog_samples.json").write_text(text, encoding="utf-8")


def _get_status(root: Path) -> dict:
    runtime = BridgeRuntime(root)
    response = runtime.handle_message(_command("app.getStatus"))
    return response["payload"]


def _text_item(item_id: str, text, **overrides) -> dict:
    item = {"id": item_id, "label": item_id, "kind": "text", "text": text}
    item.update(overrides)
    return item


def _node_item(item_id: str = "define-values", **overrides) -> dict:
    item = {
        "id": item_id,
        "label": "変数定義",
        "kind": "node",
        "connector": "WindowsConnector",
        "action": "define_values",
        "descriptionAuto": True,
        "form": {"define_values": []},
    }
    item.update(overrides)
    return item


def test_repository_catalog_samples_file_is_valid_json_with_only_allowed_extensions() -> None:
    raw = json.loads(CATALOG_SAMPLES_PATH.read_text(encoding="utf-8"))

    assert raw["version"] == 1
    assert set(raw["extensions"].keys()) <= {"zizd", "sql", "md"}
    for extension in raw["extensions"].values():
        assert all(folder.get("id") and folder.get("label") for folder in extension["folders"])
        assert all(item.get("id") and item.get("label") for item in extension["items"])
    assert isinstance(raw["extensions"]["zizd"]["items"][0]["descriptionAuto"], bool)


def test_get_status_delivers_sanitized_catalog_samples_for_all_three_extensions() -> None:
    payload = _get_status(REPOSITORY_ROOT)

    catalog_samples = payload["catalog_samples"]
    assert catalog_samples["version"] == 1
    extensions = catalog_samples["extensions"]
    assert set(extensions.keys()) == {"zizd", "sql", "md"}

    zizd_item = extensions["zizd"]["items"][0]
    assert zizd_item["id"] == "define-values"
    assert zizd_item["label"] == "変数定義"
    assert zizd_item["kind"] == "node"
    assert zizd_item["connector"] == "WindowsConnector"
    assert zizd_item["action"] == "define_values"
    assert zizd_item["descriptionAuto"] is True
    assert isinstance(zizd_item["form"], dict)

    sql_item = extensions["sql"]["items"][0]
    assert sql_item["kind"] == "text"
    assert isinstance(sql_item["text"], str) and sql_item["text"]

    md_item = extensions["md"]["items"][0]
    assert md_item["kind"] == "text"
    assert isinstance(md_item["text"], str) and md_item["text"]


def test_get_status_never_exposes_source_path_root_or_scope() -> None:
    payload = _get_status(REPOSITORY_ROOT)

    serialized = json.dumps(payload)
    assert "source_config_root" not in serialized
    assert "apps/common/config" not in serialized
    assert "apps\\\\common\\\\config" not in serialized
    assert "catalog_samples.json" not in serialized
    assert "path" not in payload["catalog_samples"]


def test_missing_catalog_samples_file_yields_an_empty_payload_without_crashing(tmp_path: Path) -> None:
    payload = _get_status(tmp_path)

    assert payload["catalog_samples"] == {}


def test_invalid_json_yields_an_empty_payload(tmp_path: Path) -> None:
    _write_catalog_samples_raw(tmp_path, "{not valid json")

    payload = _get_status(tmp_path)

    assert payload["catalog_samples"] == {}


@pytest.mark.parametrize(
    "malformed_root",
    [
        [],
        "not-an-object",
        {"version": 1},
        {"version": 1, "extensions": "not-an-object"},
        {"version": 1, "extensions": []},
    ],
)
def test_wrong_root_shape_yields_an_empty_payload(tmp_path: Path, malformed_root) -> None:
    _write_catalog_samples(tmp_path, malformed_root)

    payload = _get_status(tmp_path)

    assert payload["catalog_samples"] == {}


def test_unsupported_version_yields_an_empty_payload(tmp_path: Path) -> None:
    _write_catalog_samples(
        tmp_path,
        {"version": 2, "extensions": {"sql": {"items": [_text_item("query", "SELECT 1;")]}}},
    )

    payload = _get_status(tmp_path)

    assert payload["catalog_samples"] == {}


def test_only_zizd_sql_md_extensions_remain(tmp_path: Path) -> None:
    _write_catalog_samples(
        tmp_path,
        {
            "version": 1,
            "extensions": {
                "sql": {"items": [_text_item("query", "SELECT 1;")]},
                "txt": {"items": [_text_item("ignored-txt", "ignored")]},
                "zizw": {"items": [_text_item("ignored-zizw", "ignored")]},
            },
        },
    )

    payload = _get_status(tmp_path)

    assert set(payload["catalog_samples"]["extensions"].keys()) == {"sql"}


def test_text_item_requires_a_string_text_field(tmp_path: Path) -> None:
    _write_catalog_samples(
        tmp_path,
        {
            "version": 1,
            "extensions": {
                "sql": {
                    "items": [
                        _text_item("valid", "SELECT 1;"),
                        _text_item("non-string", 123),
                        {"id": "missing-text", "label": "missing-text", "kind": "text"},
                    ]
                }
            },
        },
    )

    payload = _get_status(tmp_path)

    items = payload["catalog_samples"]["extensions"]["sql"]["items"]
    assert len(items) == 1
    assert items[0]["text"] == "SELECT 1;"


def test_node_item_requires_exactly_the_known_fields(tmp_path: Path) -> None:
    valid_node = _node_item(description="desc")
    node_with_unknown_field = dict(valid_node, unexpected="value")
    node_missing_connector = _node_item("missing-connector")
    node_missing_connector.pop("connector")
    node_missing_action = _node_item("missing-action")
    node_missing_action.pop("action")
    node_missing_form = _node_item("missing-form")
    node_missing_form.pop("form")
    node_with_non_object_form = _node_item("bad-form", form="not-an-object")

    _write_catalog_samples(
        tmp_path,
        {
            "version": 1,
            "extensions": {
                "zizd": {
                    "items": [
                        valid_node,
                        node_with_unknown_field,
                        node_missing_connector,
                        node_missing_action,
                        node_missing_form,
                        node_with_non_object_form,
                    ]
                }
            },
        },
    )

    payload = _get_status(tmp_path)

    items = payload["catalog_samples"]["extensions"]["zizd"]["items"]
    assert len(items) == 1
    assert items[0] == valid_node


def test_node_item_without_optional_fields_is_accepted(tmp_path: Path) -> None:
    minimal_node = {
        "id": "minimal-node",
        "label": "Minimal node",
        "kind": "node",
        "connector": "WindowsConnector",
        "action": "define_values",
        "form": {"define_values": []},
    }
    _write_catalog_samples(
        tmp_path,
        {"version": 1, "extensions": {"zizd": {"items": [minimal_node]}}},
    )

    payload = _get_status(tmp_path)

    items = payload["catalog_samples"]["extensions"]["zizd"]["items"]
    assert items == [dict(minimal_node, descriptionAuto=True)]


def test_node_item_rejects_non_boolean_description_auto_and_invalid_names(tmp_path: Path) -> None:
    _write_catalog_samples(
        tmp_path,
        {
            "version": 1,
            "extensions": {
                "zizd": {
                    "items": [
                        _node_item("valid"),
                        _node_item("bad-auto", descriptionAuto="define_values"),
                        _node_item("bad-connector", connector="Windows Connector"),
                        _node_item("bad-action", action="define-values"),
                    ]
                }
            },
        },
    )

    items = _get_status(tmp_path)["catalog_samples"]["extensions"]["zizd"]["items"]

    assert [item["id"] for item in items] == ["valid"]


def test_unknown_item_kind_is_excluded(tmp_path: Path) -> None:
    _write_catalog_samples(
        tmp_path,
        {
            "version": 1,
            "extensions": {
                "sql": {
                    "items": [
                        _text_item("valid", "SELECT 1;"),
                        {"id": "invalid", "label": "invalid", "kind": "unsupported", "text": "SELECT 2;"},
                    ]
                }
            },
        },
    )

    payload = _get_status(tmp_path)

    items = payload["catalog_samples"]["extensions"]["sql"]["items"]
    assert len(items) == 1
    assert items[0]["text"] == "SELECT 1;"


def test_folder_requires_a_string_id_and_keeps_only_known_fields(tmp_path: Path) -> None:
    _write_catalog_samples(
        tmp_path,
        {
            "version": 1,
            "extensions": {
                "sql": {
                    "folders": [
                        {"id": "folder-1", "label": "Samples"},
                        {"label": "no id"},
                        {"id": "", "label": "empty id"},
                    ],
                    "items": [],
                }
            },
        },
    )

    payload = _get_status(tmp_path)

    folders = payload["catalog_samples"]["extensions"]["sql"]["folders"]
    assert folders == [{"id": "folder-1", "label": "Samples"}]


def test_catalog_metadata_is_preserved_while_duplicate_and_orphan_items_are_excluded(tmp_path: Path) -> None:
    _write_catalog_samples(
        tmp_path,
        {
            "version": 1,
            "extensions": {
                "sql": {
                    "folders": [
                        {"id": "queries", "label": "Queries", "order": 1},
                        {"id": "queries", "label": "Duplicate", "order": 2},
                    ],
                    "items": [
                        _text_item(
                            "select-one",
                            "SELECT 1;",
                            folderId="queries",
                            label="Select one",
                            description="Simple query",
                            order=1.5,
                        ),
                        _text_item("select-one", "SELECT 2;"),
                        _text_item("orphan", "SELECT 3;", folderId="missing"),
                    ],
                }
            },
        },
    )

    extension = _get_status(tmp_path)["catalog_samples"]["extensions"]["sql"]

    assert extension["folders"] == [{"id": "queries", "label": "Queries", "order": 1}]
    assert extension["items"] == [
        {
            "id": "select-one",
            "folderId": "queries",
            "label": "Select one",
            "description": "Simple query",
            "order": 1.5,
            "kind": "text",
            "text": "SELECT 1;",
        }
    ]


@pytest.mark.parametrize("invalid_order", [True, float("inf"), float("-inf"), float("nan")])
def test_non_finite_or_boolean_order_is_excluded(tmp_path: Path, invalid_order) -> None:
    _write_catalog_samples(
        tmp_path,
        {
            "version": 1,
            "extensions": {
                "sql": {
                    "folders": [{"id": "invalid-folder", "label": "Invalid", "order": invalid_order}],
                    "items": [_text_item("invalid-item", "SELECT 1;", order=invalid_order)],
                }
            },
        },
    )

    extension = _get_status(tmp_path)["catalog_samples"]["extensions"]["sql"]

    assert extension == {"folders": [], "items": []}


@pytest.mark.parametrize(
    "unsafe_icon",
    [
        "https://example.com/icon.svg",
        "file:///etc/passwd",
        "/etc/passwd",
        "\\\\server\\share\\icon.svg",
        "C:\\icons\\icon.svg",
        "../../secret/icon.svg",
        "icons/../../secret/icon.svg",
    ],
)
def test_unsafe_local_icon_values_are_omitted_without_exposing_a_path(tmp_path: Path, unsafe_icon: str) -> None:
    _write_catalog_samples(
        tmp_path,
        {
            "version": 1,
            "extensions": {
                "sql": {
                    "folders": [{"id": "folder-1", "label": "Samples", "icon": unsafe_icon}],
                    "items": [],
                }
            },
        },
    )

    payload = _get_status(tmp_path)

    folder = payload["catalog_samples"]["extensions"]["sql"]["folders"][0]
    assert "icon" not in folder
    assert unsafe_icon not in json.dumps(payload)


def test_safe_local_icon_value_is_kept(tmp_path: Path) -> None:
    _write_catalog_samples(
        tmp_path,
        {
            "version": 1,
            "extensions": {
                "sql": {
                    "folders": [{"id": "folder-1", "label": "Samples", "icon": "./icons/sql.svg"}],
                    "items": [],
                }
            },
        },
    )

    payload = _get_status(tmp_path)

    folder = payload["catalog_samples"]["extensions"]["sql"]["folders"][0]
    assert folder["icon"] == "./icons/sql.svg"


def test_malformed_items_are_excluded_without_crashing_app_get_status(tmp_path: Path) -> None:
    _write_catalog_samples(
        tmp_path,
        {
            "version": 1,
            "extensions": {
                "zizd": {"items": ["not-an-object", 42, None, {"kind": "node"}]},
                "sql": {"items": [_text_item("valid", "SELECT 1;")]},
                "md": {"items": []},
            },
        },
    )

    payload = _get_status(tmp_path)

    extensions = payload["catalog_samples"]["extensions"]
    assert extensions["zizd"]["items"] == []
    assert extensions["sql"]["items"][0]["text"] == "SELECT 1;"
    assert extensions["md"]["items"] == []
