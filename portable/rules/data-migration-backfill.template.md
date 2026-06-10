# Data Migration and Backfill

## Purpose

Keep schema and data changes safe during rollout and rollback.

## Rules

- Treat migrations as production changes, not just schema edits.
- Prefer forward-compatible changes first.
- Backfill plans must be explicit when new data is derived from old data.
- Avoid destructive changes unless the rollback story is clear.
- Keep migrations small and reviewable.
- Understand how a migration behaves if interrupted midway.
- Verify how the app behaves while old and new states temporarily coexist.
- Backfills should not silently corrupt data or create duplicates.
- If a migration needs application support code, coordinate the rollout order.

## Expectations

- rollout order
- rollback path
- backfill strategy
- compatibility with old and new code
- validation after migration

## Failure Conditions

- A schema change breaks the app during a rolling deploy.
- A backfill cannot be validated.
- A destructive migration has no rollback story.
