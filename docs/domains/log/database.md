# LOG (Audit Log) Database

---

## Table: `AuditLog`

| Column | Type | Constraint | หมายเหตุ |
|--------|------|-----------|---------|
| `id` | UUID | PK | |
| `actorUserId` | String | | FK → User (no relation constraint) |
| `actorRole` | String | | Role ขณะกระทำ |
| `action` | String | | CREATE / UPDATE / DELETE / APPROVE / ... |
| `resourceType` | String | | KPI / DAR / USER / DOCUMENT / CAR / ... |
| `resourceId` | String | | ID ของ resource |
| `before` | JSON? | | Snapshot ก่อนเปลี่ยน |
| `after` | JSON? | | Snapshot หลังเปลี่ยน |
| `metadata` | JSON? | | requestId, ip, source |
| `createdAt` | DateTime | default now() | |

---

## Indexes

| Index | Columns | วัตถุประสงค์ |
|-------|---------|------------|
| idx_audit_resource | `(resourceType, resourceId)` | ค้นหา log ของ resource เดียว |
| idx_audit_actor | `actorUserId` | ค้นหา log ของผู้ใช้คนเดียว |
| idx_audit_created | `createdAt` | กรองตามช่วงเวลา |
| idx_audit_action | `action` | กรองตาม action type |

---

## Notes

- ไม่มี FK constraint ไปยัง User เพื่อให้ log ยังคงอยู่แม้ลบ User
- `before` / `after` เป็น JSON snapshot ไม่ normalize
- ไม่มี UPDATE / DELETE บน table นี้ — append-only
