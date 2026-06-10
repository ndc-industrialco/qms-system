# CAR Frontend

---

## Pages

| Path | Component | หน้าที่ |
|------|-----------|--------|
| `/qms/car` | `CarListTable` | รายการ CAR ทั้งหมด (QMS/IT/MR view) |
| `/qms/car/[id]` | `CarDetailClient` | รายละเอียด CAR (QMS/IT) |
| `/car` | `CarListTable` | รายการ CAR ของแผนก (USER) |
| `/car/[id]` | `CarDetailClient` | รายละเอียด CAR + Respond form (USER) |
| `/approve/car/[token]` | MR Sign-off page | MR ลงนามปิด CAR ผ่าน email link |

---

## Components

### CarListTable
รายการ CAR พร้อม filter + pagination

- **Mobile (< lg):** Card layout (CAR#, type, dept, status badge, dates)
- **Desktop (≥ lg):** Table (CAR#, Type, Department, Detail, Status, Issued Date, Due Date)
- **Features:**
  - Search, กรอง status / sourceType
  - Pagination (20 ต่อหน้า, URL-bound)
  - Overdue highlight: แถว ISSUED ที่เกิน `responseDueAt` → สีแดง
- **Query:** แยก cache key ตาม role (privileged vs department-scoped)
- **Preload:** Server-side page 1, client-side refresh ด้วย TanStack Query

---

### CarDetailClient
หน้ารายละเอียด CAR ครบทุก section

**Header:**
- CAR# + Status badge
- Re-CAR indicator (link ไปยัง parent CAR)
- Action buttons ตาม role + status:

| Status | Role | Buttons |
|--------|------|---------|
| DRAFT | QMS/IT | Edit, Issue |
| ISSUED | USER (dept match) | Respond |
| RESPONDED / VERIFY_2 | QMS/IT | Verify |
| RE_CAR | QMS/IT | Create Re-CAR |

**Details Grid:**
- Type (I/C/N/O), Target Department
- Issuer name / position
- ISO Standards badges
- Issued Date, Due Date
- Defect Detail, Non-conformance Reference

**Conditional Sections:**
- Respond prompt → ISSUED + USER ของแผนกนั้น
- `CarRespondForm` → canRespond
- `CarVerifyForm` → RESPONDED/VERIFY_2 + QMS/IT
- `CarTimeline` → แสดงเสมอ
- Response Detail → ถ้ามี response แล้ว (5M, actions, planned date)

---

### CarTimeline
Timeline แสดงลำดับขั้นตอน

| Step | แสดงเมื่อ | ข้อมูล |
|------|----------|--------|
| Issued | เสมอ | CAR#, วันที่, ชื่อผู้ออก |
| Responded | มี response | วันที่ตอบ, ชื่อผู้ตอบ, planned date |
| Verify 1 | มี verification round 1 | วันที่, ผู้ verify, ผล (PASSED/FAILED) |
| Closed | CLOSED | วันที่ MR ลงนาม |
| Verify 2 | Verify 1 ไม่ผ่าน | วันที่, ผู้ verify, ผล |
| Re-CAR Children | มี Re-CAR | list link ไปยัง CAR ลูก |

สัญลักษณ์: ✅ = ผ่าน / ⭕ = รอดำเนินการ

---

### CarRespondForm
Form สำหรับแผนกตอบกลับ

| Section | Fields |
|---------|--------|
| 5-Why Analysis | textarea (required) |
| Additional Tools | textarea (optional) |
| Root Cause (5M) | checkboxes: Person, Material, Machine, Method, Other + summary textarea |
| Immediate Action | textarea (required) |
| Preventive Action | textarea (required) |
| Planned Completion Date | date picker (required) |
| Responder Position | text input (required) |
| Attachments | `CarAttachmentUpload` (SharePoint) |

Submit → `POST /api/car/[id]/respond`

---

### CarVerifyForm
Form สำหรับ QMS ติดตามผล

| Field | หมายเหตุ |
|-------|---------|
| Findings | textarea — สิ่งที่พบ (required) |
| Result | radio: PASSED / FAILED |
| Next Due Date | แสดงถ้า FAILED + round=1 (required) |
| Re-CAR warning | แสดงถ้า FAILED + round=2 |
| Verifier Position | text input (required) |

Submit → `POST /api/car/[id]/verify`

---

### CarFormDrawer
Drawer สร้าง/แก้ไข DRAFT CAR

| Section | Fields |
|---------|--------|
| Source & Type | sourceType (I/C/N/O), Re-CAR toggle + reference link |
| ISO Standards | multi-select checkboxes |
| Details | defectDetail textarea, nonConformanceRef textarea |
| Issuer | `GraphUserPicker` + position input |
| Target | Department dropdown, `GraphGroupPicker` (MS Graph email group) |

Submit → `POST /api/car` หรือ `PATCH /api/car/[id]`

---

### CarMrSignDialog
Dialog MR ลงนาม (ใน sign-off page):
- แสดง CAR summary
- ปุ่ม "ลงนาม" → `POST /api/car/[id]/close` พร้อม token
- ไม่ต้องการ login (token-based)

---

### CarStatusBadge
Badge แสดงสถานะ:
| Status | สี |
|--------|---|
| DRAFT | เทา |
| ISSUED | น้ำเงิน |
| RESPONDED | ส้ม |
| VERIFY_1 | เหลือง |
| VERIFY_2 | ส้มเข้ม |
| CLOSED | เขียว |
| RE_CAR | แดง |
| CANCELLED | เทาเข้ม |

---

## State Management

- ใช้ **TanStack React Query**
- Query keys: `["cars"]`, `["car", id]`
- Invalidate หลัง issue / respond / verify / close / re-car

---

## Permission Guards (UI)

```tsx
// แสดงปุ่ม Respond เฉพาะ USER ของแผนกที่โดน CAR
{session.user.departmentId === car.targetDepartmentId
  && car.status === "ISSUED" && <CarRespondButton />}

// แสดงปุ่ม Verify เฉพาะ QMS/IT
{["QMS", "IT"].includes(session.user.role) && <CarVerifyButton />}
```
