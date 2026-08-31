import React, { useState, useEffect, useMemo } from 'react';
import { X, ShoppingBag, Calendar, Weight, DollarSign, FileText, User, Calculator, AlertTriangle, Wallet, Clock } from 'lucide-react';
import { Person, PersonWalletSummary } from '../types';
import { getTodayJalaliString } from '../utils/persianDate';
import { formatNumber, formatToman, formatWeight } from '../utils/formatters';
import { NumericInput } from './NumericInput';

interface BuyCopperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    personId: string;
    date: string;
    weightKg: number;
    pricePerKg: number;
    totalPrice: number;
    notes?: string;
    registeredBy?: string;
  }) => void;
  people: Person[];
  summaries: PersonWalletSummary[];
  selectedPersonId?: string;
  defaultPricePerKg?: number;
  onOpenDepositForPerson?: (personId: string) => void;
}

export const BuyCopperModal: React.FC<BuyCopperModalProps> = ({
  isOpen,
  onClose,
  onSave,
  people,
  summaries,
  selectedPersonId,
  defaultPricePerKg = 3000000,
  onOpenDepositForPerson,
}) => {
  const [personId, setPersonId] = useState('');
  const [date, setDate] = useState(getTodayJalaliString());
  const [weightKg, setWeightKg] = useState<number>(0);
  const [pricePerKg, setPricePerKg] = useState<number>(defaultPricePerKg || 3000000);
  const [registeredBy, setRegisteredBy] = useState('حسابدار مس');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPersonId(selectedPersonId || (people.length > 0 ? people[0].id : ''));
      setDate(getTodayJalaliString());
      setWeightKg(0);
      setPricePerKg(defaultPricePerKg || 3000000);
      setRegisteredBy('حسابدار مس');
      setNotes('');
      setError('');
    }
  }, [isOpen, selectedPersonId, people, defaultPricePerKg]);

  const selectedPersonSummary = summaries.find((s) => s.person.id === personId);
  const currentCash = selectedPersonSummary?.cashBalance || 0;
  const currentStock = selectedPersonSummary?.copperStockKg || 0;
  const hasUnclearedCheques = selectedPersonSummary?.hasUnclearedCheques || false;
  const pendingChequesCount = selectedPersonSummary?.pendingChequesCount || 0;
  const pendingChequesAmount = selectedPersonSummary?.pendingChequesTotalAmount || 0;

  // Auto-calculated total purchase amount
  const calculatedTotal = useMemo(() => {
    return Math.round(weightKg * pricePerKg);
  }, [weightKg, pricePerKg]);

  const hasInsufficientCash = calculatedTotal > 0 && calculatedTotal > currentCash;
  const cashDeficit = calculatedTotal - currentCash;

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personId) {
      setError('لطفاً فرد مورد نظر را انتخاب کنید.');
      return;
    }
    if (weightKg <= 0) {
      setError('لطفاً مقدار مس (وزن به کیلوگرم) را به درستی وارد کنید.');
      return;
    }
    if (pricePerKg <= 0) {
      setError('لطفاً قیمت خرید هر کیلوگرم مس را وارد کنید.');
      return;
    }
    if (hasInsufficientCash) {
      setError(
        `موجودی ریالی شخص کافی نیست! موجودی فعلی: ${formatToman(currentCash)}، مبلغ کل فاکتور خرید: ${formatToman(
          calculatedTotal
        )}. خرید مس فقط تا سقف موجودی نقدی فعلی امکان‌پذیر است.`
      );
      return;
    }

    onSave({
      personId,
      date: date.trim() || getTodayJalaliString(),
      weightKg,
      pricePerKg,
      totalPrice: calculatedTotal,
      notes: notes.trim() || undefined,
      registeredBy: registeredBy.trim() || 'مسئول مس',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/70 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 py-4 sm:py-6">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-lg my-auto max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header (Sticky at top) */}
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-amber-50/90 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-700 text-white flex items-center justify-center shadow-xs">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-900">
                ثبت خرید مس
              </h3>
              <p className="text-xs text-stone-600 mt-0.5">
                ثبت فاکتور خرید (پس از تأیید مدیرعامل در کاردکس اعمال خواهد شد)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-stone-200 transition-colors cursor-pointer"
            title="بستن پنجره"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-5 space-y-4 flex-1">
          
          {/* Approval Notice */}
          <div className="p-3 bg-amber-50/90 border border-amber-300/80 rounded-xl text-xs text-amber-950 flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>فرآیند نظارت مدیرعامل:</strong> با ثبت این فرم، سند در وضعیت <span className="bg-amber-200/80 text-amber-950 font-bold px-1.5 py-0.5 rounded">در انتظار تأیید</span> قرار می‌گیرد و پس از تأیید مدیرعامل به کیف پول مس و حساب شخص اعمال خواهد شد.
            </p>
          </div>
          
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium leading-relaxed flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Person Selection */}
          <div>
            <label htmlFor="buy-person" className="block text-xs font-bold text-stone-700 mb-1.5">
              نام فرد / طرف حساب <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <select
                id="buy-person"
                value={personId}
                onChange={(e) => {
                  setPersonId(e.target.value);
                  setError('');
                }}
                required
                className={`w-full pl-3 pr-9 py-2 text-sm bg-white border rounded-lg text-stone-900 focus:outline-none transition-all cursor-pointer ${
                  hasUnclearedCheques
                    ? 'border-rose-400 focus:ring-2 focus:ring-rose-500'
                    : 'border-stone-300 focus:ring-2 focus:ring-amber-600 focus:border-amber-600'
                }`}
              >
                <option value="" disabled>-- انتخاب کنید --</option>
                {people.map((p) => {
                  const pSummary = summaries.find((s) => s.person.id === p.id);
                  const hasCheques = pSummary?.hasUnclearedCheques;
                  return (
                    <option key={p.id} value={p.id}>
                      {p.name} {hasCheques ? '⚠️ (دارای چک پاس‌نشده - خرید محدود به نقد)' : pSummary ? `(موجودی ریالی: ${formatNumber(pSummary.cashBalance)} تومان)` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Uncleared Cheque Info Warning */}
          {hasUnclearedCheques && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>اطلاعیه: این شخص دارای چک پاس‌نشده است</span>
              </div>
              <p className="text-amber-800 leading-relaxed">
                این شخص دارای <b>{pendingChequesCount} فقره چک وصول نشده</b> به ارزش کل <b>{formatToman(pendingChequesAmount)}</b> می‌باشد. خرید مس فقط تا سقف موجودی نقدی فعلی (<b>{formatToman(currentCash)}</b>) امکان‌پذیر است.
              </p>
            </div>
          )}

          {/* Person Wallet Status Badge */}
          {selectedPersonSummary && !hasUnclearedCheques && (
            <div className="grid grid-cols-2 gap-2 bg-stone-50 p-2.5 rounded-xl border border-stone-200 text-xs">
              <div className="flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-amber-700" />
                <span className="text-stone-500">موجودی ریالی:</span>
                <span className="font-bold text-stone-900 font-mono">
                  {formatNumber(selectedPersonSummary.cashBalance)} ت
                </span>
              </div>
              <div className="flex items-center gap-1.5 justify-end">
                <span className="text-stone-500">موجودی مس فعلی:</span>
                <span className="font-bold text-amber-900 font-mono">
                  {formatWeight(selectedPersonSummary.copperStockKg)}
                </span>
              </div>
            </div>
          )}

          {/* Date & Weight Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            
            {/* Purchase Date */}
            <div>
              <label htmlFor="buy-date" className="block text-xs font-bold text-stone-700 mb-1.5">
                تاریخ خرید <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  id="buy-date"
                  type="text"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="1403/12/10"
                  className="w-full pl-3 pr-9 py-2 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 transition-all font-mono"
                />
              </div>
            </div>

            {/* Weight in Kg */}
            <div>
              <label htmlFor="buy-weight" className="block text-xs font-bold text-stone-700 mb-1.5">
                مقدار مس (کیلوگرم) <span className="text-rose-500">*</span>
              </label>
              <NumericInput
                id="buy-weight"
                value={weightKg}
                onChange={(val) => {
                  setWeightKg(val);
                  setError('');
                }}
                placeholder="مثال: 120.5"
                unitLabel="کیلوگرم"
                allowDecimals={true}
                required
              />
            </div>

          </div>

          {/* Price per Kg */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="buy-price-kg" className="block text-xs font-bold text-stone-700">
                قیمت خرید هر کیلوگرم (تومان) <span className="text-rose-500">*</span>
              </label>
              {defaultPricePerKg > 0 && (
                <button
                  type="button"
                  onClick={() => setPricePerKg(defaultPricePerKg)}
                  className="text-[11px] text-amber-800 hover:text-amber-950 font-semibold cursor-pointer underline decoration-dotted"
                  title="تنظیم مجدد به قیمت مرجع خرید"
                >
                  نرخ روز بازار: {formatNumber(defaultPricePerKg)} ت
                </button>
              )}
            </div>
            <NumericInput
              id="buy-price-kg"
              value={pricePerKg}
              onChange={(val) => {
                setPricePerKg(val);
                setError('');
              }}
              placeholder="مثال: 3,000,000"
              unitLabel="تومان/کیلو"
              showWordHelper={true}
              required
            />
          </div>

          {/* Auto-Calculated Total Purchase Amount Display */}
          <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${
            hasInsufficientCash
              ? 'bg-rose-50 border-rose-200'
              : 'bg-amber-50/80 border-amber-200'
          }`}>
            <div className="flex items-center gap-2">
              <Calculator className={`w-4 h-4 ${hasInsufficientCash ? 'text-rose-600' : 'text-amber-800'}`} />
              <span className={`text-xs font-bold ${hasInsufficientCash ? 'text-rose-900' : 'text-amber-900'}`}>
                مبلغ کل خرید (محاسبه خودکار):
              </span>
            </div>
            <div className="text-left font-mono">
              <span className={`text-base font-extrabold ${hasInsufficientCash ? 'text-rose-900' : 'text-amber-950'}`}>
                {formatNumber(calculatedTotal)}
              </span>
              <span className="text-xs mr-1 text-stone-600">تومان</span>
            </div>
          </div>

          {/* Insufficient Cash Warning & Quick Deposit Prompt */}
          {hasInsufficientCash && (
            <div className="p-3 bg-rose-100/70 border border-rose-300 rounded-xl text-xs text-rose-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                <span>
                  کسری موجودی: <b>{formatToman(cashDeficit)}</b>
                </span>
              </div>
              {onOpenDepositForPerson && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDepositForPerson(personId);
                  }}
                  className="px-2.5 py-1 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-md cursor-pointer shrink-0"
                >
                  + واریز وجه به حساب
                </button>
              )}
            </div>
          )}

          {/* Balance After Purchase Preview (when cash is sufficient) */}
          {!hasInsufficientCash && calculatedTotal > 0 && selectedPersonSummary && (
            <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs flex items-center justify-between text-stone-600">
              <span>موجودی ریالی باقی‌مانده پس از خرید:</span>
              <span className="font-bold text-stone-900 font-mono">
                {formatToman(currentCash - calculatedTotal)}
              </span>
            </div>
          )}

          {/* Submitter Name */}
          <div>
            <label htmlFor="buy-registered-by" className="block text-xs font-bold text-stone-700 mb-1.5">
              نام مسئول ثبت‌کننده خرید <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                id="buy-registered-by"
                type="text"
                required
                value={registeredBy}
                onChange={(e) => setRegisteredBy(e.target.value)}
                placeholder="مثال: حسابدار مس، کارشناس خرید..."
                className="w-full pl-3 pr-9 py-2 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 transition-all"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="buy-notes" className="block text-xs font-bold text-stone-700 mb-1.5">
              توضیحات فاکتور خرید <span className="text-stone-400 font-normal">(اختیاری)</span>
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-stone-400 absolute right-3 top-3" />
              <textarea
                id="buy-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="نوع لوله، سایز، ضخامت، شماره بارنامه یا فاکتور..."
                className="w-full pl-3 pr-9 py-2 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 transition-all resize-none"
              />
            </div>
          </div>

          </div>

          {/* Footer Buttons (Fixed at bottom of modal) */}
          <div className="p-4 border-t border-stone-200 bg-stone-50/90 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 bg-stone-200/70 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={hasInsufficientCash}
              className={`px-5 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-xs flex items-center gap-1.5 ${
                hasInsufficientCash
                  ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                  : 'bg-amber-700 hover:bg-amber-800 active:bg-amber-900 cursor-pointer'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>ثبت فاکتور خرید</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
