# Portable Auth Rules

## Goals

- Keep authentication centralized.
- Keep authorization explicit.
- Make session shape stable across the app.
- Prevent routes and UI from implementing inconsistent permission logic.

## Authentication Rules

- Use a single auth entrypoint for the application.
- Use JWT session strategy unless the system has a strong requirement for database-backed sessions.
- Define a stable session user shape with these minimum fields:
  - `id`
  - `role`
  - `email`
  - `name`
  - `departmentId` or equivalent scope key
  - `jti` or another unique session identifier for revocation
- Keep auth config edge-safe where possible.
- Do not perform database work inside edge-executed auth/session mapping callbacks.
- Use a dedicated cookie name per application to avoid collisions across multiple apps on the same domain.

## Authorization Rules

- Enforce authentication in server code, not only in client navigation.
- Provide shared server helpers such as:
  - `requireAuth()`
  - `requireRole(...roles)`
  - optional scope guards such as `requireDepartmentAccess(...)`
- Treat middleware as coarse access control only.
- Treat service-level checks as the final authority for record-level permissions.
- Never rely on hidden buttons or disabled controls as the only permission barrier.

## Middleware Rules

- Middleware must attach or forward a request ID.
- Middleware must protect all non-public routes by default.
- Public routes must be explicit and minimal.
- Middleware should perform coarse route-level role checks for major route groups such as `/admin`, `/it`, `/qms`, or equivalent.
- Middleware should apply rate limiting for:
  - auth endpoints
  - API endpoints
  - sensitive action endpoints
- Rate limiting should prefer user-based keys when a trusted session exists, otherwise IP-based keys.

## Session Revocation Rules

- Support forced logout or session invalidation using a blocklist keyed by `jti` or equivalent session identifier.
- Revocation state should live in Redis or another centralized store.
- Middleware must reject revoked sessions before protected route execution continues.

## Token And Link-Based Approval Rules

- One-click approval or action links must use expiring server-stored tokens.
- Tokens must be single-use.
- Tokens must be bound to:
  - module or resource type
  - document or entity ID
  - intended role or action
  - expiry timestamp
- Token consumption must be concurrency-safe.
- Email tokens must never replace normal app permissions for authenticated in-app actions unless that workflow is explicitly designed for external approval.

## Permission Modeling Rules

- Standardize roles in one place.
- Normalize legacy or external role values before the rest of the app uses them.
- Keep role checks readable and shared through helper functions.
- Record-level access must consider organizational scope such as department, business unit, plant, or owner.
- Prefer stable external identity keys when integrating with external directory systems.

## Security Rules

- Do not trust client-supplied actor IDs, role IDs, or department IDs when they can be derived from session.
- Derive actor identity from session on the server.
- Keep access tokens server-side unless a downstream delegated call requires them.
- Minimize downstream scopes to the least privilege necessary.
- Auth failures must not leak sensitive implementation details.
