# QMS Implementation Plan

อัปเดตวันที่: 2026-07-02

## Goal

ส่งมอบโครงสร้างงานสำหรับพัฒนา requirement ชุด QMS โดยแบ่งให้ชัดระหว่าง shared platform capability และ module-specific implementation เพื่อลดงานซ้ำและควบคุมมาตรฐานให้เหมือนกันทั้งระบบ

## Delivery Strategy

ลำดับที่เหมาะสมคือ:

1. ยืนยัน business rules และ role mapping
2. ออกแบบ shared data/config model
3. ทำ shared backend capability
4. ทำ shared UI/component capability
5. ค่อยผูกเข้าทีละโมดูล
6. ปิดท้ายด้วย export, email, dashboard, และ regression verification

## Workstreams

## Workstream 1: Requirements Confirmation

### Objective

ล็อก requirement ที่ยังคลุมเครือก่อนเริ่ม implementation จริง

### Tasks

- ยืนยัน role mapping ของ `Reviewer`, `MR`, `Approver`, `QMS`, `Auditor`
- ยืนยันว่า footer config ต้องเก็บอะไรบ้าง:
  - document label
  - prefix
  - footer text
  - module binding
- ยืนยันประเภทไฟล์แนบในแต่ละ email flow
- ยืนยันรูปแบบ export ของแต่ละโมดูล:
  - summary export
  - by-id export
  - PDF / Excel / both
- ยืนยันว่า approval attachment ต้องรองรับเฉพาะบางขั้นหรือทุกขั้น approve/reject

### Output

- approved requirements matrix
- shared feature scope
- per-module exceptions list

## Workstream 2: Shared Configuration Foundation

### Objective

ทำฐานข้อมูลและ setting กลางที่หลายโมดูลเรียกใช้ร่วมกันได้

### Tasks

- ออกแบบ config model สำหรับ document footer naming
- ออกแบบ config model สำหรับ approval routing ต่อโมดูล
- ออกแบบ naming convention ของ document type / prefix / module key
- กำหนด permission ว่าใครแก้ config ได้
- วาง repository/service layer สำหรับอ่าน config กลาง

### Output

- config schema design
- repository/service contract
- admin/QMS ownership boundary

## Workstream 3: Shared Approval Capability

### Objective

ทำ flow อนุมัติร่วมที่รองรับ routing และ attachment upload ได้

### Tasks

- สร้าง approval action pattern สำหรับ `approve/reject`
- เพิ่ม support attachment upload ระหว่าง approve/reject
- กำหนด attachment metadata ที่ต้องเก็บ
- กำหนด validation และ security rules ของไฟล์
- ออกแบบ shared component/dialog สำหรับ approval action
- ออกแบบ shared API/service contract สำหรับ approval attachment

### Output

- shared approval component
- shared approval attachment flow
- module integration checklist

## Workstream 4: Shared Export Architecture

### Objective

แยก export architecture ออกเป็น `summary export` และ `by-id export` อย่างชัดเจน

### Tasks

- ออกแบบ export service แยก 2 mode:
  - summary export
  - by-id export
- กำหนด template ownership ต่อโมดูล
- วาง shared filter contract สำหรับ summary export
- วาง shared PDF generation hooks สำหรับ footer naming
- วาง shared Excel generation rules สำหรับ summary export
- กำหนดไฟล์ naming convention ของ export

### Output

- export architecture blueprint
- template registry per module
- export format decision table

## Workstream 5: Email Attachment Delivery

### Objective

ทำให้ notification/email flow ส่งไฟล์แนบได้อย่างเป็นระบบ

### Tasks

- ระบุ email flow ที่ต้องแนบไฟล์ต่อโมดูล
- แยกประเภท attachment source:
  - uploaded file
  - generated PDF
  - generated Excel
