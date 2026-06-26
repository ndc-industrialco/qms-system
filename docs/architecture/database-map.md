# Database Map

_Last updated: 2026-06-19_

## Core Models
- `Department`: Org units.
- `User`: Employees. Includes `authUserId` (Auth Center link) and `employeeId`.
- `SystemConfig`: Key-Value configs (used for CAR sequence numbers, etc.).

## Announcement Models
- `Announcement`: Title, content, displayType (LIST/SCROLLING/BANNER), pushToCompanyCenter, start/endDate, bgColor/textColor, status (ACTIVE/INACTIVE), SharePoint attachment fields.

## DAR Models
- `DarMaster`: Main request.
- `DarItem`, `DarDistribution`, `DarAttachment`, `DarApproval`
- `QmsProcessing`

## KPI Models
- `KPI`, `KPIObjective`
- `KPIMonthlyReport`, `KPIMonthlyDetail`, `KPICorrectiveAction`
- `ApprovalSignature`: Shared approval table (Preparer → Reviewer → Approver). Used by KPI, KPI Monthly.

## Document Control
- `DocumentControl`, `DocumentCategory`, `DocumentControlRevision`, `PublicDocument`

## CAR Models
- `CarMaster`: Main CAR record. Fields: `carNo`, `status` (DRAFT/ISSUED/RESPONDED/VERIFY_1/VERIFY_2/CLOSED/RE_CAR), `sourceType`, `isoStandards[]`, `targetEmailGroups[]`, `targetEmailGroupsCc[]`.
- `CarResponse`: Department 5-Why response, root causes, corrective plan, respondent signature.
- `CarVerification`: QMS verification records (VERIFY_1 / VERIFY_2).
- `CarMrSignature`: MR sign-off record (token-based).
- `CarAttachment`: File attachments per CAR (SharePoint-backed).
- `CarNotificationLog`: Email send log per CAR event (type: ISSUED/RESPONDED/CLOSED/RE_CAR/REMINDER).

## Logs & Audit
- `AuditLog`: Every action (CREATE/UPDATE/DELETE/APPROVE/REJECT/SUBMIT/REVIEW/ISSUE/RESPOND/VERIFY_1/VERIFY_2/CLOSE/RE_CAR/ROLE_CHANGE/EXPORT/SYNC). Resource types: KPI, KPI_OBJECTIVE, KPI_MONTHLY_REPORT, DAR, USER, DOCUMENT, DOCUMENT_CATEGORY, CAR.
- `NotificationLog`: Email send log with idempotency key (PENDING/SENT/FAILED). Key format: `{RESOURCE_TYPE}:{resourceId}:{EVENT}:{recipientId}`.
- `ActionToken`: Secure DB tokens for email approval links. Fields: `token`, `module` (ApprovalModule enum), `documentId`, `role`, `issuedTo` (authUserId), `expiresAt`, `usedAt`, `revokedAt`.

## In-App Notification
- `Notification`: Per-user in-app notification. Fields: `recipientId`, `recipientAuthUserId`, `title`, `body`, `module`, `resourceId`, `resourceType`, `isRead`. Indexed on `(recipientId, isRead)` and `createdAt`.
