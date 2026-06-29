/**
 * Shared date-formatting utility.
 * Returns an em dash (—) for null/undefined/invalid dates.
 */
export function fmtDate(iso: string | null | undefined, locale = "th-TH"): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(d);
  } catch {
    return "—";
  }
}
