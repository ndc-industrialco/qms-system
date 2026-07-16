# Localization of Untranslated Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Localize key user-facing dashboard pages (User CAR page, Announcements, Notifications, and Error Page) to support full TH/EN switching using the `useT` translation helper.

**Architecture:** We will replace hardcoded Thai/bilingual text in pages and client components with dynamic translation hook calls (`useT`), passing translation keys to `PageHeader` and using the context-aware locale.

**Tech Stack:** Next.js, React, Tailwind CSS

## Global Constraints
- Use existing translation setup via `@/lib/i18n` and `@/lib/locale-context`.
- Add all required keys to `messages/en.json` and `messages/th.json`.
- Do not introduce build errors.

---

### Task 1: Update Localization Dictionaries

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/th.json`

- [ ] **Step 1: Add new translation keys to en.json**
Add the new translation keys for CAR, error, announcements, and notifications inside `messages/en.json`.
Insert them in the respective JSON blocks:
```json
  "car": {
    "page": {
      "title": "CAR — Corrective Action Requests",
      "subtitle": "Corrective Action Requests",
      "userTitle": "Department CARs",
      "userSubtitle": "CARs related to your department",
      "noDeptWarning": "Your account is not linked to a department.",
      "allCarsTitle": "All CARs",
      "allCarsSubtitle": "Corrective Action Requests from all departments"
    },
    "list": {
      "emptyAll": "No CARs in the system"
    }
  }
```
Add the `error` block extensions:
```json
  "error": {
    "title": "Something went wrong",
    "desc": "Please try again. If the problem persists, please contact your administrator.",
    "retryBtn": "Retry",
    "goHome": "Go to Dashboard"
  }
```
Add a new `notifications` root-level block in `en.json`:
```json
  "notifications": {
    "title": "Notifications",
    "subtitle": "QMS Notifications",
    "deleteSelected": "Delete Selected",
    "allSystems": "All Systems",
    "unread": "Unread",
    "markAllRead": "Mark All Read",
    "empty": "No notifications",
    "selectAll": "Select All ({count})",
    "selectToView": "Select a notification to view details",
    "openItem": "Open Item",
    "delete": "Delete",
    "justNow": "just now",
    "minutesAgo": "{count}m ago",
    "hoursAgo": "{count}h ago",
    "daysAgo": "{count}d ago"
  }
```

- [ ] **Step 2: Add new translation keys to th.json**
Add corresponding translation keys in `messages/th.json`:
```json
  "car": {
    "page": {
      "title": "CAR — คำขอการแก้ไข",
      "subtitle": "Corrective Action Requests",
      "userTitle": "CAR ของแผนก",
      "userSubtitle": "คำขอการแก้ไขที่เกี่ยวข้องกับแผนกของคุณ",
      "noDeptWarning": "บัญชีของคุณยังไม่ได้ผูกกับแผนก",
      "allCarsTitle": "CAR ทั้งหมด",
      "allCarsSubtitle": "Corrective Action Requests จากทุกแผนก"
    },
    "list": {
      "emptyAll": "ไม่มี CAR ในระบบ"
    }
  }
```
Add the `error` block extensions:
```json
  "error": {
    "title": "เกิดข้อผิดพลาด",
    "desc": "กรุณาลองใหม่อีกครั้ง หากปัญหายังคงอยู่ กรุณาติดต่อผู้ดูแลระบบ",
    "retryBtn": "ลองอีกครั้ง",
    "goHome": "กลับหน้าหลัก"
  }
```
Add the `notifications` root-level block in `th.json`:
```json
  "notifications": {
    "title": "การแจ้งเตือน",
    "subtitle": "การแจ้งเตือนระบบ QMS",
    "deleteSelected": "ลบที่เลือก",
    "allSystems": "ทุกระบบ",
    "unread": "ยังไม่อ่าน",
    "markAllRead": "อ่านทั้งหมด",
    "empty": "ไม่มีการแจ้งเตือน",
    "selectAll": "เลือกทั้งหมด ({count})",
    "selectToView": "เลือกการแจ้งเตือนเพื่อดูรายละเอียด",
    "openItem": "เปิดรายการ",
    "delete": "ลบ",
    "justNow": "เมื่อกี้",
    "minutesAgo": "{count} นาทีที่แล้ว",
    "hoursAgo": "{count} ชั่วโมงที่แล้ว",
    "daysAgo": "{count} วันที่แล้ว"
  }
