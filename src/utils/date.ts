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

/** Format a real event timestamp explicitly as India local time. */
export function formatIstTimestamp(
  timestamp: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }
): string {
  if (!timestamp) return 'N/A';
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('en-IN', { ...options, timeZone: 'Asia/Kolkata' }).format(date);
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
