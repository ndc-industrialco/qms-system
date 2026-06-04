# QMS System - Full Page Analysis & Phase Handover

Date: 2026-05-30
Owner: Architecture Review (Codex)
Scope: `app/(dashboard)` only (all user-facing internal pages)
Objective: Provide implementation-ready coordination document for next dev team without changing code.

---

## 1) Method & Assumptions

- Inventory source: filesystem scan of `app/(dashboard)` + API hooks/components usage scan.
- API mapping source: `hooks/api/*`, page-level `fetch(...)`, and major client components used by each page.
- This report is implementation guidance; no runtime traffic measurements included.

---

## 2) Full Route Inventory (All Pages)

### 2.1 Core Shell

| Route | Page File | Render Type | Data Source Today | Notes |
|---|---|---|---|---|
| `/` | `app/(dashboard)/page.tsx` | Server | Direct DB (`announcement`, `publicDocument`, `department`, `darAttachment`, KPI counts) | High-value dashboard; currently SSR-heavy (not API-driven). |
| `/profile` | `app/(dashboard)/profile/page.tsx` | Server + Client | Repository/Service + `/api/profile` in client | Mixed SSR + client updates/signature save. |

### 2.2 User DAR + Approve

| Route | Page File | Render Type | Data Source Today | Notes |
|---|---|---|---|---|
| `/dar` | `app/(dashboard)/(user)/dar/page.tsx` | Server + Client | `DarService.getDarsByRequesterId` + client `/api/dar` | Candidate for near-realtime list refresh. |
| `/dar/new` | `app/(dashboard)/(user)/dar/new/page.tsx` | Server + Client | DepartmentService + DAR form client APIs | Form flow; no polling needed. |
| `/dar/[id]` | `app/(dashboard)/(user)/dar/[id]/page.tsx` | Server + Client | `DarService.getDarById` + action components | Action/detail hybrid. |
| `/dar/[id]/edit` | `app/(dashboard)/(user)/dar/[id]/edit/page.tsx` | Server + Client | DAR detail + edit form APIs | Form page; no polling. |
| `/dar/[id]/review` | `app/(dashboard)/(user)/dar/[id]/review/page.tsx` | Server + Client | DAR action flow | Legacy entry still exists. |
| `/approve` | `app/(dashboard)/(user)/approve/page.tsx` | Server + Client | `/api/approvals/pending-summary` | Primary approval queue page; realtime candidate #1. |
| `/approve/[id]/reviewer` | `app/(dashboard)/(user)/approve/[id]/reviewer/page.tsx` | Server + Client | DAR action OR KPI action client (type-based) | New unified action route. |
| `/approve/[id]/approver` | `app/(dashboard)/(user)/approve/[id]/approver/page.tsx` | Server + Client | DAR action OR KPI action client (type-based) | New unified action route. |

### 2.3 QMS

| Route | Page File | Render Type | Data Source Today | Notes |
|---|---|---|---|---|
| `/qms/dar` | `app/(dashboard)/qms/dar/page.tsx` | Server + Client | `DarService.getAllDars` + client `/api/dar?all=true` | Operational list; near-realtime helpful. |
| `/qms/announcements` | `app/(dashboard)/qms/announcements/page.tsx` | Server + Client | Announcement service + client table actions | Moderate realtime need. |
| `/qms/announcements/new` | `app/(dashboard)/qms/announcements/new/page.tsx` | Client form | `/api/announcements`, `/api/sharepoint/upload-file` | Form-centric. |
| `/qms/sharepoint` | `app/(dashboard)/qms/sharepoint/page.tsx` | Client | `/api/sharepoint/list-files`, `preview-proxy`, `get-file`, delete | Interactive browser, on-demand fetch. |
| `/qms/mr` | `app/(dashboard)/qms/mr/page.tsx` | Server + Client | User service + `/api/qms/mr/[id]` toggles | Admin settings; no polling required. |

### 2.4 KPI

