# Folder Structure and Naming Rules

## Folder Contract

Use the repository layout as the default contract. Extend the existing structure instead of inventing parallel structures.

## Where Files Belong

- `app/` for routes, pages, layouts, and server entry points.
- `app/api/` for thin API route handlers.
- `services/` for business logic and orchestration.
- `repositories/` for database access and query logic.
- `schemas/` for Zod schemas and input contracts.
- `lib/` for shared utilities, clients, wrappers, and low-level infrastructure code.
- `components/` for UI components.
- `components/ui/` for reusable design-system primitives.
- `hooks/` for client hooks and data-fetching hooks.
- `types/` for shared TypeScript types.
- `messages/` for localization content only.
- `prisma/` for schema, migrations, and Prisma configuration.
- `scripts/` for operational and maintenance scripts.
- `rules/` for shared rule documents.

## What Must Not Be Mixed

- Do not put business logic inside `app/api/`.
- Do not put direct database queries inside `services/`, `components/`, or `hooks/`.
- Do not put validation schemas inside component files or route handlers.
- Do not put UI code inside `services/`, `repositories/`, or `schemas/`.
- Do not duplicate the same concern across multiple folders when one shared module can own it.

## Naming Standard

- Use one canonical name for one business concept across the repository.
- Inspect existing route, service, schema, repository, hook, and UI names before creating a new CRUD page.
- Reuse the established singular/plural convention already used by that domain.
- Do not invent forms like `postkpi` in one place and `postkpis` in another for the same concept.
- Keep variable names descriptive, domain-based, and consistent with the existing codebase.
- Avoid abbreviations unless they are already standard in the repo.
- Use the same identifier naming across route params, service inputs, repository methods, and UI props when they refer to the same concept.
- Prefer noun-based names for entities and action-based names for operations.
- Do not rename established domain terms casually.

## CRUD Scaffolding Rule

- Align route segment, service class, repository methods, and schema names before writing the implementation.
- Do not use generic names like `data`, `item`, or `value` when a domain-specific name already exists.
- If an existing list page uses plural collection names, keep that convention only in the collection layer.
- Do not mix singular and plural names for the same abstraction.

## Microservice Thinking Standard

- Apply microservice thinking as a design discipline, not as a default instruction to split deployment.
- Each domain should have clear boundaries, explicit interfaces, and minimal coupling.
- Domain logic should not leak into unrelated features.
- Shared utilities must remain generic.
- Domain-specific rules belong in the owning domain service.
- If a concern grows large, isolate its boundary in code first before considering physical service extraction.

## Failure Conditions

- A file is placed in the wrong layer even if the code works.
- A new folder is introduced without aligning to an existing architecture rule.
- A CRUD page uses inconsistent naming across layers.
- The structure becomes harder to discover, test, or maintain.
