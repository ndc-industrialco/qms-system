# KPI Workflow Logic

เอกสารนี้อธิบาย workflow logic ของหน้า KPI ตามโค้ดปัจจุบัน โดยไล่จากหน้า UI ไปจนถึง API, service, repository และ database model

## 1. ภาพรวมหน้า KPI

KPI ในระบบแบ่งเป็น 2 workflow หลัก

| Workflow | หน้า UI | จุดประสงค์ |
| --- | --- | --- |
| KPI Objective รายปี | `/qms/kpi` และ `/qms/kpi/[kpiId]` | ตั้ง KPI ตามแผนก/ปี, เพิ่ม objective, ส่ง reviewer/approver อนุมัติ |
| KPI Monthly Report | `/qms/kpi/monthly` | สร้างรายงานรายเดือนจาก objective ที่อนุมัติ/มีอยู่, กรอก actual result, review/approve รายงาน |

ไฟล์หลักที่เกี่ยวข้อง:

| Layer | ไฟล์ |
| --- | --- |
| Page | `app/(dashboard)/qms/kpi/page.tsx`, `app/(dashboard)/qms/kpi/[departmentId]/page.tsx`, `app/(dashboard)/qms/kpi/monthly/page.tsx` |
| Client UI | `components/kpi/KpiObjectivesClient.tsx`, `components/kpi/KpiDepartmentDetailClient.tsx`, `components/kpi/KpiMonthlyClient.tsx`, `components/kpi/KpiMonthlyDetailDrawer.tsx` |
| API hooks | `hooks/api/use-kpi.ts`, `hooks/api/use-kpi-monthly.ts`, `hooks/api/use-kpi-corrective.ts` |
| API routes | `app/api/kpi/**/route.ts` |
| Business logic | `services/kpiService.ts`, `services/kpiMonthlyService.ts` |
| Data access | `repositories/kpiRepository.ts`, `repositories/kpiObjectiveRepository.ts`, `repositories/kpiMonthlyReportRepository.ts`, `repositories/kpiMonthlyDetailRepository.ts` |
| State machine | `lib/kpi-state-machine.ts` |
| Schema/types | `schemas/kpiSchema.ts`, `types/kpi.ts`, `prisma/schema.prisma` |

## 2. Data Model หลัก

โครงสร้างข้อมูล KPI อยู่ใน `prisma/schema.prisma`

| Model | ความหมาย | ความสัมพันธ์ |
| --- | --- | --- |
| `KPI` | KPI master ตาม `department` และ `yearly` | มีหลาย `KPIObjective` และหลาย `KPIMonthlyReport` |
| `KPIObjective` | objective/target ของ KPI รายปี | ผูกกับ `KPI`, ถูก snapshot ไปใช้ใน monthly detail |
| `KPIMonthlyReport` | รายงานรายเดือนของ KPI | unique ตาม `kpiId + month + year` |
| `KPIMonthlyDetail` | actual result ต่อ objective ในรายเดือน | ผูกกับ monthly report และ objective |
| `KPICorrectiveAction` | corrective action ของ objective ที่ไม่ผ่าน | ผูกกับ monthly detail |
| `ApprovalSignature` | ลายเซ็นและ action ของ workflow | ใช้ร่วมกับ module `KPI` และ `KPI_MONTHLY` |

สถานะหลัก:

