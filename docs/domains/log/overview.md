# LOG (Audit Log) Domain Overview

**Purpose:** บันทึกทุก action สำคัญในระบบเพื่อ traceability และ compliance  
**Status:** PARTIAL — Backend + Export API complete, UI Viewer ยังไม่ implement (Sprint 4)

---

## Roles & Permissions

| Role | สิทธิ์ |
|------|--------|
| IT | ดู / ค้นหา / Export AuditLog ทั้งหมด |
| อื่นๆ | ไม่มีสิทธิ์เข้าถึงโดยตรง |

---

## Action Types ที่ Track

| Action | เกิดเมื่อ |
|--------|---------|
| `CREATE` | สร้าง resource ใหม่ |
| `UPDATE` | แก้ไข resource |
| `DELETE` | ลบ resource |
| `APPROVE` | อนุมัติ |
| `REJECT` | ปฏิเสธ |
| `RECALL` | เรียกคืน |
| `SUBMIT` | ส่งเพื่อ review/approve |
| `REVIEW` | review |
| `SYNC` | sync ข้อมูลจากภายนอก |
| `EXPORT` | export ข้อมูล |
| `ROLE_CHANGE` | เปลี่ยน role ผู้ใช้ |
| `ISSUE` | ออก CAR |
| `RESPOND` | ตอบกลับ CAR |
| `VERIFY_1` | ติดตาม CAR ครั้งที่ 1 |
| `VERIFY_2` | ติดตาม CAR ครั้งที่ 2 |
| `CLOSE` | ปิด CAR |
| `RE_CAR` | สร้าง Re-CAR |

---

## Resource Types ที่ Track

| ResourceType | Domain |
|-------------|--------|
| `KPI` | KPI Master/Objective |
| `KPI_OBJECTIVE` | KPI Objective |
| `KPI_MONTHLY_REPORT` | KPI Monthly |
| `DAR` | Document Action Request |
| `USER` | User / Role management |
| `DOCUMENT` | Document Control |
| `DOCUMENT_CATEGORY` | Document Category |
| `CAR` | Corrective Action Request |

---

## Data Model

### AuditLog

| Field | Type | หมายเหตุ |
|-------|------|---------|
| `id` | UUID | PK |
| `actorUserId` | String | ผู้กระทำ |
| `actorRole` | String | Role ของผู้กระทำขณะนั้น |
| `action` | String | action type |
| `resourceType` | String | ประเภท resource |
| `resourceId` | String | ID ของ resource |
| `before` | JSON? | snapshot ก่อนเปลี่ยน |
| `after` | JSON? | snapshot หลังเปลี่ยน |
| `metadata` | JSON? | requestId, ip, source ฯลฯ |
| `createdAt` | DateTime | timestamp |

**Indexes:** `(resourceType, resourceId)`, `actorUserId`, `createdAt`, `action`

---

## Usage Pattern

บันทึกภายใน DB transaction เพื่อความ atomic:

```typescript
await db.$transaction(async (tx) => {
  await someRepository.update(id, data, tx);
  await AuditService.record({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: 'UPDATE',
    resourceType: 'DOCUMENT',
    resourceId: id,
    before: oldData,
    after: newData,
  }, tx);
});
```

---

## Pending Features

- [ ] Audit Log Viewer UI (filter / search / แสดง before-after diff)
- [ ] เพิ่ม resourceType สำหรับ Announcement, Audit Module

---

For detailed specs, see:
- [api.md](./api.md)
- [database.md](./database.md)
