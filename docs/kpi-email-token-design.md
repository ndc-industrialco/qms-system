# Email Action Token Design

## คำถามหลัก: ควรใช้ Token กับทุก Approve หรือเฉพาะ KPI?

**คำตอบ: ใช้กับทุก module** แต่ด้วยเหตุผลต่างกัน และ expiry ต่างกัน

---

## ปัญหาที่ต้องการแก้

URL ปัจจุบันใน email:

```
/approve/[kpiId]/reviewer?type=kpi           ← URL คาดเดาได้
/approve/[kpiId]/approver?type=kpi
/approve/[reportId]/approver?type=kpi-monthly&kpiId=[kpiId]
/dar/[darId]                                 ← ไม่มี expiry เลย
```

ปัญหาร่วมกันทุก module:
1. **URL ไม่มี expiry** — link ใน inbox อยู่ตลอดไป
2. **URL คาดเดาได้** — ใครรู้ ID สามารถลองเข้าได้
3. **Revoke ไม่ได้** — เมื่อสถานะ document เปลี่ยน link เก่ายังใช้งานได้

---

## Module ในระบบและเหตุผลที่ต้องการ Token

| Module | มี Recall/Cancel? | Token ช่วยอะไร |
|---|---|---|
| **KPI Objectives** | ✅ มี recall | revoke link ทันทีเมื่อ recall |
| **KPI Monthly** | ❌ ไม่มี | expiry + security |
| **DAR** | ⚠️ มี CANCELLED status (ยังไม่ implement route) | รองรับอนาคต + security |

แม้ DAR จะยังไม่มี cancel route ในปัจจุบัน การวาง token ตั้งแต่ตอนนี้ทำให้เมื่อ implement cancel ในอนาคตสามารถ revoke ได้ทันที โดยไม่ต้องแก้ email flow ใหม่

---

## Token ไม่ใช่ Gate เดียว — สำคัญมาก

Token เป็นแค่ **shortcut จาก email ไปหน้า action** เท่านั้น

- ผู้ใช้ **ยังสามารถ approve ได้** จากหน้า `/approve` list ปกติ
- Token หมดอายุ ≠ ไม่สามารถ approve ได้ แค่กดจาก email ไม่ได้เท่านั้น
- ระบบยังตรวจ session + role + document status เสมอ ไม่ว่าจะมาจาก token หรือไม่

```
Email link (มี token) ──► verify token ──► render approve page
                                                    ↑
/approve list ──────────────────────────────────────┘  (ไม่ผ่าน token)
```

---

## Expiry Duration ที่แนะนำ

| Module | Role | Expiry | เหตุผล |
|---|---|---|---|
| KPI Objectives | reviewer | 7 วัน | review ต้องอ่าน KPI ทั้งชุด ใช้เวลา |
| KPI Objectives | approver | 7 วัน | รอ reviewer ก่อน แล้วค่อย issue |
| KPI Monthly | reviewer | 3 วัน | monthly cycle ต้องรีบ ถ้าเกิน 3 วันยังไม่ approve แปลว่าพลาด email ให้หาจาก list แทน |
| DAR | reviewer | 3 วัน | document control มี SLA |
| DAR | MR approver | 3 วัน | เช่นเดียวกัน |
| DAR | QMS approver | 3 วัน | เช่นเดียวกัน |

> **ทำไม KPI Monthly ถึงสั้นกว่า?**
> เพราะ monthly report มีรอบชัดเจน — ถ้า approver ยังไม่กดหลัง 3 วัน แปลว่าพลาด email ไปแล้ว ควรหาจากหน้า list แทน ไม่ควรให้ link เก่า 7 วันยังใช้งานได้

> **ทำไม KPI Objectives ถึงยาวกว่า?**
> เพราะ reviewer ต้องอ่าน objective ทั้งปีก่อนตัดสินใจ บางคนอ่านใน inbox แล้วรอ review ในวันถัดไปก็เป็นไปได้

---

## ตัวเลือก: JWT vs DB Token

### Option A: JWT (Stateless)

```
/approve?token=eyJhbGciOiJIUzI1NiJ9...
```

```json
{
  "documentId": "...",
  "module": "KPI",
  "role": "reviewer",
  "issuedTo": "userId",
  "exp": 1720000000
}
```

