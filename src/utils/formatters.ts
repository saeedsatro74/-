/**
 * Number, Currency, Weight, and Financial Formatting Utilities
 */

/**
 * Format numbers with 3-digit comma separation in Persian digits
 */
export function formatNumber(num: number | undefined | null, decimals = 0): string {
  if (num === undefined || num === null || isNaN(num)) return '۰';
  
  const absNum = Math.abs(num);
  const fixedStr = decimals > 0 
    ? absNum.toFixed(decimals) 
    : Math.round(absNum).toString();
  
  const [intPart, decPart] = fixedStr.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  let result = decPart && decimals > 0 ? `${formattedInt}.${decPart}` : formattedInt;
  
  // Convert to Persian digits
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  result = result.replace(/[0-9]/g, (w) => persianDigits[+w]);
  result = result.replace('.', '٫').replace(/,/g, '٬');
  
  return num < 0 ? `-${result}` : result;
}

/**
 * Format numbers with standard 3-digit comma separation in English digits (e.g. "100,000,000")
 */
export function formatNumberEn(num: number | undefined | null, decimals = 0): string {
  if (num === undefined || num === null || isNaN(num)) return '0';
  
  const absNum = Math.abs(num);
  const fixedStr = decimals > 0 
    ? absNum.toFixed(decimals) 
    : Math.round(absNum).toString();
  
  const [intPart, decPart] = fixedStr.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  const result = decPart && decimals > 0 ? `${formattedInt}.${decPart}` : formattedInt;
  return num < 0 ? `-${result}` : result;
}

/**
 * Format Toman currency
 */
export function formatToman(amount: number | undefined | null, showUnit = true): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return showUnit ? `۰ تومان` : `۰`;
  }
  const formatted = formatNumber(amount, 0);
  return showUnit ? `${formatted} تومان` : formatted;
}

/**
 * Format Copper Weight in Kg
 */
export function formatWeight(kg: number | undefined | null, showUnit = true): string {
  if (kg === undefined || kg === null || isNaN(kg)) {
    return showUnit ? `۰ کیلوگرم` : `۰`;
  }
  // If integer weight, no decimals, otherwise up to 2 decimal places
  const decimals = kg % 1 === 0 ? 0 : 2;
  const formatted = formatNumber(kg, decimals);
  return showUnit ? `${formatted} کیلوگرم` : formatted;
}

/**
 * Format Profit Percentage
 */
export function formatPercent(percent: number | undefined | null): string {
  if (percent === undefined || percent === null || isNaN(percent) || !isFinite(percent)) {
    return '۰٪';
  }
  const sign = percent > 0 ? '+' : '';
  const formattedNum = Math.abs(percent).toFixed(1).replace('.', '٫');
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const persianPercent = formattedNum.replace(/[0-9]/g, (w) => persianDigits[+w]);
  
  return `${sign}${persianPercent}٪`;
}

/**
 * Clean input string to a clean standard JavaScript number.
 * Handles Persian, Arabic digits, commas, dots, and spaces.
 */
export function parseNumberInput(input: string | number | undefined | null): number {
  if (input === undefined || input === null) return 0;
  if (typeof input === 'number') return isNaN(input) ? 0 : input;
  
  let str = input.toString();
  if (!str.trim()) return 0;

  // Convert Persian and Arabic digits to standard ASCII digits
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  
  for (let i = 0; i < 10; i++) {
    str = str.replace(new RegExp(persianDigits[i], 'g'), i.toString());
    str = str.replace(new RegExp(arabicDigits[i], 'g'), i.toString());
  }

  // Replace Persian decimal separator '٫' or '/' with '.'
  str = str.replace(/[٫/]/g, '.');
  // Remove commas, Persian commas, spaces
  str = str.replace(/[,٬\s]/g, '');

  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Helper to display human-friendly Persian word equivalent for amounts (e.g. "۱۰۰ میلیون تومان", "۱ میلیارد و ۵۰۰ میلیون تومان")
 */
export function numberToTomanWords(amount: number): string {
  if (!amount || amount <= 0) return '';
  
  const billion = 1000000000;
  const million = 1000000;
  const thousand = 1000;

  const b = Math.floor(amount / billion);
  let rem = amount % billion;

  const m = Math.floor(rem / million);
  rem = rem % million;

  const t = Math.floor(rem / thousand);
  const r = rem % thousand;

  const parts: string[] = [];

  if (b > 0) parts.push(`${formatNumber(b)} میلیارد`);
  if (m > 0) parts.push(`${formatNumber(m)} میلیون`);
  if (t > 0) parts.push(`${formatNumber(t)} هزار`);
  if (r > 0 && parts.length === 0) parts.push(`${formatNumber(r)}`);

  if (parts.length === 0) return '';
  return `معادل ${parts.join(' و ')} تومان`;
}
