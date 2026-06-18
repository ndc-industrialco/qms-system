# UI Standards

- Read `rules/ui-ops-content.md` first for any frontend task.
- Use `rules/ui-design-system.md` as the source of truth for colors, typography, spacing, radius, density, and light-mode policy.
- Use `rules/ui-layouts.md` for responsive shells, page headers, grids, and sidebar layout.
- Use `rules/ui-forms-overlays.md` for forms, validation, modal, drawer, and sheet behavior.
- Use `rules/ui-components-states.md` for buttons, badges, skeleton, empty, error, and toast patterns.
- Use `rules/ui-patterns-accessibility.md` for page archetypes, permissions, accessibility, and i18n behavior.
- Use `rules/ui-tables.md` for tables, filter bars, pagination, and mobile card fallback.
- Complex interactive components must use Radix UI primitives.
- On mobile, create/edit form overlays must use a bottom sheet rather than a centered modal.
- Toast notifications should use the shared system standard.
- Light mode only unless explicitly changed by project direction.

## Icon Standards

- Primary icon library is `lucide-react`.
- Default to Lucide icons for app actions, status, navigation, table actions, empty states, and inline metadata.
- Do not introduce a second general-purpose icon library for normal product UI.
- Custom SVG icons are allowed only for brand assets, product logos, Microsoft-specific marks, or domain illustrations that Lucide cannot represent clearly.
- If a custom icon is required, wrap it in a small local component with the same sizing and className API used by Lucide icons.

### Icon Sizing

- Page header or hero icon: `h-5 w-5` or `h-6 w-6`
- Standard button-leading icon: `h-4 w-4`
- Dense table action or compact status icon: `h-3.5 w-3.5`
- Icon-only button content: `h-4 w-4`
- Large empty-state or section illustration icon: `h-8 w-8` up to `h-10 w-10`
- Keep icon and text vertically centered with `inline-flex items-center`

### Visual Rules

- Icons inherit text color via `currentColor`; do not hardcode SVG fill/stroke colors inline unless the icon is a logo/brand mark.
- Prefer stroke icons for operational UI. Avoid mixing filled and outline styles in the same control group.
- Keep icon stroke weight visually consistent. For Lucide, use the default stroke unless a specific accessibility need requires change.
- Do not use decorative icons when the label already fully communicates the action and the icon adds noise.
- Do not rely on color-only meaning; pair status icons with text or badge labels.

### Interaction Rules

- Every repeated action should map to the same icon across the system.
- Recommended mapping:
- View -> `Eye`
- Edit -> `Pencil`
- Delete / Remove -> `Trash2`
- Add / Create -> `Plus`
- Search -> `Search`
- Filter -> `Filter`
- Download -> `Download`
- Upload -> `Upload`
- Send / Submit -> `Send`
- Approve / Success -> `CheckCircle2`
- Reject / Error -> `XCircle`
- Warning / Attention -> `AlertTriangle`
- Info -> `Info`
- Time / Pending -> `Clock`
- User / Assignee -> `User`
- Department / Organization -> `Building2`
- Document / File -> `FileText`
- Folder / Category -> `FolderOpen`

### Composition Rules

- Buttons with text should place the icon before the label unless the icon indicates direction, expansion, or external navigation.
- Use icon-only buttons only for well-known row actions, toolbar actions, close controls, and compact mobile affordances.
- Every icon-only button must have an `aria-label` or visible tooltip/title that matches the action meaning.
- In tables, row action icons must use shared meanings and the same order across modules.
- Status badges may include an icon, but the icon must stay secondary to the text label.

### Implementation Rules

- Prefer importing icons directly from `lucide-react` in feature components.
- When the same icon pattern repeats across modules, extract a shared wrapper or config instead of re-declaring multiple bespoke SVG components.
- Avoid copying raw inline SVG into feature files unless it is a deliberate brand/domain asset.
- When replacing older custom icons, preserve user-recognizable meaning first and stylistic preference second.
