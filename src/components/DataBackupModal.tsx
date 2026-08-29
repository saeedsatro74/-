import React, { useRef, useState } from 'react';
import { 
  X, 
  Database, 
  Download, 
  Upload, 
  RotateCcw, 
  FileSpreadsheet, 
  Check, 
  AlertCircle 
} from 'lucide-react';
import { Person, Transaction, PersonWalletSummary } from '../types';
import { formatNumber, formatWeight } from '../utils/formatters';

interface DataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: Person[];
  transactions: Transaction[];
  marketPrice: number;
  summaries: PersonWalletSummary[];
  onRestoreData: (people: Person[], transactions: Transaction[], marketPrice?: number) => void;
  onResetToSample: () => void;
}

export const DataBackupModal: React.FC<DataBackupModalProps> = ({
  isOpen,
  onClose,
  people,
  transactions,
  marketPrice,
  summaries,
  onRestoreData,
  onResetToSample,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  // Export all data as JSON
  const handleExportJSON = () => {
    const backupData = {
      version: '2.0-wallet',
      exportedAt: new Date().toISOString(),
      marketPrice,
      people,
      transactions,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `copper_wallet_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSuccessMessage('فایل پشتیبان کامل سیستم (JSON) با موفقیت دانلود شد.');
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  // Export summary as CSV
  const handleExportCSV = () => {
    // BOM for UTF-8 Excel support in Persian
    let csvContent = '\uFEFF';
    csvContent += 'نام طرف حساب,تلفن,موجودی ریالی (تومان),موجودی مس (کیلوگرم),ارزش روز مس (تومان),مجموع کل دارایی (تومان),کل واریزی (تومان),کل خرید مس (تومان),کل وزن خرید (کیلو),کل فروش مس (تومان),کل وزن فروش (کیلو),سود محقق شده (تومان),درصد سود,تعداد تراکنش\n';

    summaries.forEach((s) => {
      const row = [
        `"${s.person.name}"`,
        `"${s.person.phone || ''}"`,
        s.cashBalance,
        s.copperStockKg,
        s.copperMarketValue,
        s.totalAssetValue,
        s.totalDeposited,
        s.totalPurchasedPrice,
        s.totalPurchasedKg,
        s.totalSoldPrice,
        s.totalSoldKg,
        s.realizedProfit,
        `${s.profitPercentage.toFixed(2)}%`,
        s.transactionsCount,
      ].join(',');
      csvContent += row + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `copper_wallets_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setSuccessMessage('فایل اکسل (CSV) گزارش دارایی‌ها با موفقیت دانلود شد.');
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  // Import JSON backup
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed.people) && Array.isArray(parsed.transactions)) {
          onRestoreData(parsed.people, parsed.transactions, parsed.marketPrice);
          setSuccessMessage('اطلاعات پشتیبان با موفقیت بازیابی شد.');
          setTimeout(() => setSuccessMessage(''), 4000);
        } else {
          setErrorMessage('ساختار فایل پشتیبان نامعتبر است.');
          setTimeout(() => setErrorMessage(''), 4000);
        }
      } catch {
        setErrorMessage('خطا در خواندن فایل پشتیبان.');
        setTimeout(() => setErrorMessage(''), 4000);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-stone-800 text-white flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-900">پشتیبان‌گیری و مدیریت داده‌ها</h3>
              <p className="text-xs text-stone-500 mt-0.5">ذخیره، بازیابی و دریافت گزارش اکسل کاردکس</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 leading-relaxed">
            اطلاعات کیف پول و تراکنش‌ها در حافظه مرورگر شما به صورت محلی ذخیره می‌شود. جهت امنیت داده‌ها و جلوگیری از حذف تصادفی، نسخه پشتیبان دریافت فرمایید.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Download JSON Backup */}
            <button
              type="button"
              onClick={handleExportJSON}
              className="p-4 rounded-xl border border-stone-200 hover:border-amber-400 hover:bg-amber-50/50 transition-all text-right flex flex-col justify-between cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-stone-900 group-hover:text-amber-800">دریافت فایل پشتیبان</span>
                <Download className="w-4 h-4 text-amber-700" />
              </div>
              <span className="text-[11px] text-stone-500">ذخیره تمام اشخاص، واریزها، خریدها و فروش‌ها به فرمت JSON</span>
            </button>

            {/* Export CSV / Excel */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="p-4 rounded-xl border border-stone-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all text-right flex flex-col justify-between cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-stone-900 group-hover:text-emerald-800">خروجی اکسل (CSV)</span>
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              </div>
              <span className="text-[11px] text-stone-500">گزارش خلاصه وضعیت مالی و سود کل افراد در اکسل</span>
            </button>

            {/* Import Backup */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-4 rounded-xl border border-stone-200 hover:border-stone-400 hover:bg-stone-50 transition-all text-right flex flex-col justify-between cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-stone-900">بازیابی فایل پشتیبان</span>
                <Upload className="w-4 h-4 text-stone-600" />
              </div>
              <span className="text-[11px] text-stone-500">بارگذاری فایل JSON پشتیبان قبلی</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </button>

            {/* Reset to Sample Data */}
            <button
              type="button"
              onClick={() => {
                if (window.confirm('آیا مایل به بارگذاری مجدد داده‌های نمونه اولیه هستید؟')) {
                  onResetToSample();
                  setSuccessMessage('داده‌های نمونه اولیه با موفقیت بارگذاری شدند.');
                  setTimeout(() => setSuccessMessage(''), 4000);
                }
              }}
              className="p-4 rounded-xl border border-stone-200 hover:border-rose-300 hover:bg-rose-50/50 transition-all text-right flex flex-col justify-between cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-stone-900 group-hover:text-rose-700">داده‌های نمونه اولیه</span>
                <RotateCcw className="w-4 h-4 text-rose-600" />
              </div>
              <span className="text-[11px] text-stone-500">بارگذاری مجدد سناریوی واقعی علی رضایی و شرکت‌ها</span>
            </button>

          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg cursor-pointer transition-colors"
          >
            بستن
          </button>
        </div>

      </div>
    </div>
  );
};
