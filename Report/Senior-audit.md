# Senior Audit

## Scope

This audit reviewed the current local codebase with focus on:

- `services/` and `repositories/` for transaction coverage and `tx` propagation
- `app/api/*` for `handleApiError` coverage and Zod validation coverage
- `services/sharepoint.ts` and `lib/graph-token.ts` for Graph API async handling, retry/timeout behavior, and token caching

## Executive Summary

The codebase has two different quality levels today.

- The best parts are `DarService` and `KpiMonthlyService`. Their explicit transaction blocks consistently pass `tx` into repository methods.
- The weakest parts are the Document Control and attachment flows. Several operations mix SharePoint side effects and multiple database writes without a single atomic boundary or compensation step.
- API error handling is mostly present, but it is not standardized. A number of routes bypass `handleApiError`, and one debug route has no catch block at all.
- Graph integration currently has no centralized timeout or retry policy. `services/sharepoint.ts` also bypasses `lib/graph-token.ts`, so it does not benefit from Redis token caching or refresh coordination.

## Findings

### High: `DocumentControlService.addRevision` can leave all previous revisions obsolete if SharePoint upload fails

Evidence:

- `services/documentControlService.ts:179` marks all existing revisions as `OBSOLETE`
- `services/documentControlService.ts:185` uploads the new file to SharePoint
- `services/documentControlService.ts:197` creates the revision row
- `services/documentControlService.ts:216` updates the main document row

Risk:

- If SharePoint upload fails after `updateMany`, the old revisions are already obsolete and the new revision does not exist.
- This is a real data consistency issue, not just a style issue.

Recommendation:

- Move the DB changes into a single transaction after external upload succeeds, or add compensation logic to restore previous statuses on failure.
- Do not mark old revisions obsolete before the new revision is safely persisted.

### High: Document Control and Category rename/move flows are not atomic across SharePoint and database

Evidence:

- `services/documentControlService.ts:117` moves the SharePoint folder first
- `services/documentControlService.ts:124` and `services/documentControlService.ts:129` then rewrite revision paths in the database
- `services/documentControlService.ts:159` updates the main document row afterward
- `services/documentCategoryService.ts:51` moves the SharePoint category folder first
- `services/documentCategoryService.ts:57`, `services/documentCategoryService.ts:64`, `services/documentCategoryService.ts:69`, `services/documentCategoryService.ts:74` then update document and revision metadata row by row

Risk:

- If a DB update fails after SharePoint has already moved the folder, database path metadata becomes stale.
- These flows also bypass repositories and transactions, so rollback discipline is inconsistent.

Recommendation:

- Wrap the DB side in a transaction.
- Add compensation for SharePoint moves when the DB transaction fails, or stage DB updates first and finalize the move only after DB commit if the workflow allows it.

### High: Attachment flows can create orphaned SharePoint files or partial database state

Evidence:

- `services/kpiAttachmentService.ts:40` uploads to SharePoint first
- `services/kpiAttachmentService.ts:42` creates the DB attachment row
- `services/kpiAttachmentService.ts:53` logs the audit event separately
- `app/api/dar/[id]/attachments/route.ts:91` uploads to SharePoint first
- `app/api/dar/[id]/attachments/route.ts:101` creates the DB row afterward
- `services/darService.ts:225` moves temp files with `Promise.allSettled`
- `services/darService.ts:249` creates DB attachment rows only for fulfilled moves

Risk:

- If DB insert fails after upload, the SharePoint file remains orphaned.
- If audit log creation fails after attachment creation, business state and audit trail diverge.
- In `adoptTempAttachments`, some files can fail to move and are only logged to console, leaving the DAR partially attached.

Recommendation:

- Treat external upload plus DB insert plus audit logging as one workflow with compensation.
- At minimum, delete the uploaded SharePoint item if DB persistence fails.
- Avoid silent partial success for temp attachment adoption unless the product explicitly accepts it.

### Medium: Existing transaction blocks in `DarService` and `KpiMonthlyService` propagate `tx` correctly

Evidence:

- `services/darService.ts:336-340` uses one transaction and passes `tx` to repository calls
- `services/darService.ts:408-436` passes `tx` to approval update, profile update, approval creation, and DAR status update
- `services/kpiMonthlyService.ts:68-97`, `120-149`, `174-180`, `208-215` consistently pass `tx` into repository writes

Assessment:

- I did not find a confirmed case where a repository write inside an existing transaction block forgot to receive `tx`.
- The larger problem is not missing `tx` inside current transactions; it is that several multi-step workflows never open a transaction at all.

### Medium: Several services bypass the repository layer and use `db.*` directly

Evidence:

- `services/documentControlService.ts:70`, `71`, `124`, `129`, `179`, `197`
- `services/documentCategoryService.ts:27`, `57`, `64`, `69`, `74`

Risk:

- This weakens the project's own Service/Repository boundary.
- It also makes transaction review harder because writes are spread across service methods instead of being encapsulated in repositories.

Recommendation:

- Move direct Prisma calls into repositories and make transaction boundaries explicit in service methods.

### Medium: `handleApiError` is not used consistently, and one route has no catch block at all

Evidence:

