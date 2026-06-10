# Change Management

## Purpose

Define how changes are planned, reviewed, approved, and rolled out safely.

## Rules

- Changes that affect production behavior should be intentional and reviewable.
- Define scope, risk, rollout order, and rollback path before release.
- Separate low-risk changes from high-risk changes when possible.
- Changes that affect data, permissions, integrations, or contracts require stronger review.
- Do not rely on undocumented manual steps.
- Keep change records tied to the relevant release or incident when needed.
- If a change requires coordination across services or teams, make that explicit.

## Minimum Expectations

- scope
- risk level
- rollout plan
- rollback plan
- owner or approver

## Failure Conditions

- A production change is made without a clear change plan.
- Risky changes are merged without escalation or approval.
- Rollout behavior depends on tribal knowledge.
