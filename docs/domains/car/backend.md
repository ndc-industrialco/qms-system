# CAR Backend

---

## File Structure

```
services/
  carService.ts              # Business logic ทั้งหมด
  carEmailService.ts         # Email notifications

repositories/
  carRepository.ts           # Prisma queries
  carSequenceRepository.ts   # CAR number generation (race-condition safe)

app/api/car/
  route.ts                   # GET (list), POST (create)
  [id]/
    route.ts                 # GET, PATCH, DELETE
    issue/route.ts           # POST — issue CAR
    respond/route.ts         # POST — dept response
    verify/route.ts          # POST — QMS verify (round 1/2)
    close/route.ts           # POST — MR sign via token
    re-car/route.ts          # POST — create Re-CAR
  next-number/route.ts       # GET — preview next CAR no.
```

---

## carService.ts — Key Methods

### `createCar(data, issuerId)`
1. เรียก `carSequenceRepository.nextSequence(year)` ใน transaction
2. สร้าง `CarMaster` (status: DRAFT)
3. บันทึก `AuditLog` (CREATE)

### `issueCar(carId, session)`
1. ตรวจสอบ status = DRAFT
2. Set `issuedAt = now()`, `responseDueAt = now() + 7 วัน`, status = ISSUED
3. ส่งเมลหา `targetEmailGroup` (`sendCarIssuedEmail`)
4. Schedule Redis reminder job (ส่งซ้ำทุก 3 วัน)
5. บันทึก `AuditLog` (ISSUE)

### `respondToCar(carId, data, session)`
1. ตรวจสอบ status = ISSUED
2. ตรวจสอบ `session.user.departmentId === car.targetDepartmentId`
3. สร้าง `CarResponse` (5M root cause data)
4. status → RESPONDED
5. Cancel Redis reminder job
6. ส่งเมลแจ้ง MR + QMS (`sendCarRespondedEmail`)
7. บันทึก `AuditLog` (RESPOND)

### `verifyCar(carId, data, session)`
1. ตรวจสอบ status = RESPONDED (round 1) หรือ VERIFY_2 (round 2)
2. สร้าง `CarVerification`
3. **ถ้า PASSED:**
   - สร้าง `ActionToken` (module: CAR, role: MR_SIGNER, expires: 7 วัน)
   - ส่งเมล MR พร้อม token link (`sendCarVerifyPassEmail`)
4. **ถ้า FAILED + round=1:**
   - status → VERIFY_2
   - ส่งเมลแผนก (`sendCarVerify2NotifyEmail`)
5. **ถ้า FAILED + round=2:**
   - status → RE_CAR
6. บันทึก `AuditLog` (VERIFY_1 / VERIFY_2)

### `closeCar(carId, token, comment)`
1. Validate `ActionToken` (module: CAR, ไม่หมดอายุ, ไม่ถูกใช้)
2. สร้าง `CarMrSignature`
3. Mark token `usedAt`
4. status → CLOSED (final)
5. บันทึก `AuditLog` (CLOSE)

### `createReCar(carId, session)`
1. ตรวจสอบ status = RE_CAR
2. Load original CAR
3. เรียก `createCar` ด้วย `reCar: true`, `reCarRefId: carId`
4. Auto-issue ทันที (copy targetDepartmentId, targetEmailGroup)
5. ส่งเมลแผนก (`sendCarReCarEmail`)

---

## carEmailService.ts

| Function | ส่งเมื่อ | ผู้รับ |
|----------|---------|--------|
| `sendCarIssuedEmail()` | ออก CAR | `targetEmailGroup` (MS Graph Group) |
| `sendCarReminderEmail()` | ครบ 3 วัน ยังไม่ตอบ | `targetEmailGroup` |
| `sendCarRespondedEmail()` | แผนกตอบกลับ | MR + QMS |
| `sendCarVerifyPassEmail()` | Verify ผ่าน | MR (พร้อม ActionToken link) |
| `sendCarVerify2NotifyEmail()` | Verify 1 ไม่ผ่าน | `targetEmailGroup` (แจ้ง date ใหม่) |
| `sendCarReCarEmail()` | สร้าง Re-CAR | `targetEmailGroup` (CAR ฉบับใหม่) |

**Template:** HTML bilingual (Thai/English), branded header (#0F1059)

---

## carRepository.ts

| Method | หน้าที่ |
|--------|--------|
| `findMany(filters)` | List CARs พร้อม role-scoping + pagination |
| `findById(id)` | CAR detail พร้อม response, verifications, mrSignature |
| `create(data)` | Insert CarMaster |
| `updateStatus(id, status, tx?)` | เปลี่ยน status |
| `createResponse(data, tx?)` | Insert CarResponse |
| `createVerification(data, tx?)` | Insert CarVerification |
| `createMrSignature(data, tx?)` | Insert CarMrSignature |

---

## carSequenceRepository.ts

จัดการ running number ต่อปี:
- เก็บใน `SystemConfig` table: key = `CAR_SEQ_{year}`, value = current sequence
- **Upsert + increment** pattern — ปลอดภัยใน serverless (Neon)
- Format: `C{yy}-{padStart(seq, 3, '0')}`
- Reset เป็น 1 ทุกต้นปี

---

## Redis Reminder Job

```
key: car:reminder:{carId}
value: { carId, targetEmailGroup, issuedAt, nextSendAt }
```

- ส่ง reminder ทุก 3 วัน ขณะ status = ISSUED
- Cancel อัตโนมัติเมื่อ status → RESPONDED
- **[Pending]** `carReminderService.ts` — job runner ยังไม่ implement

---

## Authorization Guards

```typescript
// respond — ต้องเป็นแผนกที่โดน CAR
if (session.user.departmentId !== car.targetDepartmentId) return 403

// verify — ต้องเป็น QMS / IT
if (!["QMS", "IT"].includes(session.user.role)) return 403

// close — ใช้ ActionToken แทน session (ไม่ต้อง login)
```

---

## Audit Trail

| Action | เกิดเมื่อ |
|--------|---------|
| `CREATE` | createCar() |
| `ISSUE` | issueCar() |
| `RESPOND` | respondToCar() |
| `VERIFY_1` | verifyCar() round 1 |
| `VERIFY_2` | verifyCar() round 2 |
| `CLOSE` | closeCar() |
| `RE_CAR` | createReCar() |
