# CAR Database

---

## Table: `CarMaster`

| Column | Type | Constraint | หมายเหตุ |
|--------|------|-----------|---------|
| `id` | UUID | PK | |
| `carNo` | String | UNIQUE | C25-001 |
| `carYear` | Int | | ปี ค.ศ. |
| `sequenceNo` | Int | | running number ต่อปี |
| `status` | Enum | | DRAFT / ISSUED / RESPONDED / VERIFY_1 / VERIFY_2 / CLOSED / RE_CAR / CANCELLED |
| `sourceType` | Enum | | I / C / N / O |
| `sourceDetail` | String? | | รายละเอียดแหล่งที่มา |
| `defectDetail` | String | | รายละเอียดข้อบกพร่อง |
| `nonConformanceRef` | String | | ข้อกำหนดที่ไม่สอดคล้อง |
| `isoStandards` | String[] | | ["ISO 9001:2015", ...] |
| `issuerId` | String | FK → User | ผู้ออก CAR |
| `issuerPosition` | String | | ตำแหน่งผู้ออก |
| `issuedAt` | DateTime? | | วันที่ออก CAR |
| `responseDueAt` | DateTime? | | กำหนดตอบกลับ (issuedAt + 7 วัน) |
| `targetDepartmentId` | String | FK → Department | |
| `targetEmailGroup` | String? | | MS Graph Group email |
| `reCar` | Boolean | default false | เป็น Re-CAR หรือไม่ |
| `reCarRefId` | String? | FK → CarMaster | CAR ต้นทาง |
| `createdAt` | DateTime | default now() | |
| `updatedAt` | DateTime | auto-update | |

**Indexes:** `status`, `issuerId`, `targetDepartmentId`, `(carYear, sequenceNo)`

---

## Table: `CarResponse` (1:1 กับ CarMaster)

| Column | Type | หมายเหตุ |
|--------|------|---------|
| `id` | UUID | PK |
| `carMasterId` | String UNIQUE | FK → CarMaster |
| `responderId` | String | FK → User |
| `responderPosition` | String | |
| `respondedAt` | DateTime | default now() |
| `whyAnalysis` | String | 5-Why analysis |
| `additionalToolDetail` | String? | เครื่องมืออื่นๆ |
| `rootCausePerson` | Boolean | 5M: คน |
| `rootCauseMaterial` | Boolean | 5M: วัตถุดิบ |
| `rootCauseMachine` | Boolean | 5M: เครื่องจักร |
| `rootCauseMethod` | Boolean | 5M: วิธีการ |
| `rootCauseOther` | Boolean | 5M: อื่นๆ |
| `rootCauseOtherDetail` | String? | |
| `rootCauseSummary` | String | สรุป Root Cause |
| `immediateAction` | String | การแก้ไขเบื้องต้น |
| `preventiveAction` | String | การแก้ไขป้องกัน |
| `plannedCompletionDate` | DateTime | กำหนดแล้วเสร็จ |

---

## Table: `CarVerification`

| Column | Type | Constraint | หมายเหตุ |
|--------|------|-----------|---------|
| `id` | UUID | PK | |
| `carMasterId` | String | FK → CarMaster | |
| `round` | Int | | 1 หรือ 2 |
| `verifierId` | String | FK → User | |
| `verifierPosition` | String | | |
| `verifiedAt` | DateTime | default now() | |
| `findings` | String | | สิ่งที่พบ |
| `result` | Enum | | PASSED / FAILED |
| `nextDueDate` | DateTime? | | กำหนดครั้งถัดไป (ถ้า FAILED round 1) |
| Unique | | `(carMasterId, round)` | |

---

## Table: `CarMrSignature` (1:1 กับ CarMaster)

| Column | Type | หมายเหตุ |
|--------|------|---------|
| `id` | UUID | PK |
| `carMasterId` | String UNIQUE | FK → CarMaster |
| `mrUserId` | String | FK → User |
| `signedAt` | DateTime | default now() |
| `comment` | String? | |

---

## Table: `CarAttachment`

| Column | Type | หมายเหตุ |
|--------|------|---------|
| `id` | UUID | PK |
| `carResponseId` | String | FK → CarResponse |
| `fileName` | String | |
| `fileSize` | Int | bytes |
| `mimeType` | String | |
| `spItemId` / `spWebUrl` / `spDownloadUrl` | String | SharePoint |
| `folderPath` | String | |
| `uploadedById` | String | FK → User |
| `createdAt` | DateTime | |

---

## Table: `CarNotificationLog`

| Column | Type | หมายเหตุ |
|--------|------|---------|
| `id` | UUID | PK |
| `carMasterId` | String | FK → CarMaster |
| `type` | String | ISSUED / REMINDER / RESPONSE_RECEIVED / VERIFY_1_PASS / VERIFY_2_NOTIFY / RE_CAR |
| `sentAt` | DateTime | default now() |
| `recipient` | String | email address หรือ group |

---

## Enums

```prisma
enum CarStatus {
  DRAFT
  ISSUED
  RESPONDED
  VERIFY_1
  VERIFY_2
  CLOSED
  RE_CAR
  CANCELLED
}

enum CarSourceType {
  I   // Internal Audit
  C   // Customer Complaint
  N   // Nonconformity
  O   // Other
}

enum VerificationResult {
  PASSED
  FAILED
}
```

---

## Relations

```
CarMaster ──── issuer ────────────→ User
CarMaster ──── targetDepartment ──→ Department
CarMaster ──── reCarRef ──────────→ CarMaster (self-ref parent)
CarMaster ──── reCarChildren ─────→ CarMaster[] (self-ref children)
CarMaster ──── response ──────────→ CarResponse (1:1)
CarMaster ──── verifications ─────→ CarVerification[] (1:N)
CarMaster ──── mrSignature ───────→ CarMrSignature (1:1)
CarMaster ──── notificationLogs ──→ CarNotificationLog[] (1:N)
CarResponse ── attachments ───────→ CarAttachment[] (1:N)
```

---

## Sequence Number Management

- เก็บใน `SystemConfig` table: key = `CAR_SEQ_{year}`
- Upsert + increment ใน transaction — ปลอดภัยใน serverless
- Reset เป็น 1 ทุกต้นปี

---

## ActionToken Integration

- `ApprovalModule` enum มี `CAR`
- ใช้สำหรับ MR sign-off link ในเมล (expires 7 วัน)
- Validate ใน `POST /api/car/[id]/close`