| | |
|---|---|
| ✅ ไม่ต้องเพิ่ม DB table | ❌ Recall ไม่ได้ — token ยังใช้งานได้จนหมดอายุ |
| ✅ verify ไม่ต้อง query DB | ❌ Revoke รายบุคคลไม่ได้ |
| ✅ ง่าย implement | ❌ payload decode ได้ (ถ้าไม่ encrypt) |

เหมาะกับ: module ที่ไม่มี recall และยอมรับว่าถ้า recall แล้วกดลิ้งค์เก่า จะเห็น error "KPI ถูกเรียกคืนแล้ว" จากการตรวจ status ของ document แทน

### Option B: DB Token ✅ แนะนำ

```
/approve?token=a3f8b2c1d4e5f6...  (random 32 bytes hex)
```

```prisma
model ActionToken {
  id         String    @id @default(cuid())
  token      String    @unique
  module     String    // "KPI" | "KPI_MONTHLY" | "DAR"
  documentId String    // kpiId, reportId, darId
  role       String    // "reviewer" | "approver"
  issuedTo   String    // userId
  metadata   Json?     // { kpiId } สำหรับ monthly, { darNo } สำหรับ DAR
  expiresAt  DateTime
  usedAt     DateTime?
  revokedAt  DateTime?
  createdAt  DateTime  @default(now())

  @@index([token])
  @@index([documentId, module])
  @@index([expiresAt])
}
```

| | |
|---|---|
| ✅ Recall revoke ได้ทันที | ❌ ต้องเพิ่ม DB table + migration |
| ✅ Revoke รายบุคคลได้ | ❌ query DB ทุก request |
| ✅ Audit trail ครบ | |
| ✅ Token random ไม่ decode payload ได้ | |

---

## คำแนะนำ: DB Token สำหรับทุก Module

เหตุผล:
- PostgreSQL มีอยู่แล้ว ไม่เพิ่ม infra
- KPI recall ต้องการ revoke ทันที JWT ทำไม่ได้
- DAR มี CANCELLED status รอ implement — วาง token ไว้ล่วงหน้า
- Audit trail: รู้ว่า token ออกเมื่อไหร่ ใครใช้ revoke เมื่อไหร่
- Consistent pattern เดียวทั้งระบบ ไม่สับสน

---

## Flow การทำงาน

### Issue Token (ตอนส่ง email)

```
KPI Submit:
  submitObjectives() → revokeByDocument("KPI", kpiId)   ← revoke token เก่า (กรณี re-submit)
                     → issue({ module:"KPI", documentId:kpiId, role:"reviewer", issuedTo:reviewerUserId, expiresIn:"7d" })
                     → ส่ง email URL: /approve?token=<token>

KPI Monthly Submit:
  submitReport() → issue({ module:"KPI_MONTHLY", documentId:reportId, role:"reviewer", issuedTo:reviewerUserId,
                           metadata:{ kpiId }, expiresIn:"3d" })

DAR Assign Reviewer:
  assignReviewer() → revokeByDocument("DAR", darId)
                   → issue({ module:"DAR", documentId:darId, role:"reviewer", issuedTo:reviewerUserId, expiresIn:"3d" })

DAR Reviewer Approve (ส่งต่อ MR):
  approveStep() → issue({ module:"DAR", documentId:darId, role:"mr-approver", issuedTo:mrUserId, expiresIn:"3d" })
```

### ผู้รับ Email กดปุ่ม

```
GET /approve?token=abc123

server-side:
  ActionTokenService.verify(token)
  ├─ ไม่มีใน DB            → error "ลิงก์ไม่ถูกต้อง"
  ├─ revokedAt != null      → error "รายการนี้ถูกยกเลิกหรือแก้ไขแล้ว กรุณาตรวจสอบ inbox"
  ├─ expiresAt < now()      → error "ลิงก์หมดอายุแล้ว กรุณาไปที่เมนู Approve"
  ├─ issuedTo !== session   → error "ลิงก์นี้ไม่ได้ออกให้คุณ"
  └─ ผ่านทั้งหมด           → redirect /approve/[documentId]/[role]?type=[module]&from=token

  หลัง action สำเร็จ:
  ActionTokenService.markUsed(token)
```

### Recall / Cancel

```
KPI Recall:
  recallKpi() → ActionTokenService.revokeByDocument("KPI", kpiId)
              → ส่ง recall notification email

DAR Cancel (อนาคต):
  cancelDar() → ActionTokenService.revokeByDocument("DAR", darId)
```

---

## Service Interface

