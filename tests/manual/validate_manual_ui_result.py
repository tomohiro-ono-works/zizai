from __future__ import annotations

import json
import re
import sys
from datetime import datetime
from pathlib import Path


SCHEMA_PATH = Path(__file__).with_name("manual-ui-result.schema.json")
SHA256_PATTERN = re.compile(r"^[0-9a-fA-F]{64}$")


def require(condition: bool, message: str, errors: list[str]) -> None:
    if not condition:
        errors.append(message)


def validate(record: object, schema: dict) -> list[str]:
    errors: list[str] = []
    if not isinstance(record, dict):
        return ["record must be a JSON object"]

    required_root = schema["required"]
    for field in required_root:
        require(field in record, f"missing root field: {field}", errors)
    if errors:
        return errors

    require(record["risk_id"] == "RISK-UI-001", "risk_id must be RISK-UI-001", errors)
    require(record["overall_result"] == "Pass", "overall_result must be Pass", errors)
    require(isinstance(record["executor"], str) and bool(record["executor"].strip()), "executor is required", errors)
    try:
        datetime.fromisoformat(str(record["executed_at"]).replace("Z", "+00:00"))
    except ValueError:
        errors.append("executed_at must be ISO 8601")

    environment = record.get("environment")
    required_environment = schema["properties"]["environment"]["required"]
    require(isinstance(environment, dict), "environment must be an object", errors)
    if isinstance(environment, dict):
        for field in required_environment:
            require(bool(str(environment.get(field) or "").strip()), f"environment.{field} is required", errors)
        require(environment.get("os_name") == "Windows", "environment.os_name must be Windows", errors)

    prerequisites = record.get("prerequisites")
    require(
        isinstance(prerequisites, list) and bool(prerequisites) and all(bool(str(item).strip()) for item in prerequisites),
        "prerequisites must contain non-empty items",
        errors,
    )

    cases = record.get("cases")
    expected_ids = set(
        schema["properties"]["cases"]["items"]["properties"]["test_id"]["enum"]
    )
    require(isinstance(cases, list), "cases must be an array", errors)
    if not isinstance(cases, list):
        return errors
    actual_ids = [case.get("test_id") for case in cases if isinstance(case, dict)]
    require(len(actual_ids) == len(set(actual_ids)), "test_id values must be unique", errors)
    require(set(actual_ids) == expected_ids, "cases must contain every checklist test_id exactly once", errors)

    for index, case in enumerate(cases):
        prefix = f"cases[{index}]"
        if not isinstance(case, dict):
            errors.append(f"{prefix} must be an object")
            continue
        require(case.get("result") == "Pass", f"{prefix}.result must be Pass", errors)
        require(bool(str(case.get("target_feature") or "").strip()), f"{prefix}.target_feature is required", errors)
        steps = case.get("steps")
        require(isinstance(steps, list) and bool(steps), f"{prefix}.steps must not be empty", errors)
        if isinstance(steps, list):
            for step_index, step in enumerate(steps):
                step_prefix = f"{prefix}.steps[{step_index}]"
                if not isinstance(step, dict):
                    errors.append(f"{step_prefix} must be an object")
                    continue
                for field in ("number", "action", "expected", "actual", "result"):
                    require(field in step, f"{step_prefix}.{field} is required", errors)
                require(step.get("result") == "Pass", f"{step_prefix}.result must be Pass", errors)
        evidence = case.get("evidence")
        require(isinstance(evidence, list) and bool(evidence), f"{prefix}.evidence must not be empty", errors)
        if isinstance(evidence, list):
            for evidence_index, item in enumerate(evidence):
                evidence_prefix = f"{prefix}.evidence[{evidence_index}]"
                if not isinstance(item, dict):
                    errors.append(f"{evidence_prefix} must be an object")
                    continue
                require(bool(str(item.get("path") or "").strip()), f"{evidence_prefix}.path is required", errors)
                require(bool(SHA256_PATTERN.fullmatch(str(item.get("sha256") or ""))), f"{evidence_prefix}.sha256 is invalid", errors)
    return errors


def main(arguments: list[str] | None = None) -> int:
    args = list(arguments if arguments is not None else sys.argv[1:])
    if len(args) != 1:
        print("usage: validate_manual_ui_result.py <record.json>", file=sys.stderr)
        return 2
    record_path = Path(args[0])
    if not record_path.is_file():
        print(f"manual UI record is missing: {record_path}", file=sys.stderr)
        return 2
    try:
        schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
        record = json.loads(record_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        print(f"manual UI record could not be read: {error}", file=sys.stderr)
        return 1
    errors = validate(record, schema)
    if errors:
        for error in errors:
            print(error, file=sys.stderr)
        return 1
    print("manual UI record passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
