# Audit Trail and Compliance

## Purpose

Every sensitive business action must be traceable after the fact.

## Rules

- Audit create, update, delete, approve, reject, recall, export, and permission changes.
- Capture who did it, what happened, when it happened, where it came from, and which resource changed.
- Include correlation/request IDs when available.
- Audit logs should be searchable and consistent.
- Use structured fields rather than free text only.
- Log the outcome of integration actions when they materially affect the business process.
- Preserve the record of sensitive changes even if downstream integrations fail.
- Do not log secrets, tokens, or sensitive payload contents unnecessarily.
- Separate business audit logs from debugging logs.

## Minimum Audit Fields

- actor user id or login
- actor role
- action name
- resource type
- resource id
- before and after state summary when relevant
- timestamp
- request id or trace id
- source channel if relevant

## Failure Conditions

- A sensitive action has no audit record.
- Audit data is too incomplete to reconstruct what happened.
- Audit logging leaks secrets or creates noise instead of evidence.
