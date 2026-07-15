# Auth Center Integration Manual

คู่มือสำหรับสร้างระบบใหม่ที่ใช้ Auth Center เป็นศูนย์กลางการเข้าสู่ระบบ (Single Sign-on) และใช้ App Mapping / App Roles จาก Auth Center

เอกสารนี้อ้างอิง flow ที่ใช้งานจริงใน QMS ณ วันที่ 2026-07-15 โดยระบบใหม่ควรใช้แนวทางเดียวกันเพื่อให้ผู้ใช้เข้าสู่ระบบด้วยบัญชีเดียวและไม่ต้องสร้างตารางผู้ใช้ซ้ำในแต่ละระบบ

## 1. ภาพรวมการทำงาน

```text
ผู้ใช้เปิดระบบใหม่
        |
        | ไม่มี session
        v
ระบบใหม่ redirect ไป Auth Center /auth/login
        |
        | appId + redirectUri
        v
Auth Center ตรวจสอบ Entra / Local account และ App Mapping
        |
        | redirect กลับพร้อม ?token=<JWT>&state=<path>
        v
ระบบใหม่ callback รับ token
        |
        | verify signature, issuer, audience และ expiry
        v
สร้าง session cookie ของระบบใหม่
        |
        v
ระบบอ่าน appRoles / user profile เพื่อกำหนดสิทธิ์
```

Auth Center เป็น source of truth ของ identity, employee ID, department และ app role ส่วนระบบใหม่เก็บได้เฉพาะ snapshot หรือ business data ที่จำเป็น ไม่ควรสร้างรหัสผ่านหรือระบบ login แยกเอง

## 2. สิ่งที่ต้องขอจากผู้ดูแล Auth Center

ก่อนเริ่มพัฒนา ให้ลงทะเบียน application ใหม่ใน Auth Center และขอค่าต่อไปนี้

| รายการ | ตัวอย่าง | ใช้ทำอะไร |
|---|---|---|
| Application ID | `my-new-app` | ค่า `appId`, audience ของ JWT และ key สำหรับ mapping |
| Application name | `My New System` | ชื่อแสดงใน Auth Center |
| Allowed redirect URI | `https://my-system.example.com/api/auth/center/callback` | URL ที่ Auth Center อนุญาตให้ redirect กลับ |
| Local redirect URI | `http://localhost:3000/api/auth/center/callback` | ใช้สำหรับ development เท่านั้น |
| JWKS URL | `https://auth.example.com/.well-known/jwks.json` | ใช้ verify JWT ใน production |
| Auth Center base URL | `https://auth.example.com` | ใช้สร้าง login URL และเรียก profile API |
| App role mapping | เช่น `MY_USER`, `MY_ADMIN` | สิทธิ์ที่ผู้ใช้จะได้รับในระบบใหม่ |

ถ้าระบบต้องรายงาน session login ไปที่ Auth Center ให้ขอ `client secret` และ endpoint สำหรับ session registry เพิ่มเติม ไม่ควรใส่ secret ใน browser หรือ source code

## 3. Environment variables

สร้าง `.env.local` สำหรับ local และตั้งค่าเดียวกันใน secret store ของ staging/production

```env
# URL ของระบบใหม่
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=สร้างค่า random อย่างน้อย 32 bytes
AUTH_TRUST_HOST=true

# Auth Center
AUTH_CENTER_URL=https://auth.example.com
AUTH_CENTER_APP_ID=my-new-app
AUTH_CENTER_REDIRECT_URI=http://localhost:3000/api/auth/center/callback
AUTH_CENTER_JWKS_URL=https://auth.example.com/.well-known/jwks.json

# ใช้เฉพาะกรณีเปิด session registry / internal API
AUTH_CENTER_CLIENT_ID=my-new-app
AUTH_CENTER_CLIENT_SECRET=เก็บใน secret manager เท่านั้น
AUTH_CENTER_SESSION_REGISTER_PATH=/api/internal/consumer-sessions/register
```

ข้อควรระวัง:

