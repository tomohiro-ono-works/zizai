from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path


def main() -> int:
    try:
        with tempfile.TemporaryDirectory(prefix="zizai-symlink-check-") as directory:
            root = Path(directory)
            target = root / "target.txt"
            link = root / "link.txt"
            target.write_text("check", encoding="utf-8")
            os.symlink(target, link)
            if not link.is_symlink():
                raise OSError("created path is not a symbolic link")
    except (NotImplementedError, OSError) as error:
        print(f"Symlink capability is unavailable: {error}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
