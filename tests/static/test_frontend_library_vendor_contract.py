from __future__ import annotations

import re
from pathlib import Path

import pytest


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
VENDOR_ROOT = REPOSITORY_ROOT / "apps" / "gui" / "vendor"
README_PATH = VENDOR_ROOT / "README.md"

pytestmark = [pytest.mark.static_analysis]

# Pinned revisions approved for TASK-016 WP-2. This is the manifest of record;
# apps/gui/vendor/README.md must describe exactly these libraries and commits.
PINNED_LIBRARIES: dict[str, dict[str, object]] = {
    "zizai-app-shell": {
        "url": "https://github.com/tomohiro-ono-works/zizai-app-shell",
        "commit": "4b81f4ad4762e8ddd3d89d413874f71ecf84856b",
        "entries": [
            "apps/gui/vendor/zizai-app-shell/src/00_tokens.css",
            "apps/gui/vendor/zizai-app-shell/src/ui-shell.css",
            "apps/gui/vendor/zizai-app-shell/src/shell_types.js",
            "apps/gui/vendor/zizai-app-shell/src/shell_events.js",
            "apps/gui/vendor/zizai-app-shell/src/shell_dom.js",
            "apps/gui/vendor/zizai-app-shell/src/shell_layout.js",
            "apps/gui/vendor/zizai-app-shell/src/shell_regions.js",
            "apps/gui/vendor/zizai-app-shell/src/shell_tabs.js",
            "apps/gui/vendor/zizai-app-shell/src/shell_tab_interactions.js",
            "apps/gui/vendor/zizai-app-shell/src/shell_activitybar.js",
            "apps/gui/vendor/zizai-app-shell/src/shell_shortcuts.js",
            "apps/gui/vendor/zizai-app-shell/src/app_shell.js",
        ],
    },
    "zizai-catalog-panel": {
        "url": "https://github.com/tomohiro-ono-works/zizai-catalog-panel",
        "commit": "3141ba66d583eaa6d6947d42e572f31428eefc69",
        "entries": [
            "apps/gui/vendor/zizai-catalog-panel/src/catalog-panel.css",
            "apps/gui/vendor/zizai-catalog-panel/src/catalog-store.js",
            "apps/gui/vendor/zizai-catalog-panel/src/catalog-panel.js",
        ],
    },
    "zizai-data-viewer": {
        "url": "https://github.com/tomohiro-ono-works/zizai-data-viewer",
        "commit": "62998cf76fdda5afea0c52a16654e89ded555e49",
        "entries": [
            "apps/gui/vendor/zizai-data-viewer/src/report-viewer.css",
            "apps/gui/vendor/zizai-data-viewer/src/report-viewer.js",
        ],
    },
    "zizai-editor-markdown": {
        "url": "https://github.com/tomohiro-ono-works/zizai-editor-markdown",
        "commit": "39f14305c1c6d9994fa6427cf805ffc8b3b02c69",
        "entries": [
            "apps/gui/vendor/zizai-editor-markdown/src/markdown_editor.css",
            "apps/gui/vendor/zizai-editor-markdown/src/markdown_editor.js",
        ],
    },
    "zizai-form": {
        "url": "https://github.com/tomohiro-ono-works/zizai-form",
        "commit": "f08bfc73350d04e9238b43fa4dbcfdb81fa5150e",
        "entries": [
            "apps/gui/vendor/zizai-form/src/node-form.css",
            "apps/gui/vendor/zizai-form/src/node-form.js",
        ],
    },
    "zizai-highlighter-sql": {
        "url": "https://github.com/tomohiro-ono-works/zizai-highlighter-sql",
        "commit": "9306ca2c87d5ba2857639f77c02d8fd8b1dfb4ed",
        "entries": [
            "apps/gui/vendor/zizai-highlighter-sql/src/sql-highlighter.css",
            "apps/gui/vendor/zizai-highlighter-sql/src/sql-highlighter.js",
            "apps/gui/vendor/zizai-highlighter-sql/src/dictionaries/bigquery.js",
            "apps/gui/vendor/zizai-highlighter-sql/src/dictionaries/duckdb.js",
        ],
    },
    "zizai-workflow-designer": {
        "url": "https://github.com/tomohiro-ono-works/zizai-workflow-designer",
        "commit": "a8d1713dac14e29aa18f4723cb7c8c058e74beb2",
        "entries": [
            "apps/gui/vendor/zizai-workflow-designer/src/workflow_designer.css",
            "apps/gui/vendor/zizai-workflow-designer/src/workflow_designer.js",
        ],
    },
}

# Directory/file names that indicate repository metadata, samples, tests, or
# build/cache output rather than a plain src/ + LICENSE snapshot.
FORBIDDEN_TOP_LEVEL_NAMES = {
    ".git",
    ".github",
    ".gitignore",
    "README.md",
    "readme.md",
    "CHANGELOG.md",
    "package.json",
    "package-lock.json",
    "sample",
    "samples",
    "test",
    "tests",
    "node_modules",
    "dist",
    "build",
    "coverage",
    "__pycache__",
    ".DS_Store",
}

REMOTE_URL_PATTERN = re.compile(r"""url\(\s*['"]?https?://|@import\s+['"]?https?://""")


def _library_names() -> list[str]:
    return sorted(PINNED_LIBRARIES)


