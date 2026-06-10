# UI Design System

## Visual Direction

The interface must feel clean, professional, enterprise-ready, easy to scan, and Thai-English ready.

Prioritize clarity over decoration. Use color only to support meaning, not decoration alone.

## Color Tokens

### Brand

| Token | Value | Tailwind |
| --- | --- | --- |
| Primary base | `#0F1059` | `bg-[#0F1059]` |
| Primary hover | `#161875` | `hover:bg-[#161875]` |
| Title text | `#0F1059` | `text-[#0F1059]` |
| Heading text | `#1E293B` | `text-slate-800` |
| Body text | `#475569` | `text-slate-600` |
| Caption / metadata | `#94A3B8` | `text-slate-400` |
| App background | `#F1F5F9` | `bg-slate-100` |
| Card / modal / drawer | `#FFFFFF` | `bg-white` |
| Input background | — | `bg-slate-50/50` |

### State Colors

| State | Text | Background | Border |
| --- | --- | --- | --- |
| Success | `text-emerald-600` | `bg-emerald-50` | `border-emerald-200` |
| Warning | `text-amber-600` | `bg-amber-50` | `border-amber-200` |
| Danger | `text-rose-600` | `bg-rose-50` | `border-rose-200` |
| Info | `text-sky-600` | `bg-sky-50` | `border-sky-200` |
| Neutral | `text-slate-500` | `bg-slate-50` | `border-slate-200` |

### Color Usage Rules

- Use `#0F1059` only for brand emphasis, sidebar, page title, and main CTA.
- Use `text-slate-800` for important readable headings.
- Use `text-slate-600` for normal body text.
- Use `text-slate-400` only for captions, metadata, and helper text.
- Never rely on color alone. Always pair status color with text or icon.

## Typography

System font: `Inter, ui-sans-serif, system-ui, sans-serif`

| Role | Size | Weight | Color |
| --- | --- | --- | --- |
| Page Title | `text-2xl` | `font-bold tracking-tight` | `text-[#0F1059]` |
| Section Title | `text-xl` | `font-semibold tracking-tight` | `text-slate-800` |
| Card / Bento Title | `text-lg` | `font-semibold` | `text-slate-800` |
| Body / Default | `text-base` | `font-normal` | `text-slate-600` |
| Table / Form | `text-sm` | `font-normal` | `text-slate-600` |
| Caption | `text-xs` | `font-normal` | `text-slate-400` |
| Code / Date | `text-sm font-mono` | `font-normal` | `text-slate-600` |

Caption labels may use `tracking-wide uppercase`.

## Shapes, Borders, and Shadows

| Element | Class |
| --- | --- |
| Card radius | `rounded-2xl` |
| Button / Input radius | `rounded-xl` |
| Badge radius | `rounded-full` |
| Card / Modal shadow | `shadow-[0_8px_30px_rgb(0,0,0,0.04)]` |
| Default border | `border border-slate-100` |
| Input border | `border border-slate-200` |

## Spacing

| Context | Class |
| --- | --- |
| Page wrapper | `px-4 md:px-6 lg:px-8 py-6 max-w-7xl mx-auto` |
| Section gap | `space-y-6` |
| Grid gap | `gap-6` |
| Form gap | `space-y-4` or `gap-4` |
| Default card padding | `p-6` |
| Compact card padding | `p-4` |
| Dense card padding | `p-3` |
| Button | `px-4 py-2` |
| Large Button | `px-6 py-2.5` |

## Density Modes

| Mode | Use Case | Card Padding | Table Row | Gap |
| --- | --- | --- | --- | --- |
| Comfortable (default) | Standard pages | `p-6` | `py-3 px-4` | `gap-6` |
| Compact | Dashboard-heavy pages | `p-4` | `py-2 px-3` | `gap-4` |
| Dense | ERP / approval tables | `p-3` | `py-1.5 px-2` | `gap-2` |

Do not mix more than two density modes on one page.

## Theme Policy

- Light mode only.
- Do not introduce Tailwind `dark:` utilities unless explicitly instructed.

## Failure Conditions

- UI introduces ad hoc color, spacing, or typography patterns.
- Important text uses caption color (`text-slate-400`).
- A status is encoded by color alone.
- Dark mode utilities are introduced without an explicit requirement.
