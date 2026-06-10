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
5. Read `rules/agent-docs-navigation.md`
6. Read `rules/agent-start-workflow.md`
7. Read only the relevant shared rule files in `rules/`
8. Open the minimum required source files

Do not scan the entire repository unless explicitly required.

---

# Agent Rule Set

Repository workflow rules are split into focused files in `rules/`:

* `rules/agent-docs-navigation.md`
* `rules/agent-start-workflow.md`
* `rules/agent-rule-routing.md`
* `rules/agent-execution-contract.md`
* `rules/agent-definition-of-complete.md`
* `rules/agent-documentation-updates.md`
* `rules/agent-token-discipline.md`
* `rules/agent-final-response.md`

Read only the files relevant to the current task after completing the required reading order above.

---

# Common Concern Routing

Use this routing to choose the smallest relevant rule set before opening source files:

* API routes, services, repositories, transactions, and response/error contracts -> `rules/architecture-api.md`
* Folder placement and naming -> `rules/folder-structure-naming.md`
* Prisma and PostgreSQL concerns -> `rules/prisma-database.md`
* Data integrations and Redis -> `rules/data-integration.md`
* Frontend work entrypoint -> `rules/ui-ops-content.md`
* Visual design tokens, density, typography, spacing -> `rules/ui-design-system.md`
* Page shells, responsive layouts, headers, sidebar -> `rules/ui-layouts.md`
* Forms, validation, modals, drawers, sheets -> `rules/ui-forms-overlays.md`
* Buttons, badges, loading, empty, error, toast states -> `rules/ui-components-states.md`
* Accessibility, i18n, page archetypes, role-based UI -> `rules/ui-patterns-accessibility.md`
* Tables, filter bars, pagination, mobile card fallback -> `rules/ui-tables.md`
* Authorization and permissions -> `rules/authz-permission-matrix.md`
* Audit trail and compliance -> `rules/audit-trail-compliance.md`
* Testing and CI -> `rules/testing-ci-release.md`