- `AUTH_CENTER_APP_ID` ต้องตรงกับ application ที่ลงทะเบียนและเป็นค่าเดียวกับ JWT `aud`.
- `AUTH_CENTER_REDIRECT_URI` ต้องตรงกับค่าที่ Auth Center allow แบบ exact match รวม scheme, host, port และ path.
- `AUTH_SECRET` ใช้เข้ารหัส session cookie ของระบบใหม่ ไม่ใช่ secret ของ Auth Center.
- ห้ามใช้ `AUTH_CENTER_SECRET` หรือ `AUTH_CENTER_CLIENT_SECRET` ใน client component.
- Production ต้องใช้ HTTPS และ JWKS; การใช้ shared secret สำหรับ verify token เหมาะเฉพาะ development ที่ Auth Center รองรับเท่านั้น.

## 4. สร้าง login URL

ระบบใหม่ควร redirect ไป Auth Center ด้วย `appId`, `redirectUri` และ `state` สำหรับส่งผู้ใช้กลับไปยังหน้าที่ต้องการ

```ts
// lib/auth-center-client.ts
export function buildAuthCenterLoginUrl(state = "/"): string {
  const base = process.env.AUTH_CENTER_URL!.replace(/\/$/, "");
  const appId = process.env.AUTH_CENTER_APP_ID!;
  const redirectUri = process.env.AUTH_CENTER_REDIRECT_URI!;

  const url = new URL(`${base}/auth/login`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  return url.toString();
}
```

ตัวอย่าง redirect จาก middleware หรือ route:

```ts
const callbackPath = req.nextUrl.pathname + req.nextUrl.search;
return NextResponse.redirect(
  buildAuthCenterLoginUrl(callbackPath),
);
```

`state` ต้องยอมรับเฉพาะ relative path ของระบบตัวเอง เช่น `/dashboard` ห้ามนำค่า URL ภายนอกไป redirect ต่อ เพื่อป้องกัน open redirect

## 5. สร้าง callback route

Auth Center จะ redirect กลับมาที่ `redirectUri` พร้อม `token` และอาจมี `state`

```ts
// app/api/auth/center/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { verifyAuthCenterToken } from "@/lib/auth-center-token";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const state = req.nextUrl.searchParams.get("state") ?? "/";

  if (!token) {
    return NextResponse.redirect(new URL("/auth/error?error=MissingToken", req.url));
  }

  try {
    const appId = process.env.AUTH_CENTER_APP_ID!;
    const claims = await verifyAuthCenterToken(token, appId);

    const cookieName = "my-system.session-token";
    const sessionToken = await encode({
      token: {
        sub: claims.userId,
        authUserId: claims.userId,
        employeeId: claims.employeeId,
        departmentId: claims.departmentId,
        appRoles: claims.appRoles,
        accessToken: token,
        accessTokenExpiresAt: new Date(claims.exp * 1000).toISOString(),
        jti: claims.sessionId,
      },
      secret: process.env.AUTH_SECRET!,
      salt: cookieName,
      maxAge: 60 * 60 * 24 * 30,
    });

    const response = NextResponse.redirect(
      new URL(isSafeState(state) ? state : "/", process.env.NEXTAUTH_URL ?? req.url),
    );
    response.cookies.set(cookieName, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch {
    return NextResponse.redirect(
      new URL("/auth/error?error=AuthCenterTokenInvalid", req.url),
    );
  }
}

function isSafeState(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//");
}
```

ในระบบจริงควรใช้ session library ของ framework เช่น Auth.js/NextAuth แทนการทำ cookie format เองทั้งหมด แต่หลักสำคัญเหมือนตัวอย่างคือ verify token ก่อนสร้าง session และไม่เชื่อข้อมูลจาก query string โดยตรง

## 6. Verify JWT อย่างถูกต้อง

ตรวจสอบทุกครั้งก่อนสร้าง session หรืออนุญาต API request:

1. ลายเซ็น JWT ด้วย Auth Center JWKS (`AUTH_CENTER_JWKS_URL`).
2. `iss` ต้องเป็น issuer ของ Auth Center ซึ่ง QMS ใช้ค่า `auth-center`.
3. `aud` ต้องเป็น `AUTH_CENTER_APP_ID` ของระบบนั้น.
4. ตรวจ `exp`, `iat` และไม่รับ token ที่หมดอายุ.
5. ใช้ `sub`/`userId` จาก Auth Center เป็น stable identity ห้ามใช้ email เป็น primary key.
6. ตรวจ session blocklist หรือ session registry ถ้าองค์กรเปิดใช้งาน force logout.

