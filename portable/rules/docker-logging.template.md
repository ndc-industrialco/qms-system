# Docker Logging Standard

## Purpose

Define how logs should behave in containerized deployment and how they should be shipped or consumed.

## Rules

- Application logs must be structured and container-friendly.
- Prefer stdout and stderr for container logging.
- Do not rely on ad hoc file logs inside the container unless there is a clear operational reason.
- Include request id or trace id in application logs when available.
- Log level should reflect severity consistently.
- Do not log secrets, tokens, large payloads, or sensitive user data.
- Keep log messages short, searchable, and actionable.
- If Docker log shipping is configured, document the target, labels, retention expectations, and failure behavior.
- Container log driver choice must match the operational platform and alerting pipeline.
- Logging configuration should not break application startup or core request handling if the log backend is unavailable, unless that dependency is explicitly required.

## Expectations

- structured JSON or equivalent machine-readable logs
- request correlation
- clear severity levels
- no sensitive data leakage
- documented shipping/collection path

## Failure Conditions

- Logs only exist in a format that is hard to parse or aggregate.
- A container logs secrets or PII.
- Log shipping failure breaks the app when it should not.
- Docker logging configuration is present but undocumented or inconsistent.
