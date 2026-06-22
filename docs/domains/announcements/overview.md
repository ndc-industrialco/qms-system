# ANNOUNCEMENTS Domain Overview

**Purpose:** จัดการประกาศภายในองค์กร — สร้าง แก้ไข ลบ และแสดงประกาศในรูปแบบต่างๆ  
**Status:** COMPLETED

---

## Roles & Permissions

| Role | สิทธิ์ |
|------|--------|
| QMS / IT / MR | สร้าง / แก้ไข / ลบ / Toggle Active ประกาศทุกรายการ |
| USER | อ่านอย่างเดียว (ผ่าน Ticker endpoint) |

---

## Display Types

| Type | ความหมาย | Auto-expiry |
|------|----------|-------------|
| `LIST` | แสดงในหน้า Announcement Feed | ตามที่กำหนด |
| `SCROLLING` | ข่าววิ่ง (Ticker bar) บน Dashboard | 7 วันหลังสร้าง (ถ้าไม่ระบุ endDate) |
| `BANNER` | Banner ขนาดใหญ่ | ตามที่กำหนด |

---

## Status Values

| Status | ความหมาย |
|--------|----------|
| `ACTIVE` | แสดงผล (ผู้ใช้เห็น) |
| `INACTIVE` | ซ่อน (ผู้ใช้ไม่เห็น) |

---

## Data Model (Announcement)

| Field | Type | หมายเหตุ |
|-------|------|---------|
| `id` | UUID | Primary key |
| `sourceSystem` | String | QMS / IT / HR / GA / SAFETY |
| `title` | String | หัวเรื่อง |
| `content` | String | เนื้อหา (Rich-text HTML) |
| `displayType` | Enum | LIST / SCROLLING / BANNER |
| `pushToCompanyCenter` | Boolean | แสดงบน Company Center |
| `startDate` / `endDate` | DateTime? | ช่วงเวลาแสดง |
| `expiryDate` | DateTime? | วันหมดอายุ (auto-set 7 วันสำหรับ SCROLLING) |
| `spItemId` / `spWebUrl` | String? | SharePoint attachment |
| `fileName` / `mimeType` | String? | ไฟล์แนบ |
| `bgColor` / `textColor` | String? | สีพื้นหลัง / สีตัวอักษร |
| `bgImageUrl` / `bgImageSpId` | String? | รูปพื้นหลัง (SharePoint) |
| `status` | String | ACTIVE / INACTIVE |
| `createdById` | String | FK → User |

---

## Caching

- List ถูก cache ใน **Redis** key `qms:announcements:list` TTL **60 วินาที**
- Cache invalidate อัตโนมัติเมื่อ create / update / delete / toggle

---

## Email Notification on Publish

- `POST /api/announcements` รับ `emailGroupMails[]` (จาก `GraphGroupPicker`)
- เรียก `sendAnnouncementEmail({ groupEmails, title, content, sourceSystem, senderAccessToken, announcementId })` แบบ fire-and-forget
- ส่งผ่าน MS Graph delegated-auth (`senderAccessToken` จาก session)

---

For detailed specs, see:
- [api.md](./api.md)
- [frontend.md](./frontend.md)
- [database.md](./database.md)
- [task-log.md](./task-log.md)
