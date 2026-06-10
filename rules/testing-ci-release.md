# Testing, CI, and Release Rules

## Purpose

Define what it means for a change to be ready to merge and release.

## Rules

- Definition of done includes lint, typecheck, test, and build.
- Critical workflows need automated tests.
- API and service changes must be covered by the most appropriate test level, not only manual verification.
- Fixes for regressions should add tests that prevent the same failure from returning.
- CI should fail fast on deterministic issues.
- A release must be safe to roll back.
- Do not merge code that only "seems fine" in manual testing if the change affects data, permissions, or integrations.
- If a workflow is too risky for the current test coverage, either add coverage or narrow the release scope.

## Minimum Expectations

- lint
- typecheck
- unit or integration tests for critical logic
- build
- documented release or rollback path for risky changes

## Failure Conditions

- A change lands without any automated verification.
- A critical workflow changes and no test coverage is added.
- CI passes but the change still lacks a rollback or release strategy.
