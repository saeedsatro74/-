import React, { useState } from 'react';
import { 
  X, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ShoppingBag, 
  TrendingUp, 
  CreditCard, 
  Copy, 
  Check, 
  AlertTriangle, 
  Building2, 
  FileText,
  Calendar,
  Wallet,
  Clock,
  Send,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { Person, PersonWalletSummary, MarketPrices, TransactionType, PaymentMethod, CompanyBankInfo } from '../types';
import { formatNumber, formatToman, formatWeight } from '../utils/formatters';
import { NumericInput } from './NumericInput';
import { getStoredCompanyBankInfo, DEFAULT_COMPANY_BANK_INFO } from '../utils/storage';

interface ClientRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: Person;
  summary: PersonWalletSummary;
  marketPrices: MarketPrices;
  companyBankInfo?: CompanyBankInfo;
  initialType?: TransactionType;
  onSubmitRequest: (data: {
    type: TransactionType;
    amount: number;
    weightKg?: number;
    unitPrice?: number;
    notes?: string;
    paymentMethod?: PaymentMethod;
    receiptImageUrl?: string;
  }) => void;
}

export const ClientRequestModal: React.FC<ClientRequestModalProps> = ({
  isOpen,
  onClose,
  person,
  summary,
  marketPrices,
  companyBankInfo,
  initialType = 'deposit',
  onSubmitRequest,
}) => {
  const bankInfo = companyBankInfo || getStoredCompanyBankInfo() || DEFAULT_COMPANY_BANK_INFO;
  const [requestType, setRequestType] = useState<TransactionType>(initialType);
  
  // Form fields
  const [amount, setAmount] = useState<number>(0);
  const [weightKg, setWeightKg] = useState<number>(0);
  const [unitPrice, setUnitPrice] = useState<number>(
    initialType === 'buy' ? marketPrices.buyPrice : marketPrices.sellPrice
  );
  
  // Deposit specific
  const [receiptCode, setReceiptCode] = useState('');
  const [receiptImageBase64, setReceiptImageBase64] = useState<string | null>(null);
  
  // Withdrawal specific
  const [clientCardNumber, setClientCardNumber] = useState('');
  const [clientBankName, setClientBankName] = useState('');
  
  // General
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleReceiptImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setError('حجم تصویر فیش واریزی نباید بیشتر از ۸ مگابایت باشد.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setReceiptImageBase64(reader.result as string);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTypeChange = (type: TransactionType) => {
    setRequestType(type);
    setError('');
    setAmount(0);
    setWeightKg(0);
    if (type === 'buy') setUnitPrice(marketPrices.buyPrice);
    if (type === 'sell') setUnitPrice(marketPrices.sellPrice);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (requestType === 'deposit') {
      if (amount <= 0) {
        setError('لطفاً مبلغ واریزی به حساب شرکت را وارد کنید.');
        return;
      }
      let finalNotes = `کد پیگیری/فیش: ${receiptCode.trim() || 'ثبت نشده'}`;
      if (receiptImageBase64) finalNotes += ` | [تصویر رسید ضمیمه شد]`;
      if (notes.trim()) finalNotes += ` | توضیحات: ${notes.trim()}`;

      onSubmitRequest({
        type: 'deposit',
        amount,
        notes: finalNotes,
        receiptImageUrl: receiptImageBase64 || undefined,
      });
      onClose();
      return;
    }


    if (requestType === 'withdrawal') {
      if (amount <= 0) {
        setError('لطفاً مبلغ درخواستی برای برداشت را وارد کنید.');
        return;
      }
      if (amount > summary.cashBalance) {
        setError(
          `مبلغ درخواستی برداشت (${formatToman(amount)}) بیشتر از موجودی نقدی شما (${formatToman(
            summary.cashBalance
          )}) است.`
        );
        return;
      }
      if (!clientCardNumber.trim()) {
        setError('لطفاً شماره کارت یا شبا خود را برای واریز وجه شرکت وارد کنید.');
        return;
      }
      let finalNotes = `شماره کارت/شبا مقصد: ${clientCardNumber.trim()} (${clientBankName.trim() || 'بانک مقصد'})`;
      if (notes.trim()) finalNotes += ` | توضیحات: ${notes.trim()}`;

      onSubmitRequest({
        type: 'withdrawal',
        amount,
        notes: finalNotes,
      });
      onClose();
      return;
    }

    if (requestType === 'sell') {
      if (weightKg <= 0) {
        setError('لطفاً مقدار مس برای فروش به کیلوگرم را وارد کنید.');
        return;
      }
      if (weightKg > summary.copperStockKg) {
        setError(
          `موجود مس شما کافی نیست! موجودی فعلی: ${formatWeight(summary.copperStockKg)}، مقدار درخواستی: ${formatWeight(
            weightKg
          )}`
        );
        return;
      }
      if (unitPrice <= 0) {
        setError('لطفاً قیمت پیشنهادی هر کیلوگرم مس را وارد کنید.');
        return;
      }

      const totalCalculated = Math.round(weightKg * unitPrice);
      let finalNotes = `درخواست فروش ${formatWeight(weightKg)} مس با نرخ ${formatToman(unitPrice)}`;
      if (notes.trim()) finalNotes += ` | توضیحات: ${notes.trim()}`;

      onSubmitRequest({
        type: 'sell',
        amount: totalCalculated,
        weightKg,
        unitPrice,
        notes: finalNotes,
      });
      onClose();
      return;
    }

    if (requestType === 'buy') {
      if (weightKg <= 0) {
        setError('لطفاً مقدار مس برای خرید به کیلوگرم را وارد کنید.');
        return;
      }
      if (unitPrice <= 0) {
        setError('لطفاً قیمت خرید هر کیلوگرم را وارد کنید.');
        return;
      }
      const totalCalculated = Math.round(weightKg * unitPrice);
      if (totalCalculated > summary.cashBalance) {
        setError(
          `موجودی ریالی شما کافی نیست! موجودی فعلی: ${formatToman(summary.cashBalance)}، مبلغ فاکتور: ${formatToman(
            totalCalculated
          )}.`
        );
        return;
      }

      let finalNotes = `درخواست خرید ${formatWeight(weightKg)} مس با نرخ ${formatToman(unitPrice)}`;
      if (notes.trim()) finalNotes += ` | توضیحات: ${notes.trim()}`;

      onSubmitRequest({
        type: 'buy',
        amount: totalCalculated,
        weightKg,
        unitPrice,
        notes: finalNotes,
      });
      onClose();
      return;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/70 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 py-4 sm:py-6">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-xl my-auto max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-900 text-white flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                ثبت درخواست جدید به مدیریت
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                شارژ حساب، برداشت موجودی، یا خرید و فروش مس (نیاز به تأیید مدیرعامل)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
            title="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Type Selector Tabs */}
        <div className="p-3 bg-stone-100 border-b border-stone-200 flex items-center justify-between gap-1 overflow-x-auto">
          
          <button
            type="button"
            onClick={() => handleTypeChange('deposit')}
            className={`flex-1 min-w-[110px] py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              requestType === 'deposit'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>شارژ حساب</span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange('withdrawal')}
            className={`flex-1 min-w-[110px] py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              requestType === 'withdrawal'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>برداشت وجه</span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange('sell')}
            className={`flex-1 min-w-[110px] py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              requestType === 'sell'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>فروش مس</span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange('buy')}
            className={`flex-1 min-w-[110px] py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              requestType === 'buy'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>خرید مس</span>
          </button>

        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-4 sm:p-5 space-y-4 flex-1">
            
            {/* Wallet Quick Overview */}
            <div className="grid grid-cols-2 gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-600" />
                <span className="text-stone-500">موجودی نقدی فعلی:</span>
                <span className="font-bold text-stone-900 font-mono">
                  {formatNumber(summary.cashBalance)} تومان
                </span>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-stone-500">موجودی مس انبار:</span>
                <span className="font-bold text-amber-800 font-mono">
                  {formatWeight(summary.copperStockKg)}
                </span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* COMPANY BANK DETAILS (DISPLAYED WHEN REQUESTING DEPOSIT / CHARGE) */}
            {requestType === 'deposit' && (
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
                  <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
                    <Building2 className="w-4 h-4 text-emerald-700" />
                    <span>شماره حساب و کارت شرکت ({bankInfo.bankName}):</span>
                  </div>
                  <span className="text-[11px] text-emerald-800 font-medium">
                    {bankInfo.ownerName}
                  </span>
                </div>

                {/* Card Row */}
                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-emerald-200/60">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-stone-400" />
                    <span className="text-xs text-stone-500">شماره کارت:</span>
                    <span className="font-mono text-sm font-extrabold text-stone-900 tracking-wider">
                      {bankInfo.cardNumber}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(bankInfo.rawCardNumber || bankInfo.cardNumber, 'card')}
                    className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    {copiedField === 'card' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === 'card' ? 'کپی شد!' : 'کپی شماره کارت'}</span>
                  </button>
                </div>

                {/* IBAN Row */}
                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-emerald-200/60">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-500 font-bold">شبا:</span>
                    <span className="font-mono text-xs font-bold text-stone-800">
                      {bankInfo.formattedIban || bankInfo.ibanNumber}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(bankInfo.ibanNumber, 'iban')}
                    className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    {copiedField === 'iban' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === 'iban' ? 'کپی شد!' : 'کپی شبا'}</span>
                  </button>
                </div>

                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  💡 پس از واریز وجه به کارت بالا، مبلغ، عکس فیش واریزی و شماره فیش را وارد کرده و ثبت کنید تا مدیرعامل تأیید کند.
                </p>
              </div>
            )}

            {/* FORM FIELDS BY REQUEST TYPE */}

            {/* DEPOSIT FIELDS */}
            {requestType === 'deposit' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    مبلغ واریز شده به حساب شرکت (تومان) <span className="text-rose-500">*</span>
                  </label>
                  <NumericInput
                    value={amount}
                    onChange={(val) => {
                      setAmount(val);
                      setError('');
                    }}
                    placeholder="مثال: 50,000,000"
                    unitLabel="تومان"
                    showWordHelper={true}
                    required
                  />
                </div>

                {/* Bank Receipt Image Upload Field */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center justify-between">
                    <span>بارگذاری عکس فیش / رسید بانکی</span>
                    <span className="text-[11px] text-emerald-700 font-medium">جهت اطمینان خاطره مدیرعامل</span>
                  </label>

                  {receiptImageBase64 ? (
                    <div className="relative rounded-2xl border-2 border-dashed border-emerald-400 bg-emerald-50/50 p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <img
                          src={receiptImageBase64}
                          alt="رسید واریزی"
                          className="w-16 h-16 rounded-xl object-cover border border-emerald-300 shadow-xs shrink-0"
                        />
                        <div className="truncate">
                          <p className="text-xs font-bold text-emerald-900 truncate">تصویر رسید بانکی آپلود شد</p>
                          <p className="text-[10px] text-emerald-700">جهت تایید مدیریت ارسال می‌شود</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReceiptImageBase64(null)}
                        className="px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
                      >
                        حذف و انتخاب مجدد
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-stone-300 hover:border-emerald-500 bg-stone-50 hover:bg-emerald-50/30 rounded-2xl cursor-pointer transition-all group">
                      <div className="flex flex-col items-center justify-center pt-3 pb-3">
                        <Upload className="w-7 h-7 text-stone-400 group-hover:text-emerald-600 transition-colors mb-1.5" />
                        <p className="text-xs text-stone-700 font-bold group-hover:text-emerald-800">
                          برای بارگذاری عکس رسید بانکی اینجا کلیک کنید
                        </p>
                        <p className="text-[10px] text-stone-400 mt-0.5">فرمت‌های JPG، PNG یا WEBP (حداکثر ۸ مگابایت)</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleReceiptImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    شماره فیش / کد پیگیری تراکنش <span className="text-stone-400 font-normal">(جهت بررسی مدیر)</span>
                  </label>
                  <input
                    type="text"
                    value={receiptCode}
                    onChange={(e) => setReceiptCode(e.target.value)}
                    placeholder="مثال: 123456789"
                    className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
                  />
                </div>
              </>
            )}

            {/* WITHDRAWAL FIELDS */}
            {requestType === 'withdrawal' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    مبلغ درخواستی برای برداشت (تومان) <span className="text-rose-500">*</span>
                  </label>
                  <NumericInput
                    value={amount}
                    onChange={(val) => {
                      setAmount(val);
                      setError('');
                    }}
                    placeholder="مثال: 20,000,000"
                    unitLabel="تومان"
                    showWordHelper={true}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                      شماره کارت یا شماره شبا شما <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={clientCardNumber}
                      onChange={(e) => setClientCardNumber(e.target.value)}
                      placeholder="6037... یا IR..."
                      className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-600 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                      نام بانک حساب شما <span className="text-stone-400 font-normal">(اختیاری)</span>
                    </label>
                    <input
                      type="text"
                      value={clientBankName}
                      onChange={(e) => setClientBankName(e.target.value)}
                      placeholder="مثال: ملی، ملت، صادرات..."
                      className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-600"
                    />
                  </div>
                </div>
              </>
            )}

            {/* SELL COPPER FIELDS */}
            {requestType === 'sell' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                      وزن مس برای فروش (کیلوگرم) <span className="text-rose-500">*</span>
                    </label>
                    <NumericInput
                      value={weightKg}
                      onChange={(val) => {
                        setWeightKg(val);
                        setError('');
                      }}
                      placeholder="مثال: 50"
                      unitLabel="کیلوگرم"
                      allowDecimals={true}
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-stone-700">
                        قیمت پیشنهادی هر کیلو (تومان) <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setUnitPrice(marketPrices.sellPrice)}
                        className="text-[11px] text-blue-800 hover:text-blue-950 font-semibold underline cursor-pointer"
                      >
                        نرخ روز: {formatNumber(marketPrices.sellPrice)} ت
                      </button>
                    </div>
                    <NumericInput
                      value={unitPrice}
                      onChange={(val) => {
                        setUnitPrice(val);
                        setError('');
                      }}
                      placeholder="قیمت هر کیلو"
                      unitLabel="تومان"
                      required
                    />
                  </div>
                </div>

                {weightKg > 0 && unitPrice > 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                    <span className="text-blue-900 font-bold">مبلغ کل دریافت فروش:</span>
                    <span className="font-extrabold text-blue-950 font-mono text-sm">
                      {formatNumber(Math.round(weightKg * unitPrice))} تومان
                    </span>
                  </div>
                )}
              </>
            )}

            {/* BUY COPPER FIELDS */}
            {requestType === 'buy' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                      وزن مس برای خرید (کیلوگرم) <span className="text-rose-500">*</span>
                    </label>
                    <NumericInput
                      value={weightKg}
                      onChange={(val) => {
                        setWeightKg(val);
                        setError('');
                      }}
                      placeholder="مثال: 30"
                      unitLabel="کیلوگرم"
                      allowDecimals={true}
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-stone-700">
                        قیمت هر کیلو مس (تومان) <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setUnitPrice(marketPrices.buyPrice)}
                        className="text-[11px] text-amber-800 hover:text-amber-950 font-semibold underline cursor-pointer"
                      >
                        نرخ روز: {formatNumber(marketPrices.buyPrice)} ت
                      </button>
                    </div>
                    <NumericInput
                      value={unitPrice}
                      onChange={(val) => {
                        setUnitPrice(val);
                        setError('');
                      }}
                      placeholder="قیمت هر کیلو"
                      unitLabel="تومان"
                      required
                    />
                  </div>
                </div>

                {weightKg > 0 && unitPrice > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
                    <span className="text-amber-900 font-bold">مبلغ کل فاکتور خرید:</span>
                    <span className="font-extrabold text-amber-950 font-mono text-sm">
                      {formatNumber(Math.round(weightKg * unitPrice))} تومان
                    </span>
                  </div>
                )}
              </>
            )}

            {/* GENERAL NOTES FIELD */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                توضیحات تکمیلی برای مدیرعامل <span className="text-stone-400 font-normal">(اختیاری)</span>
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="هرگونه توضیح در مورد این درخواست..."
                className="w-full p-2.5 text-xs bg-white border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-600 resize-none"
              />
            </div>

            {/* APPROVAL FLOW NOTICE */}
            <div className="p-3 bg-stone-100 border border-stone-200 rounded-xl text-[11px] text-stone-600 flex items-center gap-2">
              <Clock className="w-4 h-4 text-stone-500 shrink-0" />
              <span>
                پس از ثبت، درخواست شما مستقیماً در کارتابل تأییدات مدیرعامل قرار می‌گیرد و پس از بررسی و تایید، اعمال خواهد شد.
              </span>
            </div>

          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-900 bg-stone-200 rounded-xl cursor-pointer"
            >
              انصراف
            </button>

            <button
              type="submit"
              className={`px-5 py-2 text-xs font-extrabold text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                requestType === 'deposit'
                  ? 'bg-emerald-700 hover:bg-emerald-800'
                  : requestType === 'withdrawal'
                  ? 'bg-rose-700 hover:bg-rose-800'
                  : requestType === 'sell'
                  ? 'bg-blue-700 hover:bg-blue-800'
                  : 'bg-amber-700 hover:bg-amber-800'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>ارسال درخواست برای مدیرعامل</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
