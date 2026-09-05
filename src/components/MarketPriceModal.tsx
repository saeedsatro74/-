import React, { useState, useEffect, useRef } from 'react';
import { X, Tag, ShoppingBag, TrendingUp, Check, Info, ArrowLeftRight, Sparkles } from 'lucide-react';
import { NumericInput } from './NumericInput';
import { formatNumber, formatToman } from '../utils/formatters';
import { MarketPrices } from '../types';

interface MarketPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrices: MarketPrices | number;
  onSave: (newPrices: MarketPrices) => void;
}

export const MarketPriceModal: React.FC<MarketPriceModalProps> = ({
  isOpen,
  onClose,
  currentPrices,
  onSave,
}) => {
  const initialBuy = typeof currentPrices === 'number' 
    ? currentPrices 
    : (currentPrices?.buyPrice || 3000000);
  const initialSell = typeof currentPrices === 'number' 
    ? Math.max(0, currentPrices - 150000) 
    : (currentPrices?.sellPrice || 2850000);

  const [buyPrice, setBuyPrice] = useState<number>(initialBuy);
  const [sellPrice, setSellPrice] = useState<number>(initialSell);
  const [error, setError] = useState('');

  // Sync state ONLY when the modal transitions from closed to open.
  // DO NOT depend on currentPrices so background sync or polling NEVER clobbers user's typing!
  useEffect(() => {
    if (isOpen) {
      const b = typeof currentPrices === 'number' ? currentPrices : (currentPrices?.buyPrice || 3000000);
      const s = typeof currentPrices === 'number' ? Math.max(0, currentPrices - 150000) : (currentPrices?.sellPrice || 2850000);
      setBuyPrice(b);
      setSellPrice(s);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const spreadDifference = buyPrice - sellPrice;

  const handleApplySpread = (diff: number) => {
    const baseBuy = (buyPrice >= 500 && buyPrice <= 25000) ? buyPrice * 1000 : buyPrice;
    setSellPrice(Math.max(0, baseBuy - diff));
    setError('');
  };

  const handleSetBuyPreset = (val: number) => {
    setBuyPrice(val);
    // Maintain 150,000 spread if sell price was at standard spread
    if (sellPrice <= 0 || sellPrice === Math.max(0, buyPrice - 150000)) {
      setSellPrice(Math.max(0, val - 150000));
    }
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Auto-normalize if user typed in thousands (e.g. 2830 or 3200)
    const finalBuy = (buyPrice >= 500 && buyPrice <= 25000) ? buyPrice * 1000 : buyPrice;
    const finalSell = (sellPrice >= 500 && sellPrice <= 25000) ? sellPrice * 1000 : sellPrice;

    if (finalBuy <= 0) {
      setError('لطفاً قیمت معتبر برای خرید مس وارد کنید.');
      return;
    }
    if (finalSell <= 0) {
      setError('لطفاً قیمت معتبر برای فروش مس وارد کنید.');
      return;
    }
    onSave({
      buyPrice: finalBuy,
      sellPrice: finalSell,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/70 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 py-4 sm:py-6">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-lg my-auto max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header (Sticky at top) */}
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-900 text-white flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-800 text-amber-400 flex items-center justify-center shadow-xs">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                تنظیم قیمت‌های مرجع روز مس در بازار
              </h3>
              <p className="text-xs text-stone-300 mt-0.5">
                تعیین نرخ پیش‌فرض خرید و فروش در فاکتورها و ارزش‌گذاری انبار
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
            title="بستن پنجره"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-5 sm:p-6 space-y-4 flex-1">
          
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          {/* 1. قیمت خرید روز مس */}
          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label htmlFor="market-buy-price-input" className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-amber-700" />
                <span>قیمت مرجع خرید مس (تومان / کیلوگرم)</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-amber-800 font-medium">دیفالت فرم ثبت خرید</span>
            </div>
            
            <NumericInput
              id="market-buy-price-input"
              value={buyPrice}
              onChange={(val) => {
                setBuyPrice(val);
                setError('');
              }}
              placeholder="مثال: 3,000,000"
              unitLabel="تومان/کیلو"
              showWordHelper={true}
              autoFocus
              required
            />

            {/* Quick Thousand Multiplier Helper */}
            {buyPrice >= 500 && buyPrice <= 25000 && (
              <button
                type="button"
                onClick={() => setBuyPrice(buyPrice * 1000)}
                className="w-full text-right p-2 bg-amber-100/80 hover:bg-amber-200/80 border border-amber-300 rounded-lg text-xs font-bold text-amber-900 flex items-center justify-between cursor-pointer transition-colors"
              >
                <span>💡 آیا منظورتان {formatNumber(buyPrice * 1000)} تومان است؟</span>
                <span className="text-[11px] bg-white px-2 py-0.5 rounded shadow-xs text-amber-800 font-mono">
                  تبدیل به {formatNumber(buyPrice * 1000)} تومان
                </span>
              </button>
            )}

            {/* Quick Buy Price Presets */}
            <div className="pt-1 border-t border-amber-200/60">
              <div className="flex items-center justify-between text-[11px] text-stone-500 mb-1.5">
                <span>نرخ‌های رایج خرید مس:</span>
                <button
                  type="button"
                  onClick={() => setBuyPrice(0)}
                  className="text-stone-400 hover:text-rose-600 text-[10px] cursor-pointer"
                >
                  پاک کردن
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {[2800000, 2830000, 2850000, 2900000, 3000000, 3100000, 3200000].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => handleSetBuyPreset(rate)}
                    className={`px-2 py-1 text-[11px] font-mono rounded-md border transition-all cursor-pointer ${
                      buyPrice === rate
                        ? 'bg-amber-500 text-stone-950 font-bold border-amber-600 ring-2 ring-amber-300 shadow-xs'
                        : 'bg-white hover:bg-amber-100 text-stone-700 border-amber-300/80'
                    }`}
                  >
                    {formatNumber(rate)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. قیمت فروش روز مس */}
          <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label htmlFor="market-sell-price-input" className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-700" />
                <span>قیمت مرجع فروش مس (تومان / کیلوگرم)</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-emerald-800 font-medium">دیفالت فرم ثبت فروش</span>
            </div>
            
            <NumericInput
              id="market-sell-price-input"
              value={sellPrice}
              onChange={(val) => {
                setSellPrice(val);
                setError('');
              }}
              placeholder="مثال: 2,850,000"
              unitLabel="تومان/کیلو"
              showWordHelper={true}
              required
            />

            {/* Quick Thousand Multiplier Helper */}
            {sellPrice >= 500 && sellPrice <= 25000 && (
              <button
                type="button"
                onClick={() => setSellPrice(sellPrice * 1000)}
                className="w-full text-right p-2 bg-emerald-100/80 hover:bg-emerald-200/80 border border-emerald-300 rounded-lg text-xs font-bold text-emerald-900 flex items-center justify-between cursor-pointer transition-colors"
              >
                <span>💡 آیا منظورتان {formatNumber(sellPrice * 1000)} تومان است؟</span>
                <span className="text-[11px] bg-white px-2 py-0.5 rounded shadow-xs text-emerald-800 font-mono">
                  تبدیل به {formatNumber(sellPrice * 1000)} تومان
                </span>
              </button>
            )}

            {/* Quick Sell Presets */}
            <div className="pt-1 border-t border-emerald-200/60">
              <div className="flex items-center justify-between text-[11px] text-stone-500 mb-1.5">
                <span>نرخ‌های رایج فروش مس:</span>
                <button
                  type="button"
                  onClick={() => setSellPrice(0)}
                  className="text-stone-400 hover:text-rose-600 text-[10px] cursor-pointer"
                >
                  پاک کردن
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: 'هم‌قیمت خرید', val: (buyPrice >= 500 && buyPrice <= 25000 ? buyPrice * 1000 : buyPrice) },
                  { label: '۱۵۰هزار کمتر', val: Math.max(0, (buyPrice >= 500 && buyPrice <= 25000 ? buyPrice * 1000 : buyPrice) - 150000) },
                  { label: '۳,۲۰۰,۰۰۰', val: 3200000 },
                  { label: '۳,۱۰۰,۰۰۰', val: 3100000 },
                  { label: '۳,۰۰۰,۰۰۰', val: 3000000 },
                  { label: '۲,۸۵۰,۰۰۰', val: 2850000 },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSellPrice(item.val);
                      setError('');
                    }}
                    className={`px-2 py-1 text-[11px] font-mono rounded-md border transition-all cursor-pointer ${
                      sellPrice === item.val
                        ? 'bg-emerald-600 text-white font-bold border-emerald-700 ring-2 ring-emerald-300 shadow-xs'
                        : 'bg-white hover:bg-emerald-100 text-stone-700 border-emerald-300/80'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Spread Helper Bar */}
          <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-600 font-semibold flex items-center gap-1">
                <ArrowLeftRight className="w-3.5 h-3.5 text-stone-500" />
                اختلاف نرخ خرید و فروش (اسپرد):
              </span>
              <span className="font-bold text-stone-900 font-mono">
                {formatNumber(spreadDifference)} تومان {spreadDifference < 0 ? '(فروش بیشتر از خرید)' : ''}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-stone-200/80">
              <span className="text-[11px] text-stone-500">تنظیم سریع اختلاف فروش:</span>
              <button
                type="button"
                onClick={() => handleApplySpread(150000)}
                className="px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-stone-200 border border-stone-300 rounded-lg text-stone-800 transition-colors cursor-pointer"
              >
                ۱۵۰,۰۰۰ تومان کمتر (پیش‌فرض بازار)
              </button>
              <button
                type="button"
                onClick={() => handleApplySpread(100000)}
                className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-stone-200 border border-stone-300 rounded-lg text-stone-700 transition-colors cursor-pointer"
              >
                ۱۰۰,۰۰۰ تومان کمتر
              </button>
              <button
                type="button"
                onClick={() => handleApplySpread(200000)}
                className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-stone-200 border border-stone-300 rounded-lg text-stone-700 transition-colors cursor-pointer"
              >
                ۲۰۰,۰۰۰ تومان کمتر
              </button>
            </div>
          </div>

          <div className="p-3 bg-stone-100/70 rounded-xl text-xs text-stone-600 flex items-start gap-2">
            <Info className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              با ذخیره این مقادیر، هنگام باز کردن پنجره‌های «ثبت خرید مس» و «ثبت فروش مس»، این نرخ‌ها به صورت خودکار در فیلد قیمت هر کیلوگرم قرار می‌گیرند و نیازی به تایپ مجدد نخواهید داشت (مگر اینکه بخواهید دستی تغییر دهید).
            </p>
          </div>

          </div>

          {/* Footer Actions (Fixed at bottom) */}
          <div className="p-4 border-t border-stone-200 bg-stone-50/90 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-200/70 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 active:bg-black rounded-lg transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>به‌روزرسانی قیمت‌های مرجع</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
