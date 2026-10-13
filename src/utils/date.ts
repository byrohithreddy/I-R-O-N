/**
 * Utility functions for Indian Standard Time (IST, UTC+05:30) date handling.
 * Campus calendar dates and scheduled drive times are local IST values, while
 * actual event timestamps are stored as UTC ISO strings.
 */

const IST_OFFSET_MINUTES = 330;
const IST_OFFSET_MS = IST_OFFSET_MINUTES * 60 * 1000;

/** Return today's calendar date in India as YYYY-MM-DD (independent of host timezone). */
export function getIstCalendarDate(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

/**
 * Add calendar months to a YYYY-MM-DD date.
 * If the target month has fewer days, clamp to its last day (e.g. Aug 31 + 6
 * months = Feb 28/29), rather than allowing JavaScript Date to roll into March.
 */
export function addCalendarMonths(dateString: string, months: number): string {
  const cleanDate = dateString.trim().split('T')[0];
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cleanDate);
  if (!match || !Number.isInteger(months)) {
    throw new Error('A valid YYYY-MM-DD date and integer month offset are required.');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const sourceDate = new Date(Date.UTC(year, month - 1, day));
  if (
    sourceDate.getUTCFullYear() !== year ||
    sourceDate.getUTCMonth() !== month - 1 ||
    sourceDate.getUTCDate() !== day
  ) {
    throw new Error('Invalid calendar date.');
  }

  const targetMonthIndex = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(day, lastDayOfTargetMonth);

  return `${targetYear.toString().padStart(4, '0')}-${(targetMonth + 1).toString().padStart(2, '0')}-${targetDay.toString().padStart(2, '0')}`;
}

/** Return the number of calendar days from one YYYY-MM-DD date to another. */
export function getCalendarDayDifference(fromDate: string, toDate: string): number {
  const parse = (value: string) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim().split('T')[0]);
    if (!match) throw new Error('Calendar dates must use YYYY-MM-DD format.');
    const [year, month, day] = match.slice(1).map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      throw new Error('Invalid calendar date.');
    }
    return Date.UTC(year, month - 1, day);
  };
  return (parse(toDate) - parse(fromDate)) / (24 * 60 * 60 * 1000);
}

/** Add calendar days without relying on the host machine's timezone. */
export function addCalendarDays(dateString: string, days: number): string {
  if (!Number.isInteger(days)) throw new Error('A whole-number day offset is required.');
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString.trim().split('T')[0]);
  if (!match) throw new Error('A valid YYYY-MM-DD date is required.');
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.getUTCFullYear().toString().padStart(4, '0') + '-' +
    (date.getUTCMonth() + 1).toString().padStart(2, '0') + '-' +
    date.getUTCDate().toString().padStart(2, '0');
}

/** Format a real event timestamp explicitly as India local time. */
export function formatIstTimestamp(
  timestamp: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!timestamp) return 'N/A';
  // SQLite datetime('now') values are UTC but omit the timezone marker.
  // Normalize those values to ISO UTC before formatting them in India time.
  const normalizedTimestamp = typeof timestamp === 'string'
    ? timestamp.replace(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2}(?:\.\d+)?)$/, '$1T$2Z')
    : timestamp;
  const date = normalizedTimestamp instanceof Date ? normalizedTimestamp : new Date(normalizedTimestamp);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('en-IN', {
    ...(options || { dateStyle: 'medium', timeStyle: 'short' }),
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

/**
 * Calculates midnight IST on a drive calendar date as a UTC ISO timestamp.
 * Example: 2026-11-05 at 00:00 IST -> 2026-11-04T18:30:00.000Z.
 */
export function calculateIstApplicationDeadline(driveDate: string): string {
  const cleanDate = driveDate?.trim().split('T')[0];
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cleanDate || '');
  if (!match) {
    throw new Error('A valid drive date in YYYY-MM-DD format is required to calculate the application deadline.');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day
  ) {
    throw new Error('Invalid drive date. Use YYYY-MM-DD.');
  }

  // Drive dates are IST calendar dates; convert only the deadline instant to UTC.
  return new Date(Date.UTC(year, month - 1, day) - IST_OFFSET_MS).toISOString();
}

/** Check whether the absolute deadline instant has passed. */
export function isDeadlineExpired(deadlineIsoString: string): boolean {
  if (!deadlineIsoString) return false;
  const deadline = new Date(deadlineIsoString).getTime();
  return Number.isFinite(deadline) && Date.now() >= deadline;
}
