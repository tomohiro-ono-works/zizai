from __future__ import annotations

import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

import pytest


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
STATIC_ROOT = REPOSITORY_ROOT / "apps" / "gui"
LAYOUT_PATH = REPOSITORY_ROOT / "tests" / "fixtures" / "contracts" / "repository-layout.json"

pytestmark = [pytest.mark.static_analysis, pytest.mark.risk_web_001]


class AssetParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.references: list[tuple[str, str, str]] = []
        self.custom_elements: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        normalized_attrs = dict(attrs)
        for attribute in ("src", "href"):
            value = normalized_attrs.get(attribute)
            if value:
                self.references.append((tag, attribute, value))
        if "-" in tag:
            self.custom_elements.append(tag)


def test_production_html_uses_existing_local_assets_only() -> None:
    layout = json.loads(LAYOUT_PATH.read_text(encoding="utf-8"))
    missing: list[str] = []
    external_scripts_or_frames: list[str] = []
    custom_elements: list[str] = []

    for relative_entry in layout["web_entries"]:
        entry = REPOSITORY_ROOT / relative_entry
        parser = AssetParser()
        parser.feed(entry.read_text(encoding="utf-8"))
        custom_elements.extend(f"{relative_entry}:{tag}" for tag in parser.custom_elements)
        for tag, _attribute, raw_reference in parser.references:
            parsed = urlparse(raw_reference)
            if tag in {"script", "iframe"} and parsed.scheme in {"http", "https"}:
                external_scripts_or_frames.append(f"{relative_entry}:{raw_reference}")
                continue
            if parsed.scheme or raw_reference.startswith(("#", "data:")):
                continue
            target = (entry.parent / parsed.path).resolve()
            if target != STATIC_ROOT and STATIC_ROOT not in target.parents:
                missing.append(f"outside static root: {relative_entry}:{raw_reference}")
            elif not target.is_file():
                missing.append(f"missing: {relative_entry}:{raw_reference}")

    assert missing == []
    assert external_scripts_or_frames == []
    assert custom_elements == []