- `app/api/debug-auth/route.ts:5-6` has no `try/catch`
- Routes such as `app/api/sharepoint/preview-proxy/route.ts:71`, `app/api/sharepoint/office-embed/route.ts:18`, `app/api/sharepoint/list-files/route.ts:15`, `app/api/ms-graph/users/search/route.ts:54`, `app/api/dar/[id]/attachments/route.ts:129`, and `app/api/dar/[id]/attachments/[attachmentId]/route.ts:47` use custom catches instead of `handleApiError`

Risk:

- Error response shape is inconsistent across the API surface.
- `debug-auth` can throw uncaught exceptions directly from `getToken(...)` and also exposes internal diagnostic data that should not remain in a normal runtime.

Recommendation:

- Remove `debug-auth` or lock it down and wrap it with standard error handling.
- Standardize all routes on `handleApiError` unless there is a deliberate exception.

### Medium: `handleApiError` leaks raw unknown error messages to clients

Evidence:

- `lib/apiErrorHandler.ts:65` returns `error.message` for unknown errors

Risk:

- This does not expose a stack trace, but it can still leak internal messages from Prisma, SharePoint, Graph, JSON parsing, or infrastructure failures.
- Example: `app/api/profile/route.ts:14` throws a plain `Error("User not found")`, which becomes a 500 with raw message text.

Recommendation:

- Return a generic message for unknown errors in production, and keep detailed text only in logs.

### Medium: Validation coverage is incomplete for route params and some query inputs

Evidence:

- `app/api/dar/[id]/route.ts:16`, `29`, `44` use `id` from params without UUID validation
- `app/api/announcements/[id]/route.ts:16`, `28`, `56`, `71` use `id` from params without validation
- `app/api/document-categories/[id]/route.ts:15`, `30` use `id` from params without validation
- `app/api/it/departments/[id]/route.ts:25`, `41` use `id` from params without validation
- `app/api/sharepoint/list-files/route.ts:10` accepts `folderPath` with no schema
- `app/api/sharepoint/office-embed/route.ts:10` accepts `itemId` manually
- `app/api/sharepoint/preview-proxy/route.ts:11` accepts `itemId` manually
- `app/api/ms-graph/users/search/route.ts:21` accepts `q` with no schema or length bound

Assessment:

- Body validation is decent on the main business endpoints.
- Param and query validation is not complete across the whole API surface.

Recommendation:

- Add explicit Zod schemas for route params and query strings, especially for UUIDs and externally forwarded identifiers.

### Medium: `services/sharepoint.ts` has no timeout or retry policy and duplicates token acquisition logic

Evidence:

- `services/sharepoint.ts:15` defines its own `getToken()`
- `services/sharepoint.ts:28`, `60`, `112`, `141`, `221`, `246`, `266`, `334`, `361`, `387`, `403`, `487`, `499`, `518`, `528` make direct `fetch(...)` calls
- There is no `AbortController`, timeout wrapper, retry loop, or backoff handling

Risk:

- Slow or unstable Graph calls can hang until the platform-level fetch timeout.
- 429 and transient 5xx responses are not retried.
- Because this file bypasses `lib/graph-token.ts`, it also bypasses Redis token caching and single-flight refresh control.

Recommendation:

- Replace the local `getToken()` with `getGraphToken()`.
- Centralize Graph fetch with timeout, retry, and backoff for 429/502/503/504 plus `Retry-After` support.

### Medium: `lib/graph-token.ts` has good cache locking, but the TTL strategy is only partially safe

Evidence:

- `lib/graph-token.ts:15` hardcodes `CACHE_TTL_SEC = 3540`
- `lib/graph-token.ts:23` reads `expires_in`
- `lib/graph-token.ts:67-68` caches the token with the fixed TTL, not with `expires_in`
- `lib/graph-token.ts:64-79` uses Redis lock/wait logic correctly

Assessment:

- The lock and wait pattern is good.
- The early-expiry buffer is directionally correct.
- The weakness is that the cache TTL ignores the token's actual `expires_in` value. If Azure returns a shorter lifetime than expected, the cache can serve an expired token.

Recommendation:

- Cache using `Math.max(0, expires_in - safetyBuffer)` from the token response instead of a fixed constant.
- Add timeout and limited retry around token fetch as well.

## Additional Notes

### Routes that still bypass service/repository layers

Some routes perform direct Prisma access in the route handler itself instead of calling services or repositories:

- `app/api/sharepoint/preview-proxy/route.ts:20`, `29`, `36`
- `app/api/ms-graph/users/search/route.ts:35`
- `app/api/qms/mr/[id]/route.ts` uses `db.$transaction(...)` directly in the route
- `app/api/dar/[id]/attachments/route.ts:101`
- `app/api/dar/[id]/attachments/[attachmentId]/route.ts:44`

This is not always a correctness bug by itself, but it increases architectural drift and makes auditability worse.

## Positive Findings

- `DarService` transaction blocks are disciplined and pass `tx` correctly.
- `KpiMonthlyService` is the cleanest example of transactional orchestration plus audit/signature writes.
- Many route handlers already validate request bodies with Zod and delegate to services.
- `lib/graph-token.ts` already has Redis caching, a lock key, and a short wait strategy to reduce token stampede.

## Recommended Priority Order

1. Fix `DocumentControlService.addRevision` first.
2. Standardize SharePoint/Graph calls behind one timeout/retry/token-aware client.
3. Refactor Document Control and Category mutation flows to use repositories plus DB transactions.
4. Standardize API error handling and remove `debug-auth`.
5. Add param/query Zod schemas for all `id`, `itemId`, `folderPath`, and search inputs.
