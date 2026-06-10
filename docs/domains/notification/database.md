# NOTIFICATION Database

---

## Table: `NotificationLog`

| Column | Type | Constraint | หมายเหตุ |
|--------|------|-----------|---------|
| `id` | UUID | PK | |
| `idempotencyKey` | String | UNIQUE | ป้องกัน duplicate send |
| `channel` | String | default "EMAIL" | EMAIL / PUSH |
| `status` | String | default "PENDING" | PENDING / SENT / FAILED |
| `recipient` | String | | email address ผู้รับ |
| `subject` | String | | หัวข้อเมล |
| `errorMessage` | String? | | error message ถ้า FAILED |
| `attempts` | Int | default 0 | จำนวนครั้งที่พยายาม |
| `sentAt` | DateTime? | | timestamp ที่ส่งสำเร็จ |
| `createdAt` | DateTime | default now() | |

---

## Indexes

| Index | Columns | วัตถุประสงค์ |
|-------|---------|------------|
| idx_notif_status | `status` | ค้นหา PENDING / FAILED |
| idx_notif_created | `createdAt` | กรองตามเวลา |
| idx_notif_key | `idempotencyKey` | UNIQUE lookup |

---

## Key Convention

```
{RESOURCE_TYPE}:{resourceId}:{EVENT}:{recipientIdentifier}
```

ตัวอย่าง:
```
KPI:uuid-123:SUBMITTED:reviewer:user-456
CAR:uuid-789:ISSUED:group@company.com
DAR:uuid-abc:APPROVED:approver:user-xyz
```

---

## Notes

- Table นี้เป็น append + update เท่านั้น (ไม่มี hard delete)
- `attempts` increment ทุกครั้งที่ mark sent/failed
- FAILED records สามารถ retry ได้ (status จะถูก update เป็น PENDING ก่อน retry)
