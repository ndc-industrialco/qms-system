# AUTH Task Log

- [ ] Initial setup
- [x] Documented a detailed `QMS-AUTH-CENTER-MIGRATION-PLAN.md` for moving QMS from direct NextAuth/Entra auth to Auth Center, including role-source migration, local user mirror strategy, and rollout/rollback guidance.
- [x] Added `QMS-AUTH-CENTER-DISCOVERY.md` with a project-wide auth-related surface inventory for QMS, including middleware, NextAuth, local user/role authority, role mutation endpoints, department freshness issues, and Graph/SharePoint boundaries.
- [x] Rewrote `QMS-AUTH-CENTER-MIGRATION-PLAN.md` into an execution-grade migration plan tied to actual QMS file groups, adapter work, local user compatibility, authorization cutover, and role-admin decommission steps.
- [x] Added `QMS-AUTH-CENTER-CHECKLIST.md` as a beginner-oriented execution checklist covering Auth Center prep, auth adapter work, local user resolver, API/page cutover, role-admin decommission, testing, rollback, and cleanup.
- [x] Rewrote `QMS-AUTH-CENTER-CHECKLIST.md` into a more explicit beginner execution checklist with step-by-step tasks, verification guidance, and clear completion conditions for each migration phase.
- [x] Added `QMS-ROLE-RENAME-PLAN.md` to separate the QMS role-name refactor from the main Auth Center migration and document a safe compatibility-first rename strategy.
- [x] Checked actual runtime/auth/service/UI dependencies for QMS role rename and documented the current blockers in `migrate/QMS-ROLE-RENAME-READINESS.md`.
- [x] Added the first compatibility layer for QMS role rename so Auth Center token parsing, session shaping, middleware, and core guards can accept both legacy role names and renamed `QMS_*` role values.
- [x] Documented a dedicated plan for removing local QMS user/department mapping entirely in `migrate/QMS-LOCAL-MAPPING-REMOVAL-PLAN.md`, including blockers, target architecture, and phased migration strategy.
- [x] Added `migrate/AUTH-CENTER-SESSION-REGISTRY-CONTRACT.md` and wired QMS callback to register app sessions back to Auth Center after successful login for centralized active-session visibility.
- [x] Added `migrate/QMS-AUTH-CENTER-SINGLE-SOURCE-PLAN.md` to define the target operating model where Auth Center owns QMS user/profile/department/role administration and QMS remains a business-data consumer with local mirrors only where still required.
- [x] Hardened QMS auth-center consumer behavior after local-identity decoupling: fixed profile page department/title rendering, enabled delegated approval-config user listing from Auth Center with local mirror upserts, mapped auth department codes back to local department records for user attribute edits, and ensured searched Entra users are mirrored locally so downstream QMS workflows still receive local IDs.
