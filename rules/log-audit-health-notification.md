# Log and Audit Trail Rules

## Purpose

Define the minimum operability standard for logs, audit evidence, health checks, and notifications.

## Logs

- Use structured logs.
- Include request id or trace id when available.
- Keep log levels consistent and meaningful.
- Prefer stdout and stderr in containerized deployments.
- Do not log secrets, tokens, or sensitive payloads.
- Logs should be short, searchable, and actionable.

## Audit Logs

- Audit sensitive actions such as create, update, delete, approve, reject, recall, export, and permission changes.
- Capture who did it, what changed, when it happened, and which resource was affected.
- Use structured fields instead of free text only.
- Preserve audit records even when downstream integrations fail.
- Keep audit logs searchable and separate from debug logs.

## Minimum Expectations

- request id or trace id in logs
- structured audit record for sensitive actions

## Failure Conditions

- A production issue cannot be reconstructed from logs and audit data.
