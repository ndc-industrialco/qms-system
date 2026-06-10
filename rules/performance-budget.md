# Performance Budget

## Purpose

Keep the system responsive and predictable as usage grows.

## Rules

- Define acceptable latency for critical routes or workflows.
- Avoid unnecessary round trips and repeated work in hot paths.
- Use pagination by default for list endpoints.
- Be explicit about query count and data shape for expensive screens.
- Cache only when invalidation is understood.
- Offload heavy work when it does not belong in the request path.
- Treat N+1 patterns and repeated token fetches as defects.
- Measure before optimizing, but do not ignore obvious inefficiency.

## Expectations

- route latency awareness
- query count awareness
- pagination defaults
- cache validity
- offload plan for heavy work

## Failure Conditions

- A common workflow becomes slow because of avoidable repeated work.
- A list endpoint returns unbounded data by default.
- A cache exists but invalidation is undefined.
