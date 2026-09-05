import React, { useState, useEffect, useMemo } from 'react';
import { X, TrendingUp, Calendar, Weight, DollarSign, FileText, User, Calculator, AlertTriangle, ArrowUpRight, ArrowDownRight, Boxes, Wallet, CreditCard, Building2, Clock, CheckCircle2 } from 'lucide-react';
import { Person, PersonWalletSummary, PaymentMethod } from '../types';
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
    registeredBy?: string;
    paymentMethod?: PaymentMethod;
    chequeNumber?: string;
    chequeDueDate?: string;
    chequeBank?: string;
    saleCategory?: 'internal' | 'external';
  }) => void;
  people: Person[];
  summaries: PersonWalletSummary[];
  selectedPersonId?: string;
  defaultPricePerKg?: number;
}

export const SellCopperModal: React.FC<SellCopperModalProps> = ({
  isOpen,
  onClose,
  onSave,
  people,
  summaries,
  selectedPersonId,
  defaultPricePerKg = 2850000,
}) => {
  const [personId, setPersonId] = useState('');
  const [date, setDate] = useState(getTodayJalaliString());
  const [weightKg, setWeightKg] = useState<number>(0);
  const [pricePerKg, setPricePerKg] = useState<number>(defaultPricePerKg || 2850000);
  const [registeredBy, setRegisteredBy] = useState('حسابدار مس');
  const [saleCategory, setSaleCategory] = useState<'internal' | 'external'>('internal');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // Payment Method & Cheque State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDueDate, setChequeDueDate] = useState('');
  const [chequeBank, setChequeBank] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPersonId(selectedPersonId || (people.length > 0 ? people[0].id : ''));
      setDate(getTodayJalaliString());
      setWeightKg(0);
      setPricePerKg(defaultPricePerKg || 2850000);
      setRegisteredBy('حسابدار مس');
      setSaleCategory('internal');
      setNotes('');
      setError('');
      setPaymentMethod('cash');
      setChequeNumber('');
      setChequeDueDate('');
      setChequeBank('');
    }
  }, [isOpen, selectedPersonId, people, defaultPricePerKg]);

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

    if (paymentMethod === 'cheque') {
      if (!chequeNumber.trim()) {
        setError('لطفاً شماره چک / صیادی را وارد کنید.');
        return;
      }
      if (!chequeDueDate.trim()) {
        setError('لطفاً تاریخ سررسید چک را وارد کنید.');
        return;
      }
    }

    const catTitle = saleCategory === 'external' ? 'فروش خارجی (خروج از انبار)' : 'فروش داخلی (تحویل به انبار)';
    let finalNotes = notes.trim() ? `[${catTitle}] ${notes.trim()}` : `[${catTitle}]`;

    onSave({
      personId,
      date: date.trim() || getTodayJalaliString(),
      weightKg,
      pricePerKg,
      totalPrice: calculatedTotal,
      notes: finalNotes,
      registeredBy: registeredBy.trim() || 'مسئول مس',
      paymentMethod,
      chequeNumber: paymentMethod === 'cheque' ? chequeNumber.trim() : undefined,
      chequeDueDate: paymentMethod === 'cheque' ? chequeDueDate.trim() : undefined,
      chequeBank: paymentMethod === 'cheque' ? chequeBank.trim() : undefined,
      saleCategory,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/70 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 py-4 sm:py-6">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-lg my-auto max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header (Sticky at top) */}
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-emerald-50/90 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-900">
                ثبت فروش مس
              </h3>
              <p className="text-xs text-stone-600 mt-0.5">
                ثبت حواله فروش (پس از تأیید مدیرعامل در کاردکس و دفاتر مالی اعمال خواهد شد)
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
          <div className="p-3 bg-blue-50/90 border border-blue-300/80 rounded-xl text-xs text-blue-950 flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>فرآیند نظارت مدیرعامل:</strong> با ثبت این فرم، حواله فروش در وضعیت <span className="bg-blue-200/80 text-blue-950 font-bold px-1.5 py-0.5 rounded">در انتظار تأیید</span> قرار می‌گیرد و پس از تأیید مدیرعامل به حساب ریالی و انبار اعمال خواهد شد.
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

          {/* Sale Category Selector (Internal vs External) */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              نوع فروش و مقصد مس <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSaleCategory('internal')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-start gap-1 transition-all cursor-pointer ${
                  saleCategory === 'internal'
                    ? 'bg-blue-50 border-blue-500 text-blue-900 ring-1 ring-blue-500 shadow-xs'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-1.5 font-extrabold">
                  <Building2 className="w-4 h-4 text-blue-700" />
                  <span>فروش داخلی (تحویل به شرکت)</span>
                </div>
                <span className="text-[10px] text-stone-500 font-normal">
                  افزایش موجودی مس انبار شرکت
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSaleCategory('external')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-start gap-1 transition-all cursor-pointer ${
                  saleCategory === 'external'
                    ? 'bg-amber-50 border-amber-500 text-amber-950 ring-1 ring-amber-500 shadow-xs'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-1.5 font-extrabold">
                  <ArrowUpRight className="w-4 h-4 text-amber-700" />
                  <span>فروش خارجی (خروج از انبار)</span>
                </div>
                <span className="text-[10px] text-stone-500 font-normal">
                  کاهش موجودی مس انبار شرکت
                </span>
              </button>
            </div>
          </div>

          {/* Payment Method Selector (Cash vs Cheque) */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              نحوه تسویه وجه معامله <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  paymentMethod === 'cash'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs ring-1 ring-emerald-500'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <Wallet className="w-4 h-4 text-emerald-600" />
                <span>تسویه نقد (کیف پول)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cheque')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  paymentMethod === 'cheque'
                    ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-xs ring-1 ring-amber-500'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <CreditCard className="w-4 h-4 text-amber-700" />
                <span>دریافت چک مدت‌دار</span>
              </button>
            </div>
          </div>

          {/* Cheque Details Box (Displayed when Cheque payment is selected) */}
          {paymentMethod === 'cheque' && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-amber-700" />
                  مشخصات چک دریافتی
                </span>
                <span className="text-[11px] font-normal text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
                  مسدودکننده خرید تا زمان وصول
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Cheque Number */}
                <div>
                  <label htmlFor="cheque-num" className="block text-[11px] font-bold text-stone-700 mb-1">
                    شماره چک / شناسه صیاد <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="cheque-num"
                    type="text"
                    required={paymentMethod === 'cheque'}
                    value={chequeNumber}
                    onChange={(e) => setChequeNumber(e.target.value)}
                    placeholder="مثال: 123456789 یا سریال"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 font-mono"
                  />
                </div>

                {/* Cheque Due Date */}
                <div>
                  <label htmlFor="cheque-date" className="block text-[11px] font-bold text-stone-700 mb-1">
                    تاریخ سررسید چک <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="cheque-date"
                      type="text"
                      required={paymentMethod === 'cheque'}
                      value={chequeDueDate}
                      onChange={(e) => setChequeDueDate(e.target.value)}
                      placeholder="1403/12/28"
                      className="w-full pl-2.5 pr-8 py-1.5 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Cheque Bank */}
              <div>
                <label htmlFor="cheque-bank" className="block text-[11px] font-bold text-stone-700 mb-1">
                  نام بانک صادرکننده <span className="text-stone-400 font-normal">(اختیاری)</span>
                </label>
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="cheque-bank"
                    type="text"
                    value={chequeBank}
                    onChange={(e) => setChequeBank(e.target.value)}
                    placeholder="مثال: بانک ملی، تجارت، ملت..."
                    className="w-full pl-2.5 pr-8 py-1.5 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600"
                  />
                </div>
              </div>

              <div className="text-[11px] text-amber-900 bg-amber-100/60 p-2.5 rounded-lg leading-relaxed flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  <b>قانون سامانه:</b> مبلغ این چک تا زمان وصول به موجودی نقدی شخص اضافه نمی‌شود و تا زمان «پاس شدن چک»، امکان خرید مس جدید برای این شخص مسدود خواهد بود.
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
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="sell-price-kg" className="block text-xs font-bold text-stone-700">
                قیمت فروش هر کیلوگرم (تومان) <span className="text-rose-500">*</span>
              </label>
              {defaultPricePerKg > 0 && (
                <button
                  type="button"
                  onClick={() => setPricePerKg(defaultPricePerKg)}
                  className="text-[11px] text-emerald-800 hover:text-emerald-950 font-semibold cursor-pointer underline decoration-dotted"
                  title="تنظیم مجدد به قیمت مرجع فروش"
                >
                  نرخ روز بازار: {formatNumber(defaultPricePerKg)} ت
                </button>
              )}
            </div>
            <NumericInput
              id="sell-price-kg"
              value={pricePerKg}
              onChange={(val) => {
                setPricePerKg(val);
                setError('');
              }}
              placeholder="مثال: 2,850,000"
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

          {/* Submitter Name */}
          <div>
            <label htmlFor="sell-registered-by" className="block text-xs font-bold text-stone-700 mb-1.5">
              نام مسئول ثبت‌کننده فروش <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                id="sell-registered-by"
                type="text"
                required
                value={registeredBy}
                onChange={(e) => setRegisteredBy(e.target.value)}
                placeholder="مثال: حسابدار مس، کارشناس فروش..."
                className="w-full pl-3 pr-9 py-2 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
              />
            </div>
          </div>

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

          </div>

          {/* Footer Buttons (Fixed at bottom) */}
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
