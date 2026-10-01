/**
 * Utility functions for Indian Standard Time (IST, UTC+5:30) date handling.
 * In campus recruitment, deadlines are strictly evaluated relative to Indian midnight.
 */

/**
 * Calculates strict 00:00:00 IST on the driveDate in standard UTC ISO format.
 * Example: '2026-10-05' at 00:00 IST -> '2026-10-04T18:30:00.000Z'
 */
export function calculateIstApplicationDeadline(driveDate: string): string {
  if (!driveDate) return new Date().toISOString();
  const cleanDate = driveDate.trim().split('T')[0];
  const parts = cleanDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return `${cleanDate}T00:00:00Z`;
  }
  const [year, month, day] = parts;
  // Construct UTC timestamp corresponding to 00:00:00 IST (+05:30)
  // IST is 5 hours and 30 minutes ahead of UTC, so 00:00 IST is previous day 18:30 UTC
  const istDateMs = Date.UTC(year, month - 1, day, 0, 0, 0) - (5.5 * 60 * 60 * 1000);
  return new Date(istDateMs).toISOString();
}

/**
 * Checks whether an application deadline has passed relative to current time.
 */
export function isDeadlineExpired(deadlineIsoString: string): boolean {
  if (!deadlineIsoString) return false;
  return Date.now() >= new Date(deadlineIsoString).getTime();
}
