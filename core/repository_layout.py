from __future__ import annotations

from pathlib import Path
from typing import NamedTuple, Union

PathLike = Union[str, "Path"]


class RepositoryLayout(NamedTuple):
    repository_root: Path
    source_config_root: Path
    runtime_state_root: Path
    workspace_default_root: Path


def resolve_repository_layout(explicit_repository_root: PathLike) -> RepositoryLayout:
    repository_root = Path(explicit_repository_root).resolve()
    return RepositoryLayout(
        repository_root=repository_root,
        source_config_root=(repository_root / "apps" / "common" / "config").resolve(),
        runtime_state_root=(repository_root / "config").resolve(),
        workspace_default_root=(repository_root / "workflows").resolve(),
    )
