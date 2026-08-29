/**
 * Persian (Jalali / Solar Hijri) date utilities
 */

export function getTodayJalaliString(): string {
  try {
    const formatter = new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(new Date());
    const year = parts.find((p) => p.type === 'year')?.value || '1403';
    const month = parts.find((p) => p.type === 'month')?.value || '01';
    const day = parts.find((p) => p.type === 'day')?.value || '01';
    return `${year}/${month}/${day}`;
  } catch {
    return '1403/12/10';
  }
}

export function formatPersianDateDisplay(dateStr: string): string {
  if (!dateStr) return '-';
  return dateStr;
}

export function getPersianFullDate(): string {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date());
  } catch {
    return 'امروز';
  }
}
