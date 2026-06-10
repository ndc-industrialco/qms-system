# NOTIFICATION API

Notification domain ไม่มี public-facing API endpoints  
การส่งเมลเกิดขึ้นภายใน service layer เท่านั้น

---

## Internal Service Interface

### NotificationService.sendEmailOnce()

```typescript
NotificationService.sendEmailOnce(
  idempotencyKey: string,   // unique key ต่อ event
  sendFn: () => Promise<void>,  // function ที่จะส่งเมล
  recipient: string,        // email ผู้รับ (สำหรับ log)
  subject: string,          // หัวข้อ (สำหรับ log)
): Promise<void>
```

**Flow:**
1. ตรวจ `NotificationLog` ด้วย `idempotencyKey`
2. ถ้า `status = SENT` → return ทันที (skip)
3. ถ้าไม่มี → create log (status = PENDING)
4. เรียก `sendFn()`
5. ถ้าสำเร็จ → `markSent()` (status = SENT, sentAt = now)
6. ถ้าล้มเหลว → `markFailed()` (status = FAILED, errorMessage)

---

## Email Engine: email.ts

### sendMail()
```typescript
sendMail({
  to: [{ name: string, email: string }],
  subject: string,
  bodyHtml: string,
  senderEmail: string,
}): Promise<void>
```

- ใช้ MS Graph API: `POST /v1.0/users/{sender}/sendMail`
- ต้องการ `GRAPH_TOKEN` (app-only, client credentials flow)
- `saveToSentItems: false`

### makeBilingualMail()
สร้าง HTML email template:
```typescript
makeBilingualMail({
  thTitle: string,    // หัวข้อภาษาไทย
  enTitle: string,    // หัวข้อภาษาอังกฤษ
  facts: [{ label: string, value: string }],  // ตาราง key-value
  details?: string,   // รายละเอียดเพิ่มเติม
  ctaUrl?: string,    // URL ปุ่ม action
  ctaLabel?: string,  // ข้อความปุ่ม
}): string
```

---

## MS Graph Permissions ที่ต้องการ

| Permission | วัตถุประสงค์ |
|-----------|------------|
| `Mail.Send` | ส่งเมลจาก service account |
| `User.Read.All` | ดึงข้อมูลผู้ใช้ |
| `Group.Read.All` | ดึงข้อมูล Email Group |
