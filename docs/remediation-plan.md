# QMS System Remediation Plan

วันที่: 2026-06-08
อ้างอิง: `docs/agents-rules-project-review.md`

เอกสารนี้เป็น response ต่อ project review โดยยืนยันผลรีวิว วิเคราะห์ความเห็นเพิ่มเติม และเสนอแนวทางแก้ไขเป็นรูปธรรมพร้อม code examples

---

## สรุปการยืนยันผลรีวิว

ได้ cross-verify ทุก finding กับ codebase จริง ผลสรุปดังนี้:

| Finding | ผลยืนยัน | หมายเหตุ |
|---|---|---|
| P1: API guardrail fail + CI ไม่จับ | **ยืนยัน** | `recall/route.ts` ไม่มี body/query จริง ควร allowlist, CI ขาด `check:api` step |
| P1: Audit trail ไม่ครบ | **ยืนยัน** | มีแค่ `ApprovalSignature` สำหรับ approval flow ไม่ครอบคลุม role change/delete/sync |
| P1: Notification ไม่ idempotent | **ยืนยัน** | พบ fire-and-forget ทุกจุดที่รายงาน ไม่มี dedup/outbox |
| P1: DB invariant ขาด unique constraint | **ยืนยัน** | KPI ไม่มี `@@unique([department, yearly])`, DocumentCategory ไม่มี unique ต่อ dept+name |
| P1: ไม่มี automated tests | **ยืนยัน** | ไม่พบ test files, test script, หรือ test framework |
| P2: Direct DB ใน pages | **ยืนยัน** | `app/(dashboard)/page.tsx` import `db` ตรง มี 6+ queries |
| P2: Response envelope ไม่สม่ำเสมอ | **ยืนยัน** | `/it/users/[id]/role`, `/sharepoint/delete-item` ใช้ `{ data, error }` แทน `sendSuccess`/`handleApiError` |
| P2: Health check ไม่แยก live/ready | **ยืนยัน** | degraded ยัง HTTP 200 |
| P2: Logging ไม่สม่ำเสมอ | **ยืนยัน** | 55 console.* ใน 34 ไฟล์ vs 9 logger.* ใน 3 ไฟล์ |
| P2: Integration resilience ไม่ครบ | **ยืนยัน** | `email.ts` ใช้ raw fetch ไม่มี timeout/retry, SharePoint chunk upload เช่นกัน |
| P2: Pagination ไม่ครบ | **ยืนยัน** | IT users endpoint และ DAR `all=true` ไม่มี limit |
| P2: i18n drift | **ยืนยัน** | พบ 137 instances ของ `locale === "th"` hardcoded ใน 19+ components |
| P2: UI primitives | **ยืนยันบางส่วน** | ไม่พบ native `<select>` แล้ว แต่พบ `confirm()` ใน `DarAttachmentUpload.tsx` 1 จุด |
| P3: ไม่มี Prisma migrations | **ยืนยัน** | ใช้ `db push` ไม่มี migration history |
| Lint warnings | **ไม่ยืนยัน** | line numbers ไม่ตรงกับ code ปัจจุบัน อาจแก้แล้วหรือ shift ไปแล้ว |

---

## ความเห็นเพิ่มเติม

### สิ่งที่รีวิวถูกและสำคัญมาก

1. **Audit trail เป็น gap ใหญ่สุด** - ระบบ QMS ที่ต้อง compliance ต้องตอบได้ว่าใครทำอะไรเมื่อไหร่ `ApprovalSignature` ครอบคลุมแค่ approval flow แต่ role change, delete, sync, export ไม่มี trace เลย
2. **DB unique constraint** - เป็น ticking bomb ถ้า concurrent requests เกิดขึ้น application-level check ไม่ atomic
3. **No tests** - สำหรับ enterprise QMS ที่มี state machine หลายชั้น (DAR approve chain, KPI submit/review/approve/reject/recall) ไม่มี test เลยเป็นเรื่องเสี่ยงสูง