| Route | Page File | Render Type | Data Source Today | Notes |
|---|---|---|---|---|
| `/qms/kpi` | `app/(dashboard)/qms/kpi/page.tsx` | Server + Client | `useKpiList`, `/api/departments` | KPI objective index by department. |
| `/qms/kpi/[departmentId]` | `app/(dashboard)/qms/kpi/[departmentId]/page.tsx` | Server + Client | `useKpiById`, submit/sign/assign actions | Objective workflow page. |
| `/qms/kpi/monthly` | `app/(dashboard)/qms/kpi/monthly/page.tsx` | Server + Client | `useKpiMonthlyList`, detail drawer actions | Approval workflow page; realtime candidate #2. |

### 2.5 Document Controls

| Route | Page File | Render Type | Data Source Today | Notes |
|---|---|---|---|---|
| `/qms/document-controls` | `app/(dashboard)/qms/document-controls/page.tsx` | Server + Client | DB departments/categories summary | SSR card index. |
| `/qms/document-controls/dept/[deptId]` | `app/(dashboard)/qms/document-controls/dept/[deptId]/page.tsx` | Server + Client | DB department + client category APIs | CRUD list, low realtime demand. |
| `/qms/document-controls/dept/[deptId]/cat/[catId]` | `app/(dashboard)/qms/document-controls/dept/[deptId]/cat/[catId]/page.tsx` | Server + Client | client `/api/document-controls` list | CRUD list. |
| `/qms/document-controls/[id]` | `app/(dashboard)/qms/document-controls/[id]/page.tsx` | Server + Client | server fetch to `/api/document-controls/[id]`, client detail actions | Detail page. |
| `/qms/document-controls/[id]/edit` | `app/(dashboard)/qms/document-controls/[id]/edit/page.tsx` | Server redirect | Redirect to detail page | No direct realtime need. |
| `/qms/document-controls/new` | `app/(dashboard)/qms/document-controls/new/page.tsx` | Server redirect | Redirect to index | No direct realtime need. |

### 2.6 IT Admin

| Route | Page File | Render Type | Data Source Today | Notes |
|---|---|---|---|---|
| `/it` | `app/(dashboard)/it/page.tsx` | Server redirect | Redirect to `/it/users` | N/A |
| `/it/users` | `app/(dashboard)/it/users/page.tsx` | Server + Client | UserService + table actions APIs | Ops/admin page; focus-refetch enough. |
| `/it/departments` | `app/(dashboard)/it/departments/page.tsx` | Server + Client | DepartmentService + client CRUD actions | Admin page. |
| `/it/departments/[id]` | `app/(dashboard)/it/departments/[id]/page.tsx` | Server + Client | Department detail + members APIs | Admin page. |

---

## 3) Frontend Data Access Pattern Summary

### 3.1 TanStack Query already in use (good baseline)

- KPI: `hooks/api/use-kpi.ts`
- KPI Monthly: `hooks/api/use-kpi-monthly.ts`
- Corrective actions: `hooks/api/use-kpi-corrective.ts`
- Approve queue: `components/approve/ApprovePageClient.tsx`
- DAR list (user/qms), announcement table, document-control lists also use React Query.

### 3.2 Non-query client fetch still present

- Some pages/components still use direct `fetch()` in effects/handlers (e.g., SharePoint browser, ticker, some modals/forms).
- Server pages mix service/repository calls and direct DB calls.

Implication:
- System-wide realtime can be done, but should be phased and standardized first.

---

## 4) Realtime Classification Per Page

### 4.1 Class A (Polling 5s recommended)

- `/approve`
- `/approve/[id]/reviewer`
- `/approve/[id]/approver`
- `/qms/kpi/monthly` (approval workload)
- `/qms/dar` (if used as live operational board)

### 4.2 Class B (Polling 15-30s optional or focus refetch)

- `/dar`
- `/qms/announcements`
- `/qms/kpi`
- `/qms/kpi/[departmentId]`
- Dashboard `/`

### 4.3 Class C (No polling; mutate + invalidate only)

- Form/new/edit pages
- IT admin pages (`/it/*`)
- Document controls CRUD pages
- Profile page

---

## 5) Key Gaps to Coordinate Before Dev Implementation

1. Query Standardization Gap
- No central `useAppQuery` policy wrapper yet.
- Devs currently set per-component options manually.

2. Endpoint Responsibility Gap
- Dashboard uses server direct DB calls; not reusable by client polling strategy.
- Some UI modules still use ad hoc fetch without shared query key map.