```

- [ ] **Step 3: Verify JSON syntax is correct**
Ensure there are no trailing commas or missing bracket errors in both json files.

---

### Task 2: Localize User CAR page and AllDeptCarSection

**Files:**
- Modify: `app/(dashboard)/(user)/car/page.tsx`
- Modify: `components/car/AllDeptCarSection.tsx`

- [ ] **Step 1: Localize app/(dashboard)/(user)/car/page.tsx**
Change hardcoded titles to keys on `<PageHeader>` and import `useT` (using standard client-side mapping if needed, or pass keys). Since it's a server component and metadata is static, update page metadata title to bilingual.
```tsx
export const metadata: Metadata = { title: "CAR ของแผนก / Department CARs - QMS" };
```
Inside `UserCarListPage`:
```tsx
      <PageHeader
        titleKey="car.page.userTitle"
        subtitleKey="car.page.userSubtitle"
        actions={hasScope ? <CarFormModalTrigger issuerName={issuerName} defaultIssuerPosition={issuerPosition} footerConfig={footerConfig} /> : undefined}
      />
```
And replace the warning message using a new Client Component or directly localizing via client rendering inside the list table if needed, or we can use `useT` at client level. Since the warning is inside a server component `<p className="text-sm text-gray-500">บัญชีของคุณยังไม่ได้ผูกกับแผนก</p>`, we will wrap it in a client-side localized text component, or use a custom component `DarNoDepartment` style.
Wait, let's just make the warning dynamic by creating a simple client component or using `<LocalizedEmptyState />` or similar, or just inline translating. Let's create or use a helper client-side label if needed, or update `CarListTable` to handle it. Actually, we can use `useT` on the client. Let's look at `DarNoDepartment.tsx` for inspiration. It is a client component that shows localized warning.
Let's see: we can create a client-side simple banner `LocalizedWarning` or use `useT` inside a small inline client component, or write it directly.
Let's update the section header:
```tsx
      <div className="mt-10">
        <div className="mb-4">
          <LocalizedPageTitle titleKey="car.page.allCarsTitle" subtitleKey="car.page.allCarsSubtitle" />
        </div>
        <AllDeptCarSection initialData={carsAll} />
      </div>
```
Wait! `LocalizedPageTitle` is a component. Let's check if it exists or if we should create it. If it doesn't exist, we can use a client component or simple React code.
Wait, let's check if `components/common/LocalizedPageTitle.tsx` exists. We saw `LocalizedPageTitle.tsx` in step 10!
Let's view it to see its signature.
```tsx
import { useT, type TranslationKey } from "@/lib/i18n";
export default function LocalizedPageTitle({ titleKey, subtitleKey }: { titleKey: TranslationKey; subtitleKey?: TranslationKey }) {
  const t = useT();
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-800">{t(titleKey)}</h2>
      {subtitleKey && <p className="text-sm text-slate-500">{t(subtitleKey)}</p>}
    </div>
  );
}
```
Perfect! It exists and does exactly that!
We will also create a client component `LocalizedText` or use `useT` directly to wrap the warning. Or we can just import `LocalizedEmptyState` for warnings.

- [ ] **Step 2: Localize components/car/AllDeptCarSection.tsx**
Import `useT` in `AllDeptCarSection` and translate the table headers and empty message:
```typescript
import { useT } from "@/lib/i18n";
```
Inside the component:
```typescript
  const t = useT();
```
Replace the empty message:
```tsx
  if (cars.length === 0) {
    return <p className="text-sm text-slate-400 py-8 text-center">{t("car.list.emptyAll")}</p>;
  }