### สิ่งที่รีวิวพูดถูกแต่ priority อาจต่างกัน

1. **Notification outbox** - ถูกที่ fire-and-forget เป็นปัญหา แต่ full outbox pattern อาจ over-engineer สำหรับ scale ปัจจุบัน แนะนำเริ่มจาก idempotency key + retry ก่อน
2. **Direct DB in pages** - Next.js server components ที่ query DB ตรงเป็น pattern ที่ Next.js docs แนะนำ ไม่ใช่ anti-pattern เสมอไป แต่ถ้า queries ซับซ้อนควรแยกเป็น data access function
3. **i18n hardcoding** - 137 จุดเยอะ แต่เป็น cosmetic ไม่กระทบ production stability ทำทีหลังได้

### สิ่งที่รีวิวอาจ miss

1. **Error handling ใน recall route** - นอกจากไม่มี schema validation แล้ว ยังส่ง email ใน loop โดย `forEach` + `.catch()` ซึ่งถ้า user list ยาวจะ fire concurrent emails ทั้งหมดพร้อมกันไม่มี rate limit
2. **Console.* ใน logger.ts เอง** - structured logger wrap `console.*` ภายใน ซึ่งถูกต้องสำหรับ Next.js (stdout/stderr -> Docker log driver) แต่ปัญหาคือ code อื่นเรียก `console.*` ตรงโดยไม่ผ่าน logger ทำให้ไม่ได้ structured format

---

## แผนแก้ไข

### Phase 1: CI Guard Rails + Quick Wins (1-2 วัน)

#### 1.1 Fix `check:api` สำหรับ recall route

recall route ไม่รับ body/query จริง ให้เพิ่มเข้า allowlist:

```javascript
// scripts/check-api-patterns.mjs - เพิ่มใน NO_SCHEMA_ALLOWLIST
const NO_SCHEMA_ALLOWLIST = [
  // ...existing entries
  "app/api/kpi/[id]/recall/route.ts", // POST with path param only, no body/query
];
```

#### 1.2 เพิ่ม `check:api` เข้า CI

```yaml
# .github/workflows/ci-cd.yml - เพิ่มก่อน build step
- name: Check API patterns
  run: npm run check:api
```

#### 1.3 Fix lint warnings (ถ้ายังมี)

รัน `npm run lint` ยืนยันว่ายังมี warnings หรือไม่ ถ้ามีให้แก้ก่อน merge

---

### Phase 2: Database Integrity (2-3 วัน)

#### 2.1 เพิ่ม unique constraints

```prisma
// prisma/schema.prisma

model KPI {
  // ...existing fields
  @@unique([department, yearly])
}

model DocumentCategory {
  // ...existing fields
  @@unique([departmentId, name])
}
```

**ก่อนเพิ่ม constraint:**

1. Query หา duplicates ที่มีอยู่แล้ว:
```sql
SELECT department, yearly, COUNT(*) as cnt
FROM "KPI"
GROUP BY department, yearly
HAVING COUNT(*) > 1;

SELECT "departmentId", name, COUNT(*) as cnt
FROM "DocumentCategory"
GROUP BY "departmentId", name
HAVING COUNT(*) > 1;
```

2. ถ้ามี duplicates ให้ clean up ก่อน apply constraint
3. เปลี่ยน service ให้ handle Prisma unique violation เป็น `ConflictError`:

```typescript
// services/kpiService.ts
import { Prisma } from "@prisma/client";
import { ConflictError } from "@/errors/ConflictError";

// ใน createKpi method - แทนที่ findByDepartmentYear check
try {
  const kpi = await this.kpiRepo.create(data, tx);
  return kpi;
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new ConflictError("KPI for this department and year already exists");
  }
  throw error;
}
```

#### 2.2 เริ่มใช้ Prisma migrations

```bash
# ครั้งแรก - baseline จาก schema ปัจจุบัน
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql
npx prisma migrate resolve --applied 0_init

# หลังจากนั้นทุก schema change ใช้
npx prisma migrate dev --name <descriptive-name>
```

