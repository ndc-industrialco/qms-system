# Accessibility and i18n Quality

## Purpose

Make the UI readable, usable, and translatable without drift.

## Rules

- No hardcoded strings when translations exist.
- Keep Thai and English content aligned in meaning.
- Use natural widths so translated text can expand.
- Ensure interactive components are keyboard usable.
- Provide accessible labels and state text, not color only.
- Complex UI should follow the design system and accessibility primitives.
- Avoid layout choices that break on longer Thai text.
- Treat translation completeness as a quality gate, not a nice-to-have.

## Expectations

- translation coverage
- accessible labels
- keyboard support
- readable state indicators
- safe layout expansion

## Failure Conditions

- A visible UI string is hardcoded when translations exist.
- A component cannot be used with keyboard only.
- Thai text causes layout breakage that was predictable.
