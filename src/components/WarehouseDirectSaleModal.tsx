import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  ShoppingBag, 
  User, 
  Building2, 
  Scale, 
  DollarSign, 
  CreditCard, 
  FileText, 
  CheckCircle2, 
  Search, 
  TrendingUp,
  AlertCircle,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Phone,
  Sparkles
} from 'lucide-react';
import { Person, MarketPrices, PaymentMethod, Transaction } from '../types';
import { formatNumber, formatWeight, toFaDigits, numToWordsFa } from '../utils/formatters';
import { getTodayJalaliString } from '../utils/persianDate';

export interface SelectedWarehouseStockForSale {
  totalWeightKg: number;
  itemsCount: number;
  summaryLabel: string;
  itemsDetails: Array<{
    title: string;
    weightKg: number;
    brand: string;
    specs: string;
  }>;
  rawPayload: any;
}

interface WarehouseDirectSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStock: SelectedWarehouseStockForSale;
  people: Person[];
  marketPrices: MarketPrices;
  onSubmitSale: (saleData: {
    personId?: string;
    isBourseOrExternal: boolean;
    externalPartyName?: string;
    externalPhone?: string;
    weightKg: number;
    unitPrice: number;
    totalAmount: number;
    paymentMethod: PaymentMethod;
    notes?: string;
    chequeNumber?: string;
    chequeDueDate?: string;
    rawPayload?: any;
  }) => Promise<void> | void;
}

