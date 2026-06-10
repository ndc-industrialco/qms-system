# Idempotency and Concurrency

## Purpose

Prevent duplicates, race conditions, and repeated side effects.

## Rules

- Any action that submits, approves, rejects, sends, or writes must consider retry behavior.
- Design for double click, refresh, retry, webhook replay, and network uncertainty.
- If the same request can arrive twice, define what should happen.
- Use atomic operations where the domain requires uniqueness.
- Prefer idempotent handlers for actions that can be retried safely.
- Use transaction boundaries to protect multi-step state changes.
- Treat generated numbers, counters, and status transitions as concurrency-sensitive.
- If a side effect cannot be repeated safely, guard it with idempotency or a deduplication key.
- Make retry behavior explicit for integrations and background work.

## Expectations

- request id or idempotency key when duplication matters
- atomic write or unique constraint where appropriate
- safe retry path
- clear conflict behavior on duplicate submission
- no duplicate email, approval, or export side effects unless intentional

## Failure Conditions

- A user can create the same business event twice because of retry or double click.
- A counter or generated identifier can collide under concurrency.
- A side effect runs multiple times when it should run once.
