# Secrets and Key Rotation

## Purpose

Protect credentials, tokens, and configuration secrets across the system lifecycle.

## Rules

- Secrets must never be hardcoded in source.
- Environment variables are configuration, not a place to hide undocumented dependencies.
- Log redaction is mandatory for sensitive values.
- Tokens and secrets should have a clear ownership and lifecycle.
- Rotation must be possible without rewriting unrelated code.
- Prefer short-lived credentials where supported.
- Do not store secrets in frontend code, local storage, or documents.
- Treat Graph, database, and external service credentials as high-risk assets.

## Expectations

- documented secret owner
- rotation path
- least privilege access
- redaction in logs
- no secret leakage to client-side code

## Failure Conditions

- A secret appears in code, logs, or UI.
- A credential cannot be rotated safely.
- A service depends on an undocumented env var.
