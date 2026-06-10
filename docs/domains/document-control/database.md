# DOCUMENT CONTROL Database

---

## Table: `DocumentControl`

| Column | Type | Constraint | หมายเหตุ |
|--------|------|-----------|---------|
| `id` | UUID | PK | |
| `docNumber` | String | UNIQUE | รหัสเอกสาร เช่น QMS-001 |
| `docName` | String | | ชื่อเอกสาร |
| `revision` | String | | รหัส Revision ปัจจุบัน |
| `description` | String | | รายละเอียด |
| `status` | Enum | | DRAFT / ACTIVE / OBSOLETE |
| `effectiveDate` | DateTime | | วันที่มีผล |
| `spDriveId` | String? | | SharePoint Drive ID |
| `spItemId` | String? | | SharePoint Item ID |
| `spWebUrl` | String? | | SharePoint Web URL |
| `spDownloadUrl` | String? | | SharePoint Download URL |
| `spFolderPath` | String? | | Path โฟลเดอร์ใน SharePoint |
| `fileName` | String? | | ชื่อไฟล์ปัจจุบัน |
| `fileSize` | String? | | ขนาดไฟล์ |
| `mimeType` | String? | | MIME type |
| `departmentId` | String | FK → Department | |
| `categoryId` | String? | FK → DocumentCategory | |
| `createdById` | String | FK → User | |
| `updatedById` | String? | FK → User | |
| `createdAt` | DateTime | default now() | |
| `updatedAt` | DateTime | auto-update | |

---

## Table: `DocumentCategory`

| Column | Type | Constraint | หมายเหตุ |
|--------|------|-----------|---------|
| `id` | UUID | PK | |
| `name` | String | UNIQUE per dept | ชื่อ Category |
| `description` | String? | | |
| `order` | Int | default 0 | ลำดับแสดง |
| `departmentId` | String | FK → Department | |
| `createdAt` | DateTime | default now() | |
| `updatedAt` | DateTime | auto-update | |
| Unique | | `(departmentId, name)` | |

---

## Table: `DocumentControlRevision`

| Column | Type | Constraint | หมายเหตุ |
|--------|------|-----------|---------|
| `id` | UUID | PK | |
| `documentId` | String | FK → DocumentControl | |
| `revisionCode` | String | | A, B, 1.0, 2.0 |
| `effectiveDate` | DateTime | | |
| `status` | Enum | | DRAFT / ACTIVE / OBSOLETE |
| `spDriveId` / `spItemId` | String? | | SharePoint |
| `spWebUrl` / `spDownloadUrl` | String? | | SharePoint URLs |
| `fileName` / `fileSize` / `mimeType` | String? | | |
| `createdAt` | DateTime | default now() | |

---

## Enum: `DocControlStatus`

```prisma
enum DocControlStatus {
  DRAFT
  ACTIVE
  OBSOLETE
}
```

---

## Relations

```
Department        ──→ DocumentControl[]    (1:N)
Department        ──→ DocumentCategory[]   (1:N)
DocumentCategory  ──→ DocumentControl[]    (1:N)
DocumentControl   ──→ DocumentControlRevision[] (1:N)
User (createdBy)  ──→ DocumentControl
User (updatedBy)  ──→ DocumentControl
```

---

## Business Rules (enforced in service layer)

- ห้ามลบ Category ถ้ายังมีเอกสารอยู่
- เปลี่ยน Category → ย้าย SharePoint folder พร้อมอัปเดต `spFolderPath` ใน DB
- เปลี่ยน `docName` → rename ไฟล์ใน SharePoint
- Download latest → หา Revision ที่ `status = ACTIVE` ล่าสุด (fallback: Revision แรก)
