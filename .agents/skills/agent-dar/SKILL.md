---
name: agent-dar
description: >
  Expert in the DAR (Document Action Request) Module, with deep knowledge of DAR Business Logic,
  Status Flow, Permissions, Approval Steps, and QMS Processing.
---

# Agent-DAR — Document Action Request Module

You are the DAR Module expert for the `qms-system` project.
You are responsible for DAR Backend Logic, API Routes, and Frontend Components only.
**Regarding UI/UX, you must always adhere to the Design System Agent.**

---

## 1. Business Logic — Status Flow

```
DRAFT → PENDING_REVIEW → PENDING_APPROVE → QMS_PROCESSING → COMPLETED
                                              ↓ (Rejected)
                                           CANCELLED
```

| Status | Meaning | Authorized Roles |
|--------|---------|------------------|
| DRAFT | Created, waiting to be sent | Requester (Any Role) |
| PENDING_REVIEW | Awaiting Reviewer approval | Reviewer |
| PENDING_APPROVE | Awaiting Approver approval | Approver |
| QMS_PROCESSING | QMS is processing | QMS, IT |
| COMPLETED | Completed | QMS, IT |
| CANCELLED | Cancelled | QMS, IT |

---

## 2. Approval Steps (ApprovalStep enum)

DAR Uses Steps: `REQUESTER → REVIEWER → APPROVER → QMS_PROCESSOR`

---

## 3. QMS Processing Checklist

When status is `QMS_PROCESSING` → QMS must complete the checklist in `QmsProcessing`:
- `chkHasAttachment` — Attachment exists
- `chkPrintAndValidate` — Print and validate
- `chkRenumber` — Renumber document
- `chkImpactInvestigated` — Impact investigated
- `chkSubmitVerification` — Submit verification
- `chkGetBackProcess` — Get back process
- `chkCopyDistribute` — Copy and distribute

---

## 4. Doc Types

```typescript
const DOC_TYPES = ["ISO", "Work Instruction", "Form", "Procedure", "Other"];
```

---

## 5. Responsible Files

### Backend
- `services/darService.ts` — Core Business Logic (45KB)
- `repositories/darRepository.ts` — DB queries
- `repositories/qmsProcessingRepository.ts` — QMS Processing

### API Routes
- `app/api/dar/` — CRUD endpoints
- `app/api/dar/[id]/attachments/` — Upload file
- `app/api/dar/attachments/temp/` — Temp upload before DAR creation

### Frontend Components
- `components/dar/` — All DAR components
- `app/(dashboard)/dar/` — Pages
- `app/(dashboard)/qms/dar/` — QMS view

---

## 6. Related Schemas

```prisma
model DarMaster         // DAR Master Info
model DarItem           // Requested Document Item
model DarApproval       // Approval Result for each Step
model DarAttachment     // Attachment
model DarDistribution   // Document Recipient Department
model QmsProcessing     // QMS Checklist
model PublicDocument    // Published Document

enum DarStatus { DRAFT PENDING_REVIEW PENDING_APPROVE QMS_PROCESSING COMPLETED CANCELLED }
enum ApprovalAction { PENDING APPROVED REJECTED }
```

---

## 7. Important Rules for this Module

1. Temp Attachment is uploaded before DAR creation — use `tempId` (UUID) as reference.
2. When actual DAR is created → move Temp files to permanent folder.
3. DAR No format: `DAR-{YYYY}-{SEQ:04d}` e.g., `DAR-2026-0001`.
4. Distribution → each department receives a copy.
5. Downloading attachments must always go through `/api/sharepoint/get-file?itemId=`.
