from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import pytest

from app.gui.bridge import BridgeRuntime


pytestmark = [pytest.mark.unit, pytest.mark.risk_fs_001]


def command(message_type: str, payload: dict) -> str:
    return json.dumps(
        {
            "v": "1.0",
            "kind": "cmd",
            "id": "fs-1",
            "type": message_type,
            "ts": "2026-08-21T00:00:00+00:00",
            "payload": payload,
        }
    )


def response(runtime: BridgeRuntime, message_type: str, payload: dict) -> dict:
    return runtime.handle_message(command(message_type, payload))


@pytest.fixture
def workspace_runtime(tmp_path: Path) -> tuple[BridgeRuntime, Path, Path]:
    workspace = tmp_path / "workspace"
    outside = tmp_path / "outside"
    workspace.mkdir()
    outside.mkdir()
    runtime = BridgeRuntime(tmp_path)
    runtime.workspace_root = workspace.resolve()
    return runtime, workspace, outside


def test_regular_workspace_write_read_and_delete(
    workspace_runtime: tuple[BridgeRuntime, Path, Path]
) -> None:
    runtime, workspace, _ = workspace_runtime
    write = response(
        runtime,
        "workspace.writeText",
        {"scope": "root", "rel_path": "notes/example.md", "content": "baseline"},
    )
    read = response(runtime, "workspace.readText", {"scope": "root", "rel_path": "notes/example.md"})
    delete = response(runtime, "workspace.delete", {"scope": "root", "rel_path": "notes/example.md"})

    assert write["payload"]["saved"] is True
    assert read["payload"]["content"] == "baseline"
    assert delete["payload"] == {
        "scope": "root",
        "rel_path": "notes/example.md",
        "deleted": True,
        "kind": "file",
    }
    assert not (workspace / "notes" / "example.md").exists()


@pytest.mark.parametrize("rel_path", ["../outside/secret.md", "../../secret.md"])
def test_traversal_is_denied_without_touching_outside_file(
    workspace_runtime: tuple[BridgeRuntime, Path, Path], rel_path: str
) -> None:
    runtime, _, outside = workspace_runtime
    outside_file = outside / "secret.md"
    outside_file.write_text("protected", encoding="utf-8")
    before = hashlib.sha256(outside_file.read_bytes()).hexdigest()

    result = response(
        runtime,
        "workspace.writeText",
        {"scope": "root", "rel_path": rel_path, "content": "changed"},
    )

    assert result["error"]["code"] == "E_ACCESS_DENIED"
    assert hashlib.sha256(outside_file.read_bytes()).hexdigest() == before


def test_absolute_outside_path_is_denied(
    workspace_runtime: tuple[BridgeRuntime, Path, Path]
) -> None:
    runtime, _, outside = workspace_runtime
    outside_file = outside / "secret.md"
    outside_file.write_text("protected", encoding="utf-8")

    result = response(
        runtime,
        "workspace.readText",
        {"scope": "root", "rel_path": str(outside_file.resolve())},
    )

    assert result["error"]["code"] == "E_ACCESS_DENIED"


def test_symlink_target_is_denied(workspace_runtime: tuple[BridgeRuntime, Path, Path]) -> None:
    runtime, workspace, outside = workspace_runtime
    outside_file = outside / "secret.md"
    outside_file.write_text("protected", encoding="utf-8")
    os.symlink(outside_file, workspace / "linked.md")

    result = response(runtime, "workspace.readText", {"scope": "root", "rel_path": "linked.md"})

    assert result["error"]["code"] == "E_ACCESS_DENIED"


def test_symlink_component_is_denied(workspace_runtime: tuple[BridgeRuntime, Path, Path]) -> None:
    runtime, workspace, outside = workspace_runtime
    outside_file = outside / "secret.md"
    outside_file.write_text("protected", encoding="utf-8")
    os.symlink(outside, workspace / "linked-dir", target_is_directory=True)

    result = response(
        runtime,
        "workspace.readText",
        {"scope": "root", "rel_path": "linked-dir/secret.md"},
    )

    assert result["error"]["code"] == "E_ACCESS_DENIED"


def test_symlink_workspace_root_is_denied(tmp_path: Path) -> None:
    actual_workspace = tmp_path / "workspace"
    actual_workspace.mkdir()
    (actual_workspace / "secret.md").write_text("protected", encoding="utf-8")
    linked_root = tmp_path / "linked-root"
    os.symlink(actual_workspace, linked_root, target_is_directory=True)
    runtime = BridgeRuntime(tmp_path)
    runtime.workspace_root = linked_root

    result = response(runtime, "workspace.readText", {"scope": "root", "rel_path": "secret.md"})

    assert result["error"]["code"] == "E_ACCESS_DENIED"
