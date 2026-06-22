# QMS System — Sprint Feature List

> อ้างอิงจาก source code จริง ณ วันที่ 2026-06-10  
> Lifecycle: Agile Sprint | Status: Done / In Progress / To Do

---

## Sprint 0–2: Foundation + Core Modules + KPI (Done)

### Infrastructure & Auth
- Azure AD App Registration + MS Graph API Permissions
- Ubuntu PostgreSQL + Prisma ORM Schema + Migration
- Portainer Docker Deployment + Cloudflare Tunnel
- Microsoft OAuth2 Login via NextAuth v5 + RBAC (Role: USER / QMS / IT / MR)
- App Shell: Layout, Sidebar, Dashboard Home

### DAR Module (Document Action Request)
- Submit DAR Request (form + attachment via SharePoint)
- Multi-Step Approval Workflow: Preparer → Reviewer → Approver
- Status Tracking + Approval Timeline
- Action Token (DB Token) สำหรับ email approval link

### Admin Module
- User Roles Management (assign/change role)
- Department CRUD
- MS365 User Sync (sync จาก MS Graph)
- Block User Session

### KPI Module
- KPI Master & Objective Setting (Form, Table, Drawer)
- Assign Reviewer ต่อ Objective
- KPI Monthly Reporting (กรอกข้อมูลรายเดือน)
- Monthly Reviewer Assignment Dialog
- ApprovalSignature Table (Preparer → Reviewer → Approver)
- Email Approval Pages: `/approve/[id]/reviewer` และ `/approve/[id]/approver`
- Approval Timeline แสดงผลลำดับการอนุมัติ
- Action Token (DB Token) ใช้สำหรับ email approve/review link

---

## Sprint 3: CAR + Announcement + Document Control (In Progress — Jun 2026)

### Announcement Module (Done)
- สร้างประกาศ (Rich-text, เลือก Background Color)
- แก้ไข / ลบประกาศ
- ดูประกาศ (View Drawer)
- Announcement Feed / Card แสดงบน Dashboard
- Ticker (ข่าววิ่ง) สำหรับประกาศล่าสุด
- Email Notification เมื่อ Publish ประกาศ — `sendAnnouncementEmail()` ส่งผ่าน MS Graph delegated-auth พร้อม `GraphGroupPicker` [DONE]

### Document Control Module (Done — บางส่วน)
- อัปโหลดเอกสาร (SharePoint integration)
- Preview เอกสาร
- ค้นหาเอกสาร (Search)
- Download Log (บันทึกการดาวน์โหลด)
- Category Management (สร้าง/แก้ไข Category)
- Department Folder View (จัดเอกสารตามแผนก)
- Upload Revision (อัปโหลดเวอร์ชันใหม่)
- Document Status Badge
- **[Pending]** Multi-Level Approval Workflow (Preparer → Reviewer → Approver)
- **[Pending]** Email Notification เมื่อสถานะเอกสารเปลี่ยน

### CAR Module — Corrective Action Request (In Progress)
- ออก CAR: กรอกประเภท (Internal/Customer/Nonconformity/Other), ISO Standard, รายละเอียดข้อบกพร่อง
- CAR Number Format: `C{yy}-{XXX}` (reset ทุกปี)
- เลือก Email Group (MS Graph Group Picker) ของแผนกที่โดน CAR
- Status Flow: `DRAFT → ISSUED → RESPONDED → VERIFY_1 → CLOSED / VERIFY_2 → CLOSED / RE_CAR`
- แผนกตอบกลับ: 5 Why Analysis, Root Cause, แผนแก้ไข, ลงนาม
- QMS ติดตาม Verify ครั้งที่ 1 และ 2
- Re-CAR: สร้าง CAR ใหม่จากของเดิมที่ไม่ผ่าน
- MR Sign-off ปิด CAR
- CAR Timeline แสดงประวัติทุกขั้นตอน
- Email Notifications: ออก CAR, ตอบกลับ, ปิด CAR, Re-CAR
- Redis Reminder Job: `carReminderService.ts` + `GET /api/cron/car-reminder` — ส่งเมลซ้ำทุก 3 วัน ขณะ status = ISSUED [DONE]

---

## Sprint 4: Audit Modules (To Do — Jun 15–30, 2026)

### Internal Audit Module
- วางแผนการตรวจ (Audit Plan) + กำหนดวัน (MS Calendar integration)
- บันทึก Findings (ข้อบกพร่องที่พบ)
- เชื่อมโยง Finding → CAR อัตโนมัติ
- E-Signature ลงนามรายงาน
- Export PDF Report

