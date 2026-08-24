from __future__ import annotations

from pathlib import Path

import pandas as pd
import pytest

from apps.connectors.dataintegration_connector import DataintegrationConnector


pytestmark = [pytest.mark.unit, pytest.mark.risk_conn_002]


@pytest.fixture
def base_dataframe() -> pd.DataFrame:
    return pd.DataFrame(
        [
            {"日付": "2026-04-01", "age": 10, "city": "Tokyo", "name": "Taro"},
            {"日付": "2026-04-02", "age": 25, "city": "Osaka", "name": "Hanako"},
            {"日付": "2026-04-03", "age": 30, "city": "Tokyo", "name": "Jiro"},
        ]
    )


def test_replace_fields_applies_csv_rename_list(tmp_path: Path, base_dataframe: pd.DataFrame) -> None:
    rename_csv = tmp_path / "rename.csv"
    rename_csv.write_text(
        "origin_name,replaced_name,description,ziz_datatype\n"
        "日付,order_date,受注日,DATE\n"
        "age,age,年齢,INT64\n"
        "city,city_name,都市,STRING\n",
        encoding="utf-8",
    )

    result = DataintegrationConnector().execute(
        "replace_fields_forrenamelist",
        {"input_data": "step1", "rename_list_path": str(rename_csv)},
        {"step1": base_dataframe},
    )

    assert list(result.columns) == ["order_date", "age", "city_name", "name"]
    assert str(result["age"].dtype) == "Int64"
    assert len(result.attrs.get("ziz_schema") or []) == 4


def test_filter_rows_supports_exact_contains_and_range(base_dataframe: pd.DataFrame) -> None:
    result = DataintegrationConnector().execute(
        "filter_rows",
        {
            "input_data": "step1",
            "conditions": [
                {"field": "city", "operator": "exact", "value": "Tokyo", "value_to": ""},
                {"field": "name", "operator": "contains", "value": "r", "value_to": ""},
                {"field": "age", "operator": "range", "value": "5", "value_to": "20"},
            ],
        },
        {"step1": base_dataframe},
    )

    assert len(result) == 1
    assert result.iloc[0]["name"] == "Taro"


def test_filter_rows_supports_prefix_and_suffix(base_dataframe: pd.DataFrame) -> None:
    result = DataintegrationConnector().execute(
        "filter_rows",
        {
            "input_data": "step1",
            "conditions": [
                {"field": "city", "operator": "prefix", "value": "To", "value_to": ""},
                {"field": "name", "operator": "suffix", "value": "o", "value_to": ""},
            ],
        },
        {"step1": base_dataframe},
    )

    assert len(result) == 2
    assert result["name"].tolist() == ["Taro", "Jiro"]
