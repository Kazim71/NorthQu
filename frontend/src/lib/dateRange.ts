/**
 * Shared date-range model for the dashboard's date picker (Leads,
 * Anonymous Visitors, Summary). Pure and framework-agnostic — safe to import
 * from both Server Components (parsing searchParams) and the client picker
 * (formatting, computing the next URL).
 *
 * Represented as a plain `{ from, to }` pair rather than a `days` count
 * everywhere, so an explicit custom range (picked on the calendar) and a
 * quick-select preset (1/7/30/90) resolve to the exact same shape and every
 * query function only has to handle one case.
 */

export interface DateRange {
  /** Inclusive, start of day. */
  from: Date;
  /** Inclusive, end of day (23:59:59.999). */
  to: Date;
}

export const QUICK_RANGES = [1, 7, 30, 90] as const;
export type QuickRangeDays = (typeof QUICK_RANGES)[number];

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

/** `YYYY-MM-DD`, using LOCAL date parts (not toISOString, which is UTC and
 *  can roll the date over near midnight in non-UTC timezones). */
export function toDateParam(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fromDateParam(s: string): Date | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function rangeFromDays(days: number, now: Date = new Date()): DateRange {
  const to = endOfDay(now);
  const from = startOfDay(new Date(now.getTime() - (days - 1) * DAY_MS));
  return { from, to };
}

/**
 * Reads `?from=YYYY-MM-DD&to=YYYY-MM-DD` (custom range) or `?days=N` (preset)
 * from a Next.js page's `searchParams`. Falls back to the 7-day preset —
 * chosen as the default because it is the middle quick-select option and
 * comfortably covers "what happened recently" without an empty-looking
 * dashboard for a low-traffic tenant.
 */
export function parseDateRangeFromSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): DateRange {
  const fromParam = typeof searchParams.from === 'string' ? searchParams.from : null;
  const toParam = typeof searchParams.to === 'string' ? searchParams.to : null;

  if (fromParam && toParam) {
    const from = fromDateParam(fromParam);
    const to = fromDateParam(toParam);
    if (from && to && from.getTime() <= to.getTime()) {
      return { from: startOfDay(from), to: endOfDay(to) };
    }
    // Malformed/inverted params fall through to the default rather than
    // erroring the page for a bad URL.
  }

  const daysParam = typeof searchParams.days === 'string' ? Number(searchParams.days) : NaN;
  if (Number.isFinite(daysParam) && daysParam > 0 && daysParam <= 365) {
    return rangeFromDays(daysParam);
  }

  return rangeFromDays(7);
}

/** Whole days spanned by the range, inclusive (a same-day range is 1). */
export function rangeLengthDays(range: DateRange): number {
  return Math.round((endOfDay(range.to).getTime() - startOfDay(range.from).getTime()) / DAY_MS) + 1;
}

/**
 * The window of equal length immediately preceding `range`, for "vs. prior
 * period" trend comparisons — the range-based generalization of
 * getEventCountTrend's old fixed 7-vs-7-day comparison.
 */
export function previousRange(range: DateRange): DateRange {
  const lengthMs = endOfDay(range.to).getTime() - startOfDay(range.from).getTime() + 1;
  const to = new Date(startOfDay(range.from).getTime() - 1);
  const from = new Date(to.getTime() - lengthMs + 1);
  return { from: startOfDay(from), to: endOfDay(to) };
}

/**
 * If `range` exactly matches a quick preset (as of `now`), returns the
 * preset's day count — used to highlight the matching pill as active rather
 * than always falling into the "Custom" state.
 */
export function matchingPreset(range: DateRange, now: Date = new Date()): QuickRangeDays | null {
  for (const days of QUICK_RANGES) {
    const preset = rangeFromDays(days, now);
    if (toDateParam(preset.from) === toDateParam(range.from) && toDateParam(preset.to) === toDateParam(range.to)) {
      return days;
    }
  }
  return null;
}

export function formatRangeLabel(range: DateRange): string {
  const sameYear = range.from.getFullYear() === range.to.getFullYear();
  const fmt = (d: Date, withYear: boolean) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: withYear ? 'numeric' : undefined });

  if (toDateParam(range.from) === toDateParam(range.to)) {
    return fmt(range.from, true);
  }
  return `${fmt(range.from, !sameYear)} – ${fmt(range.to, true)}`;
}
