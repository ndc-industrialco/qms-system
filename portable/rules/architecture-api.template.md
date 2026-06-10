# Architecture and API Rules

## Core Order

When reviewing or building any backend feature:

1. Architecture
2. Security
3. Data integrity
4. Integration resilience
5. Performance and scale
6. Operations and maintainability

## API-First Standard

- Treat the API as the primary contract.
- Design routes, schemas, responses, and errors so external systems can integrate without reading frontend code.
- Use consistent success and error envelopes.
- Support predictable pagination, filtering, sorting, and search on list endpoints.
- Prefer backward-compatible changes. If breaking, version the contract or migrate in a controlled way.
- Do not couple API behavior to UI-specific assumptions.

## Backend Layering

| Directory | Purpose |
| --- | --- |
| `app/api/` | Thin route handlers only. Parse, validate, call service, return response. |
| `services/` | Business logic, orchestration, permission checks, integration coordination. |
| `repositories/` | All database access. The only layer allowed to use Prisma. |
| `schemas/` | Zod validation schemas for request bodies, query params, and path variables. |
| `errors/` | Custom error classes with status codes. |
| `lib/` | Shared utilities: Prisma singleton, error handler, response helpers. |
| `types/` | Shared DTOs, request/response interfaces. |

## Async and Transaction Rules

- Use `async`/`await` exclusively. No `.then()` or `.catch()`.
- Pass `tx` through all repository calls inside `$transaction`.
- Never import `@prisma/client` inside `/app/api`.
- Route handlers must not exceed ~30 lines. Parse → validate → call service → return.
- Fire-and-forget work must be intentional, documented, and isolated.

## Standard Patterns

### Custom Errors (`errors/customErrors.ts`)

```typescript
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public errorCode: string = 'INTERNAL_SERVER_ERROR',
    public details?: any
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
  }
}
export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}
```

### Error Handler (`lib/apiErrorHandler.ts`)

```typescript
import { NextResponse } from 'next/server';
import { AppError } from '@/errors/customErrors';
import { ZodError } from 'zod';

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { success: false, error: { message: error.message, code: error.errorCode, details: error.details } },
      { status: error.statusCode }
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { success: false, error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })) } },
      { status: 400 }
    );
  }
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  return NextResponse.json({ success: false, error: { message, code: 'INTERNAL_SERVER_ERROR' } }, { status: 500 });
}
```

### Standard Response (`lib/apiResponse.ts`)

```typescript
import { NextResponse } from 'next/server';

export function sendSuccess<T>(data?: T, message = 'Success', status = 200, meta?: { page: number; limit: number; total: number }): NextResponse {
  return NextResponse.json({ success: true, message, ...(data !== undefined && { data }), ...(meta && { meta }) }, { status });
}
```

### Base Repository (`repositories/baseRepository.ts`)

```typescript
import { db } from '@/lib/db';
import { Prisma } from '@/generated/prisma/client';

export abstract class BaseRepository<T> {
  constructor(protected modelName: Uncapitalize<Prisma.ModelName>) {}

  protected getClient(tx?: Prisma.TransactionClient) {
    return tx ?? db;
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<T | null> {
    return (this.getClient(tx) as any)[this.modelName].findUnique({ where: { id } });
  }
}
```

### Thin Route Handler Pattern

```typescript
// app/api/users/route.ts
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const dto = createUserSchema.parse(body);

    const result = await userService.createUser(dto);
    return sendSuccess(result, 'Created', 201);
  } catch (error) {
    return handleApiError(error);
  }
}
```

## Key Rules Checklist

1. Never import Prisma in `app/api/`.
2. Never put business logic in route handlers.
3. Always validate input with Zod at the route layer.
4. Always throw custom error classes from services — never return error shapes manually.
5. Always pass `tx` to every repository call inside a transaction.
6. Naming convention: `*Repository.ts`, `*Service.ts`, `*Schema.ts`.
7. Extend `BaseRepository` for all repositories.

## Failure Conditions

- A route handler contains business rules or DB access.
- A service queries Prisma directly instead of using repositories.
- Async work is left unawaited by accident.
- API contract changes in a way that breaks consumers without a migration plan.
