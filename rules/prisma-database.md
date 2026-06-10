# Prisma and PostgreSQL Rules

## Purpose

Keep the database layer safe, predictable, and scalable.

## Rules

- Use Prisma as the schema and ORM layer for PostgreSQL-backed application data.
- Keep direct database access isolated to repositories and Prisma infrastructure code.
- Treat schema design as an application contract, not just storage.
- Use relation fields, unique constraints, and indexes to protect domain invariants.
- Prefer explicit nullability and defaults.
- Review query shape and index support for list, filter, and lookup paths.
- Avoid unbounded queries in request paths.
- Use transactions when multiple writes must succeed or fail together.
- Do not mutate production data manually unless it is part of a controlled operational procedure.
- Treat generated counters, references, and status transitions as concurrency-sensitive.

## Schema Expectations

- relations reflect actual domain behavior
- uniqueness is enforced where needed
- foreign keys and cascades are intentional
- indexes support real query patterns
- optional and required fields are explicit
- enums are used where they improve stability and clarity

## Migration and Safety

- Prefer Prisma migrations as the source of schema change history.
- Keep migrations small and reviewable.
- Plan rollback or backward-compatibility behavior before merging.
- Backfills must be explicit and validated.
- Avoid destructive schema changes unless the rollout and rollback story is clear.

## Performance and Operations

- Watch for N+1 query patterns.
- Review connection pooling behavior for the deployment model.
- Prefer pagination on list endpoints.
- Use explain or query analysis when a path becomes heavy.
- Make backup and restore assumptions explicit for high-risk changes.

## Failure Conditions

- A schema change breaks the app during rollout.
- A uniqueness or relation rule is left to application code alone when the database could enforce it.
- A query path is obviously heavy but has no review of indexes or shape.
- A migration or backfill has no rollback or validation story.
