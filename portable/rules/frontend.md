# Portable Frontend Rules

## Composition Rules

- Use App Router server components for page entrypoints by default.
- Fetch initial page data on the server when it improves first render or authorization safety.
- Use client components only for interactive concerns.
- Keep layout, page shell, data widgets, and forms separated.

## Data Fetching Rules

- Use React Query for client-side data fetching and mutation orchestration.
- Server-rendered pages may pass `initialData` into client tables or widgets.
- Query keys must include all filter, search, scope, and pagination inputs.
- Avoid duplicating the same fetch logic in multiple components; share fetch helpers per domain.

## Form Rules

- Use React Hook Form with Zod-backed validation for forms.
- Use multi-step submission only when it matches business workflow, such as sign-off or reviewer selection.
- Keep draft-save and final-submit actions separate when the business process distinguishes them.
- Derive submit eligibility from actual form state, not only from server rejection.
- Show field-level errors near the field and flow-level errors through a shared toast or alert pattern.

## State Management Rules

- Keep local UI state local.
- Use URL state for list filters, search, tab selection, and pagination when the screen is operational and shareable.
- Debounce search inputs that trigger network requests.
- Reset pagination when search or filters change.

## Permission-Aware UI Rules

- Server pages must gate access before rendering protected content.
- Client components may hide or disable controls based on role, but server APIs remain authoritative.
- UI must communicate why an action is unavailable when that explanation is useful to the user.
- Department-scoped users should see department-scoped data by default.
- Privileged users may see global views, but those flows should remain visually distinct.

## Workflow Rules

- Approval, issue, verify, close, submit, and similar actions should be explicit buttons with clear confirmation points.
- Non-trivial actions should refresh affected queries after success.
- Time-sensitive workflows should surface due dates and overdue states clearly.
- Attachment workflows should support draft or temporary uploads when the parent record does not exist yet.

## Feedback Rules

- Use skeletons for initial loading.
- Use inline lightweight indicators for background refetching.
- Use empty states that explain what is missing and what the user can do next.
- Use retry affordances on recoverable failures.
- Use shared toast behavior for mutation success and failure.

## Reuse Rules

- Operational tables, filter bars, drawers, dialogs, and pagination should be shared primitives.
- Domain pages should compose shared building blocks rather than reimplement them.
- Translation hooks or message helpers must be used consistently where localization exists.
