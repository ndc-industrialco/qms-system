# Portable UI Component Rules

## Buttons

- Use shared button primitives only.
- Minimum interactive height:
  - default: `h-11`
  - small: `h-9`
  - icon: `h-11 w-11`
- Minimum touch target width should not go below `44px`.
- Default radius:
  - primary button: `rounded-xl`
  - small button: `rounded-lg`
- Keep variants limited and semantic:
  - primary
  - outline
  - secondary
  - ghost
  - destructive

## Inputs And Textareas

- Standard field height: `h-11`.
- Standard horizontal padding: `px-4`.
- Field radius: `rounded-xl`.
- Default field text size: `text-sm`.
- Placeholder text should be muted, typically `text-slate-400`.
- Focus state should rely on border/ring, not color fill alone.
- Use lighter surface background for idle state and white for focus when helpful.

## Filter Bar And Search

- Use one shared filter bar pattern for operational lists.
- Standard filter bar container:
  - `card-premium`
  - `px-5 py-4`
  - `gap-3`
  - `items-end`
- Search field rules from this system:
  - search label: `text-[11px]`
  - input height: `h-8`
  - input text: `text-[13px]`
  - search icon embedded left with `pl-9`
- Filters should sit beside search on desktop and wrap naturally on mobile.
- Include clear-all control when active filters exist.
- Show result count at the far end where space allows.

## Tables

- Every operational table must support:
  - desktop grid view
  - mobile card fallback
  - loading
  - empty
  - error
  - pagination
- Table container pattern from this system:
  - white background
  - `rounded-2xl`
  - `border-slate-100`
  - soft shadow
  - horizontal overflow enabled
- Table metrics from this system:
  - header height: `h-12`
  - header padding: `px-4`
  - body cell padding: `p-4`
  - text size: `text-sm`
- Hover state should be subtle, e.g. `hover:bg-slate-50`.
- Sticky headers are preferred for long tables when scrollable.
- Mobile fallback cards should typically use `p-4`, `rounded-2xl`, and `space-y-3`.

## Pagination

- Hide pagination when total pages <= 1.
- Keep pagination compact and aligned with table surface styling.
- Standard pagination container:
  - `px-4 py-3`
  - `rounded-2xl`
  - white background
  - border and soft shadow
- Use icon buttons sized around `h-8 w-8` for previous/next.

## Cards

- Default enterprise card:
  - white background
  - `rounded-2xl`
  - 1px light border
  - soft neutral shadow
- Use `p-4` for compact summary cards.
- Use `p-6` for forms, detail sections, and higher-information cards.
- Hover-lift is optional and should remain subtle.

## Dialogs

- Use dialogs for focused tasks with limited breadth.
- Standard dialog width should cap around `max-w-lg` unless the workflow genuinely needs more space.
- Standard dialog padding: `p-6`.
- Dialog overlay should dim but not fully black out the screen.
- Footer actions should stack on mobile and align right on desktop.
- Close button should live top-right with a visible focus ring.

## Sheets / Drawers

- Use sheets for larger forms, mobile navigation, or workflows needing more vertical space.
- Right-side sheets are suitable for desktop editing flows.
- Bottom sheets are suitable for mobile task flows and should include a drag handle.
- Large desktop sheets may use width around `w-full` on mobile and `lg:w-1/2` on large screens.

## Typography And Labels

- Standard component text sizing from this system:
  - primary body: `text-sm`
  - helper text: `text-xs`
  - micro labels/meta: `text-[11px]`
  - compact field text: `text-[13px]`
- Use `font-semibold` for section and column labels.
- Use `font-medium` for most actionable text.
- Use `font-mono` for IDs, dates, sequence numbers, and operational codes when scannability matters.

## Empty, Loading, And Error States

- Loading:
  - use skeleton placeholders that preserve final structure
- Empty:
  - icon or simple illustration
  - one strong label
  - one explanatory line
- Error:
  - concise explanation
  - retry button when recoverable
- Background refetch:
  - small status text rather than full blocking spinner

## Color Usage

- Primary action color should be strong and stable.
- Error emphasis should be reserved for destructive or overdue states.
- Overdue or expired dates may use strong red text with semibold weight.
- Status indication must not rely on color alone; pair with badges or labels.
