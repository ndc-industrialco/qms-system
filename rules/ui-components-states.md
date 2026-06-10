# UI Components and States

## Component Selection

- Simple components (Button, Badge, Input, Card): Tailwind CSS with `cva`.
- Complex components (Dialog, Dropdown, Select, Tabs, Drawer, Checkbox, Switch): must use **Radix UI Primitives**.
- Shared base UI components must live in `components/ui/`.
- Use `cn()` from `lib/utils.ts` for conditional classes.

## Button Tokens

```tsx
{/* Primary */}
<button className="h-11 min-w-[44px] bg-[#0F1059] text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-[#161875] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1059] focus-visible:ring-offset-2">
  Save
</button>

{/* Secondary */}
<button className="h-11 min-w-[44px] bg-white text-slate-700 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1059] focus-visible:ring-offset-2">
  Cancel
</button>

{/* Danger */}
<button className="h-11 min-w-[44px] bg-rose-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-rose-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2">
  Delete
</button>
```

**Button Rules:**
- All buttons must have minimum `h-11 min-w-[44px]`.
- Primary action appears once per section.
- Destructive action must open confirmation modal.
- Do not use disabled button for permission issues — hide instead.

## Badge / Status Pattern

```tsx
<span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">
  Approved ✓
</span>
```

| Status | Classes | Label |
| --- | --- | --- |
| Draft | `bg-slate-50 text-slate-500 border-slate-200` | Draft |
| Pending | `bg-amber-50 text-amber-600 border-amber-200` | Pending |
| Approved | `bg-emerald-50 text-emerald-600 border-emerald-200` | Approved ✓ |
| Rejected | `bg-rose-50 text-rose-600 border-rose-200` | Rejected ✕ |
| In Progress | `bg-sky-50 text-sky-600 border-sky-200` | In Progress |
| Overdue | `bg-rose-50 text-rose-700 border-rose-200` | Overdue ! |

**Badge Rules:** Use `rounded-full`. Always include text. Icons are supportive. Never use color alone.

## Required Data States

Every data-driven view must handle all four states: Loading, Empty, Error, and Success.

### Loading Skeleton

```tsx
<div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-3 animate-pulse">
  <div className="h-4 bg-slate-200 rounded w-1/3" />
  <div className="h-3 bg-slate-100 rounded w-2/3" />
  <div className="h-3 bg-slate-100 rounded w-1/2" />
</div>
```

### Empty State

```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
    <span className="text-slate-400 text-xl">○</span>
  </div>
  <p className="text-slate-800 font-semibold text-base mb-1">No items found</p>
  <p className="text-slate-400 text-sm mb-4">There is no data to display yet.</p>
  <button className="bg-[#0F1059] text-white rounded-xl px-4 py-2 text-sm hover:bg-[#161875] transition-colors">
    Add First Item
  </button>
</div>
```

### Error State

```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mb-4">
    <span className="text-rose-600 text-xl">!</span>
  </div>
  <p className="text-slate-800 font-semibold text-base mb-1">Something went wrong</p>
  <p className="text-slate-400 text-sm mb-4">Please try again or contact administrator.</p>
  <button className="bg-white text-slate-700 border border-slate-200 rounded-xl px-4 py-2 text-sm hover:bg-slate-50 transition-colors">
    Try Again
  </button>
</div>
```

### Toast Rules

- Success toast: emerald, auto-dismiss 3 seconds.
- Error toast: rose, no auto-dismiss.
- Do not use toast for destructive confirmation.
- Do not use toast for required field validation.

## Common Enterprise Components

### KPI Card

```tsx
<div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
  <p className="text-slate-400 text-sm mb-2">Total CAR</p>
  <div className="flex items-end justify-between">
    <p className="text-2xl font-bold text-[#0F1059]">24</p>
    <span className="text-emerald-600 text-sm font-medium">+12%</span>
  </div>
</div>
```

### Approval Timeline

```tsx
<div className="space-y-4">
  {steps.map((step) => (
    <div key={step.id} className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">✓</div>
      <div>
        <p className="text-slate-800 text-sm font-semibold">{step.title}</p>
        <p className="text-slate-400 text-xs">{step.owner} · {step.date}</p>
      </div>
    </div>
  ))}
</div>
```

### Activity Log

```tsx
<div className="space-y-3">
  {logs.map((log) => (
    <div key={log.id} className="border-b border-slate-100 pb-3 last:border-0">
      <p className="text-sm text-slate-600">{log.message}</p>
      <p className="text-xs text-slate-400 mt-1 font-mono">{log.createdAt}</p>
    </div>
  ))}
</div>
```

## Failure Conditions

- Shared components are reimplemented ad hoc in feature code.
- A data-driven view lacks loading, empty, or error states.
- Button states allow accidental duplicate submissions.
- Status uses color alone without text or icon.
