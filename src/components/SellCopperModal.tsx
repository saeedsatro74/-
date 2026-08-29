import React, { useState, useEffect, useMemo } from 'react';
import { X, TrendingUp, Calendar, Weight, DollarSign, FileText, User, Calculator, AlertTriangle, ArrowUpRight, ArrowDownRight, Boxes, Wallet } from 'lucide-react';
import { Person, PersonWalletSummary } from '../types';
import { getTodayJalaliString } from '../utils/persianDate';
import { formatNumber, formatToman, formatWeight, formatPercent } from '../utils/formatters';
import { NumericInput } from './NumericInput';

interface SellCopperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    personId: string;
    date: string;
    weightKg: number;
    pricePerKg: number;
    totalPrice: number;
    notes?: string;
  }) => void;
  people: Person[];
  summaries: PersonWalletSummary[];
  selectedPersonId?: string;
}

export const SellCopperModal: React.FC<SellCopperModalProps> = ({
  isOpen,
  onClose,
  onSave,
  people,
  summaries,
  selectedPersonId,
}) => {
  const [personId, setPersonId] = useState('');
  const [date, setDate] = useState(getTodayJalaliString());
  const [weightKg, setWeightKg] = useState<number>(0);
  const [pricePerKg, setPricePerKg] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPersonId(selectedPersonId || (people.length > 0 ? people[0].id : ''));
      setDate(getTodayJalaliString());
      setWeightKg(0);
      setPricePerKg(0);
      setNotes('');
      setError('');
    }
  }, [isOpen, selectedPersonId, people]);

  const selectedPersonSummary = summaries.find((s) => s.person.id === personId);
  const currentStock = selectedPersonSummary?.copperStockKg || 0;
  const currentCash = selectedPersonSummary?.cashBalance || 0;
  const weightedBuyPrice = selectedPersonSummary?.weightedAvgBuyPrice || 0;

  // Auto-calculated total sales amount
  const calculatedTotal = useMemo(() => {
    return Math.round(weightKg * pricePerKg);
  }, [weightKg, pricePerKg]);

  // Realized COGS and Profit on this sale
  const estimatedCogs = useMemo(() => {
    return Math.round(weightKg * weightedBuyPrice);
  }, [weightKg, weightedBuyPrice]);

  const estimatedProfit = useMemo(() => {
    if (calculatedTotal <= 0) return 0;
    return calculatedTotal - estimatedCogs;
  }, [calculatedTotal, estimatedCogs]);

  const estimatedProfitPercent = useMemo(() => {
    if (estimatedCogs <= 0) return 0;
    return (estimatedProfit / estimatedCogs) * 100;
  }, [estimatedProfit, estimatedCogs]);

  const hasInsufficientStock = weightKg > 0 && weightKg > currentStock;

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personId) {
      setError('لطفاً فرد مورد نظر را انتخاب کنید.');
      return;
    }
    if (weightKg <= 0) {
      setError('لطفاً مقدار مس فروخته‌شده (وزن به کیلوگرم) را وارد کنید.');
      return;
    }
    if (currentStock <= 0) {
      setError('این شخص هیچ موجودی مس در انبار ندارد.');
      return;
    }
    if (hasInsufficientStock) {
      setError(
        `موجودی مس شخص برای این فروش کافی نیست! موجودی فعلی: ${formatWeight(
          currentStock
        )}، مقدار درخواستی فروش: ${formatWeight(weightKg)}.`
      );
      return;
    }
    if (pricePerKg <= 0) {
      setError('لطفاً قیمت فروش هر کیلوگرم مس را وارد کنید.');
      return;
    }

    onSave({
      personId,
      date: date.trim() || getTodayJalaliString(),
      weightKg,
      pricePerKg,
      totalPrice: calculatedTotal,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-emerald-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-900">
                ثبت فروش مس
              </h3>
              <p className="text-xs text-stone-600 mt-0.5">
                کسر از موجودی مس انبار و واریز مبلغ فروش به کیف پول شخص
              </p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium leading-relaxed flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Person Selection */}
          <div>
            <label htmlFor="sell-person" className="block text-xs font-bold text-stone-700 mb-1.5">
              نام فرد / طرف حساب <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <select
                id="sell-person"
                value={personId}
                onChange={(e) => {
                  setPersonId(e.target.value);
                  setError('');
                }}
                required
                className="w-full pl-3 pr-9 py-2 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-all cursor-pointer"
              >
                <option value="" disabled>-- انتخاب کنید --</option>
                {people.map((p) => {
                  const pSummary = summaries.find((s) => s.person.id === p.id);
                  const stock = pSummary?.copperStockKg || 0;
                  return (
                    <option key={p.id} value={p.id}>
                      {p.name} {stock > 0 ? `(موجودی مس: ${formatNumber(stock)} کیلو)` : '(بدون موجودی مس)'}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Current Stock & Cost Preview */}
          {selectedPersonSummary && (
            <div className="grid grid-cols-2 gap-2 bg-stone-50 p-2.5 rounded-xl border border-stone-200 text-xs">
              <div className="flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-amber-700" />
                <span className="text-stone-500">موجودی مس:</span>
                <span className={`font-bold font-mono ${currentStock > 0 ? 'text-amber-900' : 'text-stone-400'}`}>
                  {formatWeight(currentStock)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 justify-end">
                <span className="text-stone-500">میانگین خرید:</span>
                <span className="font-bold text-stone-800 font-mono">
                  {formatNumber(weightedBuyPrice)} ت/ک
                </span>
              </div>
            </div>
          )}

          {/* Date & Weight Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            
            {/* Sale Date */}
            <div>
              <label htmlFor="sell-date" className="block text-xs font-bold text-stone-700 mb-1.5">
                تاریخ فروش <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  id="sell-date"
                  type="text"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="1403/12/15"
                  className="w-full pl-3 pr-9 py-2 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all font-mono"
                />
              </div>
            </div>

            {/* Sold Weight in Kg */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="sell-weight" className="block text-xs font-bold text-stone-700">
                  مقدار مس فروخته‌شده <span className="text-rose-500">*</span>
                </label>
                {currentStock > 0 && (
                  <button
                    type="button"
                    onClick={() => setWeightKg(currentStock)}
                    className="text-[11px] text-emerald-700 hover:text-emerald-900 font-medium cursor-pointer"
                  >
                    کل موجودی ({formatNumber(currentStock)})
                  </button>
                )}
              </div>
              <NumericInput
                id="sell-weight"
                value={weightKg}
                onChange={(val) => {
                  setWeightKg(val);
                  setError('');
                }}
                placeholder="مثال: 40"
                unitLabel="کیلوگرم"
                allowDecimals={true}
                required
              />
            </div>

          </div>

          {/* Price per Kg */}
          <div>
            <label htmlFor="sell-price-kg" className="block text-xs font-bold text-stone-700 mb-1.5">
              قیمت فروش هر کیلوگرم (تومان) <span className="text-rose-500">*</span>
            </label>
            <NumericInput
              id="sell-price-kg"
              value={pricePerKg}
              onChange={(val) => {
                setPricePerKg(val);
                setError('');
              }}
              placeholder="مثال: 750,000"
              unitLabel="تومان/کیلو"
              showWordHelper={true}
              required
            />
          </div>

          {/* Auto-Calculated Total Sale Amount Display */}
          <div className="p-3.5 rounded-xl border bg-emerald-50/80 border-emerald-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-800" />
              <span className="text-xs font-bold text-emerald-900">
                مبلغ کل فروش (محاسبه خودکار):
              </span>
            </div>
            <div className="text-left font-mono">
              <span className="text-base font-extrabold text-emerald-950">
                {formatNumber(calculatedTotal)}
              </span>
              <span className="text-xs mr-1 text-stone-600">تومان</span>
            </div>
          </div>

          {/* Real-time Profit & Cost Analysis */}
          {weightKg > 0 && pricePerKg > 0 && (
            <div className="p-3 rounded-xl border bg-stone-50 border-stone-200 text-xs space-y-2">
              <div className="flex items-center justify-between text-stone-600">
                <span>بهای تمام‌شده مس فروخته‌شده (خرید):</span>
                <span className="font-mono font-medium">{formatToman(estimatedCogs)}</span>
              </div>
              <div className="flex items-center justify-between font-bold pt-1.5 border-t border-stone-200">
                <span className="flex items-center gap-1">
                  <span>سود واقعی این معامله:</span>
                  <span className={`inline-flex items-center text-[11px] px-1.5 py-0.2 rounded font-semibold ${
                    estimatedProfit >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {formatPercent(estimatedProfitPercent)}
                  </span>
                </span>
                <span className={`font-mono text-sm ${
                  estimatedProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                  {estimatedProfit > 0 ? '+' : ''}{formatToman(estimatedProfit)}
                </span>
              </div>
            </div>
          )}

          {/* Wallet Balance After Sale Preview */}
          {!hasInsufficientStock && calculatedTotal > 0 && selectedPersonSummary && (
            <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-stone-600">
              <div className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-stone-500" />
                <span>موجودی ریالی پس از دریافت وجه:</span>
                <b className="text-stone-900 font-mono">{formatToman(currentCash + calculatedTotal)}</b>
              </div>
              <div>
                <span>موجودی مس باقی‌مانده:</span>{' '}
                <b className="text-amber-900 font-mono">{formatWeight(Math.max(0, currentStock - weightKg))}</b>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label htmlFor="sell-notes" className="block text-xs font-bold text-stone-700 mb-1.5">
              توضیحات و مشخصات حواله فروش <span className="text-stone-400 font-normal">(اختیاری)</span>
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-stone-400 absolute right-3 top-3" />
              <textarea
                id="sell-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="تحویل به پروژه، شماره حواله، خریدار نهایی..."
                className="w-full pl-3 pr-9 py-2 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all resize-none"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={hasInsufficientStock}
              className={`px-5 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-xs flex items-center gap-1.5 ${
                hasInsufficientStock
                  ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                  : 'bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 cursor-pointer'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>ثبت حواله فروش</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