def _parse_readme_manifest() -> dict[str, dict[str, str]]:
    text = README_PATH.read_text(encoding="utf-8")
    blocks = re.split(r"(?m)^### ", text)[1:]
    manifest: dict[str, dict[str, str]] = {}
    for block in blocks:
        heading, _, body = block.partition("\n")
        library = heading.strip()
        source_match = re.search(r"^- Source:\s*(\S+)\s*$", body, re.MULTILINE)
        commit_match = re.search(r"^- Commit:\s*([0-9a-f]{40})\s*$", body, re.MULTILINE)
        license_match = re.search(r"^- License:\s*`([^`]+)`\s*$", body, re.MULTILINE)
        entries = re.findall(r"^\s*\d+\.\s*`([^`]+)`\s*$", body, re.MULTILINE)
        manifest[library] = {
            "url": source_match.group(1) if source_match else "",
            "commit": commit_match.group(1) if commit_match else "",
            "license": license_match.group(1) if license_match else "",
            "entries": entries,
        }
    return manifest


@pytest.mark.parametrize("library", _library_names())
def test_vendor_directory_exists_for_each_approved_library(library: str) -> None:
    library_dir = VENDOR_ROOT / library
    src_dir = library_dir / "src"

    assert library_dir.is_dir(), f"missing vendored library directory: {library_dir}"
    assert src_dir.is_dir(), f"missing vendored src/ tree: {src_dir}"


def test_readme_manifest_exists() -> None:
    assert README_PATH.is_file(), f"missing vendor manifest: {README_PATH}"


@pytest.mark.parametrize("library", _library_names())
def test_readme_manifest_records_source_url_and_exact_pinned_commit(library: str) -> None:
    manifest = _parse_readme_manifest()
    expected = PINNED_LIBRARIES[library]

    assert library in manifest, f"README.md does not document {library}"
    recorded = manifest[library]
    assert recorded["url"] == expected["url"], (
        f"{library} source URL mismatch: {recorded['url']!r} != {expected['url']!r}"
    )
    assert recorded["commit"] == expected["commit"], (
        f"{library} pinned commit mismatch: {recorded['commit']!r} != {expected['commit']!r}"
    )
    assert len(recorded["commit"]) == 40, f"{library} commit is not a 40-character SHA"


@pytest.mark.parametrize("library", _library_names())
def test_license_file_is_present_for_each_library(library: str) -> None:
    license_path = VENDOR_ROOT / library / "LICENSE"

    assert license_path.is_file(), f"missing LICENSE: {license_path}"
    assert license_path.read_text(encoding="utf-8").strip() != ""


@pytest.mark.parametrize("library", _library_names())
def test_required_runtime_entries_exist_in_documented_load_order(library: str) -> None:
    manifest = _parse_readme_manifest()
    expected_entries = PINNED_LIBRARIES[library]["entries"]

    assert manifest[library]["entries"][: len(expected_entries)] == expected_entries, (
        f"{library} README runtime load order does not match the required entries"
    )
    for relative_entry in expected_entries:
        entry_path = REPOSITORY_ROOT / relative_entry
        assert entry_path.is_file(), f"missing required runtime entry: {entry_path}"


@pytest.mark.parametrize("library", _library_names())
def test_vendor_directory_excludes_repository_metadata_and_unapproved_content(
    library: str,
) -> None:
    library_dir = VENDOR_ROOT / library
    top_level_names = {entry.name for entry in library_dir.iterdir()}

    assert top_level_names == {"src", "LICENSE"}, (
        f"{library} has unapproved top-level content: {top_level_names - {'src', 'LICENSE'}}"
    )

    forbidden_hits = [
        path
        for path in library_dir.rglob("*")
        if path.name in FORBIDDEN_TOP_LEVEL_NAMES
    ]
    assert forbidden_hits == [], f"{library} contains repository metadata or build output: {forbidden_hits}"


@pytest.mark.parametrize("library", _library_names())
def test_vendored_assets_have_no_remote_or_cdn_url_dependency(library: str) -> None:
    src_dir = VENDOR_ROOT / library / "src"
    violations: list[str] = []

    for path in src_dir.rglob("*"):
        if path.is_file() and path.suffix in {".css", ".js"}:
            text = path.read_text(encoding="utf-8")
            if REMOTE_URL_PATTERN.search(text):
                violations.append(str(path.relative_to(REPOSITORY_ROOT)))

    assert violations == [], f"{library} references remote/CDN assets: {violations}"


_SELECTOR_HEAD_PATTERN = re.compile(r"^(:root|html|body)(?=[\s.:#\[,]|$)", re.IGNORECASE)
_COMMENT_PATTERN = re.compile(r"/\*.*?\*/", re.DOTALL)


def _unscoped_selectors(css_text: str) -> list[str]:
    cleaned = _COMMENT_PATTERN.sub("", css_text)
    violations: list[str] = []
    for rule_selectors in re.findall(r"([^{}]+)\{", cleaned):
        for selector in rule_selectors.split(","):
            token = selector.strip()
            if _SELECTOR_HEAD_PATTERN.match(token):
                violations.append(token)
    return violations


@pytest.mark.parametrize("library", _library_names())
def test_vendored_css_has_no_unscoped_root_html_body_selector(library: str) -> None:
    src_dir = VENDOR_ROOT / library / "src"
    violations: dict[str, list[str]] = {}

    for css_path in src_dir.rglob("*.css"):
        found = _unscoped_selectors(css_path.read_text(encoding="utf-8"))
        if found:
            violations[str(css_path.relative_to(REPOSITORY_ROOT))] = found

    assert violations == {}, f"{library} has unscoped :root/html/body selectors: {violations}"
