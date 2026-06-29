/**
 * Shared date-formatting utility.
 * Returns an em dash (—) for null/undefined/invalid dates.
 *
 * Accepts a BCP 47 locale tag or the short aliases "th" → "th-TH" and "en" → "en-GB".
 */
export function fmtDate(iso: string | null | undefined, locale = "th-TH"): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    const tag = locale === "th" ? "th-TH" : locale === "en" ? "en-GB" : locale;
    return new Intl.DateTimeFormat(tag, { dateStyle: "medium" }).format(d);
  } catch {
    return "—";
  }
}
