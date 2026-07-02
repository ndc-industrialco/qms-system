# QMS Update Summary

อัปเดตวันที่: 2026-07-02

## Objective

เอกสารนี้สรุปความเข้าใจจากรายการที่คุยกับแผนก QMS โดยจัดใหม่ให้อยู่ในรูปแบบที่พร้อมใช้ต่อเป็น:

- implementation plan
- task list
- report

## Executive Summary

ความเข้าใจหลักคือ QMS ต้องการยกระดับหลายโมดูลในระบบให้ใช้แนวทางเดียวกันมากขึ้น แทนการแก้ทีละหน้าหรือทีละ flow แบบแยกขาด โดยมีทั้งงาน shared capability และงาน module-specific business rule

งาน shared capability ที่เห็นชัดมี 4 กลุ่ม:

1. document footer naming ที่ QMS ต้องกำหนดได้จากหน้ากลาง
2. approval attachments ที่ reviewer หรือ MR approver ต้องอัปโหลดไฟล์ตอน approve/reject ได้
3. export capability ที่ต้องแยกชัดระหว่าง summary export กับ by-id export
4. email delivery ที่ต้องแนบไฟล์ให้ผู้รับใช้งานต่อได้ทันทีโดยไม่ต้องเข้าระบบ

ดังนั้นแนวทางที่เหมาะคือแยกงานเป็น:

- shared platform features
- module-specific templates and rules

## Shared Requirements

## 1. Document Footer Naming

สิ่งที่เข้าใจ:

- หลายโมดูลต้องมีชื่อเอกสารแสดงที่ footer ด้านล่างขวาของฟอร์ม
- PDF export ของแต่ละโมดูลต้องใช้ชื่อเดียวกันกับฟอร์ม
- QMS ต้องเป็นผู้จัดการค่าเหล่านี้ได้เอง
- หากเหมาะสมควรทำเป็นหน้ากลางสำหรับกำหนด prefix หรือชื่อเอกสารต่อโมดูล แทนการ hardcode แยกในแต่ละแบบฟอร์ม

แนวคิดสถาปัตยกรรม:

- สร้าง master configuration page สำหรับ QMS
- เก็บค่า document label / footer text / prefix ต่อ module หรือ document type
- ทุก form renderer และ PDF template ดึงค่าจาก source เดียวกัน

## 2. Approval Attachment Upload

สิ่งที่เข้าใจ:

- reviewer หรือ MR approver ต้องสามารถอัปโหลดไฟล์ได้ตอน approve/reject
- requirement นี้เกิดซ้ำใน DAR, KPI Annual, KPI Monthly, CAR และ flow ที่คล้ายกัน

แนวคิดสถาปัตยกรรม:

- หาก field structure ใกล้กัน ควรทำเป็น shared component และ shared backend pattern
- เช่น approval action dialog ที่รองรับ:
  - approve/reject decision
  - remark
  - attachment upload
  - existing attachment preview/download

## 3. Export Capability

สิ่งที่เข้าใจ:

export ต้องแยกเป็น 2 ประเภท เพราะเป้าหมายต่างกัน:

- `Export Summary`
  ใช้สำหรับสรุปผลรวม, filter, grouping, dashboard-driven report
- `Export by ID`
  ใช้สำหรับเอกสารรายฉบับ เช่น DAR รายการเดียว, KPI รายปีฉบับเดียว, CAR ฉบับเดียว

ข้อสังเกต:

- summary export และ by-id export ใช้ template ไม่เหมือนกัน
- summary export เน้นตารางรวม, ตัวกรอง, สถิติ, และ aggregation
- by-id export เน้น layout เอกสาร, footer naming, และรูปแบบเฉพาะโมดูล

## 4. Email With Attachments

สิ่งที่เข้าใจ:

- บาง flow ต้องส่งอีเมลพร้อมแนบไฟล์ export หรือไฟล์ที่ผู้ใช้แนบไว้
- เป้าหมายคือให้ผู้รับเปิดใช้งานได้ทันทีโดยไม่ต้องเข้าระบบก่อน

ข้อสังเกต:

- งานนี้จะเกี่ยวข้องกับ notification flow เดิม
- ควรแยกให้ชัดว่าแต่ละโมดูลแนบไฟล์ชนิดใด:
  - uploaded attachment เดิม
  - generated PDF
  - generated Excel
  - หรือทั้งสองแบบร่วมกัน

## Workflow Direction

สิ่งที่เข้าใจเพิ่มจากการคุยก่อนหน้า:

- เดิมบาง flow ต้องเลือก MR หรือ QMS ตอนอนุมัติ
- เป้าหมายใหม่คือให้ส่งต่ออัตโนมัติตามค่าที่ QMS หรือ IT ตั้งไว้
- จึงควรมี approval configuration page หรือ routing config กลาง

ตัวอย่างที่เข้าใจ:

- DAR: `Requester -> Reviewer -> MR -> QMS`
- CAR: `Requester -> Responsible Department Planning -> MR -> QMS`

## Module-Specific Summary

## Announcement

- แนบไฟล์เอกสารได้
- แนบรูปภาพได้
- หน้ารายละเอียดประกาศต้อง preview เอกสารหรือรูปได้
- send mail announcement ต้องแนบไฟล์หรือรูปที่เกี่ยวข้องไปกับอีเมล

## DAR

