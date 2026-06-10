# Oncall Runbook

## Purpose

Define how to respond to alerts and production support events consistently.

## Rules

- Every alert should point to a clear owner or escalation path.
- The runbook should tell the responder what to check first, second, and third.
- Include a fast path for determining whether the issue is app, database, Redis, integration, or deployment related.
- Define when to page, when to investigate, and when to escalate.
- Keep actions safe and reversible where possible.
- Include rollback or mitigation steps for high-risk failures.
- Avoid ambiguous instructions that depend on tribal knowledge.
- Keep runbooks short enough to use under pressure, but complete enough to act on.

## Minimum Expectations

- first checks
- likely cause buckets
- safe mitigation
- escalation path
- rollback or recovery path

## Failure Conditions

- An alert fires but nobody knows what to do next.
- The runbook depends on unwritten tribal knowledge.
- The first response action is unsafe or irreversible without warning.