### External Audit Module
- กำหนดการตรวจจากภายนอก (วัน/หน่วยงาน/ขอบเขต)
- บันทึก Findings จากหน่วยงานภายนอก
- Corrective Action Link (เชื่อม Finding → CAR)
- ติดตามและปิด Finding
- Export PDF Report

### E-Signature + Activity Log
- E-Signature ผ่าน Azure AD MFA
- System Activity Log (บันทึกทุก action สำคัญ)
- Audit Log Viewer (กรอง resource type / action / user)
- Export Audit Log (CSV)

---

## Log Module (ย้ายมารวม — ใช้ระบบเดิมที่มีอยู่แล้ว)

> `services/auditService.ts` + `app/api/audit-logs/` มีอยู่แล้ว — Sprint 4 จะเปิด UI Viewer

- **AuditLog**: บันทึกทุก action (CREATE, UPDATE, DELETE, APPROVE, REJECT, SUBMIT, REVIEW, ISSUE, RESPOND, VERIFY_1, VERIFY_2, CLOSE, RE_CAR, ROLE_CHANGE, EXPORT, SYNC)
- **Resource Types ที่ Track**: KPI, KPI_OBJECTIVE, KPI_MONTHLY_REPORT, DAR, USER, DOCUMENT, DOCUMENT_CATEGORY, CAR
- **GET** `/api/audit-logs` — ดึง log พร้อม filter
- **GET** `/api/audit-logs/export` — Export เป็น CSV
- Audit Log Viewer UI: `/it/audit-logs` + `AuditLogTable` — กรอง / ค้นหา [DONE]

---

## Notification Module (ย้ายมารวม — ใช้ระบบเดิมที่มีอยู่แล้ว)

> `services/notificationService.ts` + `services/email.ts` มีอยู่แล้ว

- **Email Engine**: MS Graph sendMail (app-only, ส่งจาก service account)
- **Idempotency**: `sendEmailOnce()` — กัน duplicate email ด้วย idempotency key
- **NotificationLog**: บันทึกทุก email ที่ส่ง (PENDING / SENT / FAILED)
- **Key Convention**: `{RESOURCE_TYPE}:{resourceId}:{EVENT}:{recipientId}`

### Email Events ที่ใช้อยู่แล้ว
| Module | Event | ผู้รับ |
|--------|-------|--------|
| DAR | Submit, Approve, Reject, Recall | Reviewer / Approver |
| KPI | Submit, Review, Approve, Reject | Reviewer / Approver |
| CAR | Issue, Respond, Verify, Close, Re-CAR | แผนก / MR / QMS |

### Email Events ที่ยังต้อง Implement
| Module | Event | ผู้รับ |
|--------|-------|--------|
| Announcement | Publish | ทุกคนในองค์กร (MS Graph group) |
| Document Control | Approval status change | Reviewer / Approver |
| CAR | Reminder ทุก 3 วัน (Redis Job) | แผนกที่โดน CAR |
| Internal Audit | Audit scheduled, Finding added | Auditee / QMS |

---

## Sprint 5: AI RAG Module — Target July 2026 (To Do)

- **pgvector**: ติดตั้ง extension + Prisma migration สำหรับ vector column
- **Embedding Schema**: ตาราง `DocumentEmbedding` (documentId, chunkIndex, content, embedding vector)
- **Ingestion Pipeline**: แตก document เป็น chunk → embed ผ่าน Claude/OpenAI → บันทึกใน PostgreSQL
- **Semantic Search API**: cosine similarity search, top-k retrieval
- **Auto-embed Trigger**: เมื่อ Document ผ่าน Approval Workflow → embed อัตโนมัติ
- **Chat UI**: "Ask QMS Doc Assistant" — Streaming response + Source Citation (ระบุว่ามาจากเอกสารไหน)
- **Re-embed on Revision**: เมื่ออัปโหลดเอกสารเวอร์ชันใหม่ → re-embed แทนอันเดิม

---

## Sprint 6: Hardening & Go-Live — July 20–31, 2026 (To Do)

- Integration Testing ครอบคลุมทุก module
- Bug Fixes จาก UAT
- User Acceptance Testing (UAT) กับผู้ใช้จริง
- Performance Testing (connection limits, SharePoint latency)
- Production Deployment: Docker + Cloudflare Tunnel
- System Handover + User Manual
- Health Check Endpoints: `/api/health`, `/api/health/live`, `/api/health/ready`
