# Authorization and Permission Matrix

## Purpose

Define who can do what to which resource. Authorization must be explicit, reviewable, and consistent across the app and API.

## Rules

- Every protected action must have a clear subject, action, and resource.
- Enforce least privilege.
- Prefer resource-level checks over only page-level or menu-level checks.
- Do not rely on UI hiding as authorization.
- Session role is not enough when the user needs resource ownership or department scope checks.
- Fail closed when permission data is missing or ambiguous.
- Keep authorization logic close to the business rule it protects, but centralize reusable checks where possible.
- Document exceptions explicitly when a role bypasses a normal rule.
- Use a permission matrix when a feature has multiple roles or multiple resource states.

## Matrix Expectations

For each important feature, define:

- actor roles
- allowed actions
- resource scope
- forbidden actions
- fallback behavior on missing permission data
- audit requirement for sensitive actions

## Failure Conditions

- A user can access a resource because the UI did not hide the button.
- A role can perform a sensitive action without a resource-level check.
- Permission behavior is unclear or differs between app and API.