```ts
import { createRemoteJWKSet, jwtVerify } from "jose";

const jwks = createRemoteJWKSet(new URL(process.env.AUTH_CENTER_JWKS_URL!));

export async function verifyAuthCenterToken(token: string) {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: "auth-center",
    audience: process.env.AUTH_CENTER_APP_ID!,
  });
  return payload;
}
```

ห้าม decode JWT ด้วย `atob` แล้วถือว่า valid เพราะการ decode ไม่ได้ตรวจลายเซ็น

## 7. Auth Center Mapping และ Role Mapping

Mapping มี 2 ชั้น:

### 7.1 Application mapping

ผู้ใช้ต้องถูกผูกกับ application `my-new-app` ใน Auth Center ก่อน จึงจะได้รับ `appRoles` สำหรับระบบใหม่ ระบบใหม่ไม่ควรตีความ global role ของระบบอื่นเป็นสิทธิ์ของตัวเอง

ตัวอย่าง claims:

```json
{
  "userId": "auth-user-123",
  "employeeId": "EMP-001",
  "departmentId": "dept-qms",
  "appRoles": ["MY_USER", "MY_APPROVER"],
  "sessionId": "session-456",
  "iss": "auth-center",
  "aud": "my-new-app",
  "exp": 1780000000
}
```

### 7.2 Application role mapping

กำหนด mapping ในระบบใหม่ให้ชัดเจนและ fail closed:

```ts
const ROLE_MAP: Record<string, "USER" | "APPROVER" | "ADMIN"> = {
  MY_USER: "USER",
  MY_APPROVER: "APPROVER",
  MY_ADMIN: "ADMIN",
};

export function getEffectiveRole(appRoles: string[]) {
  if (appRoles.includes("MY_ADMIN")) return ROLE_MAP.MY_ADMIN;
  if (appRoles.includes("MY_APPROVER")) return ROLE_MAP.MY_APPROVER;
  return ROLE_MAP.MY_USER;
}
```

ถ้าไม่มี role ที่รู้จัก ให้ใช้สิทธิ์ต่ำสุดหรือปฏิเสธการเข้าถึง feature สำคัญ ห้าม fallback เป็น admin

QMS ใช้ role เดิมดังนี้: `USER`, `QMS`, `MR`, `IT` และรองรับชื่อใหม่ `QMS_USER`, `QMS_QMS`, `QMS_MR`, `QMS_IT` โดย normalize ก่อนตรวจสิทธิ์ รายละเอียดนี้เป็นตัวอย่างเฉพาะ QMS; ระบบใหม่ควรใช้ namespace ของตัวเอง เช่น `APP_USER`, `APP_ADMIN` เพื่อไม่ให้ role ข้ามระบบปะปนกัน

## 8. เรียกข้อมูล profile และ API ของ Auth Center

เมื่อจำเป็นต้องอ่านชื่อ, email, department หรือ job title ให้เรียก Auth Center ด้วย bearer token ของ session:

```ts
const response = await fetch(
  `${process.env.AUTH_CENTER_URL}/api/auth/me?appId=${encodeURIComponent(appId)}`,
  { headers: { Authorization: `Bearer ${accessToken}` } },
);
```

แนวทางที่แนะนำ:

- ใช้ `userId` จาก claims เป็น identity หลัก.
- ใช้ profile API สำหรับข้อมูลที่ต้องการความสดใหม่.
- ถ้าจะเก็บ snapshot ในฐานข้อมูล ให้บันทึก `authUserId`, `employeeId`, `departmentId` และ `syncedAt`.
- ไม่ควรมี local password, local user provisioning หรือการ sync แบบสร้างผู้ใช้ซ้ำโดยไม่มีเหตุผล.
- เมื่อเรียก API จาก server ให้ส่ง token ต่อไปเฉพาะ service ที่จำเป็น และห้าม log ค่า token.

## 9. Middleware และ API protection

ทุก protected page และ API ต้องตรวจ session ก่อนทำงาน:

```ts
const session = await auth();
if (!session?.user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

if (isExpired(session.user.accessTokenExpiresAt)) {
  return NextResponse.json({ error: "SESSION_EXPIRED" }, { status: 401 });
}
```

