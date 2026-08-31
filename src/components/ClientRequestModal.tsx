import React, { useState } from 'react';
import { 
  X, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ShoppingBag, 
  TrendingUp, 
  AlertTriangle, 
  Building2, 
  Wallet, 
  Clock, 
  Send,
  CheckCircle2,
  Copy,
  Upload,
  ImageIcon,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { Person, PersonWalletSummary, MarketPrices, TransactionType, PaymentMethod, CompanyBankInfo, Transaction } from '../types';
import { formatNumber, formatToman, formatWeight } from '../utils/formatters';
import { NumericInput } from './NumericInput';

function formatPersianDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fa-IR');
  } catch {
    return dateStr;
  }
}

interface ClientRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: Person;
  summary: PersonWalletSummary;
  marketPrices: MarketPrices;
  companyBankInfo?: CompanyBankInfo;
  initialType?: TransactionType;
  activeTopupTx?: Transaction | null;
  onSubmitRequest: (data: {
    type: TransactionType;
    amount: number;
    weightKg?: number;
    unitPrice?: number;
    notes?: string;
    paymentMethod?: PaymentMethod;
    receiptImageUrl?: string;
  }) => void;
  onSubmitTopupReceipt?: (
    txId: string,
    receiptImageUrl: string,
    receiptNumber: string,
    notes?: string
  ) => void;
}

