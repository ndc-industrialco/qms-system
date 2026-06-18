# Portable Backend Rules

## Architecture

- Use layered architecture:
  - Route or controller
  - Service
  - Repository
- API routes must not call Prisma directly.
- Business workflows must not live in route handlers.
- Repositories must not contain business policy decisions.

## Route Rules

- Each route must do only five things:
  - authenticate or authorize
  - parse request input
  - validate input
  - call service methods
  - format response
- Use Zod or an equivalent schema library for all request parsing.
- Query params, route params, JSON bodies, and form-data fields must all be validated explicitly.
- Use a shared response shape across the system.
- Use a shared error handler that maps domain errors to HTTP responses consistently.

## Service Rules

- Services own:
  - business rules
  - workflow orchestration
  - state transition rules
  - record-level authorization
  - transaction boundaries
  - post-commit side effects
- Services should accept explicit actor context when the action depends on who is performing it.
- Services must validate state transitions before writing.
- Services must load only the fields needed for the decision being made.

## Repository Rules

- Repositories own Prisma access and query composition.
- Repositories should expose task-oriented methods instead of leaking generic ORM calls everywhere.
- Define selective read methods such as:
  - `findDetailById`
  - `findForIssue`
  - `findForVerify`
  - `paginateSummaries`
- Keep select/include shapes intentional to reduce overfetching.
- Repository methods that update approval or token state must be concurrency-safe.

## Transaction Rules

- Use `prisma.$transaction` for all multi-table writes.
- Write the minimum atomic unit inside the transaction.
- Send emails, webhooks, or background notifications after the transaction commits.
- If a notification must be tracked, persist a notification log inside the transaction first.
- Sequence generation must be transaction-safe and reviewed for race conditions.

## Validation And State Rules

- Treat status-driven workflows as explicit state machines.
- Reject invalid transitions with domain errors, not generic 500 responses.
- Do not allow update endpoints to mutate entities in closed or finalized states unless a documented reopen flow exists.
- Never trust mutable business fields from the client if the server can derive them.

## Audit Rules

- Record important business actions in a centralized audit service.
- Audit entries should contain:
  - actor user ID
  - actor role
  - action
  - resource type
  - resource ID
  - before snapshot when relevant
  - after snapshot when relevant
  - metadata when needed
- Audit logging must happen inside the same transaction as the state change when possible.

## Integration Rules

- External integrations must be wrapped in service or library boundaries, not scattered in routes.
- Treat external calls as unreliable:
  - validate responses
  - log failures
  - make retries explicit
  - avoid blocking durable writes on best-effort notifications
- Prefer idempotency for outbound email or third-party mutation calls.

## Data Rules

- Use repositories as the only path to Prisma in application code.
- Prefer soft delete, status transitions, or archival over hard delete.
- Persist both local keys and stable external reference keys where cross-system synchronization matters.
- Paginated list endpoints must support:
  - page
  - limit
  - search
  - relevant filters

## Operational Rules

- Attach request IDs to logs and propagate them across route and service boundaries.
- Add rate limiting to sensitive or high-volume endpoints.
- Health endpoints should be lightweight and separated from heavy diagnostics.
