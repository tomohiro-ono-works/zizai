from __future__ import annotations

from decimal import Decimal
from pathlib import Path

import duckdb
import numpy as np
import pandas as pd
import pytest

from apps.connectors.duckdb_connector import DuckConnector


pytestmark = [pytest.mark.unit, pytest.mark.risk_conn_002]


@pytest.mark.parametrize(
    ("source", "expected_duckdb_type"),
    [
        pytest.param(
            pd.DataFrame({"value": pd.Series(["alpha", None], dtype="string")}),
            "VARCHAR",
            id="explicit-string",
        ),
        pytest.param(
            pd.DataFrame({"value": pd.Series(["alpha", None], dtype=object)}),
            "VARCHAR",
            id="object-string",
        ),
        pytest.param(
            pd.DataFrame({"value": pd.Series([1, None], dtype="Int64")}),
            "BIGINT",
            id="nullable-int64",
        ),
        pytest.param(
            pd.DataFrame({"value": pd.Series([1.5, None], dtype="Float64")}),
            "DOUBLE",
            id="nullable-float64",
        ),
        pytest.param(
            pd.DataFrame({"value": pd.Series([True, None], dtype="boolean")}),
            "BOOLEAN",
            id="nullable-boolean",
        ),
        pytest.param(
            pd.DataFrame(
                {"value": pd.Series(np.array(["2026-01-01", "NaT"], dtype="datetime64[ms]"))}
            ),
            "TIMESTAMP_MS",
            id="datetime-ms",
        ),
        pytest.param(
            pd.DataFrame({"value": pd.to_datetime(["2026-01-01", None])}),
            "TIMESTAMP",
            id="datetime-us",
        ),
        pytest.param(
            pd.DataFrame(
                {"value": pd.Series(np.array(["2026-01-01", "NaT"], dtype="datetime64[ns]"))}
            ),
            "TIMESTAMP_NS",
            id="datetime-ns",
        ),
        pytest.param(
            pd.DataFrame({"value": pd.to_datetime(["2026-01-01T00:00:00Z", None], utc=True)}),
            "TIMESTAMP WITH TIME ZONE",
            id="datetime-tz",
        ),
        pytest.param(
            pd.DataFrame({"value": pd.Series(["alpha", None], dtype="category")}),
            "ENUM('alpha')",
            id="category",
        ),
        pytest.param(
            pd.DataFrame({"value": pd.Series([Decimal("1.23"), None], dtype=object)}),
            "DECIMAL(3,2)",
            id="decimal",
        ),
        pytest.param(
            pd.DataFrame({"value": pd.Series([b"abc", None], dtype=object)}),
            "BLOB",
            id="bytes",
        ),
        pytest.param(
            pd.DataFrame({"value": pd.Series([[1, 2], None], dtype=object)}),
            "INTEGER[]",
            id="list",
        ),
        pytest.param(
            pd.DataFrame({"value": pd.Series([{"name": "alpha", "count": 1}, None], dtype=object)}),
            'STRUCT("name" VARCHAR, count INTEGER)',
            id="dict",
        ),
        pytest.param(
            pd.DataFrame({"value": pd.Series([None, None], dtype=object)}),
            "INTEGER",
            id="all-null-object",
        ),
    ],
)
def test_create_table_preserves_supported_dtype_mapping(
    tmp_path: Path,
    source: pd.DataFrame,
    expected_duckdb_type: str,
) -> None:
    db_path = tmp_path / "supported.duckdb"

    DuckConnector().create_table(
        db_file=str(db_path),
        input_data="source",
        table_name="items",
        context={"source": source},
    )

    with duckdb.connect(str(db_path)) as connection:
        actual_type = connection.execute(
            "SELECT data_type FROM information_schema.columns "
            "WHERE table_name = 'items' AND column_name = 'value'"
        ).fetchone()[0]

    assert actual_type == expected_duckdb_type


def test_dataframe_normalization_avoids_copy_when_no_pandas3_str_column() -> None:
    source = pd.DataFrame(
        {
            "name": pd.Series(["alpha", None], dtype="string"),
            "count": pd.Series([1, None], dtype="Int64"),
        }
    )

    normalized = DuckConnector._normalize_dataframe_for_duckdb(source)

    assert normalized is source


def test_dataframe_normalization_shares_unmodified_column_memory() -> None:
    source = pd.DataFrame(
        {
            "name": ["alpha", None],
            "count": np.arange(2, dtype="int64"),
        }
    )

    normalized = DuckConnector._normalize_dataframe_for_duckdb(source)

    assert normalized is not source
    assert str(normalized["name"].dtype) == "string"
    assert np.shares_memory(source["count"].to_numpy(), normalized["count"].to_numpy())


def test_create_table_accepts_pandas3_default_string_dtype_without_mutating_source(
    tmp_path: Path,
) -> None:
    source = pd.DataFrame({"name": ["alpha", None]})
    assert str(source["name"].dtype) == "str"

    db_path = tmp_path / "strings.duckdb"
    DuckConnector().create_table(
        db_file=str(db_path),
        input_data="source",
        table_name="items",
        context={"source": source},
    )

    with duckdb.connect(str(db_path)) as connection:
        column_type = connection.execute(
            "SELECT data_type FROM information_schema.columns "
            "WHERE table_name = 'items' AND column_name = 'name'"
        ).fetchone()[0]
        rows = connection.execute("SELECT name FROM items ORDER BY rowid").fetchall()

    assert column_type == "VARCHAR"
    assert rows == [("alpha",), (None,)]
    assert str(source["name"].dtype) == "str"


