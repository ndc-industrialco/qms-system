# API Map

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
- **API**: `/api/auth/[...nextauth]/route.ts`
- **Service**: `userService.ts`
- **Repository**: `userRepository.ts`
- **Database**: `User`, `Department`

### CAR Domain
- **Feature**: Create CAR, Issue, Respond, Verify, Close (MR token), Re-CAR
- **API**: `/api/car`, `/api/car/[id]`, `/api/car/[id]/issue`, `/api/car/[id]/respond`, `/api/car/[id]/verify`, `/api/car/[id]/close`, `/api/car/[id]/re-car`, `/api/car/next-number`
- **Service**: `carService.ts`, `carEmailService.ts`
- **Repository**: `carRepository.ts`, `carSequenceRepository.ts`
- **Database**: `CarMaster`, `CarResponse`, `CarVerification`, `CarMrSignature`, `CarAttachment`, `CarNotificationLog`

CAR list contract:
- `GET /api/car?page=<n>&limit=<n>&search=<text>&status=<status>&sourceType=<type>`
- Returns standard success envelope with `data[]` and pagination `meta`
- Scope remains role-aware: QMS/IT/MR see all; USER sees only own department

### MS Graph Integration
- **Feature**: Search Entra ID users and mail-enabled groups (used by CAR form pickers)
- **API**: `GET /api/ms-graph/users/search?q=`, `GET /api/ms-graph/groups/search?q=`
- **Service**: `ms-graph.ts` (`searchEntraUsers`, `searchEntraGroups`, `fetchAllEntraGroups`)
- **External**: Microsoft Graph API (`/v1.0/users`, `/v1.0/groups`)

### Audit & Notifications
- **API**: `/api/audit-logs`, `/api/health`
- **Service**: `auditService.ts`, `notificationService.ts`
- **Repository**: `auditLogRepository.ts`, `notificationLogRepository.ts`
- **Database**: `AuditLog`, `NotificationLog`