export const ClientRequestModal: React.FC<ClientRequestModalProps> = ({
  isOpen,
  onClose,
  person,
  summary,
  marketPrices,
  initialType = 'deposit',
  activeTopupTx,
  onSubmitRequest,
  onSubmitTopupReceipt,
}) => {
  const requestType = initialType;

  // Form fields for fresh requests
  const [amount, setAmount] = useState<number>(0);
  const [weightKg, setWeightKg] = useState<number>(0);
  const [unitPrice, setUnitPrice] = useState<number>(
    initialType === 'buy' ? marketPrices.buyPrice : marketPrices.sellPrice
  );
  
  // Withdrawal specific
  const [clientCardNumber, setClientCardNumber] = useState('');
  const [clientBankName, setClientBankName] = useState('');
  
  // Step 3 (Topup Receipt Upload) State inside Deposit Modal
  const [receiptImageBase64, setReceiptImageBase64] = useState<string>('');
  const [receiptCodeInput, setReceiptCodeInput] = useState<string>('');
  const [receiptNotesInput, setReceiptNotesInput] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // General Error & Feedback
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setError('حجم تصویر نباید بیشتر از ۸ مگابایت باشد.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptImageBase64(reader.result as string);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitStep3Receipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTopupTx) return;

    if (!receiptImageBase64) {
      setError('لطفاً عکس فیش یا رسید واریزی را بارگذاری کنید.');
      return;
    }

    if (!receiptCodeInput.trim()) {
      setError('لطفاً شماره پیگیری یا کد ارجاع فیش واریزی را وارد کنید.');
      return;
    }

    if (onSubmitTopupReceipt) {
      onSubmitTopupReceipt(
        activeTopupTx.id,
        receiptImageBase64,
        receiptCodeInput.trim(),
        receiptNotesInput.trim()
      );
    }

    setReceiptImageBase64('');
    setReceiptCodeInput('');
    setReceiptNotesInput('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // --- DEPOSIT REQUEST (Step 1 of 4) ---
    if (requestType === 'deposit') {
      if (amount <= 0) {
        setError('لطفاً مبلغ مورد نظر جهت شارژ حساب را وارد نمایید.');
        return;
      }

      onSubmitRequest({
        type: 'deposit',
        amount,
        notes: notes.trim() ? `توضیحات مشتری: ${notes.trim()}` : undefined,
      });
      onClose();
      return;
    }

    // --- WITHDRAWAL REQUEST ---
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
        setError('لطفاً شماره کارت یا شبا خود را جهت واریز وجه وارد کنید.');
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

    // --- SELL COPPER REQUEST ---
    if (requestType === 'sell') {
      if (weightKg <= 0) {
        setError('لطفاً مقدار مس برای فروش به کیلوگرم را وارد کنید.');
        return;
      }
      if (weightKg > summary.copperStockKg) {
        setError(
          `موجودی مس شما کافی نیست! موجودی فعلی: ${formatWeight(summary.copperStockKg)}، مقدار درخواستی: ${formatWeight(
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

    // --- BUY COPPER REQUEST ---
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

  const getHeaderInfo = () => {
    switch (requestType) {
      case 'deposit':
        return {
          title: 'فرآیند شارژ و واریز موجودی حساب',
          subtitle: 'پیگیری مرحله به مرحله ثبت درخواست، دریافت شماره حساب و واریز وجه',
          icon: <ArrowDownLeft className="w-6 h-6 text-emerald-400" />,
          colorBg: 'bg-emerald-900',
          btnColor: 'bg-emerald-700 hover:bg-emerald-800',
        };
      case 'withdrawal':
        return {
          title: 'درخواست برداشت موجودی ریالی',
          subtitle: 'ثبت درخواست تسویه و واریز وجه به شماره کارت شما توسط مدیرعامل',
          icon: <ArrowUpRight className="w-6 h-6 text-rose-400" />,
          colorBg: 'bg-rose-950',
          btnColor: 'bg-rose-700 hover:bg-rose-800',
        };
      case 'sell':
        return {
          title: 'درخواست فروش مس به شرکت',
          subtitle: 'تبدیل مس موجود در انبار شما به موجودی نقد ریالی',
          icon: <TrendingUp className="w-6 h-6 text-blue-400" />,
          colorBg: 'bg-blue-950',
          btnColor: 'bg-blue-700 hover:bg-blue-800',
        };
      case 'buy':
        return {
          title: 'درخواست خرید مس از انبار',
          subtitle: 'خرید مس با موجودی کیف پول ریالی بر اساس نرخ روز بازار',
          icon: <ShoppingBag className="w-6 h-6 text-amber-400" />,
          colorBg: 'bg-amber-950',
          btnColor: 'bg-amber-700 hover:bg-amber-800',
        };
    }
  };

  const info = getHeaderInfo();

  // Helper to determine current deposit step number
  const getDepositStepNumber = () => {
    if (!activeTopupTx) return 1;
    if (activeTopupTx.approvalStatus === 'topup_step1_pending_bank') return 2;
    if (activeTopupTx.approvalStatus === 'topup_step2_awaiting_receipt') return 3;
    if (activeTopupTx.approvalStatus === 'topup_step3_pending_approval') return 4;
    return 1;
  };

  const currentDepositStep = getDepositStepNumber();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 dir-rtl">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-2xl my-auto max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className={`p-5 ${info.colorBg} text-white flex items-center justify-between shrink-0 z-10 shadow-md`}>
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              {info.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-xl text-white">
                  {info.title}
                </h3>
              </div>
              <p className="text-xs text-stone-300 mt-0.5">
                {info.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            title="بستن"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-5 sm:p-7 space-y-5 flex-1">
            
            {/* Wallet Quick Overview */}
            <div className="grid grid-cols-2 gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-200 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-stone-500 block text-[11px]">موجودی نقدی کیف پول:</span>
                  <span className="font-extrabold text-stone-900 font-mono text-sm block truncate">
                    {formatNumber(summary.cashBalance)} <span className="text-[10px] text-stone-500 font-sans">تومان</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 border-r border-stone-200 pr-4">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold shrink-0">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-stone-500 block text-[11px]">موجودی مس در انبار:</span>
                  <span className="font-extrabold text-amber-900 font-mono text-sm block truncate">
                    {formatWeight(summary.copperStockKg)}
                  </span>
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* ======================================================== */}
            {/* DEPOSIT WORKFLOW (DYNAMIC 4-STEP WIZARD) */}
            {/* ======================================================== */}
            {requestType === 'deposit' && (
              <div className="space-y-6">

                {/* VISUAL 4-STEP PROGRESS BAR */}
                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-extrabold text-stone-800 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-emerald-700" />
                      <span>مراحل شارژ و واریز وجه به حساب</span>
                    </span>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      مرحله {currentDepositStep} از ۴
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-bold relative">
                    
                    {/* Step 1 */}
                    <div className={`p-2.5 rounded-xl border transition-all flex flex-col items-center gap-1 ${
                      currentDepositStep > 1 
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                        : currentDepositStep === 1
                        ? 'bg-emerald-600 border-emerald-700 text-white shadow-md'
                        : 'bg-white border-stone-200 text-stone-400'
                    }`}>
                      <span className="text-[10px] opacity-80">مرحله ۱</span>
                      <span className="text-[11px] font-black leading-tight">ثبت مبلغ</span>
                      {currentDepositStep > 1 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 mt-0.5" />}
                    </div>

                    {/* Step 2 */}
                    <div className={`p-2.5 rounded-xl border transition-all flex flex-col items-center gap-1 ${
                      currentDepositStep > 2
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                        : currentDepositStep === 2
                        ? 'bg-amber-500 border-amber-600 text-white shadow-md animate-pulse'
                        : 'bg-white border-stone-200 text-stone-400'
                    }`}>
                      <span className="text-[10px] opacity-80">مرحله ۲</span>
                      <span className="text-[11px] font-black leading-tight">تأیید مدیر</span>
                      {currentDepositStep === 2 && <Clock className="w-3.5 h-3.5 text-amber-100 mt-0.5" />}
                      {currentDepositStep > 2 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 mt-0.5" />}
                    </div>

                    {/* Step 3 */}
                    <div className={`p-2.5 rounded-xl border transition-all flex flex-col items-center gap-1 ${
                      currentDepositStep > 3
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                        : currentDepositStep === 3
                        ? 'bg-emerald-600 border-emerald-700 text-white shadow-md ring-2 ring-emerald-400/50'
                        : 'bg-white border-stone-200 text-stone-400'
                    }`}>
                      <span className="text-[10px] opacity-80">مرحله ۳</span>
                      <span className="text-[11px] font-black leading-tight">آپلود فیش</span>
                      {currentDepositStep === 3 && <Upload className="w-3.5 h-3.5 text-white mt-0.5" />}
                      {currentDepositStep > 3 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 mt-0.5" />}
                    </div>

                    {/* Step 4 */}
                    <div className={`p-2.5 rounded-xl border transition-all flex flex-col items-center gap-1 ${
                      currentDepositStep === 4
                        ? 'bg-blue-600 border-blue-700 text-white shadow-md animate-pulse'
                        : 'bg-white border-stone-200 text-stone-400'
                    }`}>
                      <span className="text-[10px] opacity-80">مرحله ۴</span>
                      <span className="text-[11px] font-black leading-tight">شارژ نهایی</span>
                      {currentDepositStep === 4 && <Clock className="w-3.5 h-3.5 text-blue-100 mt-0.5" />}
                    </div>

                  </div>
                </div>

                {/* ------------------------------------------------------------- */}
                {/* CASE A: STEP 1 FRESH FORM (No active topup request) */}
                {/* ------------------------------------------------------------- */}
                {!activeTopupTx && (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4.5 space-y-1.5">
                      <div className="flex items-center gap-2 text-emerald-950 font-extrabold text-sm">
                        <Building2 className="w-5 h-5 text-emerald-700" />
                        <span>مرحله ۱: ثبت مبلغ درخواستی جهت دریافت شماره حساب</span>
                      </div>
                      <p className="text-xs text-emerald-900 leading-relaxed">
                        مبلغ مدنظر برای شارژ حساب را وارد نمایید. پس از ثبت، درخواست به مدیرعامل ارسال می‌گردد تا شماره حساب اختصاصی شرکت برای شما صادر شود.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-2">
                        مبلغ درخواستی جهت شارژ حساب (تومان) <span className="text-rose-500">*</span>
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

                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-2">
                        توضیحات تکمیلی <span className="text-stone-400 font-normal">(اختیاری)</span>
                      </label>
                      <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="هرگونه توضیح در مورد این واریزی..."
                        className="w-full p-3 text-xs bg-stone-50 border border-stone-300 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-none"
                      />
                    </div>

                    <div className="p-4 border-t border-stone-200 bg-stone-50 rounded-2xl flex items-center justify-between">
                      <span className="text-xs text-stone-500">پس از ثبت، مدیرعامل شماره حساب جهت واریز وجه را ارسال می‌کند.</span>
                      <button
                        type="submit"
                        className="px-6 py-2.5 text-xs font-extrabold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        <span>ثبت درخواست و دریافت شماره حساب</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* ------------------------------------------------------------- */}
                {/* CASE B: STEP 2 (Awaiting CEO Bank Account Assignment) */}
                {/* ------------------------------------------------------------- */}
                {activeTopupTx && activeTopupTx.approvalStatus === 'topup_step1_pending_bank' && (
                  <div className="space-y-4">
                    <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md animate-pulse">
                          <Clock className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-xs font-extrabold text-amber-900 bg-amber-200 px-2.5 py-0.5 rounded-full inline-block mb-1">
                            مرحله ۲ از ۴ • در حال بررسی توسط مدیرعامل
                          </span>
                          <h4 className="font-extrabold text-stone-900 text-base">
                            درخواست شارژ حساب شما ثبت گردید
                          </h4>
                        </div>
                      </div>

                      <div className="bg-white/90 p-3.5 rounded-xl border border-amber-200 text-xs space-y-2">
                        <div className="flex justify-between items-center text-stone-700">
                          <span>مبلغ درخواستی شما:</span>
                          <span className="font-extrabold text-stone-950 font-mono text-sm">
                            {formatToman(activeTopupTx.amount)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-stone-600 border-t border-stone-100 pt-2 text-[11px]">
                          <span>کد پیگیری درخواست:</span>
                          <span className="font-mono text-stone-900 font-bold">{activeTopupTx.receiptNumber}</span>
                        </div>
                        <div className="flex justify-between items-center text-stone-600 text-[11px]">
                          <span>تاریخ ثبت:</span>
                          <span>{formatPersianDate(activeTopupTx.date)}</span>
                        </div>
                      </div>

                      <p className="text-xs text-amber-950 leading-relaxed font-semibold">
                        درخواست شما جهت اختصاص شماره حساب برای مدیرعامل ارسال گردیده است. به محض اینکه مدیرعامل شماره حساب و کارت شرکت را ثبت نماید، این صفحه به‌روزرسانی شده و کادر واریز وجه و آپلود فیش بانکی برای شما فعال می‌گردد.
                      </p>
                    </div>

                    <div className="p-4 bg-stone-100 border border-stone-200 rounded-2xl text-center text-xs text-stone-600">
                      لطفاً منتظر تأیید و ارسال شماره حساب اختصاصی توسط مدیرعامل باشید...
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* CASE C: STEP 3 (CEO Bank Assigned, Awaiting Receipt Upload) */}
                {/* ------------------------------------------------------------- */}
                {activeTopupTx && activeTopupTx.approvalStatus === 'topup_step2_awaiting_receipt' && (
                  <form onSubmit={handleSubmitStep3Receipt} className="space-y-4">
                    
                    {/* Bank Info Card */}
                    <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-4.5 space-y-3">
                      <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-emerald-700" />
                          <span className="text-xs font-extrabold text-emerald-950">
                            شماره حساب اختصاصی صادر شده توسط مدیرعامل
                          </span>
                        </div>
                        <span className="text-xs font-black text-emerald-900 bg-emerald-200 px-3 py-1 rounded-full font-mono">
                          مبلغ: {formatToman(activeTopupTx.amount)}
                        </span>
                      </div>

                      <div className="bg-white p-3.5 rounded-xl border border-emerald-200 space-y-2.5 text-xs text-stone-900">
                        <div className="flex justify-between font-bold text-stone-800">
                          <span>بانک: <b className="text-emerald-900">{activeTopupTx.assignedBankName || 'بانک شرکت'}</b></span>
                          <span>صاحب حساب: <b>{activeTopupTx.assignedOwnerName || 'شرکت مس واته'}</b></span>
                        </div>

                        {/* Card Number */}
                        <div className="flex justify-between items-center pt-2 border-t border-stone-100 font-mono bg-stone-50 p-2.5 rounded-xl">
                          <div className="flex items-center gap-2">
                            <span className="text-stone-500 text-[11px] font-sans">شماره کارت:</span>
                            <span className="text-stone-900 dir-ltr text-xs sm:text-sm font-black">
                              {activeTopupTx.assignedCardNumber}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(activeTopupTx.assignedCardNumber || '', 'card')}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1 shrink-0 shadow-xs"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copiedField === 'card' ? 'کپی شد!' : 'کپی شماره کارت'}</span>
                          </button>
                        </div>

                        {/* IBAN Number */}
                        {activeTopupTx.assignedIbanNumber && (
                          <div className="flex justify-between items-center font-mono bg-stone-50 p-2.5 rounded-xl text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-stone-500 text-[11px] font-sans">شماره شبا:</span>
                              <span className="text-stone-900 dir-ltr font-bold text-xs">
                                {activeTopupTx.assignedIbanNumber}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopy(activeTopupTx.assignedIbanNumber || '', 'iban')}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1 shrink-0 shadow-xs"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>{copiedField === 'iban' ? 'کپی شد!' : 'کپی شبا'}</span>
                            </button>
                          </div>
                        )}

                        {activeTopupTx.assignedBankNote && (
                          <p className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-lg font-medium">
                            💡 یادداشت مدیرعامل: {activeTopupTx.assignedBankNote}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Step 3 Form: Upload Receipt */}
                    <div className="space-y-4 pt-1">
                      <div>
                        <label className="block text-xs font-bold text-stone-800 mb-2">
                          تصویر فیش یا رسید واریزی بانکی <span className="text-rose-500">*</span>
                        </label>
                        
                        {receiptImageBase64 ? (
                          <div className="relative rounded-2xl border-2 border-dashed border-emerald-500 p-3 bg-emerald-50/50 flex flex-col items-center gap-3">
                            <img
                              src={receiptImageBase64}
                              alt="پیش‌نمایش فیش"
                              className="max-h-52 rounded-xl object-contain shadow-md border border-emerald-300"
                            />
                            <button
                              type="button"
                              onClick={() => setReceiptImageBase64('')}
                              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                            >
                              حذف و انتخاب مجدد تصویر
                            </button>
                          </div>
                        ) : (
                          <label className="border-2 border-dashed border-stone-300 hover:border-emerald-600 rounded-2xl p-7 flex flex-col items-center justify-center gap-2 cursor-pointer bg-stone-50 hover:bg-emerald-50/30 transition-all group">
                            <ImageIcon className="w-9 h-9 text-stone-400 group-hover:text-emerald-600 transition-colors" />
                            <span className="text-xs font-bold text-stone-800 group-hover:text-emerald-900">
                              برای آپلود تصویر فیش واریزی اینجا کلیک کنید
                            </span>
                            <span className="text-[10px] text-stone-400">فرمت‌های تصویری JPG, PNG, WEBP (حداکثر ۸ مگابایت)</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>

                      {/* Receipt Code */}
                      <div>
                        <label className="block text-xs font-bold text-stone-800 mb-2">
                          شماره پیگیری / کد ارجاع فیش واریزی <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={receiptCodeInput}
                          onChange={(e) => setReceiptCodeInput(e.target.value)}
                          placeholder="مثال: ۱۲۳۴۵۶۷۸۹"
                          className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600 text-stone-900"
                        />
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-xs font-bold text-stone-800 mb-2">
                          توضیحات تکمیلی <span className="text-stone-400 font-normal">(اختیاری)</span>
                        </label>
                        <input
                          type="text"
                          value={receiptNotesInput}
                          onChange={(e) => setReceiptNotesInput(e.target.value)}
                          placeholder="توضیحات واریز..."
                          className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 text-stone-900"
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          className="w-full py-3 text-xs font-extrabold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2 transition-all"
                        >
                          <Send className="w-4 h-4" />
                          <span>ارسال فیش جهت شارژ نهایی کیف پول (مرحله ۳)</span>
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* ------------------------------------------------------------- */}
                {/* CASE D: STEP 4 (Receipt Uploaded, Awaiting CEO Final Approval) */}
                {/* ------------------------------------------------------------- */}
                {activeTopupTx && activeTopupTx.approvalStatus === 'topup_step3_pending_approval' && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md animate-pulse">
                          <Clock className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-xs font-extrabold text-blue-900 bg-blue-200 px-2.5 py-0.5 rounded-full inline-block mb-1">
                            مرحله ۴ از ۴ • بررسی فیش و شارژ کیف پول
                          </span>
                          <h4 className="font-extrabold text-stone-900 text-base">
                            تصویر فیش و کد پیگیری با موفقیت ارسال گردید
                          </h4>
                        </div>
                      </div>

                      <div className="bg-white/90 p-3.5 rounded-xl border border-blue-200 text-xs space-y-2">
                        <div className="flex justify-between items-center text-stone-700">
                          <span>مبلغ واریزی:</span>
                          <span className="font-extrabold text-stone-950 font-mono text-sm">
                            {formatToman(activeTopupTx.amount)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-stone-600 border-t border-stone-100 pt-2 text-[11px]">
                          <span>کد پیگیری فیش:</span>
                          <span className="font-mono text-stone-900 font-bold">{activeTopupTx.receiptNumber}</span>
                        </div>
                        {activeTopupTx.receiptImageUrl && (
                          <div className="pt-2">
                            <span className="text-stone-500 block text-[11px] mb-1">تصویر فیش بارگذاری شده:</span>
                            <img
                              src={activeTopupTx.receiptImageUrl}
                              alt="رسید"
                              className="max-h-40 rounded-lg object-contain border border-stone-300 shadow-xs"
                            />
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-blue-950 leading-relaxed font-semibold">
                        تصویر رسید و شماره پیگیری شما جهت تایید نهایی صورتحساب برای مدیرعامل ارسال شد. به محض تایید مدیریت، مبلغ کیف پول ریالی شما شارژ خواهد شد.
                      </p>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* ======================================================== */}
            {/* WITHDRAWAL FORM CONTENT */}
            {/* ======================================================== */}
            {requestType === 'withdrawal' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-2">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-2">
                      شماره کارت یا شماره شبا مقصد <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={clientCardNumber}
                      onChange={(e) => setClientCardNumber(e.target.value)}
                      placeholder="6037... یا IR..."
                      className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-600 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-2">
                      نام بانک حساب شما <span className="text-stone-400 font-normal">(اختیاری)</span>
                    </label>
                    <input
                      type="text"
                      value={clientBankName}
                      onChange={(e) => setClientBankName(e.target.value)}
                      placeholder="مثال: ملی، ملت، صادرات..."
                      className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-2">
                    توضیحات تکمیلی <span className="text-stone-400 font-normal">(اختیاری)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="توضیحات برداشت..."
                    className="w-full p-3 text-xs bg-stone-50 border border-stone-300 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-600 resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 text-xs font-bold text-stone-700 bg-stone-200 hover:bg-stone-300 rounded-xl cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 text-xs font-extrabold text-white bg-rose-700 hover:bg-rose-800 rounded-xl shadow-md cursor-pointer flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>ارسال درخواست برداشت</span>
                  </button>
                </div>
              </form>
            )}

            {/* ======================================================== */}
            {/* SELL COPPER FORM CONTENT */}
            {/* ======================================================== */}
            {requestType === 'sell' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-2">
                      وزن مس جهت فروش (کیلوگرم) <span className="text-rose-500">*</span>
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
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-stone-800">
                        قیمت هر کیلو (تومان) <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setUnitPrice(marketPrices.sellPrice)}
                        className="text-[11px] text-blue-800 hover:text-blue-950 font-bold underline cursor-pointer"
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
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between text-xs">
                    <span className="text-blue-900 font-bold">مبلغ کل دریافت فروش:</span>
                    <span className="font-extrabold text-blue-950 font-mono text-base">
                      {formatNumber(Math.round(weightKg * unitPrice))} تومان
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-2">
                    توضیحات تکمیلی <span className="text-stone-400 font-normal">(اختیاری)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="توضیحات فروش مس..."
                    className="w-full p-3 text-xs bg-stone-50 border border-stone-300 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 text-xs font-bold text-stone-700 bg-stone-200 hover:bg-stone-300 rounded-xl cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 text-xs font-extrabold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-md cursor-pointer flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>ارسال درخواست فروش مس</span>
                  </button>
                </div>
              </form>
            )}

            {/* ======================================================== */}
            {/* BUY COPPER FORM CONTENT */}
            {/* ======================================================== */}
            {requestType === 'buy' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-2">
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
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-stone-800">
                        قیمت هر کیلو مس (تومان) <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setUnitPrice(marketPrices.buyPrice)}
                        className="text-[11px] text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
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
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs">
                    <span className="text-amber-900 font-bold">مبلغ کل فاکتور خرید:</span>
                    <span className="font-extrabold text-amber-950 font-mono text-base">
                      {formatNumber(Math.round(weightKg * unitPrice))} تومان
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-2">
                    توضیحات تکمیلی <span className="text-stone-400 font-normal">(اختیاری)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="توضیحات خرید مس..."
                    className="w-full p-3 text-xs bg-stone-50 border border-stone-300 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600 resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 text-xs font-bold text-stone-700 bg-stone-200 hover:bg-stone-300 rounded-xl cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 text-xs font-extrabold text-white bg-amber-700 hover:bg-amber-800 rounded-xl shadow-md cursor-pointer flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>ارسال درخواست خرید مس</span>
                  </button>
                </div>
              </form>
            )}

          </div>

          {/* Modal Footer (for non-deposit or close) */}
          {requestType === 'deposit' && (
            <div className="p-4 sm:p-5 border-t border-stone-200 bg-stone-50 flex items-center justify-between shrink-0">
              <span className="text-xs text-stone-500">
                سامانه پیگیری ۴ مرحله‌ای شارژ واریزی مس واته
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs font-bold text-stone-700 hover:text-stone-900 bg-stone-200 hover:bg-stone-300 rounded-xl transition-colors cursor-pointer"
              >
                بستن پنجره
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