ตรวจ role ซ้ำที่ server/API เสมอ อย่าพึ่งการซ่อนปุ่มใน UI เพราะผู้ใช้สามารถเรียก endpoint โดยตรงได้

เมื่อ token หมดอายุ ให้ส่งผู้ใช้ไป sign out และ login ใหม่กับ Auth Center พร้อมแสดงข้อความที่ชัดเจน ไม่ควรคืน `Unauthorized` แบบไม่มีสาเหตุ

## 10. วิธีส่งอีเมลผ่าน Auth Center

ระบบใหม่ควรส่งอีเมลผ่าน Auth Center delegated mail proxy แทนการเก็บ Microsoft Graph client secret หรือเรียก Graph โดยตรงจาก browser

### 10.1 Delegated mail flow

```text
ผู้ใช้ login ผ่าน Auth Center
        |
        | session.user.accessToken
        v
ระบบใหม่ส่ง POST /api/auth/mail/send ไป Auth Center
        |
        | Authorization: Bearer <Auth Center JWT>
        v
Auth Center ตรวจ canSendDelegatedMail และระบุ Entra UPN ของผู้ส่ง
        |
        v
Auth Center เรียก Microsoft Graph /users/{upn}/sendMail
        |
        v
อีเมลแสดง From เป็นผู้ใช้ที่ login อยู่
```

ผู้ใช้ต้องมีสิทธิ์ `canSendDelegatedMail = true` ใน Auth Center JWT และต้องมี mailbox/Microsoft 365 account ที่ใช้งานได้

### 10.2 Environment variables สำหรับเมล

```env
AUTH_CENTER_URL=https://auth.example.com
AUTH_CENTER_APP_ID=my-new-app

# ใช้สำหรับ M2M fallback หรือ service-to-service mail
AUTH_CENTER_CLIENT_ID=my-new-app
AUTH_CENTER_CLIENT_SECRET=เก็บใน secret manager เท่านั้น
```

ไม่ต้องใส่ Microsoft Graph client secret ในระบบใหม่ ถ้าใช้ mail proxy ของ Auth Center เพราะ Auth Center เป็นผู้ถือ Graph credential และจัดการการส่งเมลให้

### 10.3 ตัวอย่าง service สำหรับส่งเมล

โค้ดส่งเมลควรอยู่ฝั่ง server เช่น `services/email.ts` และรับ `session.user.accessToken` มาจาก route handler เท่านั้น

```ts
type Recipient = { email: string; name?: string };

export async function sendMail(input: {
  to: Recipient[];
  cc?: Recipient[];
  subject: string;
  htmlBody: string;
  senderAccessToken?: string | null;
  attachments?: Array<{
    name: string;
    contentType: string;
    contentBytes: string; // base64
  }>;
}) {
  const base = process.env.AUTH_CENTER_URL!.replace(/\/$/, "");
  const endpoint = `${base}/api/auth/mail/send`;

  for (const recipient of input.to) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.senderAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        toEmail: recipient.email,
        toName: recipient.name,
        subject: input.subject,
        htmlBody: input.htmlBody,
        cc: input.cc ?? [],
        attachments: input.attachments ?? [],
      }),
    });

    if (!response.ok) {
      throw new Error(`Auth Center send mail failed: ${response.status}`);
    }
  }
}
```

ใน route handler ให้ส่ง token จาก session:

```ts
const session = await requireAuth();

await sendMail({
  to: [{ email: "approver@example.com", name: "Approver" }],
  subject: "New approval request",
  htmlBody: "<p>Please review the request.</p>",
  senderAccessToken: session.user.accessToken,
});
```

Payload หลักของ Auth Center mail endpoint คือ:

| Field | รายละเอียด |
|---|---|
| `toEmail` | อีเมลผู้รับหนึ่งราย |
| `toName` | ชื่อผู้รับ |
| `subject` | หัวข้ออีเมล |
| `htmlBody` | เนื้อหา HTML ที่สร้างจากข้อมูลที่ escape แล้ว |
| `cc` | รายการผู้รับสำเนา |
| `attachments` | ไฟล์ base64 พร้อม `name` และ `contentType` |

QMS วนส่งทีละผู้รับ (`toEmail` หนึ่งรายการต่อ request) หากระบบใหม่ส่งหลายคน ควรรองรับผลสำเร็จ/ล้มเหลวแยกรายคนและบันทึก notification log

