# Portable Rule Set

This folder contains reusable engineering rules extracted from the QMS system.

These rules are intended to be copied into future internal systems that use a similar stack:

- Next.js App Router
- TypeScript
- PostgreSQL + Prisma
- Auth.js / NextAuth
- React Query
- React Hook Form + Zod
- Tailwind CSS + Radix UI

## Files

- `auth.md`: authentication, authorization, session, middleware, token, and permission rules
- `backend.md`: API, service, repository, transaction, validation, audit, and integration rules
- `frontend.md`: page composition, data fetching, forms, mutation flows, and permission-aware UI rules
- `ui-ux.md`: visual system, responsive behavior, table patterns, loading/empty/error states, and accessibility rules
- `preview-download.md`: preview/download proxy logic, permission checks, headers, and file delivery rules
- `email-notifications.md`: email sending flow, idempotency, recipients, templates, and delivery safeguards
- `ui-layout-details.md`: page shell, header, sidebar, spacing, and enterprise layout metrics
- `ui-components-details.md`: tables, filters, forms, dialogs, sheets, typography, buttons, inputs, and state visuals

## How To Use In Another System

1. Copy this folder into the target repository.
2. Keep the rules as defaults unless the new system has a documented reason to differ.
3. Add project-specific extensions in a separate file instead of weakening these base rules.
4. If a rule is intentionally broken, document the exception close to the code or in architecture notes.

## Intended Operating Model

- Authentication and coarse access control are enforced in middleware and server guards.
- API routes stay thin and only coordinate request parsing, auth, validation, and response formatting.
- Services own business rules, orchestration, permissions beyond coarse route guards, and transaction boundaries.
- Repositories own Prisma access and query shapes.
- Frontend components remain permission-aware, resilient to loading/error states, and responsive by default.
- UX must support desktop tables and mobile fallback views for operational screens.
