# Data and Integration Rules

## Data Integrity

- Never write to the database without a clear consistency strategy.
- Use unique constraints, foreign keys, and transaction guards where the domain depends on them.
- Treat race conditions as real defects.
- If a value is generated from existing state, verify that it is atomic or collision-safe.
- Prefer repository methods that make invariants explicit.

## Integration Resilience

- External APIs, Microsoft Graph, SharePoint, email, Redis, and background side effects are failure-prone.
- Every integration must define:
  - what happens on timeout
  - what happens on partial failure
  - what gets retried
  - what gets rolled back
  - what gets logged
- Avoid silent failure and fire-and-forget behavior unless the loss is explicitly acceptable.
- Use shared wrappers for repeated integration patterns.

## Email Template Standard

- Email is a company communication artifact, not a notification toast.
- It must be complete, readable, and unambiguous on a single screen when possible.
- Prefer concise structure, but never omit essential context.
- Every transactional email should include:
  - a clear subject that identifies the module and action
  - the recipient role or reason for receipt
  - the business object identifier or reference number
  - the current status or decision
  - the required next action, if any
  - a direct link back to the record when applicable
  - enough facts to understand the request without opening another system
- Use a consistent template structure: title, key facts, short context, action link, automated footer.
- Do not bury critical information in long paragraphs.
- Keep bilingual content clear and parallel.
- If a field is required for operational decision-making, it belongs in the email body.
- The sender must be the authenticated session user who performed the action that triggered the email.
- `MAIL_SENDER_ADDRESS` is not the default sender for user actions.
- Use `MAIL_SENDER_ADDRESS` only as a fallback for system-owned jobs, scheduled jobs, or background automation where no human actor exists.

## Microsoft Graph User Picker Standard

- Search by both display name and employee ID.
- Do not force the user to wait for a manual search action before seeing likely matches.
- Prefetch or warm candidate lists on hover, focus, or open when the UI supports it.
- Show name, email, and employee ID when available.
- Support partial input and incremental refinement.
- If recent data exists, show it immediately and keep searching in the background.

## Redis Usage Standard

- Redis is for shared cross-request state, not as a general-purpose convenience layer.
- Use Redis only when the value is transient, shared, or needs atomic coordination.
- Valid uses include rate limiting, token or session blocklists, temporary caches, and short-lived candidate caches.
- Do not use Redis for source-of-truth data.
- Prefer explicit TTLs, clear key naming, and a documented invalidation strategy.
- If Redis failure is acceptable, fail open or degrade predictably by design.
- If Redis failure is not acceptable, the path must not depend on Redis without a fallback.

## Failure Conditions

- A human action sends mail from a generic system sender when the session actor is known.
- A picker blocks users behind a slow search when prefetch or warm data was available.
- Redis is introduced without TTL, ownership, or fallback behavior.
- Integration failure can silently corrupt data or lose user intent.
