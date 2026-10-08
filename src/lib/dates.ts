/**
 * Central Date and Business-Day Helper
 * Required by AGENTS.md Rule 7 and docs/domain.md.
 * All business-day math goes through this helper.
 * Per docs/open-questions.md Q31: Monday to Friday, no holiday calendar.
 */

export function isBusinessDay(date: Date): boolean {
  const day = date.getUTCDay();
  return day !== 0 && day !== 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Adds N business days to a date, skipping weekends.
 */
export function addBusinessDays(startDate: Date, businessDays: number): Date {
  const current = new Date(startDate.getTime());
  let added = 0;

  while (added < businessDays) {
    current.setUTCDate(current.getUTCDate() + 1);
    if (isBusinessDay(current)) {
      added++;
    }
  }

  return current;
}

/**
 * Counts the number of business days between two dates (exclusive of start, inclusive of end)
 */
export function countBusinessDays(startDate: Date, endDate: Date): number {
  if (startDate >= endDate) return 0;

  const current = new Date(startDate.getTime());
  let count = 0;

  while (current < endDate) {
    current.setUTCDate(current.getUTCDate() + 1);
    if (isBusinessDay(current) && current <= endDate) {
      count++;
    }
  }

  return count;
}

/**
 * Adds regular calendar days
 */
export function addCalendarDays(startDate: Date, days: number): Date {
  const result = new Date(startDate.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}
