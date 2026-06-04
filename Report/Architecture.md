# Architecture

## 1) Current Architecture Overview

The system follows a layered architecture on top of Next.js App Router:

- Presentation layer (`app/`, `components/`, `hooks/`): Pages, layouts, reusable UI, and client-side interactions.
- API layer (`app/api/*`): Thin route handlers for request parsing, validation, and response shaping.
- Business layer (`services/*`): Domain logic, permissions, orchestration, and transaction boundaries.
- Data access layer (`repositories/*`): All database operations via repository classes.
- Validation layer (`schemas/*`): Zod schemas for input contracts.
- Infrastructure/shared layer (`lib/*`): Auth, DB/Prisma client, Redis, Graph token, error/response helpers, utilities.
- Persistence layer (`prisma/schema.prisma`, PostgreSQL): Data models and relational storage.

## 2) Folder Structure (Current)

- `app/`
- `app/(dashboard)/*`: Feature pages (DAR, KPI, IT, QMS, profile, etc.).
- `app/api/*`: Route handlers for each domain endpoint.
- `components/*`: UI and feature components.
- `hooks/*`: Reusable frontend hooks (forms, APIs, UX helpers).
- `services/*`: Business workflows (DAR, KPI, Document Control, SharePoint, Email, User sync).
- `repositories/*`: Prisma-backed repositories per aggregate/entity.
- `schemas/*`: Zod validation schemas by domain.
- `lib/*`: Shared infra and helpers (`db.ts`, `auth.ts`, `redis.ts`, `apiErrorHandler.ts`, `apiResponse.ts`, etc.).
- `prisma/schema.prisma`: Prisma data model and enums for PostgreSQL.
- `messages/*`: i18n dictionaries (`en.json`, `th.json`).

## 3) Main Data Flow (Client -> Database)

1. Client UI in `app/*` / `components/*` triggers actions (form submit, query, mutation).
2. Client uses `fetch` and/or TanStack Query hooks to call `app/api/*` endpoints.
3. API route handler:
- Parses request.
- Validates payload with Zod schema from `schemas/*`.
- Calls corresponding service in `services/*`.
4. Service layer:
- Applies business rules and authorization checks.
- Coordinates cross-domain actions (e.g., DB + Graph/SharePoint).
- Opens Prisma transaction when needed and passes `tx` downstream.
5. Repository layer:
- Executes all Prisma queries (create/read/update/delete).
- Uses transaction client (`tx`) when provided.
6. PostgreSQL persists/returns data through Prisma.
7. Service maps output/errors and returns to API route handler.
8. Route handler sends standardized success/error response (`sendSuccess`, `handleApiError`).
9. Client receives response; TanStack Query cache/UI state updates accordingly.

## 4) External Integration Flow (Graph/SharePoint)

For attachment and Microsoft 365-related features:

1. API route -> service calls Graph helpers (`services/sharepoint.ts`, `services/ms-graph.ts`, `services/email.ts`).
2. Graph token is acquired/cached via `lib/graph-token.ts`.
3. Files/users/groups/email operations are executed against Microsoft Graph.
4. Returned metadata (e.g., `spItemId`, `spWebUrl`) is stored in PostgreSQL via repositories.
