# LOG (Audit Log) API

Base path: `/api/audit-logs`

---

## Endpoints

### GET /api/audit-logs
ดึง audit log แบบ paginated + filter

- **Auth:** IT role only
- **Query params:**

| Param | Type | หมายเหตุ |
|-------|------|---------|
| `page` | number | default 1 |
| `limit` | number | max 100, default 50 |
| `action` | string | กรองตาม action type |
| `resourceType` | string | กรองตาม resource type |
| `actorUserId` | string | กรองตามผู้กระทำ |
| `search` | string | text search |
| `from` | date | วันเริ่มต้น |
| `to` | date | วันสิ้นสุด |

- **Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "actorUserId": "uuid",
      "actorRole": "QMS",
      "action": "APPROVE",
      "resourceType": "KPI",
      "resourceId": "uuid",
      "before": {},
      "after": {},
      "metadata": { "ip": "1.2.3.4" },
      "createdAt": "2026-06-10T08:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 1234
  }
}
```

---

### GET /api/audit-logs/export
Export audit log เป็น Excel (.xlsx)

- **Auth:** IT role only
- **Query params:** เหมือนกับ GET /api/audit-logs
- **Response:** Binary XLSX file

**Excel Format:**
| Column | หมายเหตุ |
|--------|---------|
| Date/Time | Bangkok timezone (Asia/Bangkok) |
| Actor Name | ชื่อผู้กระทำ |
| Email | อีเมลผู้กระทำ |
| Role | Role ขณะนั้น |
| Action | action type |
| Resource Type | ประเภท resource |
| Resource ID | ID ของ resource |
| Before | JSON snapshot ก่อนเปลี่ยน |
| After | JSON snapshot หลังเปลี่ยน |

**Formatting:**
- Header row: Dark blue background (#0F1059), white text
- Frozen header row
- Auto-filter enabled
- Thin borders, text wrapping
- Filename: `audit-log-YYYY-MM-DD.xlsx`
