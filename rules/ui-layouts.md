# UI Layouts

## Responsive Policy

- Design for mobile compatibility even when desktop is the primary target.
- Add layout complexity progressively from `md:` upward.
- Use full data tables only on `lg:` and above.
- Use cards or lists below `lg:`.

## Breakpoints

| Prefix | Viewport |
| --- | --- |
| default | Mobile / base |
| `sm:` | ≥ 640px |
| `md:` | ≥ 768px |
| `lg:` | ≥ 1024px |
| `xl:` | ≥ 1280px |
| `2xl:` | ≥ 1536px |

## Standard Page Shell

```tsx
<div className="min-h-screen bg-slate-100">
  <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">
    <PageHeader />
    <main className="space-y-6">
      ...
    </main>
  </div>
</div>
```

## Page Header Pattern

```tsx
<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
  <div>
    <nav className="flex items-center gap-2 text-sm text-slate-400 mb-2">
      <span>Module</span>
      <span>/</span>
      <span>Page</span>
    </nav>
    <h1 className="text-2xl font-bold tracking-tight text-[#0F1059]">Page Title</h1>
    <p className="text-sm text-slate-400 mt-1">Short description.</p>
  </div>
  <div className="flex gap-2">
    <button className="bg-white text-slate-700 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium hover:bg-slate-50 transition-colors">
      Export
    </button>
    <button className="bg-[#0F1059] text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-[#161875] transition-colors">
      Create
    </button>
  </div>
</div>
```

## Grid Patterns

```tsx
{/* 3-column bento */}
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">...</div>

{/* 4-column KPI cards */}
<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">...</div>

{/* Sidebar layout */}
<div className="flex min-h-screen bg-slate-100">
  <aside className="hidden md:block w-64 bg-[#0F1059]" />
  <main className="flex-1 min-w-0">...</main>
</div>
```

## Navigation Shell

| Token | Class |
| --- | --- |
| Sidebar width | `w-64` |
| Collapsed width | `w-[72px]` |
| Background | `bg-[#0F1059]` |
| Item height | `h-11` |
| Top header height | `h-16` |
| Top header bg | `bg-white border-b border-slate-100` |

```tsx
{/* Sidebar item — default */}
<button className="flex items-center gap-3 w-full h-11 px-4 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition-colors duration-200">
  <Icon className="w-5 h-5 shrink-0" />
  <span className="text-sm font-medium truncate">Dashboard</span>
</button>

{/* Sidebar item — active */}
<button className="flex items-center gap-3 w-full h-11 px-4 rounded-xl bg-white text-[#0F1059] font-semibold shadow-sm">
  ...
</button>
```

## Standard Page Components

- Use a shared `PageHeader` pattern consistently across all pages.
- Use a shared `FilterBar` pattern for search, filter, and sort.
- Use shared `DataCard` or `ListCard` patterns for mobile-friendly data display.

## Failure Conditions

- A page invents a different shell without reason.
- Desktop tables are shown unchanged on mobile.
- Header structure varies arbitrarily across modules.
