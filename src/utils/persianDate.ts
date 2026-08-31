/**
 * Persian (Jalali / Solar Hijri) date and time utilities
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

export function getCurrentPersianTimeString(): string {
  try {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '12:00';
  }
}

export function getPersianDateTimeString(dateStr?: string): string {
  const d = dateStr || getTodayJalaliString();
  const t = getCurrentPersianTimeString();
  return `${d} ساعت ${t}`;
}

export function generateReceiptNumber(type = 'tx'): string {
  const jalali = getTodayJalaliString().replace(/\//g, '').slice(2); // e.g. "031210"
  const randomSuffix = Math.floor(1000 + Math.random() * 9000); // 4-digit random
  const prefix = type === 'buy' ? 'REC-BUY' : type === 'sell' ? 'REC-SEL' : 'REC';
  return `${prefix}-${jalali}-${randomSuffix}`;
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

