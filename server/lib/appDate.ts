const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Tashkent';

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDateInAppTimezone(date: Date): string {
  const parts = getFormatter(APP_TIMEZONE).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

export function getRecentAppDateStrings(days: number, now: Date = new Date()): string[] {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() - index);
    return formatDateInAppTimezone(date);
  }).reverse();
}

export function getAppTimezone(): string {
  return APP_TIMEZONE;
}
