# ANNOUNCEMENTS API

Base path: `/api/announcements`

---

## Endpoints

### GET /api/announcements
ดึงรายการประกาศทั้งหมด

- **Auth:** QMS / IT / MR
- **Cache:** Redis 60s
- **Response:** `AnnouncementRow[]`

```json
[
  {
    "id": "uuid",
    "title": "string",
    "content": "string",
    "sourceSystem": "QMS",
    "displayType": "LIST",
    "pushToCompanyCenter": false,
    "status": "ACTIVE",
    "startDate": "2026-06-01T00:00:00Z",
    "endDate": null,
    "bgColor": "#0F1059",
    "textColor": "#ffffff",
    "createdAt": "2026-06-01T00:00:00Z",
    "createdBy": { "name": "John Doe" }
  }
]
```

---

### POST /api/announcements
สร้างประกาศใหม่ (FormData)

- **Auth:** QMS / IT / MR
- **Body:** `multipart/form-data`

| Field | Required | หมายเหตุ |
|-------|----------|---------|
| `title` | ✅ | |
| `content` | ✅ | |
| `sourceSystem` | | default: `QMS` |
| `displayType` | | LIST / SCROLLING / BANNER |
| `pushToCompanyCenter` | | `"true"` / `"false"` |
| `startDate` / `endDate` | | ISO string |
| `bgColor` / `textColor` | | Hex color |
| `bgImageUrl` / `bgImageSpId` | | SharePoint image |
| `spItemId` / `spWebUrl` / `spDownloadUrl` | | SharePoint attachment |
| `fileName` / `mimeType` | | ไฟล์แนบ |

- **Response 201:** `{ "id": "uuid" }`
- **Side-effect:** Invalidate Redis cache

---

### GET /api/announcements/[id]
ดึงประกาศรายการเดียว

- **Auth:** QMS / IT / MR
- **Response:** `AnnouncementRow`

---

### PUT /api/announcements/[id]
แก้ไขประกาศ

- **Auth:** QMS / IT / MR
- **Body:** JSON

```json
{
  "title": "string",
  "content": "string",
  "sourceSystem": "QMS",
  "displayType": "LIST",
  "pushToCompanyCenter": false,
  "startDate": null,
  "endDate": null,
  "bgColor": null,
  "textColor": null
}
```

- **Response:** `{ "id": "uuid" }`
- **Side-effect:** Invalidate Redis cache

---

### PATCH /api/announcements/[id]
Toggle Active / Inactive

- **Auth:** QMS / IT / MR
- **Body:** `{ "active": true | false }`
- **Response:** `{ "id": "uuid" }`
- **Side-effect:** Invalidate Redis cache

---

### DELETE /api/announcements/[id]
ลบประกาศ

- **Auth:** QMS / IT / MR
- **Response:** `{ "id": "uuid" }`
- **Side-effect:** Invalidate Redis cache

---

### GET /api/announcements/ticker
ดึงประกาศสำหรับ Ticker bar (ข่าววิ่ง)

- **Auth:** ต้อง login (requireAuth)
- **Query:** กรอง status=ACTIVE, displayType=SCROLLING, expiryDate > now(), limit 20
- **Response:** ข้อมูลประกาศสำหรับแสดง Ticker
