/**
 * Get ISO week number for a given date
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Get the current week number
 */
export function getCurrentWeek(): { weekNumber: number; year: number } {
  const now = new Date();
  return {
    weekNumber: getWeekNumber(now),
    year: now.getFullYear(),
  };
}

/**
 * Get the date of Monday for a given week
 */
export function getMondayOfWeek(weekNumber: number, year: number): Date {
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7;
  const firstMonday = new Date(year, 0, 4 - jan4Day + 1);
  const targetMonday = new Date(firstMonday);
  targetMonday.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);
  return targetMonday;
}

/**
 * Format week display (e.g., "S46")
 */
export function formatWeek(weekNumber: number): string {
  return `S${weekNumber}`;
}