export const WarehouseDirectSaleModal: React.FC<WarehouseDirectSaleModalProps> = ({
  isOpen,
  onClose,
  selectedStock,
  people,
  marketPrices,
  onSubmitSale,
}) => {
  // Target Customer Mode: 'registered' (account holder) vs 'bourse_external' (bourse or cash buyer)
  const [saleMode, setSaleMode] = useState<'registered' | 'bourse_external'>('registered');
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [searchPersonQuery, setSearchPersonQuery] = useState<string>('');

  // Bourse / External Buyer Fields
  const [externalPartyName, setExternalPartyName] = useState<string>('خریدار بورسی / متفرقه نقدی');
  const [externalPhone, setExternalPhone] = useState<string>('');

  // Pricing & Quantities
  const [unitPrice, setUnitPrice] = useState<number>(() => marketPrices.sellPrice || 3100000);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [chequeNumber, setChequeNumber] = useState<string>('');
  const [chequeDueDate, setChequeDueDate] = useState<string>(getTodayJalaliString());
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync unit price when market prices change or modal opens
  useEffect(() => {
    if (marketPrices.sellPrice && marketPrices.sellPrice > 0) {
      setUnitPrice(marketPrices.sellPrice);
    }
  }, [marketPrices.sellPrice, isOpen]);

  // Filter registered people
  const filteredPeople = useMemo(() => {
    const q = searchPersonQuery.trim().toLowerCase();
    if (!q) return people;
    return people.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.phone && p.phone.includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q))
    );
  }, [people, searchPersonQuery]);

  const selectedPerson = useMemo(() => {
    return people.find((p) => p.id === selectedPersonId) || null;
  }, [people, selectedPersonId]);

  // Calculations
  const weightKg = Number(selectedStock.totalWeightKg) || 0;
  const totalAmount = Math.round(weightKg * (Number(unitPrice) || 0));

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (weightKg <= 0) return;

    if (saleMode === 'registered' && !selectedPersonId) {
      alert('لطفاً طرف حساب خریدار را انتخاب نمایید.');
      return;
    }

    if (saleMode === 'bourse_external' && !externalPartyName.trim()) {
      alert('لطفاً عنوان خریدار بورسی یا متفرقه را وارد کنید.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitSale({
        personId: saleMode === 'registered' ? selectedPersonId : undefined,
        isBourseOrExternal: saleMode === 'bourse_external',
        externalPartyName: saleMode === 'bourse_external' ? externalPartyName.trim() : undefined,
        externalPhone: saleMode === 'bourse_external' ? externalPhone.trim() : undefined,
        weightKg,
        unitPrice: Number(unitPrice) || 0,
        totalAmount,
        paymentMethod,
        notes: notes.trim() || `فروش مستقیم از انبار مس • ${selectedStock.summaryLabel}`,
        chequeNumber: paymentMethod === 'cheque' ? chequeNumber : undefined,
        chequeDueDate: paymentMethod === 'cheque' ? chequeDueDate : undefined,
        rawPayload: selectedStock.rawPayload,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-2xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200 text-stone-800"
        dir="rtl"
      >
        {/* Header */}
        <div className="bg-stone-900 text-white px-5 py-4 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-800/80 border border-amber-600/50 flex items-center justify-center text-amber-300 shadow-xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-amber-200">
                ثبت فروش مستقیم و خروج از انبار مس
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                کسر هوشمند اقلام فیزیکی انتخاب‌شده و ثبت سند مالی در سامانه
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* 1. Selected Warehouse Stock Specs Card */}
          <div className="bg-amber-50/70 border border-amber-200/90 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-amber-950">
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-800" />
                <span>اقلام انتخاب‌شده برای فروش:</span>
              </span>
              <span className="bg-amber-800 text-white px-2.5 py-0.5 rounded-full text-xs font-mono font-black">
                {toFaDigits(selectedStock.itemsCount)} قلم • {toFaDigits(weightKg.toFixed(1))} کیلوگرم
              </span>
            </div>

            <div className="text-xs text-stone-700 bg-white/80 border border-amber-200/60 rounded-lg p-2.5 space-y-1.5">
              <div className="font-bold text-amber-950 flex items-center justify-between">
                <span>{selectedStock.summaryLabel}</span>
                <span className="font-mono text-amber-800 font-black">
                  صافی: {toFaDigits(weightKg.toFixed(2))} kg
                </span>
              </div>
              {selectedStock.itemsDetails.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1 border-t border-amber-100 text-[11px] text-stone-600">
                  {selectedStock.itemsDetails.slice(0, 6).map((det, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-stone-50 px-2 py-1 rounded">
                      <span className="font-medium truncate max-w-[170px]">{det.title}</span>
                      <span className="font-mono font-bold text-stone-900">
                        {toFaDigits(det.weightKg.toFixed(1))} kg
                      </span>
                    </div>
                  ))}
                  {selectedStock.itemsDetails.length > 6 && (
                    <div className="text-[10px] text-stone-500 py-1 text-center sm:col-span-2">
                      + {toFaDigits(selectedStock.itemsDetails.length - 6)} قلم دیگر...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 2. Customer Type Selector (Registered Account vs Bourse/External) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-stone-700">
              نوع خریدار و نحوه ثبت سند:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSaleMode('registered')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  saleMode === 'registered'
                    ? 'bg-amber-900 text-white border-amber-950 shadow-xs ring-2 ring-amber-500/50'
                    : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                }`}
              >
                <User className="w-4 h-4" />
                <span>مشتری دارای حساب در سامانه</span>
              </button>

              <button
                type="button"
                onClick={() => setSaleMode('bourse_external')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  saleMode === 'bourse_external'
                    ? 'bg-amber-900 text-white border-amber-950 shadow-xs ring-2 ring-amber-500/50'
                    : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>خریدار بورسی / متفرقه نقدی</span>
              </button>
            </div>
          </div>

          {/* Registered Person Select View */}
          {saleMode === 'registered' ? (
            <div className="space-y-2 bg-stone-50 border border-stone-200 rounded-xl p-3">
              <div className="flex items-center justify-between text-xs font-bold text-stone-700">
                <span>انتخاب طرف حساب:</span>
                <span className="text-[11px] text-stone-500 font-mono">
                  {toFaDigits(people.length)} طرف حساب فعال
                </span>
              </div>

              {/* Search bar inside people picker */}
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="جستجوی نام مشتری یا شماره تلفن..."
                  value={searchPersonQuery}
                  onChange={(e) => setSearchPersonQuery(e.target.value)}
                  className="w-full pr-9 pl-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600 focus:border-amber-600"
                />
              </div>

              {/* Scrollable People List */}
              <div className="max-h-36 overflow-y-auto space-y-1 pr-0.5">
                {filteredPeople.map((p) => {
                  const isSelected = p.id === selectedPersonId;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPersonId(p.id)}
                      className={`p-2 rounded-lg cursor-pointer flex items-center justify-between border text-xs transition-colors ${
                        isSelected
                          ? 'bg-amber-100/90 border-amber-400 font-bold text-amber-950'
                          : 'bg-white hover:bg-stone-100/80 border-stone-200 text-stone-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
                          isSelected ? 'border-amber-800 bg-amber-800 text-white' : 'border-stone-400'
                        }`}>
                          {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                        </div>
                        <span>{p.name}</span>
                        {p.phone && <span className="text-[10px] text-stone-500 font-mono">({toFaDigits(p.phone)})</span>}
                      </div>
                      <span className="text-[10px] text-stone-500 font-mono">
                        {p.notes ? p.notes.slice(0, 20) : 'طرف حساب تجاری'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Bourse / External Buyer Input View */
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-2.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  نام خریدار / کارگزاری بورس / شرکت:
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شرکت صنایع مس ایران، کارگزاری بورس کالا، یا نام خریدار"
                  value={externalPartyName}
                  onChange={(e) => setExternalPartyName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600 focus:border-amber-600 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  شماره تماس / هماهنگی (اختیاری):
                </label>
                <input
                  type="text"
                  placeholder="۰۹۱۲..."
                  value={externalPhone}
                  onChange={(e) => setExternalPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600 focus:border-amber-600 font-mono"
                />
              </div>
            </div>
          )}

          {/* 3. Pricing & Financial Calculation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            
            {/* Unit Price per KG */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center justify-between">
                <span>نرخ فروش هر کیلوگرم (تومان):</span>
                {marketPrices.sellPrice > 0 && (
                  <button
                    type="button"
                    onClick={() => setUnitPrice(marketPrices.sellPrice)}
                    className="text-[10px] text-amber-700 hover:text-amber-900 underline font-mono cursor-pointer"
                  >
                    نرخ روز: {formatNumber(marketPrices.sellPrice)} ت
                  </button>
                )}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1000"
                  required
                  value={unitPrice || ''}
                  onChange={(e) => setUnitPrice(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600 focus:border-amber-600 font-mono font-bold text-stone-900"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">
                  تومان
                </span>
              </div>
              <div className="text-[11px] text-stone-500 font-mono mt-0.5">
                معادل: {toFaDigits(formatNumber(unitPrice))} تومان
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                روش پرداخت / تسویه:
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600 focus:border-amber-600 font-bold"
              >
                <option value="deposit">واریز نقدی به حساب بانکی شرکت</option>
                <option value="cash">پرداخت نقدی / تسویه حضوری</option>
                <option value="cheque">چک صیادی بانکی</option>
                <option value="wallet_credit">کسر از مانده ریالی کیف پول مشتری</option>
              </select>
            </div>

          </div>

          {/* Cheque specific fields */}
          {paymentMethod === 'cheque' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-amber-50/50 p-3 rounded-xl border border-amber-200">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  شماره / شناسه ۱۶ رقمی صیاد:
                </label>
                <input
                  type="text"
                  placeholder="۱۲۳۴۵۶۷۸..."
                  value={chequeNumber}
                  onChange={(e) => setChequeNumber(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  تاریخ سررسید چک:
                </label>
                <input
                  type="text"
                  placeholder="۱۴۰۴/۰۵/۱۵"
                  value={chequeDueDate}
                  onChange={(e) => setChequeDueDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg font-mono"
                />
              </div>
            </div>
          )}

          {/* Total Amount Box */}
          <div className="bg-stone-900 text-white p-3.5 rounded-xl border border-stone-800 space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-stone-300">
              <span>مبلغ کل فاکتور فروش:</span>
              <span className="font-mono text-stone-400">
                {toFaDigits(weightKg.toFixed(2))} kg × {formatNumber(unitPrice)} ت
              </span>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-xl sm:text-2xl font-black font-mono text-amber-300">
                {toFaDigits(formatNumber(totalAmount))}
              </span>
              <span className="text-xs text-stone-300 font-bold">تومان</span>
            </div>
            <div className="text-[11px] text-stone-400 font-light border-t border-stone-800 pt-1">
              به حروف: {numToWordsFa(totalAmount)} تومان
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              توضیحات و شرح بارنامه / حواله خروج (اختیاری):
            </label>
            <input
              type="text"
              placeholder="مثال: تحویل به راننده آقای احمدی، حواله فروش شماره ۱۲..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600 focus:border-amber-600"
            />
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              انصراف
            </button>

            <button
              type="submit"
              disabled={isSubmitting || weightKg <= 0}
              className="px-5 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-colors shadow-sm disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 text-amber-300" />
              <span>{isSubmitting ? 'در حال پردازش...' : 'تأیید و صدور فاکتور فروش + کسر از انبار'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
