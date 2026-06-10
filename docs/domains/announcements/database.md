# ANNOUNCEMENTS Database

---

## Table: `Announcement`

| Column | Type | Constraint | หมายเหตุ |
|--------|------|-----------|---------|
| `id` | UUID | PK | auto-generated |
| `sourceSystem` | String | | QMS / IT / HR / GA / SAFETY |
| `title` | String | | หัวเรื่อง |
| `content` | String | | Rich-text HTML |
| `displayType` | Enum | | LIST / SCROLLING / BANNER |
| `pushToCompanyCenter` | Boolean | default false | |
| `expiryDate` | DateTime? | | auto-set 7 วัน สำหรับ SCROLLING |
| `startDate` | DateTime? | | วันเริ่มแสดง |
| `endDate` | DateTime? | | วันหยุดแสดง |
| `spItemId` | String? | | SharePoint Item ID |
| `spWebUrl` | String? | | SharePoint Web URL |
| `spDownloadUrl` | String? | | SharePoint Download URL |
| `fileName` | String? | | ชื่อไฟล์แนบ |
| `mimeType` | String? | | MIME type ไฟล์แนบ |
| `bgColor` | String? | | Hex color (#xxxxxx) |
| `bgImageUrl` | String? | | URL รูปพื้นหลัง |
| `bgImageSpId` | String? | | SharePoint ID รูปพื้นหลัง |
| `textColor` | String? | | Hex color ตัวอักษร |
| `status` | String | default "ACTIVE" | ACTIVE / INACTIVE |
| `createdById` | String | FK → User | |
| `createdAt` | DateTime | default now() | |
| `updatedAt` | DateTime | auto-update | |

---

## Relations

```
Announcement ──── createdBy ──→ User
```

---

## Enum: `DisplayType`

```prisma
enum DisplayType {
  LIST
  SCROLLING
  BANNER
}
```

---

## Notes

- Ticker query: `status = ACTIVE AND displayType = SCROLLING AND expiryDate > now()` limit 20
- SCROLLING ที่ไม่ระบุ endDate จะ auto-set `expiryDate = createdAt + 7 days`