def test_create_table_reports_column_dtype_when_duckdb_rejects_registration(
    tmp_path: Path,
) -> None:
    source = pd.DataFrame({"period_value": pd.period_range("2026-01", periods=2, freq="M")})

    with pytest.raises(ValueError) as captured:
        DuckConnector().create_table(
            db_file=str(tmp_path / "unsupported.duckdb"),
            input_data="source",
            table_name="items",
            context={"source": source},
        )

    assert "DataFrameのDuckDB登録に失敗しました" in str(captured.value)
    assert "period_value=period[M]" in str(captured.value)
    assert isinstance(captured.value.__cause__, duckdb.NotImplementedException)


def test_create_table_keeps_existing_empty_dataframe_error(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="有効なデータがありません"):
        DuckConnector().create_table(
            db_file=str(tmp_path / "empty.duckdb"),
            input_data="source",
            table_name="items",
            context={"source": pd.DataFrame({"value": pd.Series([], dtype="string")})},
        )


@pytest.mark.parametrize(
    ("source", "expected_roundtrip_type"),
    [
        pytest.param(
            pd.DataFrame({"value": pd.Series(["alpha", None], dtype="category")}),
            "VARCHAR",
            id="category",
        ),
        pytest.param(
            pd.DataFrame({"value": pd.Series([Decimal("1.23"), None], dtype=object)}),
            "DOUBLE",
            id="decimal",
        ),
    ],
)
def test_execute_sql_category_and_decimal_results_remain_reimportable(
    tmp_path: Path,
    source: pd.DataFrame,
    expected_roundtrip_type: str,
) -> None:
    db_path = tmp_path / "scalar-roundtrip.duckdb"
    connector = DuckConnector()
    connector.create_table(
        db_file=str(db_path),
        input_data="source",
        table_name="source",
        context={"source": source},
    )

    query_result = connector.execute_sql(str(db_path), "SELECT value FROM source")
    connector.create_table(
        db_file=str(db_path),
        input_data="query_result",
        table_name="roundtrip",
        context={"query_result": query_result},
    )

    with duckdb.connect(str(db_path)) as connection:
        actual_type = connection.execute(
            "SELECT data_type FROM information_schema.columns "
            "WHERE table_name = 'roundtrip' AND column_name = 'value'"
        ).fetchone()[0]
    assert actual_type == expected_roundtrip_type


def test_execute_sql_array_result_does_not_guess_element_type(tmp_path: Path) -> None:
    db_path = tmp_path / "array-schema.duckdb"
    with duckdb.connect(str(db_path)) as connection:
        connection.execute("CREATE TABLE source AS SELECT [1, 2]::INTEGER[] AS value")

    query_result = DuckConnector().execute_sql(str(db_path), "SELECT value FROM source")

    schema_item = query_result.attrs["ziz_schema"][0]
    assert schema_item["ziz_datatype"] == "ARRAY"


def test_execute_sql_array_result_can_be_created_as_another_table(tmp_path: Path) -> None:
    db_path = tmp_path / "array-roundtrip.duckdb"
    connector = DuckConnector()
    with duckdb.connect(str(db_path)) as connection:
        connection.execute("CREATE TABLE source AS SELECT [1, 2]::INTEGER[] AS value")

    query_result = connector.execute_sql(str(db_path), "SELECT value FROM source")
    connector.create_table(
        db_file=str(db_path),
        input_data="query_result",
        table_name="roundtrip",
        context={"query_result": query_result},
    )

    with duckdb.connect(str(db_path)) as connection:
        actual_type = connection.execute(
            "SELECT data_type FROM information_schema.columns "
            "WHERE table_name = 'roundtrip' AND column_name = 'value'"
        ).fetchone()[0]
    assert actual_type == "INTEGER[]"


def test_execute_sql_file_array_result_can_be_created_as_another_table(tmp_path: Path) -> None:
    db_path = tmp_path / "array-file-roundtrip.duckdb"
    sql_path = tmp_path / "array-query.sql"
    sql_path.write_text("SELECT value FROM source", encoding="utf-8")
    connector = DuckConnector()
    with duckdb.connect(str(db_path)) as connection:
        connection.execute("CREATE TABLE source AS SELECT [1, 2]::INTEGER[] AS value")

    query_result = connector.execute_sql_file(str(db_path), str(sql_path))
    connector.create_table(
        db_file=str(db_path),
        input_data="query_result",
        table_name="roundtrip",
        context={"query_result": query_result},
    )

    with duckdb.connect(str(db_path)) as connection:
        actual_type = connection.execute(
            "SELECT data_type FROM information_schema.columns "
            "WHERE table_name = 'roundtrip' AND column_name = 'value'"
        ).fetchone()[0]
    assert actual_type == "INTEGER[]"


def test_execute_sql_struct_result_can_be_created_as_another_table(tmp_path: Path) -> None:
    db_path = tmp_path / "struct-roundtrip.duckdb"
    connector = DuckConnector()
    with duckdb.connect(str(db_path)) as connection:
        connection.execute(
            "CREATE TABLE source AS "
            "SELECT {'name': 'alpha', 'count': 1}::STRUCT(name VARCHAR, count INTEGER) AS value"
        )

    query_result = connector.execute_sql(str(db_path), "SELECT value FROM source")
    connector.create_table(
        db_file=str(db_path),
        input_data="query_result",
        table_name="roundtrip",
        context={"query_result": query_result},
    )

    with duckdb.connect(str(db_path)) as connection:
        actual_type = connection.execute(
            "SELECT data_type FROM information_schema.columns "
            "WHERE table_name = 'roundtrip' AND column_name = 'value'"
        ).fetchone()[0]
    assert actual_type == 'STRUCT("name" VARCHAR, count INTEGER)'
