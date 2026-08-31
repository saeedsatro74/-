import React, { useState } from 'react';
import { X, Layers, PlusCircle, CheckCircle2, RefreshCw, Sparkles, Building2 } from 'lucide-react';
import { formatNumber, formatToman } from '../utils/formatters';
import { MarketPrices } from '../types';
import { NumericInput } from './NumericInput';

interface CompanyCopperStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStockKg: number;
  marketPrices: MarketPrices;
  onSaveStockKg: (newStockKg: number) => void;
}

export const CompanyCopperStockModal: React.FC<CompanyCopperStockModalProps> = ({
  isOpen,
  onClose,
  currentStockKg,
  marketPrices,
  onSaveStockKg,
}) => {
  const [stockInputKg, setStockInputKg] = useState<number>(currentStockKg);
  const [mode, setMode] = useState<'set' | 'add'>('set');
  const [addKg, setAddKg] = useState<number>(500);

  if (!isOpen) return null;

  const buyPrice = marketPrices.buyPrice || 3000000;
  
  const finalStockKg = mode === 'set' ? stockInputKg : currentStockKg + addKg;
  const stockTons = (finalStockKg / 1000).toFixed(3);
  const totalValuation = Math.round(finalStockKg * buyPrice);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (finalStockKg < 0) return;
    onSaveStockKg(finalStockKg);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-stone-200 flex flex-col dir-rtl">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-stone-950 via-amber-950 to-stone-900 text-white p-5 flex items-center justify-between border-b border-amber-700/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 p-0.5 shadow-md flex items-center justify-center text-stone-950 shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base text-amber-100">
                مدیریت و تنظیم موجودی مس شرکت
              </h3>
              <p className="text-xs text-amber-200/70">
                تعیین موجودی فیزیکی آماده تحویل در انبار مرکزی مس واته
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Mode Switcher: Set Exact vs Add Stock */}
          <div className="flex bg-stone-100 p-1 rounded-xl gap-1 text-xs font-bold border border-stone-200">
            <button
              type="button"
              onClick={() => setMode('set')}
              className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                mode === 'set' 
                  ? 'bg-amber-600 text-white shadow-xs' 
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              تنظیم موجودی جدید (کیلوگرم / تن)
            </button>
            <button
              type="button"
              onClick={() => setMode('add')}
              className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                mode === 'add' 
                  ? 'bg-amber-600 text-white shadow-xs' 
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              افزایش / شارژ انبار (+کیلوگرم)
            </button>
          </div>

          {mode === 'set' ? (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-700">
                موجودی کل انبار شرکت (کیلوگرم):
              </label>
              <NumericInput
                value={stockInputKg}
                onChange={setStockInputKg}
                placeholder="مثال: 2000"
                className="w-full px-4 py-3 border border-stone-300 rounded-xl font-mono text-lg font-bold text-amber-900 focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[11px] text-stone-500">
                مساوی با <b>{formatNumber(Number(stockTons), 3)} تن</b> مس خالص
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-700">
                مقدار شارژ / افزودن به انبار (کیلوگرم):
              </label>
              <NumericInput
                value={addKg}
                onChange={setAddKg}
                placeholder="مثال: 500"
                className="w-full px-4 py-3 border border-stone-300 rounded-xl font-mono text-lg font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-stone-500">
                موجودی نهایی پس از شارژ: <b>{formatNumber(finalStockKg, 1)} کیلوگرم ({stockTons} تن)</b>
              </p>
            </div>
          )}

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-stone-600 block">دکمه‌های انتخاب سریع:</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => { setMode('set'); setStockInputKg(2000); }}
                className="px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-xl transition-colors cursor-pointer"
              >
                ۲ تن (۲۰۰۰ کیلو)
              </button>
              <button
                type="button"
                onClick={() => { setMode('set'); setStockInputKg(5000); }}
                className="px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-xl transition-colors cursor-pointer"
              >
                ۵ تن (۵۰۰۰ کیلو)
              </button>
              <button
                type="button"
                onClick={() => { setMode('add'); setAddKg(500); }}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl transition-colors cursor-pointer"
              >
                +۵۰۰ کیلو شارژ
              </button>
              <button
                type="button"
                onClick={() => { setMode('add'); setAddKg(1000); }}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl transition-colors cursor-pointer"
              >
                +۱ تن شارژ
              </button>
            </div>
          </div>

          {/* Calculation Summary Card */}
          <div className="bg-stone-900 text-white p-4 rounded-xl space-y-2 border border-stone-800">
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span>موجودی فعلی شرکت:</span>
              <span className="font-mono text-white font-bold">{formatNumber(currentStockKg)} کیلوگرم</span>
            </div>
            <div className="flex items-center justify-between text-xs text-amber-300 font-bold border-t border-stone-800 pt-2">
              <span>موجودی جدید انبار:</span>
              <span className="font-mono text-base">{formatNumber(finalStockKg, 1)} کیلو ({stockTons} تن)</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-stone-400 border-t border-stone-800 pt-1.5">
              <span>ارزش کل موجودی مس:</span>
              <span className="font-mono text-emerald-400 font-bold">{formatToman(totalValuation)}</span>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-stone-600 hover:text-stone-900 rounded-xl transition-colors cursor-pointer"
            >
              انصراف
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-stone-950" />
              <span>ثبت و ذخیره موجودی مس</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
