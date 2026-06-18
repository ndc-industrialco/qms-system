# NDC Enterprise Project Hub

This file is mandatory.

Read and follow this file before performing any repository work.

`AGENTS.md` is the entry point for repository workflow.

---

# Required Reading Order

Before reading source code:

1. Read `docs/agent/00-start-here.md`
2. Read `docs/agent/01-current-state.md`
3. Read `docs/architecture/domain-map.md`
4. Read `docs/architecture/tech-stack.md`
5. Read `docs/agent/03-standards.md`
6. Read only the relevant files in `docs/standards/`
7. If the task is to create, extract, or update reusable cross-project standards, read `portable/rules/README.md` and then only the relevant files in `portable/rules/`
8. Open the minimum required source files

Do not scan the entire repository unless explicitly required.

---

# Repository Rule Sources

This working tree does not currently contain the expected `rules/agent-*.md` files.

Use these sources instead:

* `docs/agent/00-start-here.md`
* `docs/agent/01-current-state.md`
* `docs/agent/02-file-map.md`
* `docs/agent/03-standards.md`
* `docs/standards/api.md`
* `docs/standards/backend.md`
* `docs/standards/database.md`
* `docs/standards/frontend.md`
* `docs/standards/security.md`
* `docs/standards/testing.md`
* `docs/standards/ui.md`

Read only the files relevant to the current task after completing the required reading order above.

Portable reusable standards for future systems live in `portable/rules/`.

Use `portable/rules/` when the task is about:

* extracting standards from this repository for reuse elsewhere
* defining cross-project architecture or UX rules
* documenting implementation patterns that should become a starter baseline for future systems

Do not default to `portable/rules/` for ordinary feature work inside this repository.

---

# Common Concern Routing

Use this routing to choose the smallest relevant rule set before opening source files:

* API routes, services, repositories, transactions, and response/error contracts -> `docs/standards/api.md` and `docs/standards/backend.md`
* Folder placement and codebase entrypoints -> `docs/agent/02-file-map.md`
* Prisma and PostgreSQL concerns -> `docs/standards/database.md`
* Data integrations and permissions -> `docs/standards/security.md` and relevant source files under `services/` and `lib/`
* Frontend work entrypoint -> `docs/standards/frontend.md`
* Visual design tokens, density, typography, spacing, tables, forms, responsive UI, and states -> `docs/standards/ui.md`
* Testing and CI -> `docs/standards/testing.md`

For cross-project reusable standards, use `portable/rules/` routing:

* Reusable rule index and selection -> `portable/rules/README.md`
* Authentication, authorization, session, middleware, token flows -> `portable/rules/auth.md`
* API layering, services, repositories, validation, transactions, audit -> `portable/rules/backend.md`
* App Router composition, React Query, RHF, URL state, permission-aware UI -> `portable/rules/frontend.md`
* Shared UX principles, responsive behavior, accessibility, enterprise interaction patterns -> `portable/rules/ui-ux.md`
* Preview, file proxy, inline rendering, download routing -> `portable/rules/preview-download.md`
* Email sending, idempotency, recipients, template structure, notification delivery -> `portable/rules/email-notifications.md`
* Shell layout, header, sidebar, spacing, typography, page structure -> `portable/rules/ui-layout-details.md`
* Tables, filters, search, forms, dialog, sheet, button, input, pagination, card metrics -> `portable/rules/ui-components-details.md`
