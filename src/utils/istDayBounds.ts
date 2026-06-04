/** Day boundaries for Asia/Kolkata (used by daily digest only). */
export function getIstDateKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function getIstDayBounds(date: Date = new Date()): { start: Date; end: Date } {
  const dateKey = getIstDateKey(date);
  return {
    start: new Date(`${dateKey}T00:00:00+05:30`),
    end: new Date(`${dateKey}T23:59:59.999+05:30`),
  };
}

export function formatDateInIst(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}
