# API Map

_Last updated: 2026-06-19_

## Feature -> API -> Service -> Repository -> Database

### DAR Domain
- **Feature**: Create DAR
- **API**: `/api/dar/route.ts`
- **Service**: `darService.ts`
- **Repository**: `darRepository.ts`
- **Database**: `DarMaster`, `DarItem`, `DarDistribution`, `DarAttachment`

### KPI Domain
- **Feature**: Create & Approve KPI Master, Submit Monthly KPI
- **API**: `/api/kpi/[id]/submit`, `/api/kpi/[id]/review`, `/api/kpi/[id]/approve`, `/api/kpi/[id]/monthly/[reportId]/submit`, `/api/kpi/[id]/monthly/[reportId]/review`
- **Service**: `kpiService.ts`, `kpiMonthlyService.ts`
- **Repository**: `kpiRepository.ts`, `kpiMonthlyReportRepository.ts`, `approvalSignatureRepository.ts`
- **Database**: `KPI`, `KPIObjective`, `KPIMonthlyReport`, `KPIMonthlyDetail`, `ApprovalSignature`

### Authentication Domain
- **Feature**: Login
- **API**: `/api/auth/[...nextauth]/route.ts`, `/api/auth/center/callback`, `/api/auth/center/health`
- **Service**: `userService.ts`
- **Repository**: `userRepository.ts`
- **Database**: `User`, `Department`

### CAR Domain
- **Feature**: Create CAR, Issue, Respond, Verify, Close (MR token), Re-CAR, MR Response Review
- **API**: `/api/car`, `/api/car/[id]`, `/api/car/[id]/issue`, `/api/car/[id]/respond`, `/api/car/[id]/verify`, `/api/car/[id]/close`, `/api/car/[id]/re-car`, `/api/car/[id]/review-response`, `/api/car/next-number`
- **Service**: `carService.ts`, `carEmailService.ts`, `carNotificationService.ts`, `carReminderService.ts`
- **Repository**: `carRepository.ts`, `carSequenceRepository.ts`
- **Database**: `CarMaster`, `CarResponse`, `CarVerification`, `CarMrSignature`, `CarAttachment`, `CarNotificationLog`

CAR list contract:
- `GET /api/car?page=<n>&limit=<n>&search=<text>&status=<status>&sourceType=<type>`
- Returns standard success envelope with `data[]` and pagination `meta`
- Scope: QMS/IT/MR see all; USER sees own department only

### CAR Cron / Reminder
- **Feature**: Email reminder every 3 days while CAR status = ISSUED
- **API**: `GET /api/cron/car-reminder` (requires `Authorization: Bearer <CRON_SECRET>`)
- **Service**: `carReminderService.ts` → `CarReminderService.processAllDue()`
- **Storage**: Redis keys `car:reminder:<carId>` (epoch timestamp of next fire)
- **Side effects**: calls `sendCarReminderEmail()`, logs to `CarNotificationLog`

### MS Graph Integration
- **Feature**: Search Entra ID users and mail-enabled groups
- **API**: `GET /api/ms-graph/users/search?q=`, `GET /api/ms-graph/groups/search?q=`
- **Service**: `ms-graph.ts` (`searchEntraUsers`, `searchEntraGroups`, `fetchAllEntraGroups`)
- **External**: Microsoft Graph API (`/v1.0/users`, `/v1.0/groups`)

### Announcements Domain
- **Feature**: Create / Edit / Delete / Toggle announcements; email on publish
- **API**: `GET/POST /api/announcements`, `GET/PATCH/DELETE /api/announcements/[id]`
- **Public APIs**: `GET /api/announcements/public` (company center feed), `GET /api/announcements/ticker` (scrolling ticker)
- **Service**: `announcementService.ts` (Redis cache TTL 60s), `email.ts` (`sendAnnouncementEmail`)
- **Repository**: `announcementRepository.ts`
- **Database**: `Announcement`
- **Email**: On create, if `emailGroupMails[]` is non-empty, sends email via MS Graph delegated-auth (fire-and-forget)

### Document Control Domain
- **Feature**: Upload, Preview (SharePoint), Download, Category & Dept management, Revisions
- **API**: `GET/POST /api/document-controls`, `GET/PATCH/DELETE /api/document-controls/[id]`, `POST /api/document-controls/[id]/upload`, `GET /api/document-controls/[id]/download-latest`
- **API**: `GET/POST /api/document-categories`, `GET/PATCH/DELETE /api/document-categories/[id]`
- **Service**: `documentControlService.ts`, `documentCategoryService.ts`
- **Repository**: `documentControlRepository.ts`, `documentCategoryRepository.ts`
- **Database**: `DocumentControl`, `DocumentCategory`, `DocumentControlRevision`

### SharePoint Integration
- **API**: `/api/sharepoint/upload-file`, `/api/sharepoint/list-files`, `/api/sharepoint/get-file`, `/api/sharepoint/delete-item`, `/api/sharepoint/create-folder`, `/api/sharepoint/preview-proxy`, `/api/sharepoint/office-embed`
- **Service**: `sharepoint.ts`

### Audit & Notifications
- **API**: `GET /api/audit-logs`, `GET /api/audit-logs/export` (CSV)
- **API**: `GET/POST /api/notifications`, `PATCH /api/notifications/[id]/read`, `PATCH /api/notifications/read-all`
- **Service**: `auditService.ts`, `notificationService.ts`
- **Repository**: `auditLogRepository.ts`, `notificationLogRepository.ts`, `notificationRepository.ts`
- **Database**: `AuditLog`, `NotificationLog`, `Notification`

### Approvals
- **API**: `GET /api/approvals/pending-summary`
- **Service**: `approvalsService.ts` → `getPendingSummaryForUser()`
- **Purpose**: Badge/count of pending approvals for dashboard header

### IT Admin Domain
- **API**: `GET/POST /api/it/departments`, `GET/PATCH/DELETE /api/it/departments/[id]`, `GET /api/it/departments/[id]/members`
- **API**: `GET /api/it/users`, `PATCH /api/it/users/[id]/role`, `POST /api/it/users/[id]/block-session`, `POST /api/it/users/[id]/push-to-m365`, `POST /api/it/users/[id]/local-credential`
- **API**: `POST /api/it/sync-users`, `POST /api/it/sync-departments`, `GET /api/it/ms365-groups`
- **Service**: `userService.ts`, `departmentService.ts`

### Health
- **API**: `GET /api/health`, `GET /api/health/live`, `GET /api/health/ready`
- **Service**: `healthService.ts`
