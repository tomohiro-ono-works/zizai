from __future__ import annotations

import os
import sys


def main() -> int:
    os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
    flags = os.environ.get("QTWEBENGINE_CHROMIUM_FLAGS", "").strip()
    required_flags = "--no-sandbox --disable-gpu"
    os.environ["QTWEBENGINE_CHROMIUM_FLAGS"] = f"{flags} {required_flags}".strip()
    try:
        from PySide6.QtWebEngineWidgets import QWebEngineView
        from PySide6.QtWidgets import QApplication

        application = QApplication.instance() or QApplication([])
        view = QWebEngineView()
        view.deleteLater()
        application.processEvents()
    except Exception as error:
        print(f"QtWebEngine capability is unavailable: {error}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
