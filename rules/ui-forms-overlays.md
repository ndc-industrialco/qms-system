# UI Forms and Overlays

## Form Architecture

- Use React Hook Form with Zod for all forms.
- Required fields must display a rose-colored `*`.
- Validation errors must appear directly below the field.
- Invalid fields must block submission.
- Use inline validation for user-correctable input.
- Do not use toast for field-level validation.

## Form Field Tokens

```tsx
{/* Label */}
<label htmlFor="fieldName" className="text-slate-800 text-sm font-semibold mb-2 block">
  Field Name <span className="text-rose-600">*</span>
</label>

{/* Text Input */}
<input className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 text-sm focus:outline-none focus:border-[#0F1059] focus:bg-white transition-colors" />

{/* Textarea */}
<textarea className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 text-sm resize-none focus:outline-none focus:border-[#0F1059] focus:bg-white transition-colors" />

{/* Error text */}
<p className="text-rose-600 text-xs mt-1">This field is required.</p>

{/* Helper text */}
<p className="text-slate-400 text-xs mt-1">Helper text or description.</p>
```

## Field States

| State | Input Class |
| --- | --- |
| Default | `border-slate-200 bg-slate-50/50` |
| Focus | `focus:border-[#0F1059] focus:bg-white` |
| Error | `border-rose-300 text-rose-700 focus:border-rose-500` |
| Disabled | `bg-slate-100 text-slate-400 cursor-not-allowed` |
| Success | `border-emerald-300` |

## Full Field Pattern

```tsx
<div>
  <label htmlFor="docName" className="text-slate-800 text-sm font-semibold mb-2 block">
    Document Name <span className="text-rose-600">*</span>
  </label>
  <input
    id="docName"
    aria-invalid={!!error}
    aria-describedby="docName-error"
    className={`w-full bg-slate-50/50 border rounded-xl px-4 py-2.5 text-sm transition-colors focus:outline-none ${
      error
        ? "border-rose-300 text-rose-700 focus:border-rose-500"
        : "border-slate-200 text-slate-700 focus:border-[#0F1059] focus:bg-white"
    }`}
  />
  {error && <p id="docName-error" className="text-rose-600 text-xs mt-1">{error.message}</p>}
</div>
```

## Container Selection

| Condition | Container |
| --- | --- |
| 1–2 fields | Modal |
| 3–4 fields | Modal or small drawer |
| 5 or more fields | Drawer — Half |
| Long / multi-step workflow | Drawer — Half |
| Confirm action | Modal |
| Destructive action | Modal |
| Mobile | Bottom Sheet |

## Drawer Pattern (5+ fields)

```tsx
<div className={`fixed inset-y-0 right-0 w-full md:w-1/2 bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}>
  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
    <h2 className="text-lg font-semibold text-slate-800">Form Title</h2>
    <button onClick={onClose} className="h-11 min-w-[44px] text-slate-400 hover:text-slate-600">✕</button>
  </div>
  <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
    {/* fields */}
  </div>
  <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
    <button onClick={onClose} className="bg-white text-slate-700 border border-slate-200 rounded-xl px-4 py-2 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
    <button className="bg-[#0F1059] text-white rounded-xl px-4 py-2 text-sm hover:bg-[#161875] transition-colors">Save</button>
  </div>
</div>
{open && <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />}
```

## Modal Pattern (1–4 fields / confirm / destructive)

```tsx
<dialog className="modal modal-open">
  <div className="modal-box rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] max-w-md w-full">
    <h3 className="text-lg font-semibold text-slate-800 mb-4">Dialog Title</h3>
    <div className="space-y-4">
      {/* fields */}
    </div>
    <div className="flex justify-end gap-2 mt-6">
      <button onClick={onClose} className="bg-white text-slate-700 border border-slate-200 rounded-xl px-4 py-2 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
      {/* For destructive: */}
      <button className="bg-rose-600 text-white rounded-xl px-4 py-2 text-sm hover:bg-rose-700 transition-colors">Delete</button>
    </div>
  </div>
  <div className="modal-backdrop" onClick={onClose} />
</dialog>
```

## Bottom Sheet (Mobile)

```tsx
<div className={`fixed inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl z-50 transform transition-transform duration-300 ${open ? "translate-y-0" : "translate-y-full"}`}>
  <div className="flex justify-center pt-3 pb-1">
    <div className="w-10 h-1 bg-slate-200 rounded-full" />
  </div>
  <div className="px-6 py-4 border-b border-slate-100">
    <h2 className="text-lg font-semibold text-slate-800">Form Title</h2>
  </div>
  <div className="px-6 py-4 overflow-y-auto max-h-[70vh] space-y-4">
    {/* fields */}
  </div>
  <div className="px-6 py-4 border-t border-slate-100 flex gap-2">
    <button className="flex-1 bg-white text-slate-700 border border-slate-200 rounded-xl py-2 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
    <button className="flex-1 bg-[#0F1059] text-white rounded-xl py-2 text-sm hover:bg-[#161875] transition-colors">Save</button>
  </div>
</div>
```

## Notification Rules

- Use toast for form-level success and non-blocking failure.
- Success toast auto-dismisses in 3 seconds.
- Error toast must not auto-dismiss.
- Do not use toast for destructive confirmation (use modal).
- Do not use toast for field-level validation (use inline error).

## Failure Conditions

- Field validation is shown only in toast.
- A long form is forced into a cramped modal.
- Required markers are missing.
- Destructive actions skip explicit confirmation.
