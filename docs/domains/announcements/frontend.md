# ANNOUNCEMENTS Frontend

---

## Pages

| Path | Component | หน้าที่ |
|------|-----------|--------|
| `/announcements` | `AnnouncementsTableClient` | รายการประกาศทั้งหมด (QMS/IT/MR) |
| Dashboard | `AnnouncementCard` + Ticker | แสดงประกาศบน Feed และข่าววิ่ง |

---

## Components

### AnnouncementsTableClient
- Table/Card แสดงรายการประกาศ
- เรียก `GET /api/announcements`
- Actions: สร้าง / แก้ไข / ลบ / Toggle Active

### AnnouncementsTable
Columns: Title, System, Type, Date Range, Attachment, Created By, Status, Actions

### AnnouncementCard
Card แสดงประกาศใน Feed
- แสดง: Title (พร้อมสีประกาศ), System badge, Type badge, ช่วงวันที่ (Thai locale), ชื่อผู้สร้าง
- Company Center indicator (ถ้า `pushToCompanyCenter = true`)
- ไฟล์แนบ (link)
- Status toggle (Active/Inactive)
- Buttons: View / Edit / Delete

สีตาม sourceSystem:
| System | สี |
|--------|---|
| QMS | น้ำเงิน |
| IT | ม่วง |
| HR | เขียว |
| GA | ส้ม |
| SAFETY | แดง |

### AnnouncementCreateDrawer
Sheet (slide-out) สำหรับสร้างประกาศ
- Fields: Title, Content, Source System, Display Type, Start/End Date, Push to Company Center, File attachment, Background color picker, Background image picker
- Submit → `POST /api/announcements` (FormData)

### AnnouncementEditDrawer
Sheet สำหรับแก้ไขประกาศ
- Pre-populate จากข้อมูลเดิม
- รองรับ clear background image
- Submit → `PUT /api/announcements/[id]` (JSON)

### AnnouncementViewDrawer
Sheet สำหรับดูรายละเอียดประกาศ (read-only)

### AnnouncementDeleteModal
Dialog ยืนยันการลบ
- Submit → `DELETE /api/announcements/[id]`

### AnnouncementBgPicker
Color picker + Image picker สำหรับเลือกพื้นหลังประกาศ

### NewAnnouncementHeader
Header bar สำหรับหน้า Announcement พร้อมปุ่ม "สร้างประกาศ"

### AnnouncementTableRow
แถวเดียวใน Table — แสดง field พร้อม action buttons

---

## State Management

- ใช้ **TanStack React Query** (`useQuery` + `useMutation`)
- Query key: `["announcements"]`
- Invalidate หลัง create / update / delete / toggle
