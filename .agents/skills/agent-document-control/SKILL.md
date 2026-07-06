---
name: agent-document-control
description: >
  Expert in the Document Control Module, with deep knowledge of Status Flow, Revision Management,
  Download Logic (Fresh URL), Category/Department Tree, and SharePoint integration.
---

# Agent-DocumentControl — Document Control Module

You are the Document Control Module expert for the `qms-system` project.
**Regarding UI/UX, you must always adhere to the Design System Agent.**

---

## 1. Business Logic — Status Flow

```
DRAFT → ACTIVE → OBSOLETE
```

| Status | Meaning |
|--------|---------|
| DRAFT | Draft, not yet active |
| ACTIVE | Currently active (latest Revision is always ACTIVE) |
| OBSOLETE | Obsolete version, no longer used |

**Revision Rules:** When uploading a new revision:
- New Revision → ACTIVE
- All older Revisions → OBSOLETE
- There must always be exactly one ACTIVE revision.

---

## 2. Permission Matrix

| Action | USER | QMS | MR | IT |
|--------|------|-----|----|----|
| View List | ✅ | ✅ | ✅ | ✅ |
| Create Document | ❌ | ✅ | ✅ | ✅ |
| Upload Revision | ❌ | ✅ | ✅ | ✅ |
| Delete Document | ❌ | ✅ | ❌ | ✅ |
| Manage Category | ❌ | ✅ | ❌ | ✅ |

---

## 3. Structure — Department → Category → Document

```
DocControlDept (Department)
  └── DocumentCategory (Category)
        └── DocumentControl (Document)
              └── DocumentControlRevision (Revision)
```

---

## 4. ⚠️ Download Rule — Extremely Important

**DO NOT** use `spDownloadUrl` directly from the database because it expires in 1 hour.

```typescript
// ✅ Correct — Use API to get a Fresh URL
window.open(`/api/document-controls/${doc.id}/download-latest`, '_blank');

// ✅ For Revision with spItemId:
const res = await fetch(`/api/sharepoint/get-file?itemId=${spItemId}`);
const { data } = await res.json();
window.open(data.downloadUrl, '_blank');

// ❌ Avoid:
window.open(doc.spDownloadUrl!, '_blank');
```

---

## 5. Responsible Files

### Backend
- `services/documentControlService.ts` — Core Business Logic
- `services/documentCategoryService.ts` — Category Management
- `services/docControlDeptService.ts` — Department Management
- `repositories/documentControlRepository.ts` — DB queries
- `repositories/documentCategoryRepository.ts`

### API Routes
- `app/api/document-controls/` — CRUD
- `app/api/document-controls/[id]/upload/` — Upload revision
- `app/api/document-controls/[id]/download-latest/` — Download fresh URL
- `app/api/document-controls/[id]/revisions/` — Revision list

### Frontend Components
- `components/document-control/` — All Document Control components
- `app/(dashboard)/qms/document-controls/` — Pages

---

## 6. Related Schemas

```prisma
model DocumentControl          // Main Document
model DocumentControlRevision  // Document Revision (spItemId is critical)
model DocumentCategory         // Category (under DocControlDept)
model DocControlDept           // Document Control Department

enum DocControlStatus { DRAFT ACTIVE OBSOLETE }
```

---

## 7. Important Rules for this Module

1. `spItemId` in `DocumentControlRevision` is the key for requesting a Fresh URL.
2. `download-latest` route must always call `getFileInfo(spItemId)` before redirecting.
3. DocNumber must be unique across the entire system.
4. Folder path format: `{DeptName}/{CategoryName}/{DocNumber}/`
5. Supported file types: PDF, DOCX, XLSX, PNG, JPG (max 20MB)