### 10.4 M2M fallback / service email

กรณี background job, cron หรือผู้ใช้ไม่มี delegated mail permission ให้ใช้ M2M credential ของ application:

```http
POST /api/auth/mail/send
X-Consumer-App-Id: my-new-app
X-Consumer-App-Secret: <server-only-secret>
Content-Type: application/json
```

ส่ง body รูปแบบเดียวกับ delegated mail แต่ต้องส่ง header `X-Consumer-App-Id` และ `X-Consumer-App-Secret` แทน `Authorization`

ลำดับที่แนะนำ:

1. ถ้ามี `session.user.accessToken` ให้ลอง delegated mail ก่อน เพื่อให้อีเมลแสดง From เป็นผู้ใช้ที่ทำรายการ.
2. ถ้า Auth Center ตอบ `401` หรือ `403` และระบบได้รับอนุญาตให้ใช้ service mail ให้ fallback เป็น M2M.
3. ถ้าเป็น error อื่น เช่น `400`, `429` หรือ `5xx` ให้บันทึก failure และจัดการ retry ตาม policy ไม่ควร fallback ทันทีแบบซ่อนสาเหตุ.
4. ถ้าไม่มีทั้ง delegated token และ M2M credentials ให้หยุดส่งและบันทึกสถานะ `SKIPPED` หรือ `FAILED` อย่างชัดเจน.

M2M ต้องถูกจำกัดสิทธิ์ตาม application และควรส่งจาก server-side job เท่านั้น ห้ามส่ง secret ไป client หรือใส่ไว้ใน HTML/JavaScript ที่ browser โหลดได้

### 10.5 ข้อควรระวังด้านความปลอดภัยและความเสถียร

- ตรวจ session และ role ก่อนให้ผู้ใช้กดส่งเมล.
- อย่าให้ client ส่ง `from`, arbitrary headers หรือ Graph endpoint เข้ามากำหนดเอง.
- Escape ข้อมูลผู้ใช้ก่อนนำไปประกอบ `htmlBody` และใช้ template ที่ควบคุมโดย server.
- ไม่ log access token, client secret หรือเนื้อหาอีเมลที่มีข้อมูลอ่อนไหว.
- จำกัดขนาดและชนิดไฟล์แนบ รวมถึงตรวจ base64 ก่อนส่ง.
- บันทึก `NotificationLog` หรือ audit event พร้อม recipient, subject แบบที่เหมาะสม, status, error และ correlation/request ID.
- ทำ idempotency หรือป้องกันการส่งซ้ำสำหรับ action ที่ retry ได้.
- ตรวจ `accessTokenExpiresAt` ก่อนส่ง หากหมดอายุให้แจ้งผู้ใช้ login ใหม่ ไม่ควร retry token เดิมไม่จำกัด.
- ทำ health check ที่ตรวจ `AUTH_CENTER_URL`, delegated token, M2M credentials และประวัติการส่งล้มเหลว.

## 11. Logout และ session registry

Logout ขั้นต่ำต้องลบ session cookie ของระบบใหม่ สำหรับองค์กรที่ต้องการ force logout หรือเห็น active sessions ให้เรียก internal endpoint ของ Auth Center หลัง login สำเร็จ:

```http
POST /api/internal/consumer-sessions/register
X-Consumer-App-Id: my-new-app
X-Consumer-App-Secret: <server-only-secret>
Content-Type: application/json
```

payload ที่ QMS ใช้มี `appId`, `authUserId`, `employeeId`, `appRoles`, `sessionId`, `loginAt`, `lastSeenAt` และ `expiresAt` ควรส่งเฉพาะข้อมูลที่ Auth Center กำหนดและไม่ส่ง access token เข้า registry

## 12. Local development checklist

