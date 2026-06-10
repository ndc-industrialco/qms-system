# Release Checklist

## Purpose

Define the minimum safe release bar for changes that reach production.

## Rules

- Verify the change against architecture, security, data, integration, performance, and ops.
- Confirm lint, typecheck, test, and build status.
- Check that migrations, backfills, and rollbacks are understood.
- Confirm API contract compatibility when external consumers exist.
- Confirm permission changes and audit logging are correct.
- Confirm observability is in place for the new or changed path.
- Confirm the release can be rolled back safely.
- Do not release a change that depends on undocumented manual steps unless those steps are recorded.

## Minimum Expectations

- verification status
- migration or rollout notes
- rollback path
- monitoring plan
- approval for risky changes

## Failure Conditions

- A release goes out without checking rollback or monitoring.
- The change depends on unrecorded manual steps.
- A risky change is shipped without passing the core verification gates.
