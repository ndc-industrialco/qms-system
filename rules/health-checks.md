# Health Check Rules

## Purpose

Define what health checks must prove in production.

## Rules

- Separate liveness from readiness when useful.
- Liveness should confirm the process is alive.
- Readiness should confirm the app can serve real traffic.
- Health checks should cover the dependencies that matter for the request path.
- Keep health checks fast and deterministic.
- Do not make core request handling depend on the health check endpoint.
- Health check responses should be simple and machine-readable.
- If a dependency is optional, its health failure should not falsely mark the whole app as down unless that is intended.
- If a dependency is critical, readiness must fail clearly when it is unavailable.

## Minimum Expectations

- app/process health
- database health where relevant
- Redis health where relevant
- critical external integration health where relevant
- clear liveness/readiness behavior

## Failure Conditions

- A health check reports healthy while the app cannot serve traffic.
- A critical dependency failure is hidden by an overly permissive health response.
- Health checks are slow, noisy, or expensive.
