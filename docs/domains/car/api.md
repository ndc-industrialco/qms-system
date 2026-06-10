# CAR API

Base path: `/api/car`

---

## Endpoints

### GET /api/car
ดึงรายการ CAR (Role-scoped)

- **Auth:** Login required
- **Scoping:**
  - QMS / IT / MR → ดูทั้งหมด
  - USER → ดูเฉพาะ `targetDepartmentId` ตรงกับแผนกของตัวเอง
- **Query params:**

| Param | Type | หมายเหตุ |
|-------|------|---------|
| `page` / `limit` | number | pagination (default 20) |
| `search` | string | ค้นหาจาก carNo / detail |
| `status` | string | DRAFT / ISSUED / RESPONDED / VERIFY_1 / VERIFY_2 / CLOSED / RE_CAR |
| `sourceType` | string | I / C / N / O |

- **Response:** Paginated `CarSummary[]` พร้อม `meta: { page, limit, total }`

---

### POST /api/car
สร้าง CAR ใหม่ (status = DRAFT)

- **Auth:** QMS / IT
- **Body:** JSON (validated via `carCreateSchema`)

```json
{
  "sourceType": "I",
  "sourceDetail": "...",
  "defectDetail": "...",
  "nonConformanceRef": "...",
  "isoStandards": ["ISO 9001:2015"],
  "issuerId": "user-uuid",
  "issuerPosition": "QMS Manager",
  "targetDepartmentId": "dept-uuid",
  "targetEmailGroup": "group@company.com",
  "reCar": false,
  "reCarRefId": null
}
```

- **Response 201:** `{ "id": "uuid", "carNo": "C25-001" }`

---

### GET /api/car/[id]
ดูรายละเอียด CAR

- **Auth:** QMS/IT/MR หรือ USER ที่ `departmentId` ตรงกับ `targetDepartmentId`
- **Response:** `CarDetail` — รวม response, verifications, mrSignature, timeline

---

### PATCH /api/car/[id]
แก้ไข DRAFT CAR

- **Auth:** QMS / IT
- **Condition:** status ต้องเป็น DRAFT
- **Body:** JSON (fields เดียวกับ POST)

---

### DELETE /api/car/[id]
ยกเลิก CAR (status → CANCELLED)

- **Auth:** QMS / IT
- **Condition:** ห้ามยกเลิก CLOSED CAR

---

### POST /api/car/[id]/issue
ออก CAR (DRAFT → ISSUED)

- **Auth:** QMS / IT
- **Body:** ไม่ต้องการ
- **Side-effects:**
  - `issuedAt = now()`, `responseDueAt = now() + 7 วัน`
  - ส่งเมลแจ้ง `targetEmailGroup` (`sendCarIssuedEmail`)
  - Schedule Redis reminder job (ทุก 3 วัน ขณะ ISSUED)
  - บันทึก AuditLog (`ISSUE`)
- **Response:** `{ carNo, issuedAt, responseDueAt }`

---

### POST /api/car/[id]/respond
แผนกตอบกลับ (ISSUED → RESPONDED)

- **Auth:** USER ที่ `departmentId === car.targetDepartmentId`
- **Body:** JSON (validated via `carRespondSchema`)

```json
{
  "responderPosition": "...",
  "whyAnalysis": "...",
  "additionalToolDetail": "...",
  "rootCausePerson": true,
  "rootCauseMaterial": false,
  "rootCauseMachine": false,
  "rootCauseMethod": false,
  "rootCauseOther": false,
  "rootCauseOtherDetail": "",
  "rootCauseSummary": "...",
  "immediateAction": "...",
  "preventiveAction": "...",
  "plannedCompletionDate": "2026-07-01"
}
```

- **Side-effects:**
  - ส่งเมลแจ้ง MR + QMS (`sendCarRespondedEmail`)
  - Cancel Redis reminder job
  - บันทึก AuditLog (`RESPOND`)

---

### POST /api/car/[id]/verify
QMS ติดตามผล

- **Auth:** QMS / IT
- **Body:** JSON (validated via `carVerifySchema`)

```json
{
  "round": 1,
  "findings": "...",
  "result": "PASSED",
  "nextDueDate": null,
  "verifierPosition": "QMS Manager"
}
```

- **Side-effects (PASSED):**
  - สร้าง `ActionToken` (module: CAR, role: MR_SIGNER, expires: 7 วัน)
  - ส่งเมล MR พร้อม token link (`sendCarVerifyPassEmail`)
- **Side-effects (FAILED, round=1):**
  - status → VERIFY_2
  - ส่งเมลแผนก (`sendCarVerify2NotifyEmail`)
- **Side-effects (FAILED, round=2):**
  - status → RE_CAR (รอ QMS เรียก `/re-car`)
- **บันทึก:** AuditLog (`VERIFY_1` หรือ `VERIFY_2`)

---

### POST /api/car/[id]/close
MR ลงนามปิด CAR (ผ่าน Email Token)

- **Auth:** ActionToken validation (ไม่ต้องการ session)
- **Body:** `{ "token": "...", "comment": "..." }`
- **Side-effects:**
  - Validate token (module: CAR, ไม่หมดอายุ, ไม่ถูกใช้)
  - สร้าง `CarMrSignature`
  - Mark token `usedAt`
  - status → CLOSED
  - บันทึก AuditLog (`CLOSE`)

---

### POST /api/car/[id]/re-car
สร้าง Re-CAR ใหม่

- **Auth:** QMS / IT
- **Condition:** status ต้องเป็น RE_CAR
- **Body:** ไม่ต้องการ (auto-copy จาก parent)
- **Side-effects:**
  - สร้าง CarMaster ใหม่ (`reCar: true`, `reCarRefId: carId`)
  - Auto-issue ทันที
  - ส่งเมลแผนก (`sendCarReCarEmail`)
- **Response:** `{ newCarId, newCarNo }`

---

### GET /api/car/next-number
Preview CAR number ถัดไป

- **Auth:** QMS / IT
- **Response:** `{ "nextNumber": "C25-003" }`

---

## Zod Validation Schemas

| Schema | ใช้ใน |
|--------|-------|
| `carCreateSchema` | POST /api/car |
| `carRespondSchema` | POST /api/car/[id]/respond |
| `carVerifySchema` | POST /api/car/[id]/verify |
