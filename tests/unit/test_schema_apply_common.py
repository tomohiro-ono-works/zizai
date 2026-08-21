from __future__ import annotations

import pandas as pd
import pytest

from connectors.base_connector import BaseConnector


pytestmark = [pytest.mark.unit, pytest.mark.risk_conn_002]


def test_schema_apply_selects_converts_and_renames() -> None:
    dataframe = pd.DataFrame(
        [
            {"a": "1", "b": "x", "c": "2026/06/11"},
            {"a": "2", "b": "y", "c": "2026/06/12"},
        ]
    )
    schema = [
        {"origin_name": "a", "new_name": "amount", "ziz_datatype": "INT64"},
        {"origin_name": "c", "new_name": "order_date", "ziz_datatype": "DATE"},
    ]

    result = BaseConnector.apply_schema_to_dataframe(dataframe, schema)

    assert list(result.columns) == ["amount", "order_date"]
    assert str(result["amount"].dtype) == "Int64"
    assert result.iloc[0]["amount"] == 1
    assert str(result.iloc[0]["order_date"])[:10] == "2026-06-11"
    assert result.attrs["ziz_date_parse_metrics"]["target_columns"] == 1


def test_schema_apply_raises_on_missing_columns() -> None:
    dataframe = pd.DataFrame([{"a": "1", "b": "x"}])
    schema = [{"origin_name": "not_exists", "new_name": "value", "ziz_datatype": "STRING"}]

    with pytest.raises(ValueError) as error:
        BaseConnector.apply_schema_to_dataframe(dataframe, schema)

    assert "schema適用エラー(列存在チェック)" in str(error.value)
    assert "not_exists" in str(error.value)