- export report ทั้งหมดได้
- filter export ตามแผนก, แบบฟอร์ม, วัตถุประสงค์ได้
- QMS ดูข้อมูลแบบกราฟและ interact/filter ได้
- form และ PDF ต้องรองรับ footer document naming
- reviewer หรือ MR approver ต้องอัปโหลดไฟล์ตอน approve/reject ได้

## Document Control

- export master list รายแผนกหรือทั้งหมดได้
- รูปแบบ report ต้องมีคอลัมน์มาตรฐานตาม master list
- การตั้งหมวดหมู่เอกสาร เช่น `FM`, `P`, `SOP` ต้องสัมพันธ์กับ document numbering
- เลขเอกสารใหม่ต้องสร้างแบบ `{หมวดหมู่}-{แผนก}-{running no}`
- สถานะเอกสารมี `ใช้งาน` และ `ยกเลิก`
- เอกสารยกเลิกยังมองเห็นได้ แต่ห้าม preview/download
- revision upload ควร link กับ DAR ได้
- dropdown DAR ควรค้นหา/filter/sort ได้
- ควรมี download audit log ต่อท้าย revision history

## KPI Annual

- การ revise KPI ต้องเข้าสู่ flow review/approval ใหม่
- form และ PDF ต้องรองรับ footer document naming
- QMS ต้องมีขั้นตรวจรวม, เซ็น, ส่ง reviewer/approver เซ็น, รับกลับมาตรวจ แล้วประกาศ
- ตอนประกาศต้องส่งถึงรายชื่อในแต่ละแผนก
- อีเมลประกาศควรแนบ export Excel
- ปีใหม่ต้อง copy ฐานจากปีก่อนเพื่อให้แต่ละแผนกกลับมาแก้ไขและ submit ใหม่
- export Excel ของรายการที่ revision ต้องมี visual emphasis ชัดเจน
- reviewer หรือ MR approver ต้องอัปโหลดไฟล์ตอน approve/reject ได้

## KPI Monthly

- เมื่อ KPI Annual approve แล้ว ระบบสร้าง 12 เดือน
- ถ้ามี revision ระหว่างปี ต้อง generate เฉพาะเดือนที่เหลือ
- form และ PDF ต้องรองรับ footer document naming
- export summary ทุกแผนกแบบรวมรายการได้
- dashboard และ table ต้องแสดงผ่าน/ไม่ผ่าน
- reviewer หรือ MR approver ต้องอัปโหลดไฟล์ตอน approve/reject ได้

## CAR

- ตอนสร้าง CAR ต้องระบุได้ทั้งแผนกหลักและแผนกที่เกี่ยวข้อง
- ISO Standards section 2 ต้องอ้างอิง `qms/audit-standards`
- form และ PDF ต้องรองรับ footer document naming
- reviewer หรือ MR approver ต้องอัปโหลดไฟล์ตอน approve/reject ได้
- export summary CAR ต้องรองรับการ filter ตามปี แผนก สถานะ
- ต้องรองรับ follow-up หลายรอบ และรายงานใกล้ครบกำหนด/เกินกำหนด

## Auditor

- เมื่อ approve ครบทุกขั้น ต้อง export PDF ตาม template ที่กำหนด
- อีเมลแจ้งผลต้องแนบ PDF ดังกล่าว โดยยังใช้ email template เดิม
- form และ PDF ต้องรองรับ footer document naming

## Audit Plan

- ต้อง refactor หน้า `audit/plans/new` และ `audit/plan/[id]`
- ต้องทำให้ภาพรวมชัด ใช้งานง่าย และอยู่ในมาตรฐานระบบ
- ต้องมีปฏิทินแสดงวัน audit รายแผนก
- การยืนยันว่าง/ไม่ว่างต้องจำกัดตาม role ที่เกี่ยวข้อง
- ถ้าไม่ว่างต้องเสนอวันใหม่กลับมาได้
- form และ PDF ต้องรองรับ footer document naming

## Shared vs Specific Breakdown

### Shared platform features

- approval routing / approval configuration
- document footer naming config
- approval attachment upload flow
- export engine orchestration
- email with attachment delivery
- dashboard/filter/export interaction patterns

### Module-specific templates and rules

- DAR filters and form output
- Document Control numbering and cancellation behavior
- KPI annual rollover and revision highlighting
- KPI monthly generation from revised annual KPI
- CAR follow-up round logic and status reporting
- Auditor final PDF email package
- Audit Plan calendar and availability confirmation flow

## Assumptions To Confirm Before Implementation

- role mapping ของ `Reviewer`, `MR`, `Approver`, `QMS`, `Auditor`
- ขอบเขตของ prefix ว่าใช้เฉพาะ footer label หรือรวมถึง document code naming
- email attachment policy ต่อโมดูล ว่าจะแนบไฟล์ประเภทใดบ้าง
- export summary ของแต่ละโมดูลต้องการ format เป็น Excel, PDF หรือทั้งคู่
- shared approval attachment ใช้ data model เดียวกันได้ทุกโมดูลหรือไม่

## Conclusion

คุณเข้าใจ requirement ได้ถูกทิศทางแล้ว โดยเฉพาะประเด็นที่ควรมองเป็น shared features มากกว่าทำแยกโมดูล ได้แก่:

- footer naming config
- approval attachment upload
- export summary vs export by ID
- email with attachments

ส่วนที่เหลือคือแตก implementation ต่อให้ชัดว่าอะไรเป็น platform capability และอะไรเป็น template/business rule เฉพาะโมดูล
