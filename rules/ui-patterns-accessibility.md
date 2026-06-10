# UI Patterns, Accessibility, and i18n

## Design Principles

- Prioritize clarity over decoration.
- Use color to support meaning, not decoration alone.
- Important actions must be easy to find.
- Destructive actions must always require confirmation.
- Do not show disabled actions for unauthorized users — hide them instead.
- Never show full data tables on mobile. Use card list instead.

## Page Archetypes

### Dashboard Page

Required: page header, KPI summary cards, chart/trend, recent activity, action-required list.

```tsx
<div className="space-y-6">
  <PageHeader />
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
    <KpiCard /><KpiCard /><KpiCard /><KpiCard />
  </div>
  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
    <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">Chart</div>
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">Recent Activity</div>
  </div>
</div>
```

### Master Data Page

Required: toolbar (search, filter, sort), table on desktop, card list on mobile, drawer for create/edit, pagination.

### Approval Page

Required: record summary card, status badge, approval timeline, approve/reject CTA, comment box, audit trail.

### Detail Page

Required: header with title and status, metadata section, main content card, attachments (if applicable), activity log/timeline, role-based action buttons.

### Form Page

Required: fields grouped in sections, inline validation, save/cancel footer, drawer if 5+ fields.

## Role-Based UI Rules

```tsx
{canEdit && <button>Edit</button>}
{canDelete && <button>Delete</button>}
{role === "APPROVER" && <button>Approve</button>}
{role === "ADMIN" && <button>System Settings</button>}
```

| Role | Behavior |
| --- | --- |
| VIEWER | Read-only, hide create/edit/delete |
| USER | Create/edit own data, delete own drafts |
| APPROVER | Approve/reject, view approval timeline |
| ADMIN | Full CRUD, system settings, role management |

**Rule: Never show disabled action buttons for unauthorized users. Hide the action instead.**

## Accessibility Rules

| Rule | Requirement |
| --- | --- |
| Touch target | `h-11 min-w-[44px]` on all clickable elements |
| Focus ring | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1059] focus-visible:ring-offset-2` |
| Contrast | Minimum WCAG AA. Important text `text-slate-600` or darker. |
| Screen reader | Never rely on color alone. |
| Modal | Focus trap, Esc closes, restore focus to trigger after close. Must have title. |
| Table | `<th>` for headers, `aria-sort` on sortable columns, `aria-label` on checkboxes. |

### Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `/` | Focus search |
| `Esc` | Close modal / drawer |
| `Ctrl + K` | Global search |
| `Ctrl + S` | Save form |
| `Tab` | Next field |
| `Shift + Tab` | Previous field |

### Input Accessibility

```tsx
<label htmlFor="email" className="text-slate-800 text-sm font-semibold mb-2 block">Email</label>
<input id="email" aria-label="Email" aria-invalid={!!error} aria-describedby="email-error" />
```

### Status with Screen Reader Support

```tsx
{/* Bad */}
<span className="text-rose-600">Rejected</span>

{/* Good */}
<span className="text-rose-600">Rejected ✕</span>
<span className="text-emerald-600">Approved ✓</span>
```

## Code Quality Rules

- Use `cn()` utility for conditional class names.
- Use TypeScript types for all component props.
- Keep component names clear and business-friendly.

| Component | Example Name |
| --- | --- |
| Page | `DocumentControlPage` |
| Table | `DocumentTable` |
| Form | `DocumentForm` |
| Drawer | `DocumentDrawer` |
| Badge | `StatusBadge` |
| Card | `KpiCard` |

## Internationalization (i18n)

- No hardcoded UI strings in components or pages.
- All text must use translation keys from `messages/th.json` and `messages/en.json`.
- Group keys by module (e.g., `button.save`, `table.noData`, `car.status.issued`).
- Components must not have fixed widths that break when Thai/English text length differs.

## Implementation Checklist

Before shipping any page or component:

**Visual**
- [ ] Uses `#0F1059` for primary brand action
- [ ] Uses `bg-slate-100` page background and white cards
- [ ] Correct typography scale

**UX**
- [ ] Loading, empty, error, and success states exist
- [ ] Destructive action has confirmation modal
- [ ] Form validation is inline

**Responsive**
- [ ] Table hidden below `lg:`, card list exists for mobile
- [ ] Drawer becomes full width on mobile

**i18n**
- [ ] No hardcoded UI strings
- [ ] Uses translation keys

**Accessibility**
- [ ] Inputs have labels
- [ ] Buttons have focus ring
- [ ] Click targets ≥ 44px
- [ ] Status uses text + color

**Enterprise**
- [ ] Permission-based actions are hidden if not allowed
- [ ] Table has search/filter/pagination

## Failure Conditions

- Unauthorized actions remain visible as disabled controls.
- UI text is hardcoded.
- Status communication depends on color alone.
- Accessibility basics like labels, focus, or keyboard escape are missing.
