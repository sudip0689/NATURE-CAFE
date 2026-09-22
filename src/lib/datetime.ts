/**
 * Dates, always in the café's own timezone.
 *
 * Postgres hands back timestamptz in UTC. Rendering that raw would show a
 * 00:30 IST sale as belonging to the previous day, which is exactly the kind
 * of quiet wrongness that makes an owner distrust the whole system.
 */

const TZ = "Asia/Kolkata";

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: TZ,
});

const TIME = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
  timeZone: TZ,
});

const DATE_LONG = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: TZ,
});

/**
 * "22-09-2026" — the Indian convention the spec's receipt uses.
 *
 * Built from parts rather than taking en-GB's own output, which is
 * slash-separated ("22/09/2026"). Assembling it here keeps the separator ours
 * instead of the locale's.
 */
export function formatDate(iso: string): string {
  const parts = DATE.formatToParts(new Date(iso));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${part("day")}-${part("month")}-${part("year")}`;
}

/** "04:35 pm" */
export function formatTime(iso: string): string {
  return TIME.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}

export function formatDateLong(iso: string): string {
  return DATE_LONG.format(new Date(iso));
}

/**
 * Day boundaries for filtering, expressed as explicit +05:30 instants.
 *
 * Written as a literal offset rather than computed, because India has a single
 * fixed offset and no daylight saving — so this is exact, and it keeps the
 * boundary logic identical to the `at time zone 'Asia/Kolkata'` the SQL
 * functions use. A filter that disagrees with the dashboard by five and a half
 * hours is the kind of bug an owner finds by noticing their totals don't add up.
 */
const IST_OFFSET = "+05:30";

/** Start of that café day, as an instant PostgREST can compare against. */
export function kolkataDayStart(date: string): string {
  return `${date}T00:00:00${IST_OFFSET}`;
}

/** Start of the *next* café day — use with `<`, so the end date is inclusive. */
export function kolkataDayAfter(date: string): string {
  const next = new Date(`${date}T00:00:00${IST_OFFSET}`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString();
}

/** N days before today in the café's timezone, as YYYY-MM-DD. */
export function daysAgoInKolkata(days: number): string {
  const start = new Date(`${todayInKolkata()}T00:00:00${IST_OFFSET}`);
  start.setUTCDate(start.getUTCDate() - days);
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TZ,
  }).format(start);
}

/** Today in the café's timezone, as YYYY-MM-DD for a date input. */
export function todayInKolkata(): string {
  // en-CA gives ISO-ordered parts, which is the tidiest way to get YYYY-MM-DD
  // for a specific timezone without pulling in a date library.
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TZ,
  }).format(new Date());
}
