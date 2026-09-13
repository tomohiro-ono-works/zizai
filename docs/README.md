# Documentation Index

This file is the Source of Truth for the ZizAI documentation structure and Task format.

## Work structure

`Project → Objective → Task → Subtask → Step`

- **Project**: the product, repository, and its maintained assets as a whole.
- **Objective**: a higher-level outcome pursued within the Project.
- **Task**: one independently completable outcome, including the design, implementation, verification, and necessary fixes required by that outcome.
- **Subtask**: an internal division of a Task. It inherits the parent Task and records only its own outcome, scope differences, dependencies, and verification details.
- **Step**: a concrete action within a Subtask.

This hierarchy describes work, not Agent allocation. Historical `Work Package` or `WP` terminology remains valid inside completed records, but new and reactivated work uses `Subtask`.

## Document responsibilities

| Asset | Responsibility | Usage |
| --- | --- | --- |
| `features/` | Current Specifications, Architecture, and Project-wide implementation or verification contracts | Read only the files referenced by the active Task |
| `tasks/active/` | Current Task authority, status, remaining work, and acceptance conditions | Primary execution instruction |
| `tasks/done/` | Completed Task history and evidence | Read only when historical evidence is required |
| `decisions/` | Approved, durable design decisions and their rationale | Read when a Task or Current Specification refers to the decision |
| `handoffs/` | Investigation evidence, transition notes, and non-canonical plans | Never treat as Current Specification by itself |
| `codex_development_guide_2026-08-15_v24/` | Versioned historical development guide | Not a Current Specification |

Current Specifications live in `features/`. When historical Tasks or Handoffs conflict with a Current Specification, use the Current Specification and current code; consult `decisions/` for the approved rationale.

## Task contract

Every new or reactivated Task contains:

- `Goal`
- `Scope`
- `Out of scope`
- `References`
- `Constraints`
- `Acceptance Criteria`

Add only when required:

- `Edit Scope`
- `Tests`
- `Subtasks`
- `Status`
- `Evidence`
- `Remaining Work`

A Subtask does not repeat the parent Task's References or Constraints. Fixed Owner, Assignment Reason, phase-specific Agent or model assignments, and duplicate parallelization fields are not part of the Task contract. Deferred Tasks may retain legacy structure until reactivated; completed Tasks and Evidence are not rewritten only to normalize terminology.

## Primary Current Specifications

- [Architecture](features/architecture.md)
- [Coding Rules](features/coding-rules.md)
- [Refactor Policy](features/refactor-policy.md)
- [Data Contract](features/data-contract.md)
- [Connector Contract](features/connectors.md)
- [Frontend](features/frontend.md)
- [Frontend Libraries](features/frontend-libraries.md)

Do not duplicate these definitions in Tasks, Handoffs, Agent instructions, or local Skills. A Current Specification may change only when that change is explicitly authorized by a Task Goal or Scope.
