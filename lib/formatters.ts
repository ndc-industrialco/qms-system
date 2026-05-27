export type Locale = "th" | "en";

// ── Date ──────────────────────────────────────────────────────────────────────

/**
 * Format an ISO string as a short date: "26 May 2026" / "26 พ.ค. 2569"
 */
export function fmtDate(iso: string, locale: Locale = "en"): string {
  return new Date(iso).toLocaleDateString(
    locale === "th" ? "th-TH" : "en-GB",
    { day: "2-digit", month: "short", year: "numeric" },
  );
}

/**
 * Format an ISO string as date + time: "26 May 2026, 14:30" / "26 พ.ค. 2569 14:30"
 */
export function fmtDateTime(iso: string, locale: Locale = "en"): string {
  return new Date(iso).toLocaleString(
    locale === "th" ? "th-TH" : "en-GB",
    { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" },
  );
}

/**
 * Format an ISO string as a relative time: "3m ago", "2h ago", "5d ago".
 * Falls back to fmtDate after 7 days.
 */
export function fmtRelative(iso: string, locale: Locale = "en"): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (locale === "th") {
    if (minutes < 1) return "เมื่อกี้";
    if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
    if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
    if (days < 7) return `${days} วันที่แล้ว`;
    return fmtDate(iso, "th");
  }

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return fmtDate(iso, "en");
}

// ── Number ────────────────────────────────────────────────────────────────────

/**
 * Format a number with locale-appropriate thousands separators.
 */
export function fmtNumber(n: number, locale: Locale = "en"): string {
  return n.toLocaleString(locale === "th" ? "th-TH" : "en-US");
}
