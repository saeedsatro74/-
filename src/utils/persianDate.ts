import { useState, useEffect } from 'react';

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

export function getCurrentPersianTimeString(includeSeconds = true): string {
  try {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    if (!includeSeconds) {
      return `${hours}:${minutes}`;
    }
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  } catch {
    return includeSeconds ? '12:00:00' : '12:00';
  }
}

export function getCurrentExactPersianTime(includeSeconds = true): string {
  return getCurrentPersianTimeString(includeSeconds);
}

/**
 * Extracts exact formatted time (e.g. "14:35:20" or "14:35") from transaction
 */
export function getTransactionExactTime(tx: { time?: string; createdAt?: string; approvedAt?: string }): string {
  if (tx.time && tx.time.trim()) {
    return tx.time.trim();
  }

  if (tx.createdAt) {
    try {
      const d = new Date(tx.createdAt);
      if (!isNaN(d.getTime())) {
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
      }
    } catch {
      // ignore
    }
  }

  if (tx.approvedAt && tx.approvedAt.includes('ساعت')) {
    const match = tx.approvedAt.match(/ساعت\s*([\d:]+)/);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return '12:00:00';
}

export function getPersianDateTimeString(dateStr?: string, includeSeconds = true): string {
  const d = dateStr || getTodayJalaliString();
  const t = getCurrentPersianTimeString(includeSeconds);
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

/**
 * Converts Jalali date (jy, jm, jd) to Gregorian date (gy, gm, gd)
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  let gy: number;
  if (jy > 979) {
    gy = 1600;
    jy -= 979;
  } else {
    gy = 621;
  }
  let days =
    365 * jy +
    Math.floor(jy / 33) * 8 +
    Math.floor(((jy % 33) + 3) / 4) +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);

  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal_a = [0, 31, (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 0; gm < 13; gm++) {
    const v = sal_a[gm];
    if (gd <= v) break;
    gd -= v;
  }
  return [gy, gm, gd];
}

/**
 * Parses a Jalali string like "1405/06/14" or "1403-12-10" into a JS Date
 */
export function parseJalaliDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const cleaned = dateStr.trim();
  const parts = cleaned.split(/[/ -]/).map((p) => parseInt(p, 10));
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return null;
  }
  let [jy, jm, jd] = parts;
  // If 2-digit year like "03", assume 1400s
  if (jy < 100) jy += 1400;
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
  return new Date(gy, gm - 1, gd, 12, 0, 0); // midday to prevent local timezone boundary issues
}

const PERSIAN_WEEKDAYS = [
  'یکشنبه', // 0 = Sunday
  'دوشنبه', // 1 = Monday
  'سه‌شنبه', // 2 = Tuesday
  'چهارشنبه', // 3 = Wednesday
  'پنج‌شنبه', // 4 = Thursday
  'جمعه', // 5 = Friday
  'شنبه', // 6 = Saturday
];

/**
 * Returns the Persian day of the week, e.g. "دوشنبه"
 */
export function getPersianDayOfWeek(dateStr: string): string {
  const d = parseJalaliDate(dateStr);
  if (!d) return '';
  return PERSIAN_WEEKDAYS[d.getDay()] || '';
}

/**
 * Returns Persian relative days e.g. "امروز", "دیروز", "۵ روز پیش"
 */
export function getRelativePersianDays(dateStr: string): string {
  const target = parseJalaliDate(dateStr);
  if (!target) return '';

  const now = new Date();
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
  const targetDate = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 12, 0, 0);

  const diffMs = todayDate.getTime() - targetDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'امروز';
  if (diffDays === 1) return 'دیروز';
  if (diffDays === 2) return '۲ روز پیش';
  if (diffDays > 2) return `${diffDays} روز پیش`;
  if (diffDays === -1) return 'فردا';
  if (diffDays < -1) return `${Math.abs(diffDays)} روز بعد`;
  return '';
}

/**
 * Formats full human friendly Persian date breakdown with day of week & relative days
 * e.g. { date: '1405/06/14', dayOfWeek: 'دوشنبه', relative: '۵ روز پیش', fullText: '۵ روز پیش (دوشنبه)' }
 */
export function getPersianDateRelativeInfo(dateStr: string) {
  const dayOfWeek = getPersianDayOfWeek(dateStr);
  const relative = getRelativePersianDays(dateStr);

  let fullBadge = '';
  if (relative && dayOfWeek) {
    if (relative === 'امروز' || relative === 'دیروز') {
      fullBadge = `${relative} • ${dayOfWeek}`;
    } else {
      fullBadge = `${relative} (${dayOfWeek})`;
    }
  } else {
    fullBadge = relative || dayOfWeek;
  }

  return {
    date: dateStr,
    dayOfWeek,
    relative,
    fullBadge,
  };
}

/**
 * React hook that returns live updating Persian date and exact time (HH:mm:ss) every second
 */
export function useLivePersianClock() {
  const [time, setTime] = useState<string>(() => getCurrentPersianTimeString(true));
  const [date, setDate] = useState<string>(() => getPersianFullDate());
  const [jalaliDate, setJalaliDate] = useState<string>(() => getTodayJalaliString());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(getCurrentPersianTimeString(true));
      setDate(getPersianFullDate());
      setJalaliDate(getTodayJalaliString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return { time, date, jalaliDate };
}



