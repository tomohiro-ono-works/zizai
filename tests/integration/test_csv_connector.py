from __future__ import annotations

from pathlib import Path

import pytest

from connectors.csv_connector import CSVConnector


pytestmark = [pytest.mark.integration, pytest.mark.risk_conn_002]


def test_read_csv_chunks_rows_and_logs_progress(tmp_path: Path) -> None:
    csv_path = tmp_path / "orders.csv"
    csv_path.write_text(
        "id,name\n" + "".join(f"{index},name-{index}\n" for index in range(5)),
        encoding="utf-8",
    )
    connector = CSVConnector()
    events = []
    connector.set_execution_logger(None, "step1", lambda event, detail: events.append((event, detail)))

    result = connector.read_csv(
        str(csv_path),
        encoding="utf-8",
        delimiter=",",
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