- ตั้ง `AUTH_CENTER_REDIRECT_URI` เป็น `http://localhost:3000/api/auth/center/callback`.
- เพิ่ม localhost redirect URI ใน Auth Center application mapping.
- ตรวจว่า `AUTH_CENTER_APP_ID` ตรงกับ `aud` ของ token.
- เปิดระบบแล้วเข้าหน้า protected route เช่น `/dashboard`.
- ตรวจว่า redirect ไป Auth Center และกลับ callback ได้.
- ตรวจว่า session มี `userId`, `employeeId`, `appRoles`, `accessTokenExpiresAt`.
- เรียก endpoint health ของระบบใหม่เพื่อตรวจ JWKS reachability.
- ทดสอบ role ต่ำสุด, role admin, ผู้ใช้ไม่มี app mapping และ token หมดอายุ.
- ทดสอบส่งเมลแบบ delegated, M2M fallback, token หมดอายุ และ Auth Center ตอบ `401/403`.

## 13. Production security checklist

- ใช้ HTTPS ทุกจุดและตั้ง cookie `Secure`, `HttpOnly`, `SameSite=Lax`.
- ใช้ JWKS signature verification; ห้ามปิดการตรวจ `issuer`, `audience` หรือ `exp`.
- แยก `AUTH_SECRET` และ `AUTH_CENTER_CLIENT_SECRET` ต่อ environment.
- จำกัด redirect URI แบบ exact match และ validate `state` เป็น relative path.
- ไม่ log JWT, client secret หรือข้อมูลส่วนบุคคลเกินจำเป็น.
- ป้องกัน callback และ API ด้วย rate limit ตามความเหมาะสม.
- ตรวจสิทธิ์ที่ server/API และบันทึก audit event สำหรับ action สำคัญ.
- รองรับ JWKS key rotation โดยใช้ `createRemoteJWKSet` และไม่ hard-code public key.
- วางแผนกรณี Auth Center ล่ม: ไม่ควรอนุญาต token ใหม่ แต่ session ที่ valid อาจทำงานได้ตาม policy ของระบบ.
- กำหนด mail retry/backoff และป้องกันการส่งอีเมลซ้ำจาก job ที่ถูก retry.

## 14. Troubleshooting

| อาการ | จุดตรวจสอบ |
|---|---|
| Redirect กลับแล้ว `MissingToken` | Auth Center ส่งกลับ path/query ถูกต้องหรือไม่ และ callback อ่าน `token` หรือไม่ |
| `AuthCenterTokenInvalid` | JWKS URL, issuer, audience, clock ของ server และ app ID |
| `redirect_uri_mismatch` | ค่า redirect URI ใน environment ต้องตรงกับที่ลงทะเบียนทุกตัวอักษร |
| Login สำเร็จแต่ role เป็น user | ตรวจ application mapping และชื่อใน `appRoles` ให้ตรงกับ role map |
| API ได้ 401 หลังเปิดทิ้งไว้ | access token หมดอายุ ต้อง sign out แล้ว login ใหม่ |
| Profile ว่าง | ตรวจ bearer token, Auth Center `/api/auth/me`, appId และสิทธิ์ของ token |
| ระบบวน login | ตรวจ cookie name, `AUTH_SECRET`, `NEXTAUTH_URL`, callback path และ domain/HTTPS |
| ส่งเมลได้ `401/403` | ตรวจ `canSendDelegatedMail`, mailbox ของผู้ใช้, token expiry และ app mail permission |
| ส่งเมลได้ `400` | ตรวจ `toEmail`, HTML body, attachment size/type และ payload ตาม contract ของ Auth Center |
| M2M ส่งไม่ได้ | ตรวจ `AUTH_CENTER_CLIENT_ID`, `AUTH_CENTER_CLIENT_SECRET`, app mapping และ server secret store |

## 15. Definition of Done สำหรับระบบใหม่

- มี application mapping และ redirect URI ที่ Auth Center.
- Login และ callback ผ่านการ verify JWT ครบ issuer/audience/signature/expiry.
- มี session cookie ที่ปลอดภัยและ logout ได้.
- มี server-side auth และ role guard สำหรับทุก protected API.
- มี role map ของระบบตัวเองและ default เป็นสิทธิ์ต่ำสุด.
- ไม่มี password หรือ identity source ซ้ำโดยไม่จำเป็น.
- มี health check และ automated test สำหรับ login, invalid token, expired token และ unauthorized role.
- มี mail service ฝั่ง server รองรับ delegated mail และ M2M ตาม policy.
- มี notification/audit log และ test สำหรับ mail success, failure, retry และ duplicate prevention.
- มีเอกสาร environment variables และผู้รับผิดชอบ application mapping.
