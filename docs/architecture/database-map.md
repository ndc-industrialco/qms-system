# Database Map

## Core Models
- `Department`: Org units.
- `User`: Employees.
- `SystemConfig`: Key-Value configs.

## DAR Models
- `DarMaster`: Main request.
- `DarItem`, `DarDistribution`, `DarAttachment`, `DarApproval`
- `QmsProcessing`

## KPI Models
- `KPI`, `KPIObjective`
- `KPIMonthlyReport`, `KPIMonthlyDetail`, `KPICorrectiveAction`

## Document Control
- `DocumentControl`, `DocumentCategory`, `DocumentControlRevision`, `PublicDocument`

## CAR Models
- `CarMaster`, `CarResponse`, `CarVerification`, `CarMrSignature`, `CarAttachment`, `CarNotificationLog`

## Logs & Audit
- `AuditLog`, `NotificationLog`, `ActionToken`
