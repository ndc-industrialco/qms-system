# File Map

## Major Folders

### `/app`
- **Purpose**: Next.js App Router containing pages and API routes.
- **Dependencies**: React, Next.js, Components, Services, Schemas.
- **Related Domains**: All domains.
- **Important Files**: `layout.tsx`, `api/.../route.ts`

### `/components`
- **Purpose**: Shared UI components (Radix UI, Tailwind).
- **Dependencies**: Radix UI, React Hook Form, Zod.
- **Related Domains**: UI Shared.
- **Important Files**: `ui/*`

### `/services`
- **Purpose**: Business logic layer.
- **Dependencies**: Repositories, External APIs (SharePoint, MS Graph).
- **Related Domains**: All domains.
- **Important Files**: `darService.ts`, `kpiService.ts`, `email.ts`, `ms-graph.ts`

### `/repositories`
- **Purpose**: Data access layer.
- **Dependencies**: Prisma Client.
- **Related Domains**: All domains.
- **Important Files**: `baseRepository.ts`, `darRepository.ts`

### `/prisma`
- **Purpose**: Database schema and migrations.
- **Dependencies**: PostgreSQL, Prisma.
- **Related Domains**: Database.
- **Important Files**: `schema.prisma`

### `/schemas`
- **Purpose**: Zod validation schemas for forms and API requests.
- **Dependencies**: Zod.
- **Related Domains**: Validation.
- **Important Files**: `darSchema.ts`, `kpiSchema.ts`
