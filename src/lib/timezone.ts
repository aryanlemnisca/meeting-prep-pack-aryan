// All time display and date logic uses Asia/Kolkata
export const TIMEZONE = 'Asia/Kolkata';

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: TIMEZONE,
  });
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', {
    timeZone: TIMEZONE,
  });
}

export function formatFullDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: TIMEZONE,
  });
}

// Get start and end of today in IST
export function getTodayBoundsIST(): { startOfDay: Date; endOfDay: Date } {
  const now = new Date();
  const istString = now.toLocaleDateString('en-CA', { timeZone: TIMEZONE }); // YYYY-MM-DD format
  const startOfDay = new Date(`${istString}T00:00:00+05:30`);
  const endOfDay = new Date(`${istString}T23:59:59.999+05:30`);
  return { startOfDay, endOfDay };
}