```
And replace the TableHeader column names:
```tsx
              <TableRow>
                <TableHead>{t("car.list.colCarNo")}</TableHead>
                <TableHead>{t("car.list.colType")}</TableHead>
                <TableHead>{t("car.list.colDept")}</TableHead>
                <TableHead>{t("car.list.colDetail")}</TableHead>
                <TableHead className="text-center">{t("car.list.colStatus")}</TableHead>
                <TableHead className="text-center">{t("car.list.colIssuedAt")}</TableHead>
                <TableHead className="text-center">{t("car.list.colDueAt")}</TableHead>
              </TableRow>
```

---

### Task 3: Localize Announcements Page

**Files:**
- Modify: `app/(dashboard)/announcements/page.tsx`
- Modify: `app/(dashboard)/announcements/AnnouncementsClient.tsx`

- [ ] **Step 1: Update app/(dashboard)/announcements/page.tsx**
Change PageHeader to use keys:
```tsx
export const metadata: Metadata = { title: "ประกาศ / Announcements - QMS" };
```
And inside `AnnouncementsPage`:
```tsx
      <PageHeader titleKey="announcement.allTitle" />
```

- [ ] **Step 2: Update app/(dashboard)/announcements/AnnouncementsClient.tsx**
Import `useT` and translate the empty state message:
```typescript
import { useT } from "@/lib/i18n";
```
Inside the component:
```typescript
  const t = useT();
```
Change line 68:
```tsx
        <p className="text-slate-400 text-sm">{t("announcement.empty")}</p>
```

---

### Task 4: Localize Notifications Page

**Files:**
- Modify: `app/(dashboard)/notifications/page.tsx`
- Modify: `app/(dashboard)/notifications/NotificationsView.tsx`

- [ ] **Step 1: Update app/(dashboard)/notifications/page.tsx**
Change page title metadata:
```tsx
export const metadata: Metadata = { title: "การแจ้งเตือน / Notifications - QMS" };
```

- [ ] **Step 2: Update app/(dashboard)/notifications/NotificationsView.tsx**
Import `useT` and translate the hardcoded texts:
```typescript
import { useT } from "@/lib/i18n";
```
Inside `NotificationsView`:
```typescript
  const t = useT();
```
Update page header:
```tsx
      <PageHeader titleKey="notifications.title" subtitleKey="notifications.subtitle" className="shrink-0 mb-3 mx-4 mt-4" />
```
Update all labels like:
- "ลบที่เลือก" -> `{t("notifications.deleteSelected")}`
- "ทุกระบบ" -> `{t("notifications.allSystems")}`
- "ยังไม่อ่าน" -> `{t("notifications.unread")}`
- "อ่านทั้งหมด" -> `{t("notifications.markAllRead")}`
- "ไม่มีการแจ้งเตือน" -> `{t("notifications.empty")}`
- "เลือกทั้งหมด" -> `{t("notifications.selectAll", { count: filtered.length })}`
- "เลือกการแจ้งเตือนเพื่อดูรายละเอียด" -> `{t("notifications.selectToView")}`
- "เปิดรายการ" -> `{t("notifications.openItem")}`
- "ลบ" -> `{t("notifications.delete")}`

And update relative time helpers in `NotificationsView.tsx`:
```typescript
function formatRelativeTime(dateStr: string, t: any): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);

  if (m < 1)  return t("notifications.justNow");
  if (m < 60) return t("notifications.minutesAgo", { count: m });
  if (h < 24) return t("notifications.hoursAgo", { count: h });
  if (d < 7)  return t("notifications.daysAgo", { count: d });
  ...
}
```

---

### Task 5: Localize Global Error Fallback Page

**Files:**
- Modify: `app/(dashboard)/error.tsx`

- [ ] **Step 1: Update app/(dashboard)/error.tsx**
Import `useT` from `@/lib/i18n` and wrap with locale context provider if needed, or since it is under `DashboardShell` which provides `LocaleContext`, we can just call `useT()`.
```typescript
import { useT } from "@/lib/i18n";
```
Inside the component:
```typescript
  const t = useT();
```
Replace the hardcoded messages:
- Line 36-38: `<p className="text-slate-800 font-semibold text-base mb-1">{t("error.title")}</p>`
- Line 40-45: `<p className="text-slate-400 text-sm mb-6">{t("error.desc")}</p>`
- Line 58: `{t("error.retryBtn")}`
- Line 64: `{t("error.goHome")}`
