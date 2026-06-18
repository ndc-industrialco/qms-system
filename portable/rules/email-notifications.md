# Portable Email / Notification Rules

## Goals

- Make outbound email reliable, auditable, and idempotent.
- Keep email rendering consistent across workflows.
- Separate business event creation from message delivery.

## Delivery Flow Rules

- Trigger email from service or orchestration code, never directly from presentation components.
- Durable state changes must commit before email send starts.
- If email delivery matters to the workflow, persist a notification log inside the transaction first.
- Actual sending should happen after commit and should be non-blocking relative to the user request when possible.
- Wrap all delivery in a shared notification service or adapter.

## Idempotency Rules

- All outbound emails tied to workflow transitions must use idempotency keys.
- Idempotency keys should include:
  - module or domain
  - resource ID
  - action type
  - recipient or recipient group
  - optional token slice if repeated sends are valid across separate tokens
- Replays and retries must not send duplicates unless the workflow explicitly allows reminders.

## Recipient Rules

- Resolve recipients on the server from trusted user or department data.
- Do not trust recipient email addresses from the client for privileged workflow messages.
- Support both direct users and shared departmental email groups where the business flow requires it.
- Prefer stable identity lookup first, then email extraction.

## Template Rules

- Use one shared email builder for visual consistency.
- Email templates should be bilingual or localization-ready when the system is multilingual.
- Standard template regions should be:
  - title
  - subtitle or context
  - facts table
  - details block
  - optional data table
  - primary action button
  - footer stating automated origin
- All interpolated values must be HTML-escaped before rendering.

## Content Rules

- Subjects should follow a stable pattern:
  - `[MODULE] Action - Identifier`
- Body content should prioritize:
  - who needs to act
  - what item is affected
  - current workflow state
  - next action
  - direct link
- Large workflow tables in email should be summary-only, not full application replicas.
- Keep critical facts above the fold.

## Action Link Rules

- Action buttons in email must use server-issued, expiring, single-use tokens when the action is approval-like.
- View links may use normal authenticated URLs without action tokens.
- Action URLs must always be derived from a trusted base app URL.

## Sender Rules

- The sender address must be explicit and controlled by the server.
- If no sender is configured, the system must log and skip rather than pretending delivery succeeded.
- Use one delivery provider abstraction even if the underlying provider is Microsoft Graph or SMTP.

## Failure Rules

- Delivery failures must be logged with:
  - subject
  - recipients
  - idempotency key
  - error details
- User-facing requests should not fail solely because a best-effort notification failed, unless the business process explicitly requires synchronous delivery.
- Reminder emails are the exception: they may be repeatable, but still need traceable logs.

## Template Metrics Derived From This System

- Use HTML email with a simple centered container.
- Header background can use brand primary color.
- Facts table rows should use compact spacing around `10px 12px`.
- Body content should use roughly:
  - title: `20px`
  - subtitle: `15px`
  - fact labels: `11px-12px`
  - fact values/body text: `13px`
  - footer: `11px`
- Action buttons should be large enough for touch and obvious scanning, around `12px 20px` padding with `8px` radius.
