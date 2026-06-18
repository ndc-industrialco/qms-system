# Portable UI Layout Rules

## Goals

- Make enterprise screens dense enough for daily operations without becoming visually cramped.
- Keep layout consistent across dashboard, list, detail, and form pages.

## Page Shell Rules

- Use a two-zone shell on desktop:
  - persistent sidebar
  - main content column
- Use a mobile drawer or sheet for sidebar navigation on small screens.
- Main content must scroll independently from the sidebar.
- Header should remain visible with sticky behavior when the product is navigation-heavy.

## Shell Metrics Derived From This System

- App background: light neutral surface rather than plain white.
- Main content area padding:
  - mobile: `px-4 py-6`
  - desktop: `md:px-8 pb-8`
- Standard card radius:
  - primary cards: `rounded-2xl`
  - smaller controls: `rounded-xl`
- Standard operational shadow:
  - `shadow-[0_8px_30px_rgb(0,0,0,0.04)]`
- Standard border color:
  - `border-slate-100` for containers
  - `border-slate-200` for controls

## Header Rules

- Header should contain:
  - mobile sidebar toggle
  - page title or breadcrumb
  - locale switch if supported
  - notifications
  - profile menu
- Mobile title should be a single truncated line.
- Desktop should prefer breadcrumbs for location context.
- Header height should remain compact; this system uses `h-14`.

## Sidebar Rules

- Sidebar should visually differ from the content surface.
- Active and hover states must be obvious with both color and surface change.
- Collapsing or drawer behavior must not hide primary navigation on mobile.

## Page Spacing Rules

- Standard vertical rhythm:
  - page sections: `gap-4`
  - control clusters: `gap-3`
  - small inline action groups: `gap-1.5` to `gap-2`
- Standard content card padding:
  - compact cards: `p-4`
  - default cards/forms: `p-6`
  - modal detail blocks: `p-6`
- Avoid mixed arbitrary spacing unless the component is highly custom.

## Typography Rules

- Base document size: `16px`.
- Prefer readable operational typography over decorative scaling.
- Recommended usage from this system:
  - page title mobile: `text-[15px] font-semibold`
  - dialog title: `text-lg font-semibold`
  - section title: `text-base font-semibold`
  - body text: `text-sm`
  - support/meta text: `text-xs`
  - micro labels: `text-[11px]`
- Important codes and identifiers may use `font-mono`.

## Background And Surface Rules

- Use subtle texture or tonal variation to reduce flatness in large enterprise screens.
- Keep content surfaces white or near-white for data density and readability.
- Decorative background treatments must not reduce contrast or compete with data.
