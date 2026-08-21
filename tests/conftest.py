from __future__ import annotations

import os

from _pytest.config import ExitCode


def pytest_sessionfinish(session, exitstatus: int) -> None:
    if os.environ.get("ZIZAI_FAIL_ON_REQUIRED_SKIP") != "1":
        return

    terminal_reporter = session.config.pluginmanager.get_plugin("terminalreporter")
    skipped = terminal_reporter.stats.get("skipped", ()) if terminal_reporter else ()
    if skipped and session.exitstatus == ExitCode.OK:
        session.exitstatus = ExitCode.TESTS_FAILED
