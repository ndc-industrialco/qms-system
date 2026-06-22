# CAR Domain Overview

**Purpose:** Corrective Action Request — จัดการข้อบกพร่อง/ปัญหาที่ไม่สอดคล้อง ตั้งแต่ออก CAR จนถึงปิด CAR พร้อม follow-up tracking  
**Status:** COMPLETED — Backend + Frontend + Redis Reminder Job + In-app notifications complete. Pending: E2E tests only.

---

## Roles & Permissions

| Role | สิทธิ์ |
|------|--------|
| QMS / IT | Create / Read / Update / Delete CAR ทั้งหมด, Issue, Verify, สร้าง Re-CAR |
| MR | ลงนามปิด CAR (ผ่าน Email Token Link) |
| USER | ดู CAR ของแผนกตัวเอง, Respond (ตอบกลับ) |

---

## CAR Number Format

```
C{yy}-{XXX}   เช่น: C25-001, C25-002
```

- `{yy}` = ปี ค.ศ. 2 หลัก
- `{XXX}` = running number 3 หลัก reset ทุกปี
- จัดการผ่าน `carSequenceRepository` + `SystemConfig` (race-condition safe)

---

## CAR Source Types

| Code | ประเภท |
|------|--------|
| `I` | Internal Audit |
| `C` | Customer Complaint |
| `N` | Nonconformity |
| `O` | Other |

---

## ISO Standards (Multi-select)

- ISO 9001:2015
- ISO 14001:2015
- ISO 45001:2018

---

## Status Flow

```
DRAFT
  └─> ISSUED          (ออก CAR → ส่งเมลแผนก)
        └─> RESPONDED      (แผนกตอบกลับภายใน 7 วัน)
              └─> VERIFY_1      (QMS ติดตามครั้งที่ 1)
                    ├─> CLOSED      (ผ่าน → MR ลงนาม)
                    └─> VERIFY_2    (ไม่ผ่าน → กำหนดวันใหม่)
                          ├─> CLOSED   (ผ่าน → MR ลงนาม)
                          └─> RE_CAR   (ไม่ผ่าน → CAR ใหม่)
```

---

## Email Notifications

| เหตุการณ์ | ผู้รับ |
|-----------|--------|
| ออก CAR (ISSUED) | แผนกที่โดน CAR (MS Graph Email Group) |
| Reminder ทุก 3 วัน (ยังไม่ตอบ) | แผนกที่โดน CAR |
| แผนกตอบกลับ (RESPONDED) | MR + QMS |
| ปิด CAR — Verify ผ่าน | MR (รับ token link ลงนาม) |
| Verify 1 ไม่ผ่าน → VERIFY_2 | แผนกที่โดน CAR |
| Re-CAR | แผนกที่โดน CAR (CAR ฉบับใหม่) |

---

## Additional Services

- `carNotificationService.ts` — in-app notifications (ISSUED / RESPONDED / MR_REVIEW / PLAN_APPROVED / PLAN_REJECTED / VERIFY_1_PASS / VERIFY_2_SCHEDULED / CLOSED / RE_CAR / REMINDER) via `NotificationRepository`
- `carReminderService.ts` — Redis scheduler: `schedule(carId)` / `cancel(carId)` / `processAllDue()`. Fires every 3 days while ISSUED; cron endpoint `GET /api/cron/car-reminder` (bearer `CRON_SECRET`).

## Pending Features

- [ ] E2E Tests

---

For detailed specs, see:
- [api.md](./api.md)
- [backend.md](./backend.md)
- [frontend.md](./frontend.md)
- [database.md](./database.md)
- [task-log.md](./task-log.md)
