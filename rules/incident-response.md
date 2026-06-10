# Incident Response

## Purpose

Define how to triage, contain, and recover from production incidents.

## Rules

- Triage first, speculate later.
- Identify impact, scope, severity, and affected dependencies quickly.
- Use request ids, logs, metrics, and recent deploys to narrow root cause.
- If the issue touches data integrity, permissions, or external integration failure, treat it as high risk.
- Containment comes before optimization.
- Preserve evidence before making destructive changes.
- Communicate the incident status clearly to the relevant stakeholders.
- Restore service in the safest viable way, then follow up with the permanent fix.

## Minimum Expectations

- incident severity
- affected service or workflow
- containment action
- recovery action
- evidence preserved
- follow-up action item

## Failure Conditions

- Incident handling is ad hoc and cannot be repeated.
- Evidence is lost before root cause analysis.
- The team restores service without recording what changed.
