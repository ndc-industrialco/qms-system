# Observability and SLO

## Purpose

Make the system measurable, debuggable, and operable under real load.

## Rules

- Every important request path should have traceable logging.
- Propagate request IDs through services and integrations.
- Separate business errors from infrastructure failures.
- Define the metrics that matter for the workflow.
- Prefer structured logs over ad hoc text.
- Make latency and failure behavior visible.
- Define an SLO or operational target for critical user-facing and integration-heavy flows.
- Alert on sustained failure patterns, not isolated noise.
- Keep logs useful for support and incident investigation.
- Do not log secrets or sensitive payloads.

## Minimum Expectations

- request id or trace id
- structured error logging
- route or operation name
- latency visibility for critical paths
- integration failure visibility

## Failure Conditions

- A production issue cannot be reconstructed from logs and traces.
- A critical flow has no measurable success or latency signal.
- Logs are noisy, unstructured, or leak sensitive data.
