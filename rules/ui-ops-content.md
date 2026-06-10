# UI, Ops, and Content Rules

## Purpose

This file is the entry point for UI work.

Read this file first for any frontend task, then read only the matching focused UI rule files:

- `rules/ui-design-system.md`
- `rules/ui-layouts.md`
- `rules/ui-forms-overlays.md`
- `rules/ui-components-states.md`
- `rules/ui-patterns-accessibility.md`
- `rules/ui-tables.md`

## Required Baseline

- Light mode only.
- Use the established NDC color tokens and shapes.
- Keep component behavior aligned with the shared design system.
- Use TanStack Query for server state and API fetching.
- Use React Hook Form + Zod for forms.
- Use Radix UI primitives for complex interactive components.
- Do not hardcode UI text; use translations from `messages/th.json` and `messages/en.json`.

## Concern Routing

Read only the smallest set of files that matches the task:

- Visual styling, colors, spacing, typography, density -> `rules/ui-design-system.md`
- Page shell, headers, sidebar, responsive grids -> `rules/ui-layouts.md`
- Inputs, validation, dialogs, drawers, sheets -> `rules/ui-forms-overlays.md`
- Buttons, badges, loading/empty/error/toast states -> `rules/ui-components-states.md`
- UX principles, page archetypes, permissions, accessibility, i18n -> `rules/ui-patterns-accessibility.md`
- Data tables, filter bars, pagination, mobile card fallback -> `rules/ui-tables.md`

## Query and Form Rules

- Use TanStack Query for server state.
- Do not use TanStack Query for local UI state, form state, or purely derived state.
- Avoid raw `useEffect` fetching when a query abstraction fits the use case.
- Inline validation errors must appear directly under the field.
- Required fields must be marked clearly.
- Use modals for destructive confirmation.
- Do not use toast for destructive confirmations or field-level validation.

## Ops Rules

- Prefer clear logs, traceable request IDs, and actionable failure states.
- Keep linting, type checking, tests, and verification commands part of the definition of done.
- Build for safe deploy, rollback, and future debugging.
- If the code cannot be observed or verified, it is operationally incomplete.

## Failure Conditions

- UI work ships without reading the relevant focused UI rule files.
- The UI diverges from the established design system.
- Form validation or toast behavior violates the standard.
- Hardcoded strings are introduced where translations exist.
- The code is functional but not observable, testable, or maintainable.
