# API Contract and Versioning

## Purpose

Keep external and internal API consumers stable over time.

## Rules

- Treat API responses as contracts.
- Keep success and error envelopes stable.
- Changes to field names, nested structure, status enums, and pagination format are contract changes.
- Prefer additive changes over breaking changes.
- If a breaking change is unavoidable, version the contract or provide a migration path.
- Document deprecations before removing old behavior.
- Keep identifier names and status values stable when downstream systems rely on them.
- Do not tie API shape to UI component needs.
- Use explicit versioning or compatibility notes when a route serves system integrations.

## Contract Expectations

For each externally relevant endpoint, define:

- request shape
- response shape
- error shape
- pagination behavior
- filtering and sorting behavior
- version or compatibility policy
- deprecation policy

## Failure Conditions

- A consumer breaks because the response shape changed silently.
- An endpoint changes field names without a migration path.
- Versioning policy is undefined for a route that external systems depend on.
