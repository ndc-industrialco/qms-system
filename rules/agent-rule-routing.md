# Agent Rule Routing

Read only the rule files relevant to the current task.

| Concern                                 | Rule File                           |
| --------------------------------------- | ----------------------------------- |
| API, Services, Repository, Transactions | rules/architecture-api.md           |
| Folder Structure and Naming             | rules/folder-structure-naming.md    |
| Prisma and PostgreSQL                   | rules/prisma-database.md            |
| Data Integrations and Redis             | rules/data-integration.md           |
| UI, Forms, UX                           | rules/ui-ops-content.md             |
| Authorization and Permissions           | rules/authz-permission-matrix.md    |
| Audit Trail and Compliance              | rules/audit-trail-compliance.md     |
| Testing and CI                          | rules/testing-ci-release.md         |
| API Versioning                          | rules/api-contract-versioning.md    |
| Idempotency and Concurrency             | rules/idempotency-concurrency.md    |
| Observability and SLO                   | rules/observability-slo.md          |
| Docker Logging                          | rules/docker-logging.md             |
| Health Checks                           | rules/health-checks.md              |
| Notifications                           | rules/notifications.md              |
| Incident Response                       | rules/incident-response.md          |
| Release Management                      | rules/release-checklist.md          |
| Change Management                       | rules/change-management.md          |
| Backup and Restore                      | rules/backup-restore.md             |
| Security Review                         | rules/security-review.md            |
| Secrets and Key Rotation                | rules/secrets-key-rotation.md       |
| Data Migration and Backfill             | rules/data-migration-backfill.md    |
| Performance Budgets                     | rules/performance-budget.md         |
| Accessibility and I18N                  | rules/accessibility-i18n-quality.md |

## Quick Choice Rules

* API data synchronization -> TanStack Query
* Screen-only state -> React State
* Form handling -> React Hook Form + Zod
* Short-lived coordination/cache -> Redis