---

### Phase 3: Audit Trail (3-5 วัน)

#### 3.1 เพิ่ม AuditLog model

```prisma
model AuditLog {
  id          String   @id @default(cuid())
  actorUserId String
  actorRole   String
  action      String   // CREATE, UPDATE, DELETE, APPROVE, REJECT, RECALL, SYNC, EXPORT
  resourceType String  // KPI, DAR, USER, DOCUMENT, etc.
  resourceId  String
  before      Json?    // snapshot ก่อนเปลี่ยน
  after       Json?    // snapshot หลังเปลี่ยน
  metadata    Json?    // requestId, source, ip, etc.
  createdAt   DateTime @default(now())

  @@index([resourceType, resourceId])
  @@index([actorUserId])
  @@index([createdAt])
  @@index([action])
}
```

#### 3.2 สร้าง AuditService

```typescript
// services/auditService.ts
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

interface AuditEntry {
  actorUserId: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
}

export class AuditService {
  static async record(entry: AuditEntry, tx?: Prisma.TransactionClient) {
    const client = tx ?? db;
    return client.auditLog.create({
      data: {
        ...entry,
        before: entry.before ? (entry.before as Prisma.InputJsonValue) : undefined,
        after: entry.after ? (entry.after as Prisma.InputJsonValue) : undefined,
        metadata: entry.metadata ? (entry.metadata as Prisma.InputJsonValue) : undefined,
      },
    });
  }
}
```

#### 3.3 เพิ่ม audit เข้า critical paths

Priority actions ที่ต้องเพิ่ม audit ก่อน:

| Action | ไฟล์ | ตำแหน่งที่เพิ่ม |
|---|---|---|
| Role change | `services/userService.ts` | หลัง `updateUserAttributes()` |
| KPI approve/reject/recall | `services/kpiService.ts` | ใน transaction เดียวกับ state change |
| DAR approve/reject | `services/darService.ts` | ใน transaction เดียวกับ state change |
| Document delete | `services/documentControlService.ts` | ก่อน delete |
| SharePoint delete | `app/api/sharepoint/delete-item/route.ts` | หลัง delete สำเร็จ |
| User sync | `services/userService.ts` | หลัง sync สำเร็จ |

ตัวอย่างการเพิ่มใน KPI approve:

```typescript
// services/kpiService.ts - ใน approveKpi method
await db.$transaction(async (tx) => {
  const before = await tx.kPI.findUnique({ where: { id: kpiId } });

  const updated = await tx.kPI.update({
    where: { id: kpiId },
    data: { status: "APPROVED", /* ... */ },
  });

  await tx.approvalSignature.create({ /* ...existing signature logic */ });

  await AuditService.record({
    actorUserId: userId,
    actorRole: role,
    action: "APPROVE",
    resourceType: "KPI",
    resourceId: kpiId,
    before: { status: before?.status },
    after: { status: updated.status },
    metadata: { requestId },
  }, tx);

  return updated;
});
```

---

### Phase 4: Notification Safety (2-3 วัน)

#### 4.1 Idempotency key approach (แทน full outbox)

แทนที่จะทำ full outbox pattern ที่ซับซ้อน เริ่มจาก idempotency key ก่อน:

```prisma
model NotificationLog {
  id            String   @id @default(cuid())
  idempotencyKey String  @unique
  channel       String   // EMAIL, PUSH, etc.
  status        String   // PENDING, SENT, FAILED
  recipient     String
  subject       String?
  errorMessage  String?
  attempts      Int      @default(0)
  createdAt     DateTime @default(now())
  sentAt        DateTime?

  @@index([status])
  @@index([createdAt])
}
```

