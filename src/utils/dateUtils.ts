/**
 * Utility functions for date handling
 * Fixes timezone issues when converting Date to YYYY-MM-DD format
 */

/**
 * Converts a Date object to YYYY-MM-DD format in local timezone
 * Avoids the common issue where toISOString() shifts the date by one day
 * 
 * @param date - The date to format
 * @returns Date string in YYYY-MM-DD format (local timezone)
 * 
 * @example
 * const date = new Date('2025-11-04');
 * formatDateForInput(date); // Returns "2025-11-04" (not "2025-11-03")
 */
export function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Gets today's date in YYYY-MM-DD format (local timezone)
 * 
 * @returns Today's date string in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  return formatDateForInput(new Date());
}

/**
 * Parses a YYYY-MM-DD string to a Date object at midnight local time
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object at midnight local time
 */
export function parseDateString(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}