| Entity | Enum | Status |
| --- | --- | --- |
| KPI Objective workflow | `KpiObjectiveStatus` | `DRAFT`, `PENDING_REVIEW`, `APPROVED`, `REJECTED` |
| Monthly report workflow | `MonthlyStatus` | `DRAFT`, `PENDING_REVIEW`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED` |
| Monthly result | `AchievedStatus` | `PENDING`, `OK`, `NOT_OK` |

## 3. KPI Objective รายปี

### 3.1 เปิดหน้า `/qms/kpi`

Flow:

1. `app/(dashboard)/qms/kpi/page.tsx` อ่าน session ด้วย `auth()`
2. ส่ง `role`, `userId`, `userDepartmentId` เข้า `KpiObjectivesClient`
3. `KpiObjectivesClient` โหลดข้อมูล 2 ชุด:
   - `GET /api/departments`
   - `GET /api/kpi?yearly=<year>&limit=100`
4. UI map KPI เข้ากับ department โดยใช้ชื่อแผนกแบบ lowercase
5. ถ้ามี KPI แล้ว กด row จะไป `/qms/kpi/[kpiId]`
6. ถ้ายังไม่มี KPI และ user มีสิทธิ์ edit จะสร้าง KPI ใหม่ด้วย `POST /api/kpi` แล้ว redirect ไปหน้า detail

สิทธิ์ในหน้านี้:

| Role | เห็นข้อมูล | สร้าง KPI |
| --- | --- | --- |
| `IT`, `QMS`, `MR` | เห็นทุก department | ได้ |
| `USER` | เห็นเฉพาะ department ตัวเอง | ไม่ได้จาก UI ถ้าไม่มีสิทธิ์ edit |

หมายเหตุ: การสร้าง KPI จาก UI ใช้ payload auto-create ที่อนุญาตให้ `prepare`, `reviewer`, `approver` เป็นค่าว่างได้ ผ่าน `autoCreateKpiSchema`

### 3.2 สร้าง KPI master

Route:

```text
POST /api/kpi
```

ลำดับ logic:

1. Route เรียก `requireAuth()`
2. Validate body ด้วย `autoCreateKpiSchema`
3. เรียก `KpiService.createKpi()`
4. Service ตรวจ duplicate ด้วย `KpiRepository.findByDepartmentYear(department, yearly)`
5. ถ้ามีอยู่แล้ว throw `ConflictError`
6. ถ้าไม่ซ้ำ สร้าง record ใน `kpis`

เงื่อนไขสำคัญ:

- KPI 1 department ต่อ 1 ปี ห้ามซ้ำ
- สถานะเริ่มต้นจาก Prisma คือ `DRAFT`

### 3.3 เปิดหน้า detail `/qms/kpi/[kpiId]`

Flow:

1. `app/(dashboard)/qms/kpi/[departmentId]/page.tsx` รับ param ชื่อ `departmentId` แต่ค่าจริงคือ `kpiId`
2. ส่ง `kpiId` และ `role` เข้า `KpiDepartmentDetailClient`
3. Client โหลด KPI ด้วย `useKpiById(kpiId)`
4. Hook เรียก `GET /api/kpi/[id]`
5. Service เรียก `findByIdWithRelations()` เพื่อโหลด:
   - KPI master
   - objectives
   - monthlyReports
   - approvalSignatures
   - reviewer/approver user

### 3.4 เพิ่ม/แก้ไข/ลบ objective

UI action:

| Action | Hook | API |
| --- | --- | --- |
| เพิ่ม objective | `useAddObjective()` | `POST /api/kpi/[id]/objectives` |
| แก้ objective | `useUpdateObjective()` | `PATCH /api/kpi/[id]/objectives/[objectiveId]` |
| ลบ objective | `useDeleteObjective()` | `DELETE /api/kpi/[id]/objectives/[objectiveId]` |

สิทธิ์ใน UI:

| Role | เงื่อนไข edit objective |
| --- | --- |
| `IT`, `QMS`, `MR` | edit ได้ทุกสถานะ |
| `USER` | edit ได้เฉพาะ `DRAFT` หรือ `REJECTED` |

Business rule ฝั่ง service:

- `addObjective()` ตรวจว่ามี KPI อยู่จริงก่อน
- `updateObjective()` ตรวจว่า objective มีอยู่จริง
- `deleteObjective()` ตรวจว่า objective มีอยู่จริง และห้ามลบถ้ามี monthly detail แล้ว

หมายเหตุเชิง architecture: permission lock ส่วนใหญ่ enforce ที่ UI เป็นหลัก ส่วน service ตรวจ existence/relationship เป็นหลัก

### 3.5 Submit KPI objective

ปุ่ม Submit ใน `KpiDepartmentDetailClient` ทำงาน 2 ขั้น:

1. เปิด `KpiSignatureDialog` เพื่อรับลายเซ็น preparer
2. เปิด `KpiObjectiveAssignDialog` เพื่อเลือก reviewer และ approver

จากนั้นเรียก:

```text
POST /api/kpi/[id]/submit
```

ลำดับ logic ใน `KpiService.submitObjectives()`:

1. โหลด KPI พร้อม objectives
2. ถ้าไม่พบ KPI throw `NotFoundError`
3. ถ้าไม่มี objective throw `ConflictError`
4. โหลด user ผู้ submit เพื่อ resolve ชื่อ preparer
5. เปิด transaction
6. อัปเดต KPI:
   - `status = PENDING_REVIEW`
   - `prepareSignature`
   - `reviewerUserId`
   - `approverUserId`
   - `submittedAt`
   - `prepare`
7. ลบ approval signatures เดิมของ module `KPI`
8. สร้าง/อัปเดต signatures:
   - `PREPARER = APPROVED`
   - `REVIEWER = PENDING`
   - `APPROVER = PENDING`
9. Route ส่ง email ไปหา reviewer

State หลัง submit:

```text
DRAFT / REJECTED -> PENDING_REVIEW
```

### 3.6 Review KPI objective

Route:

```text
POST /api/kpi/[id]/review
```

ลำดับ logic ใน `KpiService.reviewObjectives()`:

1. โหลด KPI
2. KPI ต้องอยู่สถานะ `PENDING_REVIEW`
3. `actor.userId` ต้องตรงกับ `reviewerUserId`
4. เปิด transaction
5. อัปเดต signature step `REVIEWER = APPROVED`
6. ถ้ามี `saveSignature` จะบันทึกลายเซ็นไว้ที่ user
7. Route ส่ง email ไปหา approver

ข้อสำคัญ: หลัง reviewer approve แล้ว status ของ KPI ยังเป็น `PENDING_REVIEW` อยู่ ไม่ได้เปลี่ยนเป็น `PENDING_APPROVAL` เพราะ enum ของ KPI objective ไม่มีสถานะ `PENDING_APPROVAL` ระบบจึงใช้ `ApprovalSignature` เป็นตัวบอกว่า reviewer ผ่านแล้วหรือยัง

### 3.7 Approve KPI objective

Route:

```text
POST /api/kpi/[id]/approve
```

ลำดับ logic ใน `KpiService.approveObjectives()`:

1. โหลด KPI
2. KPI ต้องอยู่สถานะ `PENDING_REVIEW`
3. `actor.userId` ต้องตรงกับ `approverUserId`
4. ตรวจ `ApprovalSignature` ว่า step `REVIEWER` ต้องเป็น `APPROVED`
5. เปิด transaction
6. อัปเดต KPI เป็น `APPROVED`
7. อัปเดต signature step `APPROVER = APPROVED`
8. สร้าง KPI monthly report อัตโนมัติ 12 เดือนของปีนั้น
9. สร้าง monthly detail ให้ครบทุก objective ในแต่ละเดือน
10. ส่ง email แจ้งผลไปยัง reviewer/approver

State:

```text
PENDING_REVIEW + reviewer signature approved -> APPROVED
```

ผลลัพธ์หลัง approve:

- ระบบสร้าง `KPIMonthlyReport` เดือน `Jan` ถึง `Dec`
- ทุก report เริ่มต้นเป็น `DRAFT`
- ทุก report มี `KPIMonthlyDetail` ครบตาม objective ของ KPI
- ถ้ามี monthly report/detail บางเดือนอยู่แล้ว ระบบใช้ของเดิมและเติม detail ที่ยังขาด โดยไม่สร้างข้อมูลซ้ำ

### 3.8 Reject KPI objective

Route:

```text
POST /api/kpi/[id]/reject
```

ลำดับ logic:

1. KPI ต้องอยู่สถานะ `PENDING_REVIEW`
2. ผู้ reject ต้องเป็น `reviewerUserId` หรือ `approverUserId`
3. ตั้ง KPI เป็น `REJECTED`
4. บันทึก signature step ที่ reject เป็น `REJECTED`

State:

```text
PENDING_REVIEW -> REJECTED
```

## 4. KPI Monthly Report

### 4.1 เปิดหน้า `/qms/kpi/monthly`

Flow:

1. `app/(dashboard)/qms/kpi/monthly/page.tsx` อ่าน session และส่ง `userRole` เข้า `KpiMonthlyClient`
2. `KpiMonthlyClient` ใช้ URL filter keys:
   - `mKpi`
   - `mYear`
   - `mMonth`
   - `mDept`
   - `mStatus`
   - `mPage`
   - `mReport`
3. โหลด KPI list ด้วย `useKpiList({ yearly: year })`
4. เลือก KPI จาก `mKpi` หรือใช้ KPI ตัวแรกใน list
5. โหลด monthly reports ด้วย `useKpiMonthlyList(selectedKpiId, query)`
6. กด row จะเปิด `KpiMonthlyDetailDrawer`

### 4.2 สร้าง monthly report

Route:

```text
POST /api/kpi/[id]/monthly
```

ลำดับ logic ใน `KpiMonthlyService.createMonthlyReport()`:

1. ตรวจ unique ด้วย `findByCompositeKey(kpiId, month, year)`
2. ถ้ามี report เดือน/ปีนี้แล้ว throw `ConflictError`
3. โหลด objectives ของ KPI
4. เปิด transaction
5. สร้าง `KPIMonthlyReport`
6. loop objectives ทั้งหมด แล้วสร้าง `KPIMonthlyDetail` ให้ objective ละ 1 row
7. return report พร้อม details

ผลลัพธ์:

- report ใหม่เริ่มที่ `DRAFT`
- detail ทุกตัวเริ่มที่ `actualResult = null`, `achievedStatus = PENDING`
- report รองรับ `remark` และไฟล์แนบระดับเดือน 1 ไฟล์ พร้อม metadata ของ SharePoint

### 4.3 กรอก actual result

Route:

```text
PATCH /api/kpi/[id]/monthly/[reportId]/details/[detailId]
```

ลำดับ logic ใน `KpiMonthlyService.updateDetail()`:

1. โหลด monthly detail พร้อม report และ objective
2. แก้ไขได้เฉพาะ report สถานะ `DRAFT` หรือ `REJECTED`
3. ถ้า `actualResult` มีค่า:
   - เรียก `autoSetAchievedStatus(detailId, target, actualResult)`
   - ถ้า `actualResult >= target` ได้ `OK`
   - ถ้า `actualResult < target` ได้ `NOT_OK`
4. ถ้า `actualResult = null` จะตั้ง `achievedStatus = PENDING`

สูตรตัดสินผลปัจจุบัน:

```text
actualResult >= target -> OK
actualResult < target  -> NOT_OK
actualResult is null   -> PENDING
```

### 4.4 Submit monthly report

Route:

```text
POST /api/kpi/[id]/monthly/[reportId]/submit
```

ลำดับ logic ใน `KpiMonthlyService.submitReport()`:

1. โหลด report
2. ตรวจ state transition ด้วย `ensureMonthlyStatusTransition(current, PENDING_REVIEW)`
3. เปิด transaction
4. อัปเดต report:
   - `status = PENDING_REVIEW`
   - `prepareBy = actor.userId`
   - `submittedAt = now`
5. ลบ approval signatures เดิมของ module `KPI_MONTHLY`
6. สร้าง signature:
   - `PREPARER = APPROVED`
   - `APPROVER = PENDING` ถ้า KPI มี `approverUserId`
7. Route ส่ง email ไปหา approver ของ KPI

State:

```text
DRAFT -> PENDING_REVIEW
REJECTED -> PENDING_REVIEW
```

### 4.5 Review monthly report

Route:

```text
POST /api/kpi/[id]/monthly/[reportId]/review
```

ลำดับ logic ใน `KpiMonthlyService.reviewReport()`:

1. role ต้องเป็น `QMS`, `MR`, หรือ `IT`
2. โหลด report
3. ตรวจ transition `PENDING_REVIEW -> PENDING_APPROVAL`
4. เปิด transaction
5. อัปเดต report:
   - `status = PENDING_APPROVAL`
   - `reviewBy = actor.userId`
6. บันทึก signature `REVIEWER = APPROVED`
7. ถ้า user เลือก save signature จะบันทึก signature ไว้ที่ user

State:

```text
PENDING_REVIEW -> PENDING_APPROVAL
```

### 4.6 Approve monthly report

Route:

```text
POST /api/kpi/[id]/monthly/[reportId]/approve
```

ลำดับ logic ใน `KpiMonthlyService.approveReport()`:

1. role ต้องเป็น `QMS`, `MR`, หรือ `IT`
2. โหลด report
3. ตรวจ transition `PENDING_APPROVAL -> APPROVED`
4. เปิด transaction
5. อัปเดต report:
   - `status = APPROVED`
   - `approveBy = actor.userId`
   - `approvedAt = now`
6. บันทึก signature `APPROVER = APPROVED`
7. ส่ง email แจ้งผลไปยัง preparer

State:

```text
PENDING_APPROVAL -> APPROVED
```

### 4.7 Reject monthly report

Route:

```text
POST /api/kpi/[id]/monthly/[reportId]/reject
```

ลำดับ logic ใน `KpiMonthlyService.rejectReport()`:

1. role ต้องเป็น `QMS`, `MR`, หรือ `IT`
2. ต้องระบุ `reason`
3. report สถานะ `DRAFT` หรือ `APPROVED` reject ไม่ได้
4. ตรวจ transition ไป `REJECTED`
5. ตั้ง report เป็น `REJECTED`
6. บันทึก signature `APPROVER = REJECTED` พร้อม comment เป็น reason
7. ส่ง email แจ้งผลไปยัง preparer

State:

```text
PENDING_REVIEW -> REJECTED
PENDING_APPROVAL -> REJECTED
```

หลัง reject แล้ว สามารถแก้ไข actual result ได้ เพราะ `updateDetail()` อนุญาต `REJECTED`

## 5. Monthly State Machine

ไฟล์ `lib/kpi-state-machine.ts` กำหนด transition สำหรับ monthly report:

```text
DRAFT            -> PENDING_REVIEW
PENDING_REVIEW   -> PENDING_APPROVAL, REJECTED
PENDING_APPROVAL -> APPROVED, REJECTED
APPROVED         -> ไม่มี transition
REJECTED         -> DRAFT
```

แต่ใน service ปัจจุบัน:

- `submitReport()` ใช้ transition ไป `PENDING_REVIEW`
- `reviewReport()` ใช้ transition ไป `PENDING_APPROVAL`
- `approveReport()` ใช้ transition ไป `APPROVED`
- `rejectReport()` ใช้ transition ไป `REJECTED`

ข้อสังเกต: state machine อนุญาต `REJECTED -> DRAFT` แต่ยังไม่เห็น route/service function ที่เปลี่ยน monthly report จาก `REJECTED` กลับเป็น `DRAFT` โดยตรง ใน flow ปัจจุบันการ submit ซ้ำจาก `REJECTED` จะพยายามไป `PENDING_REVIEW`

## 6. Monthly Remark และ Attachment

Monthly report แต่ละเดือนสามารถบันทึกหมายเหตุและไฟล์แนบได้

Route:

```text
PATCH /api/kpi/[id]/monthly/[reportId]
POST  /api/kpi/[id]/monthly/[reportId]/attachment
```

Business rule:

1. `USER` แก้หมายเหตุและอัปโหลดไฟล์ได้เมื่อ report เป็น `DRAFT` หรือ `REJECTED`
2. `IT`, `QMS`, `MR` แก้ได้เมื่อ report ยังไม่เป็น `APPROVED`
3. ไฟล์แนบถูก validate ประเภทไฟล์และขนาดด้วย `lib/fileValidation.ts`
4. ไฟล์ถูกจัดเก็บใน SharePoint path `KPI Monthly/<department>/<year>/<month>`
5. metadata ไฟล์ถูกเก็บที่ `KPIMonthlyReport`

## 7. Corrective Action

Corrective action ใช้กับ monthly detail ที่ผลเป็น `NOT_OK`

Route:

```text
GET  /api/kpi/[id]/monthly/[reportId]/details/[detailId]/corrective-actions
POST /api/kpi/[id]/monthly/[reportId]/details/[detailId]/corrective-actions
```

Business rule ใน `KpiMonthlyService.addCorrectiveAction()`:

1. โหลด monthly detail
2. ถ้าไม่พบ detail throw `NotFoundError`
3. ถ้า `achievedStatus !== NOT_OK` throw `ConflictError`
4. สร้าง corrective action

ข้อมูล corrective action:

- `times`
- `rootCause`
- `guidelines`
- `responsiblePerson`
- `dueDate`

## 8. Permission Logic สรุป

### 8.1 Objective workflow

| ส่วน | USER | IT/QMS/MR |
| --- | --- | --- |
| เห็น KPI list | เฉพาะ department ตัวเองจาก UI | ทุก department |
| สร้าง KPI จากหน้า list | ไม่ได้จาก UI | ได้ |
| เพิ่ม/แก้/ลบ objective | ได้เมื่อ KPI เป็น `DRAFT` หรือ `REJECTED` | ได้ทุกสถานะจาก UI |
| Submit objective | ได้เมื่อมี objective และยังแก้ไขได้ | ได้จาก UI เมื่อมี objective |
| Review objective | ต้องเป็น `reviewerUserId` | ต้องเป็น `reviewerUserId` |
| Approve objective | ต้องเป็น `approverUserId` และ reviewer ต้อง approve แล้ว | ต้องเป็น `approverUserId` และ reviewer ต้อง approve แล้ว |
| Reject objective | ต้องเป็น reviewer หรือ approver ที่ถูก assign | ต้องเป็น reviewer หรือ approver ที่ถูก assign |

### 8.2 Monthly workflow

| ส่วน | USER | IT/QMS/MR |
| --- | --- | --- |
| แก้ actual result | ได้เมื่อ report เป็น `DRAFT` หรือ `REJECTED` | ได้เมื่อไม่ใช่ `APPROVED` จาก UI |
| Submit report | ได้เมื่อ report editable | ได้เมื่อ `DRAFT` หรือ `REJECTED` จาก UI |
| แก้ remark/upload file | ได้เมื่อ `DRAFT` หรือ `REJECTED` | ได้เมื่อยังไม่ `APPROVED` |
| Review report | ไม่ได้ | ได้เมื่อ `PENDING_REVIEW` |
| Approve report | ไม่ได้ | ได้เมื่อ `PENDING_APPROVAL` |
| Reject report | ไม่ได้ | ได้เมื่อ `PENDING_REVIEW` หรือ `PENDING_APPROVAL` |

## 9. End-to-End Flow

### 9.1 KPI Objective รายปี

```text
เลือกปี/แผนก
  -> ถ้ายังไม่มี KPI และมีสิทธิ์ สร้าง KPI master
  -> เข้า detail
  -> เพิ่ม objectives
  -> กด Submit
  -> ลงลายเซ็น preparer
  -> เลือก reviewer และ approver
  -> KPI.status = PENDING_REVIEW
  -> reviewer approve
  -> reviewer signature = APPROVED
  -> approver approve
  -> KPI.status = APPROVED
  -> สร้าง KPI Monthly 12 เดือนเป็น DRAFT พร้อม details ครบทุก objective