```typescript
// services/actionTokenService.ts

type TokenModule = "KPI" | "KPI_MONTHLY" | "DAR"

interface IssueOpts {
  module: TokenModule
  documentId: string
  role: string
  issuedTo: string       // userId
  expiresIn: "3d" | "7d"
  metadata?: Record<string, string>
}

interface VerifiedToken {
  id: string
  module: TokenModule
  documentId: string
  role: string
  issuedTo: string
  metadata: Record<string, string> | null
}

class ActionTokenService {
  static async issue(opts: IssueOpts): Promise<string>
  // throws TokenRevokedError | TokenExpiredError | TokenNotFoundError | TokenOwnerMismatchError
  static async verify(token: string, requestingUserId: string): Promise<VerifiedToken>
  static async markUsed(token: string): Promise<void>
  static async revokeByDocument(module: TokenModule, documentId: string): Promise<void>
  static async cleanupExpired(olderThanDays?: number): Promise<void>  // default 30
}
```

---

## Approve Page Flow

หน้า `/approve` ปัจจุบันแสดง list ของรายการที่รอ action

เพิ่ม logic รับ `?token=`:

```typescript
// app/(dashboard)/(user)/approve/page.tsx

export default async function ApprovePage({ searchParams }) {
  const sp = await searchParams
  const session = await requireAuth()

  if (sp.token) {
    const result = await ActionTokenService.verify(sp.token, session.user.id)
      .catch((err) => ({ error: err.message }))

    if ('error' in result) {
      return <TokenErrorPage message={result.error} />
    }

    // redirect ไป action page ตาม module/role
    const target = resolveActionUrl(result)
    redirect(target)
  }

  return <ApprovePageClient userRole={session.user.role} />
}
```

---

## Cleanup Strategy

ไม่ต้องมี cron เฉพาะ ให้ทำใน existing health check หรือ cron ที่มีอยู่:

```typescript
// ลบ token ที่ expired และ usedAt หรือ revokedAt มีค่า (ไม่ต้องเก็บ)
// ลบ token ที่ expired > 30 วัน (ยังไม่ถูกใช้แต่หมดอายุนานแล้ว)
await ActionTokenService.cleanupExpired(30)
```

Row ที่เก็บไว้ใน DB ต่อ document:
- KPI: max 2 rows (reviewer + approver) ต่อ 1 submission
- KPI Monthly: max 1 row ต่อ report
- DAR: max 3 rows (reviewer + MR + QMS) ต่อ DAR

ปริมาณรวมน้อยมาก ไม่เป็น bottleneck

---

## เปรียบเทียบสรุป

| เกณฑ์ | URL เดิม | JWT | DB Token |
|---|---|---|---|
| Recall invalidate ทันที | ❌ | ❌ | ✅ |
| URL ไม่คาดเดาได้ | ❌ | ✅ | ✅ |
| มี expiry | ❌ | ✅ | ✅ |
| Audit trail | ❌ | ❌ | ✅ |
| Revoke รายบุคคลได้ | ❌ | ❌ | ✅ |
| ไม่ block workflow ถ้าหมดอายุ | ✅ | ✅ | ✅ (ยังเข้า /approve list ได้) |
| ต้องเพิ่ม infra | - | - | ❌ (DB เดิม) |
| ความซับซ้อน | ต่ำ | กลาง | กลาง |

---

## Implementation Order

1. เพิ่ม `ActionToken` model ใน `prisma/schema.prisma`
2. `prisma migrate dev`
3. สร้าง `repositories/actionTokenRepository.ts`
4. สร้าง `services/actionTokenService.ts` + custom errors
5. แก้ `kpiService.submitObjectives()` → issue reviewer token
6. แก้ `kpiService.reviewObjectives()` → issue approver token (ตอน reviewer ผ่าน)
7. แก้ `kpiService.recallKpi()` → revokeByDocument
8. แก้ `kpiService.rejectObjectives()` → revokeByDocument (token เก่าก่อน re-submit)
9. แก้ `kpiMonthlyService.submitReport()` → issue approver token
10. แก้ `darService.assignReviewer()` → issue reviewer token
11. แก้ `darService` approve steps → issue next-step token
12. แก้ `services/email.ts` รับ `actionToken` แทน kpiId/darId สำหรับ action URL
13. แก้ `app/(dashboard)/(user)/approve/page.tsx` → handle `?token=`
14. สร้าง `TokenErrorPage` component สำหรับ error states
