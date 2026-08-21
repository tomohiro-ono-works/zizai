from __future__ import annotations

from pathlib import Path

import pytest
from openpyxl import Workbook

from connectors.excel_connector import ExcelConnector


pytestmark = [pytest.mark.integration, pytest.mark.risk_conn_002]


def create_workbook(path: Path, rows: list[list[object]]) -> None:
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = "Orders"
    for row in rows:
        worksheet.append(row)
    workbook.save(path)
    workbook.close()


def test_read_excel_skips_epoch_lookup_when_date_cleansing_is_false(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    path = tmp_path / "orders.xlsx"
    create_workbook(path, [["order_date"], ["2026-06-14"]])
    connector = ExcelConnector()
    monkeypatch.setattr(
        connector,
        "_resolve_excel_serial_system_from_workbook",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(AssertionError("unexpected epoch lookup")),
    )

    result = connector.read_excel(
        str(path),
        sheet_name="Orders",
        header_row=1,
        data_start_row=2,
        schema=[{"origin_name": "order_date", "new_name": "order_date", "ziz_datatype": "DATE"}],
        date_cleansing=False,
    )

    assert result.shape == (1, 1)
    assert str(result.iloc[0]["order_date"])[:10] == "2026-06-14"


def test_read_excel_uses_epoch_lookup_when_date_cleansing_is_true(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    path = tmp_path / "orders.xlsx"
    create_workbook(path, [["order_date"], [44927]])
    connector = ExcelConnector()
    calls = []

    def resolve_epoch(*args, **kwargs):
        calls.append((args, kwargs))
        return "excel_1900"

    monkeypatch.setattr(connector, "_resolve_excel_serial_system_from_workbook", resolve_epoch)

    result = connector.read_excel(
        str(path),
        sheet_name="Orders",
        header_row=1,
        data_start_row=2,
        schema=[{"origin_name": "order_date", "new_name": "order_date", "ziz_datatype": "DATE"}],
        date_cleansing=True,
    )

    assert result.shape == (1, 1)
    assert len(calls) == 1


def test_read_excel_rejects_zero_chunk_size(tmp_path: Path) -> None:
    path = tmp_path / "orders.xlsx"
    create_workbook(path, [["order_id"], ["order-1"]])

    with pytest.raises(ValueError, match="chunk_size は 1 以上"):
        ExcelConnector().read_excel(
            str(path),
            sheet_name="Orders",
            header_row=1,
            data_start_row=2,
            chunk_size=0,
        )


def test_preview_excel_streams_without_openpyxl_workbook_load(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    path = tmp_path / "orders.xlsx"
    rows = [["order_id", "amount"], *[[f"order-{index}", index] for index in range(50)]]
    create_workbook(path, rows)

    def fail_workbook_load(*_args, **_kwargs):
        raise AssertionError("preview must not load workbook")

    monkeypatch.setattr("connectors.excel_connector.load_workbook", fail_workbook_load)
    preview = ExcelConnector().preview_excel(str(path), sheet_name="Orders", max_rows=30)

    assert preview["sheet_names"] == ["Orders"]
    assert preview["sheet_name"] == "Orders"
    assert preview["columns"] == ["A", "B"]
    assert len(preview["rows2d"]) == 30
    assert preview["rows2d"][0] == ["order_id", "amount"]
    assert preview["rows2d"][1] == ["order-0", "0"]


def test_read_excel_chunks_rows_and_logs_progress(tmp_path: Path) -> None:
    path = tmp_path / "orders.xlsx"
    rows = [["order_id", "amount"], *[[f"order-{index}", index] for index in range(5)]]
    create_workbook(path, rows)
    connector = ExcelConnector()
    events = []
    connector.set_execution_logger(None, "step1", lambda event, detail: events.append((event, detail)))

    result = connector.read_excel(
        str(path),
        sheet_name="Orders",
        header_row=1,
        data_start_row=2,
        chunk_size=2,
        date_cleansing=False,
    )

    chunk_events = [detail for event, detail in events if event == "run.connector.chunk.finish"]
    assert result.shape == (5, 2)
    assert [event["rows"] for event in chunk_events] == [2, 2, 1]
    assert chunk_events[-1]["total_rows"] == 5
    connector.clear_execution_logger()
