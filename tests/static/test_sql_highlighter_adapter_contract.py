from __future__ import annotations

from pathlib import Path

import pytest


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
GUI_ROOT = REPOSITORY_ROOT / "apps" / "gui"
DATAFLOW_HTML = GUI_ROOT / "dataflow.html"
CODE_HIGHLIGHT_JS = GUI_ROOT / "js" / "code.highlight.js"

# TASK-016 WP-4: the SQL editors must resolve every dialect asset from the pinned
# local vendor snapshot, in the order recorded in apps/gui/vendor/README.md.
SQL_HIGHLIGHTER_RUNTIME_ENTRIES = [
    "./vendor/zizai-highlighter-sql/src/sql-highlighter.css",
    "./vendor/zizai-highlighter-sql/src/sql-highlighter.js",
    "./vendor/zizai-highlighter-sql/src/dictionaries/bigquery.js",
    "./vendor/zizai-highlighter-sql/src/dictionaries/duckdb.js",
]

pytestmark = [pytest.mark.static_analysis]


def test_dataflow_page_loads_vendored_sql_highlighter_in_documented_order() -> None:
    text = DATAFLOW_HTML.read_text(encoding="utf-8")

    positions = []
    for entry in SQL_HIGHLIGHTER_RUNTIME_ENTRIES:
        index = text.find(entry)
        assert index >= 0, f"dataflow.html does not load {entry}"
        positions.append(index)

    assert positions == sorted(positions), (
        "dataflow.html loads the SQL Highlighter assets out of the documented order"
    )


def test_dataflow_page_does_not_reference_dialect_json_at_runtime() -> None:
    text = DATAFLOW_HTML.read_text(encoding="utf-8")

    assert "dictionaries/bigquery.json" not in text
    assert "dictionaries/duckdb.json" not in text


def test_application_javascript_has_no_legacy_sql_tokenizer() -> None:
    text = CODE_HIGHLIGHT_JS.read_text(encoding="utf-8")

    assert "tokenizeSql" not in text, "the duplicated Application SQL tokenizer is still present"
    assert "SQL_KEYWORDS" not in text, "the duplicated Application SQL keyword table is still present"


def test_application_javascript_keeps_python_and_json_tokenizers() -> None:
    text = CODE_HIGHLIGHT_JS.read_text(encoding="utf-8")

    assert "tokenizePython" in text
    assert "tokenizeJson" in text


def test_application_javascript_never_loads_sql_dialects_over_the_network() -> None:
    offenders = [
        str(path.relative_to(REPOSITORY_ROOT))
        for path in sorted((GUI_ROOT / "js").rglob("*.js"))
        if "loadDialect" in path.read_text(encoding="utf-8")
    ]

    assert offenders == [], f"SQL dialects must not be fetched at runtime: {offenders}"
