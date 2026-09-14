import Tesseract from 'tesseract.js';
import { CopperPalletData } from '../types';

/**
 * Parses raw text extracted by OCR from a copper label and extracts industrial specifications:
 * - Brand / Manufacturer (شرکت)
 * - Metric & Inch Size (قطر و ضخامت)
 * - Net & Gross Weight per roll (وزن کلاف)
 * - Total Pallet Net & Gross Weight (وزن کلی پالت)
 * - Batch No, Pallet No, etc.
 */
export function parseCopperLabelText(rawText: string): Partial<CopperPalletData> {
  const text = rawText.toUpperCase();
  const res: Partial<CopperPalletData> = {};

  // 1. Company / Brand detection (شرکت و کارخانه تولیدی)
  if (text.includes('BAHONAR') || text.includes('باهنر') || text.includes('CSP') || text.includes('SHAHID BAHONAR')) {
    res.companyName = 'صنایع مس شهید باهنر کرمان (Bahonar)';
  } else if (text.includes('KAVEH') || text.includes('کاوه')) {
    res.companyName = 'مس کاوه (Kaveh Copper)';
  } else if (text.includes('ASTERIA') || text.includes('آستریا')) {
    res.companyName = 'ASTERIA COPPER';
  } else if (text.includes('BABAK') || text.includes('بابک')) {
    res.companyName = 'بابک مس ایرانیان (Babak Copper)';
  } else if (text.includes('SARBAZ') || text.includes('سرباز')) {
    res.companyName = 'صنایع مس سرباز';
  } else if (text.includes('CHILAN') || text.includes('چیلان')) {
    res.companyName = 'چیلان مس';
  } else if (text.includes('NICICO') || text.includes('ملی مس')) {
    res.companyName = 'شرکت ملی صنایع مس ایران (NICICO)';
  }

  // 2. Metric Size - Diameter & Wall Thickness (قطر و ضخامت دیواره مثل 15.87*0.45 یا 9.52*0.75)
  // Matches 15.87*0.45, 15.87 x 0.45, 9.52*0.75, 12.70*0.80, 6.35*0.60, 19.05*0.90, etc.
  const metricMatch = text.match(/(\d{1,2}(?:[.,]\d{1,3})?)\s*[*xX×]\s*(\d{1,2}(?:[.,]\d{1,3})?)/);
  if (metricMatch) {
    const dia = metricMatch[1].replace(',', '.');
    const thick = metricMatch[2].replace(',', '.');
    res.sizeMetric = `${dia}*${thick}`;

    // Auto calculate fractional inch size from metric diameter
    const diaNum = parseFloat(dia);
    if (Math.abs(diaNum - 6.35) < 0.5) res.sizeInch = '1/4"';
    else if (Math.abs(diaNum - 7.94) < 0.5) res.sizeInch = '5/16"';
    else if (Math.abs(diaNum - 9.52) < 0.5) res.sizeInch = '3/8"';
    else if (Math.abs(diaNum - 12.70) < 0.5) res.sizeInch = '1/2"';
    else if (Math.abs(diaNum - 15.87) < 0.5) res.sizeInch = '5/8"';
    else if (Math.abs(diaNum - 19.05) < 0.5) res.sizeInch = '3/4"';
    else if (Math.abs(diaNum - 22.22) < 0.5) res.sizeInch = '7/8"';
    else if (Math.abs(diaNum - 25.40) < 0.5) res.sizeInch = '1"';
    else if (Math.abs(diaNum - 28.58) < 0.5) res.sizeInch = '1-1/8"';
  }

  // 3. Direct Inch Size Match (سایز اینچی مثل 3/8 یا 5/8 یا 1/2)
  const inchMatch = text.match(/(1\/4|5\/16|3\/8|1\/2|5\/8|3\/4|7\/8|1|1-1\/8)\s*(?:[*xX×"]\s*(\d+(?:[.,]\d+)?))?/);
  if (inchMatch && (!res.sizeInch || res.sizeInch === '')) {
    res.sizeInch = inchMatch[1] + (inchMatch[2] ? `*${inchMatch[2]}` : '"');
  }

  // 4. Weights Extraction (وزن خالص و ناخالص رول و کل پالت)
  // Look for NET / N.W / خالص
  const netMatch = text.match(/(?:NET|N\.W|NET\s*WT|خالص)[\s:=-]*(\d{2,4}(?:[.,]\d{1,2})?)/i);
  if (netMatch) {
    const val = parseFloat(netMatch[1].replace(',', '.'));
    if (val > 250) {
      res.totalPalletNetWeight = val;
    } else if (val >= 40) {
      res.netWeightPerRoll = val;
    }
  }

  // Look for GROSS / G.W / ناخالص
  const grossMatch = text.match(/(?:GROSS|G\.W|GROSS\s*WT|ناخالص)[\s:=-]*(\d{2,4}(?:[.,]\d{1,2})?)/i);
  if (grossMatch) {
    const val = parseFloat(grossMatch[1].replace(',', '.'));
    if (val > 250) {
      res.totalPalletGrossWeight = val;
    } else if (val >= 40) {
      res.grossWeightPerRoll = val;
    }
  }

  // Look for TOTAL / PALLET NET
  const totalPalletMatch = text.match(/(?:TOTAL|PALLET|مجموع|پالت)[\s\w:=-]*(\d{3,4}(?:[.,]\d{1,2})?)/i);
  if (totalPalletMatch) {
    const val = parseFloat(totalPalletMatch[1].replace(',', '.'));
    if (val > 250 && val < 2000) {
      res.totalPalletNetWeight = val;
    }
  }

  // Scan all numbers followed by KG or near weights (exclude alloy C12200, years 2025/2026/1404, etc.)
  const cleanTextForWeights = text.replace(/C12200/gi, '').replace(/ASTM\s*B\d+/gi, '').replace(/202[0-9]/g, '');
  const numbersNearKg = Array.from(cleanTextForWeights.matchAll(/(\d{2,4}(?:[.,]\d{1,2})?)\s*(?:KG|KGS|کیلو)?/gi))
    .map(m => parseFloat(m[1].replace(',', '.')))
    .filter(n => !isNaN(n) && n >= 40 && n <= 1800 && n !== 1220 && n !== 12200);

  const rollCandidates = numbersNearKg.filter(n => n >= 60 && n <= 180);
  const palletCandidates = numbersNearKg.filter(n => n >= 300 && n <= 1500 && n !== 1220);

  if (!res.netWeightPerRoll && rollCandidates.length > 0) {
    res.netWeightPerRoll = rollCandidates[0];
  }

  if (!res.totalPalletNetWeight && palletCandidates.length > 0) {
    res.totalPalletNetWeight = palletCandidates[0];
  }

  // Fallback calculations for missing weights
  const rollCount = res.numberOfCoils || 5;
  if (res.netWeightPerRoll && !res.totalPalletNetWeight) {
    res.totalPalletNetWeight = Number((res.netWeightPerRoll * rollCount).toFixed(1));
  }
  if (res.totalPalletNetWeight && !res.netWeightPerRoll) {
    res.netWeightPerRoll = Number((res.totalPalletNetWeight / rollCount).toFixed(1));
  }
  if (res.netWeightPerRoll && !res.grossWeightPerRoll) {
    res.grossWeightPerRoll = Number((res.netWeightPerRoll + 13.2).toFixed(1));
  }
  if (res.totalPalletNetWeight && !res.totalPalletGrossWeight) {
    res.totalPalletGrossWeight = Number((res.totalPalletNetWeight + (13.2 * rollCount) + 35.0).toFixed(1));
  }

  // 5. Batch & Pallet No
  const batchMatch = text.match(/(?:BATCH|بچ|LOT)[\s:=-]*([A-Z0-9-]{4,16})/i);
  if (batchMatch) res.batchNo = batchMatch[1];

  const palletMatch = text.match(/(?:PALLET|پالت)[\s:=-]*([A-Z0-9-]{4,16})/i);
  if (palletMatch) res.palletNo = palletMatch[1];

  // 6. Number of coils
  const coilsMatch = text.match(/(?:COILS?|ROLLS?|کلاف|تعداد)[\s:=-]*([3-8])/i);
  if (coilsMatch) {
    res.numberOfCoils = parseInt(coilsMatch[1]);
  }

  // 7. Alloy standard
  if (text.includes('C12200') || text.includes('ASTM B75') || text.includes('CU-DHP') || text.includes('SEAMLESS')) {
    res.alloyStandard = 'SEAMLESS, C12200, ASTM B75';
  }

  // 8. Temper
  if (text.includes('O60') || text.includes('SOFT') || text.includes('آنیل')) {
    res.temper = 'O60';
  } else if (text.includes('H58') || text.includes('HARD')) {
    res.temper = 'H58';
  }

  return res;
}

/**
 * Runs client-side offline Tesseract OCR directly on an image DataURL
 */
export async function runClientSideOCR(dataUrl: string, onProgress?: (progress: number) => void): Promise<{
  rawText: string;
  extracted: Partial<CopperPalletData>;
}> {
  try {
    const result = await Tesseract.recognize(dataUrl, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text' && typeof m.progress === 'number') {
          if (onProgress) onProgress(Math.round(m.progress * 100));
        }
      }
    });

    const rawText = result.data.text || '';
    const extracted = parseCopperLabelText(rawText);
    return { rawText, extracted };
  } catch (err) {
    console.warn('Client Tesseract OCR failed:', err);
    return { rawText: '', extracted: {} };
  }
}
