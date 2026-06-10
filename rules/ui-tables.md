# UI Tables

## Table Strategy

- Every enterprise table must support search, filter, pagination, and responsive display.
- Desktop: use table on `lg:` and above.
- Mobile: use card list below `lg:`.
- Never show the full desktop table unchanged on mobile.

## Standard Table Container

```tsx
<div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
  <div className="overflow-x-auto">
    <table className="w-full min-w-[960px]">
      <thead className="sticky top-0 z-10 bg-white border-b border-slate-100">
        <tr>
          <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">Name</th>
          <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-center">Date</th>
          <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr className="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors">
          <td className="text-slate-600 text-sm px-4 py-3 text-left">Document Control</td>
          <td className="text-slate-600 text-sm font-mono px-4 py-3 text-center">2026-05-26</td>
          <td className="px-4 py-3">
            <div className="flex justify-end gap-2">...</div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

## Column Alignment Rules

| Column Type | Alignment |
| --- | --- |
| Text | `text-left` |
| Date | `text-center font-mono` |
| Number | `text-center font-mono` |
| Status | `text-center` |
| Actions | `text-right` + `flex justify-end gap-2` |

## Toolbar Pattern

```tsx
<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-4 border-b border-slate-100">
  <input
    placeholder="Search..."
    className="w-full lg:max-w-sm bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#0F1059] focus:bg-white transition-colors"
  />
  <div className="flex gap-2">
    <button className="bg-white text-slate-700 border border-slate-200 rounded-xl px-4 py-2 text-sm hover:bg-slate-50 transition-colors">Export</button>
    <button className="bg-white text-slate-700 border border-slate-200 rounded-xl px-4 py-2 text-sm hover:bg-slate-50 transition-colors">Filter</button>
  </div>
</div>
```

**Toolbar Rules:**
- Search must debounce `300–500ms` before triggering API.
- Sync search, filters, and pagination to URL params (`?search=...&page=2`).

## Pagination Pattern

```tsx
<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 border-t border-slate-100">
  <p className="text-sm text-slate-400">Showing 1–20 of 243 items</p>
  <div className="join">
    <button className="join-item btn btn-sm">«</button>
    <button className="join-item btn btn-sm btn-active">1</button>
    <button className="join-item btn btn-sm">2</button>
    <button className="join-item btn btn-sm">»</button>
  </div>
</div>
```

## Bulk Action Bar

```tsx
{selected.length > 0 && (
  <div className="bg-sky-50 border-b border-sky-100 px-4 py-3 flex items-center justify-between">
    <span className="text-sm text-sky-700">{selected.length} selected</span>
    <div className="flex gap-2">
      <button className="bg-white text-slate-700 border border-slate-200 rounded-xl px-4 py-2 text-sm hover:bg-slate-50 transition-colors">Export</button>
      <button className="bg-rose-600 text-white rounded-xl px-4 py-2 text-sm hover:bg-rose-700 transition-colors">Delete</button>
    </div>
  </div>
)}
```

Destructive bulk actions must use confirmation modal.

## Responsive Display Strategy

```tsx
{/* Desktop Table */}
<div className="hidden lg:block">
  <table className="w-full min-w-[960px]">...</table>
</div>

{/* Mobile Card List */}
<div className="lg:hidden space-y-3">
  {items.map((item) => (
    <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4">
      <div className="flex items-start justify-between mb-2">
        <p className="text-slate-800 font-semibold text-sm">{item.name}</p>
        <StatusBadge status={item.status} />
      </div>
      <p className="text-slate-400 text-xs font-mono">{item.date}</p>
      <div className="flex justify-end gap-2 mt-3">...</div>
    </div>
  ))}
</div>
```

## Card Tokens

```tsx
{/* Standard Card */}
<div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">...</div>

{/* Quick Access Card */}
<div className="bg-white border-l-4 border-[#0F1059] rounded-xl shadow-sm p-4 hover:-translate-y-1 transition-transform duration-200 cursor-pointer">...</div>
```

## Mobile Card Rules

- Mobile cards use `p-4`.
- Most important field uses `font-semibold text-slate-800`.
- Date/code metadata uses `font-mono text-xs text-slate-400`.
- Actions stay `flex justify-end gap-2`.

## Failure Conditions

- Table pages ship without search, filter, or pagination when dataset requires them.
- Desktop tables are rendered unchanged on mobile.
- Status and primary row actions are hard to scan.