3. Realtime Governance Gap
- No written policy for interval tiers (5s/15s/focus-only) per domain.
- No feature flag to disable polling by module quickly.

4. Workflow Consistency Gap
- New approve routes exist for DAR/KPI, but legacy DAR review route remains.
- Team should confirm long-term canonical route set.

---

## 6) Phase Plan for Multi-Dev Execution

### Phase 1: Foundation (Platform Team)

Scope:
- Build query policy abstraction and key naming standard.

Tasks:
- Create `useAppQuery` wrapper.
- Define shared defaults: `refetchOnWindowFocus`, retry, staleTime.
- Add options: `realtime`, `intervalMs`, visibility-aware polling.
- Publish query key convention doc.

Deliverables:
- `docs/frontend-query-standard.md`
- shared query util/hooks

Owner:
- Frontend platform/dev lead

---

### Phase 2: Approvals Realtime (Workflow Team)

Scope:
- Approve queue + action routes.

Tasks:
- Apply 5s polling to approve summary and active action detail queries.
- Ensure post-action success returns to queue and hard refresh/invalidates keys.
- Add fallback UX on stale/not-found item.

Deliverables:
- Stable realtime behavior for `/approve*`

Owner:
- DAR/KPI workflow devs

---

### Phase 3: KPI/DAR Operational Pages (Feature Team A)

Scope:
- `/qms/kpi/monthly`, `/qms/dar`, `/dar`.

Tasks:
- Add tiered polling (5s/15s) where needed.
- Replace local `fetch` list refresh logic with unified query invalidation.

Deliverables:
- Consistent data freshness for operations pages.

---

### Phase 4: Dashboard + Announcements (Feature Team B)

Scope:
- Dashboard and announcement management.

Tasks:
- Decide whether dashboard should remain SSR snapshots or expose dedicated summary API for client polling.
- Apply focus-refetch + optional low-frequency polling.

Deliverables:
- Predictable dashboard freshness without excessive load.

---

### Phase 5: Admin & Document Controls Hardening (Feature Team C)

Scope:
- IT + doc-control modules.

Tasks:
- Keep non-realtime but standardize query/invalidation patterns.
- Eliminate ad hoc fetch where practical.

Deliverables:
- Uniform data layer and lower maintenance cost.

---

### Phase 6: Observability & Rollout Control (QA + Infra)

Scope:
- Safe production rollout.

Tasks:
- Add feature flags for polling by module.
- Track request volume, error rates, stale state incidents.
- Stage rollout by module.

Deliverables:
- rollback-ready realtime rollout governance.

---

## 7) Suggested Work Breakdown (for Dev Coordination)

### Squad A (Approve + DAR)
- `/approve*`, DAR queues/actions
- APIs touched: `/api/approvals/*`, `/api/dar/*`

### Squad B (KPI + KPI Monthly)
- `/qms/kpi*`, KPI action flows
- APIs touched: `/api/kpi/*`

### Squad C (Docs + IT + Announcements)
- `/qms/document-controls/*`, `/it/*`, `/qms/announcements*`
- APIs touched: document/it/announcement endpoints

### Platform/QA
- query standard wrapper, flags, QA matrix, monitoring

---

## 8) Handover Checklist (Definition of Ready for Dev)

- [ ] Confirm canonical realtime policy (Class A/B/C) with product owner.
- [ ] Confirm canonical approval routes (`/approve/[id]/...`) and legacy route deprecation timeline.
- [ ] Freeze query key naming standard before feature teams start migration.
- [ ] Decide dashboard strategy (SSR snapshot vs API + polling).
- [ ] Prepare module-level feature flags for safe rollout.

---

## 9) Risks & Mitigations

1. API load spike from aggressive polling
- Mitigation: class-based intervals + visibility-only polling + feature flags.

2. Inconsistent stale state after mutation
- Mitigation: explicit invalidation map per endpoint and query key standard.

3. Team drift (different patterns per squad)
- Mitigation: enforce `useAppQuery` and PR checklist.

4. Route ambiguity for approvals
- Mitigation: publish single source of truth route map.

---

## 10) Recommended Next Action (No Code Change)

1. Share this report with all dev squads.
2. Approve Class A/B/C mapping and phase ownership.
3. Start Phase 1 platform work before feature migrations.

