# NDC Enterprise QMS - Frontend Query & Realtime Standards

This document establishes the architecture, usage, and policies for client-side data fetching and realtime state updates in the Quality Management System (QMS).

---

## 1. Core Principles

All data fetching on the frontend must use **TanStack Query** (React Query). Raw `useEffect` fetching is prohibited. To ensure consistent performance, resource utilization, and developer experience across teams, we standardise all queries on the `useAppQuery` hook wrapper.

- **Client Efficiency**: No active polling should occur when a tab is in the background.
- **Server Safety**: Limit retries on high-frequency (realtime) endpoints to prevent cascading failures.
- **Observability & Control**: Provide runtime overrides (feature flags) to enable or disable realtime polling on a module basis without redeploying code.

---

## 2. Shared Query Abstraction (`useAppQuery`)

The custom hook [useAppQuery](file:///d:/NDC_042/NextJS/qms-system/hooks/use-app-query.ts) wraps TanStack Query’s `useQuery` and implements standard intervals, visibility-aware polling, default cache policies, and runtime toggles.

### API Reference
```typescript
import { useAppQuery } from "@/hooks/use-app-query";

const { data, isLoading, error } = useAppQuery({
  queryKey: ["approvals", "pending-summary"],
  queryFn: async () => { ... },
  realtimeClass: "A", // Optional: "A", "B", or "C" (default: "C")
  customIntervalMs: 10000, // Optional: override class defaults
  realtimeEnabled: true, // Optional: toggle to disable polling
});
```

---

## 3. Realtime Classification Tier Rules

Every client-side query must be mapped to one of the following classes:

| Realtime Class | Polling Interval | Default `staleTime` | Default `retry` | Target Pages / Workflows |
|---|---|---|---|---|
| **Class A** (High Urgency) | **5 seconds** | `0` | `1` | Approval queues, active action reviews (`/approve`, `/approve/[id]/reviewer`, `/approve/[id]/approver`). |
| **Class B** (Medium Urgency) | **15 seconds** | `0` | `1` | Operations boards, general dashboards, main list views (`/dar`, `/qms/kpi`, `/qms/announcements`). |
| **Class C** (Standard/CRUD) | **Disabled** (No Poll) | `30000` (30s) | `2` | Detail pages, edit forms, IT settings, profiles (`/it/*`, `/profile`, `/qms/document-controls/*`). |

---

## 4. Visibility-Aware Polling (Tab Suspense)

`useAppQuery` tracks the page visibility state (`document.visibilityState`). 
- When the user switches tabs or minimizes the browser, the polling interval is automatically **suspended** (`refetchInterval = false`).
- When the user returns to the tab, polling **resumes** instantly and triggers a window focus refetch if the cache has expired.
- Double-suspension is enforced through TanStack Query's native `refetchIntervalInBackground: false` default setting.

---

## 5. Developer Debugging & Feature Flags

To allow QA or operations teams to disable realtime intervals during high database load or debug sessions, `useAppQuery` checks `localStorage` values on the client browser.

### Global Toggle
Disable **all** active polling across the entire application:
```javascript
// Run in the browser Console:
localStorage.setItem("qms_realtime_disable_all", "true");
```
To enable again:
```javascript
localStorage.removeItem("qms_realtime_disable_all");
```

### Module-Specific Toggle
Disable polling for a specific module (derived from the first element of the `queryKey` array, e.g., `["approvals", ...]` maps to the `approvals` module):
```javascript
// Disable approvals polling only:
localStorage.setItem("qms_realtime_disable_approvals", "true");

// Disable KPI polling only:
localStorage.setItem("qms_realtime_disable_kpi", "true");

// Disable DAR polling only:
localStorage.setItem("qms_realtime_disable_dar", "true");
```

---

## 6. Query Key Conventions

To ensure module-level feature flags and cache invalidation maps work cleanly, all query keys must adhere to the following schema:

1. **First Element**: Module namespace (always lowercase singular/plural e.g. `"approvals"`, `"kpi"`, `"dar"`, `"document-controls"`).
2. **Second Element**: Action or list scope descriptor (e.g. `"pending-summary"`, `"detail"`, `"list"`).
3. **Subsequent Elements**: Query parameters, IDs, or filters.

### Examples:
- **Approval Queue**: `["approvals", "pending-summary"]`
- **Specific KPI Monthly Report**: `["kpiMonthlyReport", reportId]` (maps to module `kpimonthlyreport`)
- **DAR List Filtered**: `["dar", "list", filters]`

---

## 7. Migration Guide

When refactoring legacy components or introducing new pages, replace the standard `useQuery` from `@tanstack/react-query` with `useAppQuery`:

```diff
- import { useQuery } from "@tanstack/react-query";
+ import { useAppQuery } from "@/hooks/use-app-query";

- const query = useQuery({
+ const query = useAppQuery({
    queryKey: ["approvals", "pending-summary"],
+   realtimeClass: "A",
    queryFn: fetchPendingSummary
  });
```
