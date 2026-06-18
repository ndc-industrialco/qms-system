# Portable UI / UX Rules

## Visual System

- Use one documented design system for color, spacing, radius, typography, and density.
- Prefer light mode by default unless the project explicitly supports multiple themes.
- Use consistent card, table, form, and overlay treatments across domains.
- Avoid one-off visual patterns for standard enterprise actions.

## Layout Rules

- Every major page needs:
  - clear title
  - primary action area when relevant
  - secondary metadata or filters area when relevant
  - stable content container
- Desktop and mobile layouts must both be designed intentionally.
- Do not assume wide-screen table layouts are usable on mobile.

## Table And List Rules

- Operational lists must support:
  - search
  - filtering
  - pagination
  - empty states
  - error states
- Desktop tables should have a mobile fallback, usually card-based.
- Important identifiers should be visually scannable, often with monospace treatment.
- Status must be represented consistently with shared badges.
- Overdue or risky states must be highlighted with strong but limited emphasis.

## Forms And Overlays

- Use dialogs, drawers, or sheets based on task complexity and screen size.
- Keep the number of decisions per step manageable.
- Required fields must be obvious before submit.
- Long forms should be grouped into named sections.
- Confirmation steps are required for irreversible, high-impact, or signature-based actions.

## State Communication

- Loading states should preserve layout stability.
- Empty states should explain whether the absence is due to no records, no permission, or no scope assignment.
- Error states must provide a retry path where reasonable.
- Background refresh indicators should be subtle and not block interaction.

## Accessibility Rules

- Use Radix primitives or similarly accessible primitives for interactive components.
- Keyboard navigation must work for dialogs, menus, filters, and forms.
- Color must not be the only signal for status or error.
- Form controls need labels, validation messages, and focus visibility.
- Click targets should remain usable on touch devices.

## Enterprise UX Rules

- Optimize for frequent operational use, not marketing aesthetics.
- Make record status, owner, department, dates, and next action easy to scan.
- Preserve user progress in multi-step workflows when possible.
- Do not hide critical workflow context behind too many clicks.
- When actions depend on role or workflow state, explain the constraint in plain language.