```typescript
// services/notificationService.ts
export class NotificationService {
  static async sendEmailOnce(
    idempotencyKey: string,
    sendFn: () => Promise<void>,
    recipient: string,
    subject: string,
  ) {
    const existing = await db.notificationLog.findUnique({
      where: { idempotencyKey },
    });

    if (existing?.status === "SENT") return; // already sent

    const log = existing ?? await db.notificationLog.create({
      data: { idempotencyKey, channel: "EMAIL", status: "PENDING", recipient, subject },
    });

    try {
      await sendFn();
      await db.notificationLog.update({
        where: { id: log.id },
        data: { status: "SENT", sentAt: new Date(), attempts: { increment: 1 } },
      });
    } catch (error) {
      await db.notificationLog.update({
        where: { id: log.id },
        data: {
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message : String(error),
          attempts: { increment: 1 },
        },
      });
      throw error;
    }
  }
}
```

ตัวอย่างใช้ใน KPI submit:

```typescript
await NotificationService.sendEmailOnce(
  `KPI:${kpiId}:SUBMITTED:reviewer:${reviewerId}`,
  () => sendKpiObjectiveReviewerAssignedEmail({ /* ... */ }),
  reviewer.email,
  "KPI Review Request",
);
```

#### 4.2 ย้าย email orchestration เข้า service

email ที่ส่งใน API route ควรย้ายเข้า service method เดียวกับ business action:

```typescript
// services/kpiService.ts
async submitKpi(kpiId: string, userId: string) {
  const result = await db.$transaction(async (tx) => {
    // ... business logic + state change
    return { kpi: updated, reviewer };
  });

  // email ส่งนอก transaction แต่อยู่ใน service
  if (result.reviewer?.email) {
    await NotificationService.sendEmailOnce(
      `KPI:${kpiId}:SUBMITTED:reviewer:${result.reviewer.id}`,
      () => sendKpiObjectiveReviewerAssignedEmail({ /* ... */ }),
      result.reviewer.email,
      "KPI Review Request",
    ).catch((e) => logger.error("Failed to send KPI review email", { kpiId, error: e }));
  }

  return result.kpi;
}
```

---

### Phase 5: API Consistency + Response Envelope (1-2 วัน)

#### 5.1 แก้ routes ที่ใช้ `{ data, error }` pattern

Routes ที่ต้องแก้:

| Route | แก้อะไร |
|---|---|
| `app/api/it/users/[id]/role/route.ts` | ใช้ `sendSuccess()` + `handleApiError()` |
| `app/api/it/users/[id]/block-session/route.ts` | ใช้ `sendSuccess()` + `handleApiError()` |
| `app/api/sharepoint/delete-item/route.ts` | ใช้ `sendSuccess()` + `handleApiError()` |
| `app/api/ms-graph/users/search/route.ts` | ใช้ `sendSuccess()` + `handleApiError()` |

ตัวอย่าง:

```typescript
// ก่อน
return NextResponse.json({ data: updated, error: null });

// หลัง
return sendSuccess(updated, "Role updated successfully");
```

```typescript
// ก่อน
return NextResponse.json({ data: null, error: "itemId is required" }, { status: 400 });

// หลัง
return NextResponse.json(
  { success: false, error: { message: "itemId is required", code: "VALIDATION_ERROR" } },
  { status: 400 }
);
```

---

### Phase 6: Email + Integration Resilience (1 วัน)

#### 6.1 ใช้ graphFetch wrapper สำหรับ email

```typescript
// services/email.ts - แก้ให้ใช้ graphFetch แทน raw fetch
import { graphFetch } from "@/lib/graphFetch";

export async function sendMail(sender: string, payload: MailPayload) {
  const response = await graphFetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    throw new Error(`Send mail failed: ${response.status}`);
  }
}
```

ได้ timeout 30s + retry 3 ครั้ง + backoff ฟรี

---

### Phase 7: Health Check (0.5 วัน)

#### 7.1 แยก liveness และ readiness