```

Reject path:

```text
PENDING_REVIEW
  -> reviewer หรือ approver reject
  -> KPI.status = REJECTED
  -> USER สามารถแก้ objective แล้ว submit ใหม่ได้
```

### 9.2 KPI Monthly Report

```text
เลือก KPI / ปี / เดือน
  -> สร้าง monthly report
  -> ระบบสร้าง monthly details ตาม objectives ทั้งหมด
  -> กรอก actual result
  -> เพิ่มหมายเหตุ/อัปโหลดไฟล์แนบของเดือนนั้นถ้ามี
  -> ระบบคำนวณ OK / NOT_OK / PENDING
  -> Submit
  -> PENDING_REVIEW
  -> QMS/MR/IT review
  -> PENDING_APPROVAL
  -> QMS/MR/IT approve
  -> APPROVED
```

Reject path:

```text
PENDING_REVIEW หรือ PENDING_APPROVAL
  -> QMS/MR/IT reject พร้อม reason
  -> REJECTED
  -> แก้ actual result ได้
```

## 10. จุดที่ควรรู้ก่อนแก้โค้ด

1. KPI objective ไม่มีสถานะ `PENDING_APPROVAL`; ระบบใช้ `PENDING_REVIEW` ค้างไว้ และแยกว่าไปถึงขั้น approver หรือยังด้วย `ApprovalSignature.REVIEWER = APPROVED`
2. Monthly workflow มี state machine ชัดเจนกว่า objective workflow เพราะมี `PENDING_APPROVAL`
3. Monthly actual result ใช้ rule แบบ `actual >= target` เสมอ ถ้า KPI บางตัวควรเป็น “ยิ่งน้อยยิ่งดี” จะยังรองรับไม่ได้โดยตรง
4. หลัง approve KPI ระบบสร้าง monthly report 12 เดือนและ snapshot objectives ผ่าน `KPIMonthlyDetail`; objective ที่เพิ่มภายหลังจะไม่ถูกเพิ่มใน report เดือนเดิมอัตโนมัติ
5. การลบ objective ถูก block ถ้ามี monthly detail แล้ว เพื่อป้องกัน report history เสีย
6. Permission บางส่วนอยู่ใน UI และบางส่วนอยู่ใน service ถ้าต้องการ harden security ควรย้าย rule สำคัญไป enforce ที่ service เพิ่มเติม
7. `app/(dashboard)/qms/kpi/[departmentId]/page.tsx` ใช้ชื่อ param ว่า `departmentId` แต่ส่งต่อเป็น `kpiId` จริง อาจทำให้สับสนเวลา maintain