- ออกแบบ mail payload structure สำหรับ multiple attachments
- ตรวจสอบผลกระทบต่อ delegated mail flow เดิม
- กำหนด fallback behavior เมื่อ generate file ไม่สำเร็จ

### Output

- email attachment matrix
- notification integration design
- failure-handling rules

## Workstream 6: Dashboard and Summary Analytics

### Objective

ทำ summary pages ที่มีกราฟ, filter, interaction, และ export ได้

### Tasks

- นิยาม summary data contract ของ DAR, CAR, KPI, KPI-Monthly, Audit
- นิยาม filter set ต่อโมดูล
- เลือก chart patterns ที่ใช้ซ้ำกันได้
- วาง export behavior ของ graph/report
- วางแนวทางเลือก export บางกราฟหรือทั้งชุด

### Output

- analytics requirements matrix
- shared chart/filter pattern
- export-from-summary behavior spec

## Workstream 7: Module Delivery Batches

### Batch A: Foundation-first modules

- DAR
- CAR
- KPI Annual
- KPI Monthly

เหตุผล:

- เป็นกลุ่มที่ใช้ approval, export, footer naming, และ attachment ซ้ำกันมาก

### Batch B: Document and communication modules

- Document Control
- Announcement
- Auditor

เหตุผล:

- เน้น document/report/email behavior มาก

### Batch C: Audit UX and planning

- Audit Plan
- Audit summary/dashboard

เหตุผล:

- มีทั้ง workflow, UX refactor, calendar, availability, และ export template เฉพาะทาง

## Per-Module Implementation Checklist

ทุกโมดูลควรถูกเช็กตามรายการเดียวกัน:

1. ใช้ approval routing config หรือยัง
2. ใช้ footer naming config หรือยัง
3. รองรับ approval attachment หรือยัง
4. มี summary export หรือไม่
5. มี by-id export หรือไม่
6. มี email attachment flow หรือไม่
7. มี dashboard/filter/export summary หรือไม่
8. มี module-specific rule ไหนที่ต้องเติมเพิ่ม

## Recommended Build Order

1. requirement confirmation
2. config schema and service layer
3. footer naming config page
4. approval attachment shared component + API
5. export shared architecture
6. email attachment integration
7. DAR/CAR integration
8. KPI Annual/KPI Monthly integration
9. Document Control integration
10. Announcement/Auditor integration
11. Audit Plan refactor + summary pages
12. final regression, exports, mail, and permissions verification

## Risks

- role mapping ไม่ชัด จะทำให้ approval routing ผิด flow
- shared attachment model อาจไม่พอถ้าแต่ละโมดูลมี field ต่างกันมาก
- export summary กับ by-id export อาจปนกันจนโครงสร้าง service ใช้ซ้ำยาก
- email attachment จะกระทบขนาดไฟล์, mail limits, และ delegated mail behavior
- footer naming ถ้าไม่ออกแบบ key ดีตั้งแต่ต้น จะเกิด config กระจัดกระจาย

## Done Criteria

ถือว่างานเสร็จเมื่อ:

- QMS จัดการ footer naming / prefix จากหน้ากลางได้
- approval flows ที่กำหนดสามารถอัปโหลดไฟล์ตอน approve/reject ได้
- export summary และ export by-id ถูกแยกชัดและทำงานตาม template ที่ต้องการ
- email flows ที่กำหนดสามารถแนบไฟล์ที่เกี่ยวข้องได้
- module integrations ใช้ shared capability ให้มากที่สุด
- verification ผ่านตาม pre-CI pipeline ของ repo

## Suggested Next Artifact

ถ้าจะต่อจากเอกสารนี้ ควรทำเอกสารถัดไป 2 ชิ้น:

1. `docs/qms-requirements-matrix.md`
2. `implement-status/qms-shared-features.md`

ไฟล์แรกใช้ล็อก requirement รายโมดูล

ไฟล์ที่สองใช้ติดตามการลงมือทำจริงเป็น batch