```typescript
// app/api/health/live/route.ts
export async function GET() {
  return Response.json({ status: "ok", timestamp: new Date().toISOString() });
}

// app/api/health/ready/route.ts
export async function GET() {
  const checks = { database: "ok", redis: "ok" };
  let healthy = true;

  try { await db.$queryRaw`SELECT 1`; } catch { checks.database = "error"; healthy = false; }
  try { await redis.ping(); } catch { checks.redis = "error"; healthy = false; }

  return Response.json(
    { status: healthy ? "ok" : "not_ready", services: checks },
    { status: healthy ? 200 : 503 }
  );
}
```

```yaml
# docker-compose.yml
healthcheck:
  test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health/ready"]
```

---

### Phase 8: Testing Foundation (3-5 วัน)

#### 8.1 Setup test framework

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
```

```json
// package.json - เพิ่ม
"test": "vitest run",
"test:watch": "vitest"
```

#### 8.2 เริ่มจาก service unit tests

Priority test cases:

| Service | Test cases |
|---|---|
| `kpiService` | submit -> SUBMITTED, approve -> APPROVED, reject -> REJECTED, recall -> status กลับ, duplicate dept+year -> error |
| `darService` | approve chain progression, reject -> back to draft, attachment validation |
| `userService` | role change validation, sync dedup |

---

### Phase 9: Logging + i18n + UI (ทำตาม capacity)

สิ่งเหล่านี้ไม่กระทบ stability แต่ช่วย maintainability:

1. **Logging**: แทน `console.*` ด้วย `logger.*` ทั่วทั้ง services/api (55 จุดใน 34 ไฟล์)
2. **i18n**: ย้าย hardcoded locale ternaries 137 จุดเข้า messages files
3. **UI**: แทน `confirm()` ด้วย dialog component (1 จุด)

---

## Timeline รวม

| Phase | ระยะเวลา | Impact |
|---|---|---|
| Phase 1: CI guard rails | 1-2 วัน | ป้องกัน regression |
| Phase 2: DB integrity | 2-3 วัน | ป้องกัน data corruption |
| Phase 3: Audit trail | 3-5 วัน | Compliance requirement |
| Phase 4: Notification safety | 2-3 วัน | ป้องกัน duplicate emails |
| Phase 5: API consistency | 1-2 วัน | Developer experience |
| Phase 6: Email resilience | 1 วัน | Production stability |
| Phase 7: Health check | 0.5 วัน | Ops reliability |
| Phase 8: Testing | 3-5 วัน | Long-term safety net |
| Phase 9: Cleanup | ตาม capacity | Maintainability |

**รวม Phase 1-8: ประมาณ 2-3 สัปดาห์** (ถ้าทำ full-time)

---

## สิ่งที่ไม่ต้องรีบแก้

1. **Direct DB ใน server pages** - เป็น valid Next.js pattern สำหรับ read-only dashboard queries ถ้า queries ไม่ซับซ้อนไม่ต้องย้าย
2. **Prisma migrations** - ถ้ายังไม่มี multiple environments ที่ต้อง sync schema `db push` ยังใช้ได้ แต่ควรเริ่ม migrations ก่อน production scale
3. **Ops runbooks** - สำคัญแต่ไม่ urgent ถ้ายังมี team เล็กที่รู้ระบบ
4. **Pagination สำหรับ IT users** - ถ้า user count ยังน้อย (<500) ยังไม่ critical

---

## คำแนะนำสุดท้าย

รีวิวฉบับเดิมครอบคลุมดีมากและ findings ถูกต้องเกือบทั้งหมด แนะนำให้:

1. **เริ่มจาก Phase 1-2 ก่อน** เพราะเป็น quick wins ที่ป้องกัน data issues
2. **Phase 3 (Audit) ทำควบคู่** เพราะเป็น compliance requirement สำหรับ QMS
3. **อย่าทำทุกอย่างพร้อมกัน** - ทำทีละ phase แล้ว merge เข้า production ทีละชุด
4. **Phase 4 (Notification)** - เริ่มจาก idempotency key approach ก่อน ไม่ต้องทำ full outbox ตั้งแต่แรก
